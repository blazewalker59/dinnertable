# ADR-0014: In-app Google auth via Better Auth (supersedes ADR-0002)

**Status:** Accepted (2026-07-05) — supersedes ADR-0002

## Context
Cloudflare Access + one-time PIN shipped first (ADR-0002) but the login UX
failed the family test: the emailed code was routinely rejected ("already
used") because the PIN is bound to a login attempt whose state resets when
the browser tab reloads — endemic on mobile. The owner asked for Google
sign-in with Better Auth, mirroring the working setup in the npball project.

## Decision
- **Better Auth** with the Drizzle adapter on D1, Google as the only social
  provider, mounted at `/api/auth/*`, `tanstackStartCookies()` plugin.
- **Allowlist enforced in the `user.create.before` hook**: after Google
  resolves the email, before any row is created. `ALLOWLIST_EMAILS` var holds
  the comma-separated family emails — adding a family member = editing that
  var (and redeploying).
- Better Auth owns `user`/`session`/`account`/`verification` tables; the
  app's **`members` table stays** as the domain concept (recipes, favorites,
  images reference it). It is auto-provisioned from the session by email, so
  pre-seeded members are reused. Display name defaults to the Google name.
- Unauthenticated visitors are redirected to `/login` by the root route's
  `beforeLoad`; server functions still 401 without a session; the `/img`
  route requires a session (cookie is same-origin, so `<img>` loads work).
- Local dev/e2e keeps the `DEV_USER_EMAIL` bypass in `.dev.vars`.
- The Cloudflare Access application was deleted; the Zero Trust org remains
  but gates nothing.

## Consequences
- One-tap Google sign-in; sessions are Better Auth's (7-day default,
  refreshed on activity).
- The app now owns auth code, session cookies, and two user-ish tables —
  the cost of controlling the UX.
- Secrets: `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_SECRET` (wrangler secrets);
  vars: `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `ALLOWLIST_EMAILS`.
- Family members without a Google account cannot sign in (accepted; revisit
  with email OTP via Better Auth if it ever matters).
