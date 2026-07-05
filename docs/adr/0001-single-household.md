# ADR-0001: Single household, no tenancy

**Status:** Accepted (2026-07-05)

## Context
The app serves one family sharing recipes. Multi-tenancy (a household entity,
memberships, scoping on every query) would double complexity for a hypothetical
future user base.

## Decision
No `household`/`family` entity exists anywhere in the schema. Everyone who can
sign in sees everything. A second family = a second Cloudflare deployment.

## Consequences
- Every query is simpler; no scoping bugs possible.
- Access control is entirely "can you sign in at all" (see ADR-0002).
- If true multi-tenancy is ever needed, it is a rewrite of the data layer — accepted.
