# ADR-0009: No transcription/OCR of handwritten cards in v1

**Status:** Accepted (2026-07-05)

## Context
Handwritten card photos could be transcribed by an AI vision model to make
them searchable. Workers AI vision models are weak at handwriting; doing it
well means calling an external API (e.g. Claude). The owner asked for images
*associated with* recipes, not OCR.

## Decision
v1 ships no transcription. A card photo + title is a complete recipe
(ADR-0003); anyone can type the text in later via wiki editing (ADR-0007).

**Designed-for fast-follow:** an "AI-assist: draft text from this photo"
button that fills the ingredients/instructions fields for human review before
save. This touches zero schema and no existing screens beyond one button.

## Consequences
- v1 has zero AI dependencies.
- Image-only recipes are findable only by title/section until transcribed.
