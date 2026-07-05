# ADR-0004: Images in R2, served via Cloudflare Image Transformations

**Status:** Accepted (2026-07-05) — **Amended (2026-07-05), see below**

## Context
Family members upload 8–15 MB phone photos of recipe cards and dishes. We need
originals preserved (card scans must stay readable at full resolution),
thumbnails fast, and no maintained image pipeline.

## Decision
- Client lightly downscales huge uploads (canvas, max ~2500px long edge) before
  upload.
- One canonical original per image stored in R2, keyed by image id.
- Served through the app's custom domain using Cloudflare Image
  Transformations URL options for thumbnails/detail sizes (free tier: 5,000
  unique transformations/month — ample for one family).
- D1 holds image metadata (recipe id, R2 key, dimensions, uploader, sort order).

## Consequences
- Thumbnail sizes are URL parameters, changeable anytime; no regeneration jobs.
- Depends on a custom domain (ADR-0013); `*.workers.dev` cannot transform.
- Not using the paid Cloudflare Images product; R2 is the single blob store.

## Amendment (2026-07-05): client renditions instead of URL transformations

`/cdn-cgi/image/` transformations fetch their source through the zone, where
**Cloudflare Access intercepts the subrequest** — every thumbnail would get a
login redirect instead of bytes. Working around that means a public bypass
path for images, weakening privacy.

Instead, the **client generates two renditions at upload** (canvas, JPEG):
`thumb` (~640px) and `full` (~2200px), both stored in R2 at
`img/{id}/{size}` and served by an authenticated app route (`/img/...`) so
the browser's Access session cookie protects family photos end-to-end.
Undecodable formats (e.g. HEIC on some platforms) fall back to storing the
original file for both sizes.

Trade-off accepted: sizes are frozen at upload; a new size would need a
backfill. Revisit only if image quality or page weight becomes a problem.
