# Domain model — dinnertable

A single-household family recipe shelf. See GLOSSARY.md for the language and
docs/adr/ for why each decision was made.

## Entities

```
Member                          Section
  id                              id
  email        (unique, from     name
                CF Access)       sortOrder
  displayName  (editable)
  createdAt

Recipe                          RecipeImage
  id                              id
  title         (required)       recipeId    → Recipe
  sectionId     → Section        r2Key       (original bytes in R2)
  servings?     (text)           width, height
  attribution?  (text,           sortOrder
                 provenance)     addedById   → Member
  ingredients?  (multiline       createdAt
                 plain text)
  instructions? (plain text)    Favorite
  notes?        (plain text,      memberId  → Member
                 story/tips)      recipeId  → Recipe
  addedById     → Member          createdAt
  createdAt                       (pk: memberId + recipeId)
  updatedAt
  deletedAt?    (soft delete)

recipes_fts (FTS5 virtual table; raw SQL migration + triggers)
  title, ingredients, instructions, notes, attribution
```

## Relationships
- Section 1—N Recipe (exactly one section per recipe)
- Recipe 1—N RecipeImage (zero or more; image-only recipes valid)
- Member N—N Recipe via Favorite
- Member 1—N Recipe/RecipeImage via addedBy (attribution of entry, not provenance)

## Invariants
- Only `title` is required on a recipe.
- Any member may edit/soft-delete any recipe (wiki-style).
- Queries exclude `deletedAt IS NOT NULL` rows everywhere.
- One R2 object per image; all sizes are transformation URLs.

## System shape
Cloudflare Access (email allowlist) → Worker running TanStack Start
(loaders + server functions) → D1 (Drizzle; FTS5 raw) + R2 (image originals)
→ served on a custom domain with Image Transformations.
