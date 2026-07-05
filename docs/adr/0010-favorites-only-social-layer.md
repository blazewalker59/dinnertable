# ADR-0010: Favorites yes, comments no

**Status:** Accepted (2026-07-05)

## Context
With the meal log cut (ADR-0005), the app is a reference shelf. Candidate
social touches: per-member favorites and per-recipe comment threads. The
family already has a group text thread for conversation.

## Decision
- **Favorites:** yes. One join table (member, recipe), a heart button, and a
  "My favorites" filter. Serves the "easily surface" goal once the collection
  grows.
- **Comments:** no. Notes worth keeping belong in the recipe's notes field
  (wiki-editable); conversation belongs in the family thread.

## Consequences
- No threads, no notifications, no moderation questions.
