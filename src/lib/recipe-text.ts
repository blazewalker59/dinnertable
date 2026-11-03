// Turns a recipe's free-text fields (ADR-0003) into structure for display.
// Nothing here changes what's stored; it only shapes how it reads.

/** Joins the present parts with " · " and capitalizes the first letter. */
export function joinDetail(
  parts: Array<string | null | undefined>,
): string | null {
  const s = parts
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(' · ')
  return s ? s[0].toUpperCase() + s.slice(1) : null
}

// "1. ", "2) ", "Step 3: " — but not "1.5 cups" or "1-2 minutes".
const STEP_NUMBER = /^\s*(?:step\s*)?\d+\s*[.):-](?:\s+|$)/i
const BULLET = /^\s*[-*•·]\s+/

/**
 * Splits instructions into steps. Paragraphs (blank-line separated) are steps
 * when there are several; otherwise each non-empty line is. Leading "1." /
 * "2)" / "Step 3:" numbering and bullets are dropped, since the list numbers
 * them itself.
 */
export function parseSteps(text: string | null | undefined): Array<string> {
  if (!text?.trim()) return []
  const normalized = text.replace(/\r\n?/g, '\n').trim()
  const paragraphs = normalized.split(/\n\s*\n/)
  const chunks = paragraphs.length > 1 ? paragraphs : normalized.split('\n')
  return chunks
    .map((c) =>
      c
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .join(' ')
        .replace(STEP_NUMBER, '')
        .replace(BULLET, '')
        .trim(),
    )
    .filter(Boolean)
}

export type IngredientLine =
  { kind: 'heading'; text: string } | { kind: 'item'; text: string }

/**
 * One entry per non-empty line. A line ending in ":" (e.g. "Frosting:") is
 * a sub-heading rather than something to tick off. Bullets are dropped.
 */
export function parseIngredients(
  text: string | null | undefined,
): Array<IngredientLine> {
  if (!text?.trim()) return []
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.trim().replace(BULLET, '').trim())
    .filter(Boolean)
    .map((l) =>
      l.endsWith(':') && l.length > 1
        ? { kind: 'heading', text: l.slice(0, -1).trim() }
        : { kind: 'item', text: l },
    )
}
