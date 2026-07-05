# ADR-0008: Seed launch content from "Recipes from Mama.pdf"

**Status:** Accepted (2026-07-05)

## Context
An empty recipe app is a dead recipe app. The family already has ~50 recipes
digitized in the HeritageCookbook PDF, in four sections. PDF text extraction is
imperfect (garbled lines like "72/ Oz5.", column-order jumbles).

## Decision
A one-time **offline import script** (not an app feature) extracts each
recipe's title / servings / attribution / ingredients / instructions / notes
from the PDF into the free-text model (ADR-0003) and loads D1. Output gets a
human/AI cleanup pass before launch. Sections seeded from the book's table of
contents.

## Consequences
- App launches with the full book, searchable on day one.
- The script is throwaway; it lives in `scripts/` and is not maintained.
- Book page images are NOT attached to recipes (typeset text, not heirloom
  handwriting).
