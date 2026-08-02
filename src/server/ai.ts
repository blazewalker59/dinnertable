import { env } from 'cloudflare:workers'
import { createServerFn } from '@tanstack/react-start'
import { asc } from 'drizzle-orm'
import { db } from '../db'
import { sections } from '../db/schema'
import { currentMember } from './auth'

// AI-assisted recipe capture (ADR-0009 fast-follow): a Workers AI model
// drafts the free-text fields from a photo/screenshot or copied text; the
// member reviews in the form before anything is saved.

export type ExtractedRecipe = {
  title: string
  servings: string | null
  attribution: string | null
  ingredients: string | null
  instructions: string | null
  notes: string | null
  sectionName: string | null
}

const MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct'

function systemPrompt(sectionNames: Array<string>, source: 'image' | 'text') {
  return `You transcribe recipes from ${
    source === 'image'
      ? 'photos of recipe cards, cookbook pages, and app/website screenshots'
      : 'text copied from websites, notes, and messages'
  } for a family recipe book. Respond with ONLY a JSON object, no prose, using exactly these keys:
{"title": string, "servings": string|null, "attribution": string|null, "ingredients": string|null, "instructions": string|null, "notes": string|null, "sectionName": string|null}

Rules:
- Transcribe faithfully, preserving quirky wording and quantities; fix obvious garbling only. Drop boilerplate that isn't part of the recipe (ads, navigation, comments).
- ingredients: one ingredient per line (\\n separated). instructions: paragraphs as written.
- attribution: whose recipe it is if stated (a person's name), else null.
- notes: personal notes/stories/tips that aren't instructions, else null.
- sectionName: the best fit from this list, else null: ${JSON.stringify(sectionNames)}
- If there is no recipe, use "" for title and null elsewhere.`
}

// Models wrap JSON in prose or code fences despite instructions; dig it out.
function parseLenient(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON in model output')
  return JSON.parse(candidate.slice(start, end + 1))
}

function bufToBase64(buf: ArrayBuffer) {
  let binary = ''
  const bytes = new Uint8Array(buf)
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

async function sectionNames() {
  const rows = await db()
    .select({ name: sections.name })
    .from(sections)
    .orderBy(asc(sections.sortOrder))
  return rows.map((s) => s.name)
}

async function runExtraction(
  messages: Array<Record<string, unknown>>,
  names: Array<string>,
): Promise<ExtractedRecipe> {
  const output: unknown = await env.AI.run(MODEL as never, {
    messages,
    max_tokens: 2048,
  } as never)

  // Workers AI response shape varies by model: sometimes { response: string },
  // sometimes OpenAI-style choices, sometimes already-parsed JSON.
  const o = output as Record<string, any>
  const text =
    typeof output === 'string'
      ? output
      : typeof o?.response === 'string'
        ? o.response
        : typeof o?.choices?.[0]?.message?.content === 'string'
          ? o.choices[0].message.content
          : JSON.stringify(o?.response ?? o)

  const raw = parseLenient(text)
  const str = (v: unknown) => {
    const t = typeof v === 'string' ? v.trim() : ''
    return t ? t : null
  }
  const result: ExtractedRecipe = {
    title: (typeof raw.title === 'string' ? raw.title.trim() : '').slice(0, 200),
    servings: str(raw.servings),
    attribution: str(raw.attribution),
    ingredients: str(raw.ingredients),
    instructions: str(raw.instructions),
    notes: str(raw.notes),
    sectionName:
      typeof raw.sectionName === 'string' &&
      names.includes(raw.sectionName.trim())
        ? raw.sectionName.trim()
        : null,
  }
  if (!result.title && !result.ingredients && !result.instructions)
    throw new Error("Couldn't find a recipe in that")
  return result
}

export const extractRecipe = createServerFn({ method: 'POST' })
  .inputValidator((data: FormData) => {
    const images = data.getAll('image').filter((v) => v instanceof File)
    if (images.length === 0) throw new Error('image is required')
    if (images.length > 4) throw new Error('At most 4 images per scan')
    return { images }
  })
  .handler(async ({ data }) => {
    await currentMember()
    const names = await sectionNames()
    const imageParts = await Promise.all(
      data.images.map(async (image) => ({
        type: 'image_url',
        image_url: {
          url: `data:${image.type || 'image/jpeg'};base64,${bufToBase64(
            await image.arrayBuffer(),
          )}`,
        },
      })),
    )
    return runExtraction(
      [
        { role: 'system', content: systemPrompt(names, 'image') },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                data.images.length === 1
                  ? 'Extract the recipe from this image.'
                  : `These ${data.images.length} images are sequential parts of ONE recipe (e.g. front/back of a card or a long screenshot split up). Combine them into a single recipe, in order.`,
            },
            ...imageParts,
          ],
        },
      ],
      names,
    )
  })

export const extractRecipeText = createServerFn({ method: 'POST' })
  .inputValidator((text: string) => {
    const trimmed = text.trim()
    if (!trimmed) throw new Error('Nothing to extract')
    return trimmed.slice(0, 16000)
  })
  .handler(async ({ data: text }) => {
    await currentMember()
    const names = await sectionNames()
    return runExtraction(
      [
        { role: 'system', content: systemPrompt(names, 'text') },
        {
          role: 'user',
          content: `Extract the recipe from this copied text:\n\n${text}`,
        },
      ],
      names,
    )
  })
