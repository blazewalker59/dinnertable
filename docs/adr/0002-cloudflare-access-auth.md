# ADR-0002: Authentication via Cloudflare Access

**Status:** ~~Accepted~~ **Superseded by ADR-0014** (2026-07-05) — the OTP
login UX failed in practice (codes bound to tab state, "already used" errors
on mobile); replaced with in-app Google auth via Better Auth.

## Context
Users are ~5–15 family members, some non-technical. We need "keep strangers
out," not a full auth system. Everything runs on Cloudflare.

## Decision
Cloudflare Access (Zero Trust) sits in front of the app with an email
allowlist. Sign-in is email + one-time PIN. The app contains no auth code: it
reads the verified identity from the `Cf-Access-Jwt-Assertion` /
`Cf-Access-Authenticated-User-Email` headers (JWT verified against the team's
public keys in a server middleware).

On first request from a new email, a `member` row is auto-provisioned with an
editable display name (see glossary: Member). Adding a family member = adding
their email to the Access policy. No roles, no invite flow.

## Consequences
- Zero session/token/email-sender code in the app.
- Login screen is Cloudflare-branded, not ours — accepted.
- Session duration configurable up to 1 month, so re-auth is rare.
- Requires a hostname on our Cloudflare zone (see ADR-0013).
- Swapping to in-app auth later would not touch the recipe domain.
