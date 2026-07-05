# ADR-0007: Wiki-style editing, soft deletes, no roles

**Status:** Accepted (2026-07-05)

## Context
This is a family trust circle. The failure mode to guard against is neglect
(typos never fixed, recipes frozen when their adder goes inactive), not
vandalism.

## Decision
- Any member can edit or delete any recipe.
- `added_by` (member) records who entered it; a separate freeform
  `attribution` text field records provenance ("Juli Alderman", "Mama") —
  these are distinct concepts.
- Deletes are soft (`deleted_at`); recovery is a DB poke, no trash UI in v1.
- No edit history/versioning: the card image, which is immutable, preserves
  original wording where it matters.

## Consequences
- No role/permission machinery anywhere.
- A destructive edit loses the previous text (accepted for v1).
