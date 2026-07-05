# Glossary — dinnertable

The ubiquitous language for this project. Use these words in code, UI, and
conversation; if a word isn't here, it isn't a concept in this system.

- **Recipe** — the core entity. A titled entry with optional section,
  servings, attribution, free-text ingredients, free-text instructions,
  free-text notes/story, and zero or more images. Only the title is required;
  an image-only recipe is valid (ADR-0003).
- **Section** — the single browsing axis, mirroring the book's table of
  contents (e.g. "Mama's Classics", "Desserts"). A recipe belongs to exactly
  one section. Family-editable list; no tags exist (ADR-0006).
- **Card** — a photographed handwritten recipe card. In the system it's just a
  recipe image, but in conversation "card" implies the image *is* the source
  of truth and text may be absent or transcribed later (ADR-0009).
- **Image** — a photo attached to a recipe (card scan or dish photo). Original
  bytes live in R2; sized renditions are URL transformations (ADR-0004).
- **Member** — a family member, auto-provisioned from their Cloudflare Access
  email on first visit, with an editable display name. No roles (ADR-0002,
  ADR-0007).
- **Added by** — the member who entered a recipe into the app. Automatic.
  Distinct from attribution.
- **Attribution** — freeform provenance text: whose recipe it is ("Mama",
  "Juli Alderman"). Often not a member (ADR-0007).
- **Notes** — the free-text story/tips field on a recipe ("Mama would use a
  9x13 casserole dish"). The wiki-editable home for what comments would have
  been (ADR-0010).
- **Favorite** — a member's heart on a recipe; powers the "My favorites"
  filter. The only social feature (ADR-0010).
- **The book** — "Recipes from Mama.pdf", the HeritageCookbook family cookbook
  that seeds launch content (ADR-0008) and lends its structure (not its dark
  visual style — ADR-0011).

**Words that are deliberately NOT concepts here:** household/tenant
(ADR-0001), meal log / cook log / feed (ADR-0005), tag (ADR-0006), comment
(ADR-0010), role/admin (ADR-0007), structured ingredient (ADR-0003).
