# ADR-0015: Agents use the recipe book over MCP, with a member's API token

**Status:** Accepted (2026-11-02)

## Context
Family members want their AI assistants (Claude, ChatGPT, their own bots) to
use the recipe book: put a recipe's ingredients on a grocery list, and save a
recipe from a link or a screenshot without opening the app. Agents speak the
Model Context Protocol. The same design already works in sportsline
(its docs/adr/0007).

## Decision
- **`/mcp`** is a TanStack Start server route (`src/routes/mcp.ts`). It's a
  deliberately small MCP server: one JSON-RPC message per POST, answered with
  JSON (Streamable HTTP without the optional event stream, so no sessions to
  keep in a Worker), tools only. Notifications get 202, GET gets 405, and a
  browser Origin other than ours gets 403. Tool failures and bad arguments
  come back as tool results the model can read. Protocol mistakes come back
  as JSON-RPC errors. Unexpected errors are logged, and only a generic
  message is returned.
- **API tokens.** A member makes a token on the AI agents page (Profile → AI
  agents). It's `dt_` plus 32 random bytes, shown once. Only its SHA-256 is
  stored (`api_tokens`), with a name, its first characters, scopes, and when
  it was last used. Revoking a token stops it at once. Each request sends
  `Authorization: Bearer dt_…`, and the tools act as that member. A member can
  hold ten working tokens.
- **Scopes.** Every token has `read`. Tokens made with "Can add recipes" also
  have `add`.
  - **read:** `search_recipes`, `list_sections`, `list_recipes` (all, by
    section, or the member's favorites), `get_recipe` and `get_ingredients`.
    `get_ingredients` takes up to 20 recipes at once and is meant for
    building a grocery list. dinnertable keeps no grocery list of its own:
    the agent adds the items to whatever list it already manages.
  - **add:** `add_recipe` (fields the agent read itself, with optional photos
    to attach), `add_recipe_from_link` and `add_recipe_from_image`.
- **Links.** The server fetches the page and reads its schema.org Recipe
  JSON-LD where there is some (exact, and present on most recipe sites). It
  files the recipe by matching the page's recipeCategory to a section name.
  Pages without JSON-LD fall back to their visible text, read by the same
  Workers AI extractor the app's scan uses. The source URL goes in the
  recipe's notes.
- **Images** go through that same extractor and are attached as photos. One
  original stands in for both renditions, since nothing resizes on the
  server.
- **Saving.** Added recipes save straight away (no draft state), credited to
  the token's member. The result carries the recipe's URL and any
  same-titled recipes as `possibleDuplicates`, so the agent can point the
  member at it to check. Recipes are wiki-editable and soft-deleted
  (ADR-0007), so a bad import is easy to fix or remove.
- **Rate limit.** 60 requests a minute per token, as a fixed window kept on
  the token's row and updated atomically in the same statement that verifies
  the token. Past it, the request gets 429 with `Retry-After`. (Sportsline
  counts in a Durable Object; dinnertable has none, and D1 is enough at
  family scale.)

## Considered options
- **OAuth (MCP's authorization spec).** This is what claude.ai's hosted
  connectors need. It means more moving parts, though, and a member's own
  agent wants a fixed credential in its config. Tokens first. OAuth can sit
  beside them later.
- **A grocery list inside dinnertable.** Members already keep lists
  elsewhere (Reminders, AnyList, the agent's own memory). Building one would
  duplicate that, and the agent can already write to those lists.
- **The MCP TypeScript SDK.** Its HTTP transport assumes long-lived sessions
  and Node. Four methods written by hand fit a Worker better and are easy to
  test.

## Consequences
- A leaked token reads the family's recipes until it's revoked. A leaked
  `add` token can also add recipes, which any member can delete. The
  database alone never reveals a token.
- Tokens are long-lived, so members should revoke the ones they stop using.
  The last-used date shows which those are.
- Some recipe sites block automated fetches. The tool says so and suggests a
  screenshot, or having the agent read the page itself.
- Clients that only support OAuth (claude.ai connectors) can't connect yet.
  Claude Code, Claude Desktop (via config) and most bots send headers fine.
