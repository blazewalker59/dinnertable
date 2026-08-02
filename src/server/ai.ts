import { env } from 'cloudflare:workers'
import { createServerFn } from '@tanstack/react-start'
import { asc } from 'drizzle-orm'
import { db } from '../db'
import { sections } from '../db/schema'
import { currentMember } from './auth'

// AI-assisted recipe capture (ADR-0009 fast-follow): a Workers AI vision
// model drafts the free-text fields from a photo/screenshot; the member
// reviews in the form before anything is saved.

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

function bufToBase64(buf: ArrayBuffer) {
  let binary = ''
  const bytes = new Uint8Array(buf)
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
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

export const extractRecipe = createServerFn({ method: 'POST' })
  .inputValidator((data: FormData) => {
    const image = data.get('image')
    if (!(image instanceof File)) throw new Error('image is required')
    return { image }
  })
  .handler(async ({ data }) => {
    await currentMember()
    const sectionList = await db()
      .select({ name: sections.name })
      .from(sections)
      .orderBy(asc(sections.sortOrder))
    const sectionNames = sectionList.map((s) => s.name)

    const dataUrl = `data:${data.image.type || 'image/jpeg'};base64,${bufToBase64(
      await data.image.arrayBuffer(),
    )}`

    const output: unknown = await env.AI.run(MODEL as never, {
      messages: [
        {
          role: 'system',
          content: `You transcribe recipes from photos of recipe cards, cookbook pages, and app/website screenshots for a family recipe book. Respond with ONLY a JSON object, no prose, using exactly these keys:
{"title": string, "servings": string|null, "attribution": string|null, "ingredients": string|null, "instructions": string|null, "notes": string|null, "sectionName": string|null}

Rules:
- Transcribe faithfully, preserving quirky wording and quantities; fix obvious OCR-style garbling only.
- ingredients: one ingredient per line (\\n separated). instructions: paragraphs as written.
- attribution: whose recipe it is if stated (a person's name), else null.
- notes: personal notes/stories/tips that aren't instructions, else null.
- sectionName: the best fit from this list, else null: ${JSON.stringify(sectionNames)}
- If the image contains no recipe, use "" for title and null elsewhere.`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract the recipe from this image.' },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
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
        sectionNames.includes(raw.sectionName.trim())
          ? raw.sectionName.trim()
          : null,
    }
    if (!result.title && !result.ingredients && !result.instructions)
      throw new Error("Couldn't find a recipe in that image")
    return result
  })
