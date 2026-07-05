# ADR-0013: New custom domain via Cloudflare Registrar

**Status:** Accepted (2026-07-05) — domain: **dinnertable.cc**

## Context
Cloudflare Access policies (ADR-0002) and Image Transformations (ADR-0004)
both require a hostname on a Cloudflare zone; `*.workers.dev` supports
neither well. Owner has no existing domain earmarked.

## Decision
**dinnertable.cc**, registered via Cloudflare Registrar, routes to the Worker.
Initial Cloudflare Access allowlist: `blazewalker59@gmail.com` (family emails
added over time).

## Consequences
- Unblocks Access + image transforms as designed.
- Family-friendly URL to share.
