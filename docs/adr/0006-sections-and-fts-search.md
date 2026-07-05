# ADR-0006: Book-style sections + full-text search; no tags

**Status:** Accepted (2026-07-05)

## Context
The book organizes recipes on exactly one axis: sections (Mama's Classics,
Soups and Dips, Brunch and Breakfast, Desserts). Freeform tags rot with
multiple casual users (Dessert vs desserts vs sweets).

## Decision
- Each recipe belongs to exactly one **Section**, from a family-editable table
  (name + sort order). Browsing mirrors the book's table of contents.
- Discovery beyond sections is **full-text search** via a SQLite FTS5 virtual
  table in D1 over title, ingredients, instructions, notes, and attribution
  (maintained by triggers; hand-written migration since Drizzle doesn't model
  virtual tables).
- No tags.

## Consequences
- Add-recipe form stays one dropdown; no tag gardening ever.
- New sections (e.g. "Holiday Baking") are a data change, not a code change.
- FTS queries are raw SQL alongside Drizzle — an accepted seam.
