# ADR-0003: Free-text recipe content; image-only recipes are valid

**Status:** Accepted (2026-07-05)

## Context
The source material ("Recipes from Mama" book + handwritten cards) has
idiosyncratic free-text ingredients ("Italian seasoning, to taste - I probably
put about 2 TBSP"), prose instructions, and personal stories. Structured
qty/unit/name ingredient rows would fight the data and make entry miserable.
The hard problem for family apps is getting anyone to enter data at all.

## Decision
A Recipe is: **title (required)** + optional section, servings, attribution,
ingredients (multiline plain text), instructions (plain text), notes/story
(plain text), and zero or more attached images.

Everything except title is optional, so "a title + a photo of Grandma's
handwritten card" is a complete, valid recipe. Text can be added later by
anyone (ADR-0007). No structured ingredient entities, no scaling, no shopping
lists.

## Consequences
- Photographing a card is the fastest path to adding a recipe.
- Search works via FTS over the text blocks (ADR-0006); image-only recipes are
  findable only by title/section until someone transcribes them.
- Recipe scaling / shopping lists are out of scope permanently unless the model
  is revisited.
