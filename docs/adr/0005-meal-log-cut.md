# ADR-0005: Meal log cut from scope

**Status:** Accepted (2026-07-05)

## Context
The original pitch included logging meals ("I made mom's spaghetti last week")
so the family could see what everyone is eating. During design grilling, the
owner chose to drop it and focus the app purely on recipes.

## Decision
No meal-log / cook-log / feed feature. The app is a recipe shelf: surface,
create, and share recipes. The home screen is the recipe collection, not an
activity feed.

## Consequences
- Domain collapses to Member, Section, Recipe, RecipeImage, Favorite.
- No date/backdating UI, no feed, no activity notifications.
- If revisited later, a log entry would reference recipes but nothing in the
  current schema anticipates it — deliberate; do not pre-build for it.
