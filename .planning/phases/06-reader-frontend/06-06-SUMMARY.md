---
phase: 06-reader-frontend
plan: "06"
subsystem: reader-seo
tags: [rss, sitemap, impressum, tdd, seo, legal]
dependency_graph:
  requires: [06-02, 06-03]
  provides: [rss-feeds, sitemap-xml, impressum-page]
  affects: [seo, feed-distribution, legal-compliance]
tech_stack:
  added: []
  patterns: [tdd-red-green, force-dynamic, feedsmith-generate, nextjs-sitemap, vitest-vi-mock]
key_files:
  created:
    - src/lib/reader/rss.ts
    - src/app/rss/[slug]/route.ts
    - src/app/sitemap.ts
    - src/app/(public)/impressum/page.tsx
  modified:
    - src/lib/reader/rss.test.ts
    - src/lib/reader/sitemap.test.ts
    - src/app/(public)/page.tsx
decisions:
  - "sitemap.ts and (public)/page.tsx use export const dynamic = 'force-dynamic' — prevents Next.js from statically pre-rendering DB-dependent routes at build time"
  - "sitemap.test.ts uses relative imports (../../app/sitemap) not @/ alias — vitest does not resolve @/ for value imports without explicit vite resolve.alias config"
  - "vi.mock paths in sitemap.test.ts match the resolved module path (../../lib/content/*) — vitest normalizes to physical path for mock interception"
  - "generateRssFeed takes Rss.Feed<Date> directly (not wrapped in channel) — feedsmith 2.9.1 API shape confirmed from node_modules types"
metrics:
  duration_seconds: 623
  completed_date: "2026-03-22"
  tasks_completed: 2
  files_changed: 7
---

# Phase 6 Plan 06: RSS Feeds, Sitemap, and Impressum Summary

Per-Bezirk RSS feeds using feedsmith's `generateRssFeed`, Next.js 15 MetadataRoute.Sitemap, and a complete Austrian Impressum + Datenschutzerklärung page — all delivered via TDD with 12 new green tests.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | RSS generator (TDD) + RSS route handler | 3a60c1e | rss.ts, rss.test.ts, rss/[slug]/route.ts |
| 2 | Sitemap TDD + Impressum page | f540892 | sitemap.test.ts, sitemap.ts, impressum/page.tsx |
| fix | force-dynamic unblocks next build | 67fb3d2 | sitemap.ts, (public)/page.tsx |

## Verification Results

- `npx vitest run src/lib/reader/rss.test.ts src/lib/reader/sitemap.test.ts` — 12/12 tests green
- `npx tsc --noEmit` — passes
- `npx next build` — succeeds

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] sitemap.ts force-dynamic**
- **Found during:** Overall verification (next build)
- **Issue:** Next.js tried to statically pre-render `/sitemap.xml` at build time, hitting the real DB which lacks the `publicId` column in dev
- **Fix:** Added `export const dynamic = 'force-dynamic'` to `src/app/sitemap.ts`
- **Files modified:** src/app/sitemap.ts
- **Commit:** 67fb3d2

**2. [Rule 3 - Blocking] Homepage force-dynamic (pre-existing issue from Plan 03)**
- **Found during:** Overall verification (next build)
- **Issue:** `(public)/page.tsx` also failed static pre-render with same `publicId` error — pre-existing from Plan 03 but only surfaced during build verification here
- **Fix:** Added `export const dynamic = 'force-dynamic'` to `src/app/(public)/page.tsx`
- **Files modified:** src/app/(public)/page.tsx
- **Commit:** 67fb3d2

**3. [Rule 3 - Blocking] sitemap.test.ts import resolution**
- **Found during:** Task 2 (TDD RED phase)
- **Issue:** `@/app/sitemap` alias failed to resolve in vitest (no vite resolve.alias configured), `@/lib/content/*` also needed to use physical paths for vi.mock interception
- **Fix:** Changed test to use `'../../app/sitemap'` relative import and `'../../lib/content/*'` relative mock paths
- **Files modified:** src/lib/reader/sitemap.test.ts
- **Commit:** f540892

**4. [Rule 1 - Bug] feedsmith API shape**
- **Found during:** Task 1 implementation
- **Issue:** Plan pseudocode shows `generateRssFeed({ channel: { ... } })` but actual feedsmith 2.9.1 API takes `Rss.Feed<Date>` at the top level (no `channel` wrapper)
- **Fix:** Implementation uses `generateRssFeed({ title, link, description, items: [...] })` directly
- **Files modified:** src/lib/reader/rss.ts
- **Commit:** 3a60c1e

## Key Artifacts

### src/lib/reader/rss.ts
`generateBezirkRssFeed(articles, slug, baseUrl): string` — wraps feedsmith's `generateRssFeed` with the canonical article URL pattern `/artikel/[publicId]/[slugify(seoTitle??title)]`.

### src/app/rss/[slug]/route.ts
Next.js 15 Route Handler. Strips `.xml` suffix from slug. `steiermark` → `listArticles({ status: 'PUBLISHED', limit: 20 })`. Other slugs → validated via `getBezirkBySlug`, then `getArticlesByBezirk` filtered to PUBLISHED. Unknown slug → 404.

### src/app/sitemap.ts
`MetadataRoute.Sitemap` default export with `force-dynamic`. Covers homepage (priority 1.0), /impressum (0.3), 13 Bezirk pages (0.6), all published articles (0.8).

### src/app/(public)/impressum/page.tsx
Server Component with MedienG §25 + ECG §5 + DSGVO sections. `id="datenschutz"` anchor for CookieBanner link. No ads (locked decision). All operator-specific fields marked as `[PLACEHOLDER]` for pre-launch fill-in.

## Self-Check: PASSED

All 4 key files exist on disk. All 3 task commits verified in git history.
