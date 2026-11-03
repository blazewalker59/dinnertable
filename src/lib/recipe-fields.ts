// A recipe's editable fields (ADR-0003). Shared by the app's server
// functions and agent tools; no server code here.

export type RecipeFields = {
  title: string
  sectionId: number
  servings: string | null
  attribution: string | null
  ingredients: string | null
  instructions: string | null
  notes: string | null
}

// Only title is required (ADR-0003); blank optional fields become null.
export function validateFields(input: RecipeFields): RecipeFields {
  const title = input.title.trim()
  if (!title) throw new Error('Title is required')
  const clean = (v: string | null | undefined) => {
    const t = v?.trim()
    return t ? t : null
  }
  return {
    title,
    sectionId: Number(input.sectionId),
    servings: clean(input.servings),
    attribution: clean(input.attribution),
    ingredients: clean(input.ingredients),
    instructions: clean(input.instructions),
    notes: clean(input.notes),
  }
}
