---
phase: "06-reader-frontend"
plan: "04"
subsystem: reader-frontend
tags: [reader, homepage, infinite-scroll, bezirk, modal, localstorage, adsense, next15]
dependency_graph:
  requires: ["06-02", "06-03"]
  provides: ["reader-homepage", "bezirk-page", "article-card", "article-feed", "bezirk-modal", "api-reader-articles"]
  affects: ["06-05", "06-06", "06-07"]
tech_stack:
  added: []
  patterns:
    - "IntersectionObserver for infinite scroll with 200px rootMargin sentinel"
    - "Client-side localStorage personalization in 'use client' ArticleFeed on mount"
    - "API route for client-side pagination: /api/reader/articles?bezirkSlugs=&limit=&offset="
    - "Next.js 15 async params: const { slug } = await params in server components"
    - "Bezirk-colored gradient image placeholder via BEZIRK_COLORS record"
    - "German relative timestamps via pure formatRelativeTime() function"
key_files:
  created:
    - src/components/reader/ArticleCard.tsx
    - src/components/reader/BezirkModal.tsx
    - src/components/reader/ArticleFeed.tsx
    - src/app/(public)/bezirk/[slug]/page.tsx
    - src/app/api/reader/articles/route.ts
  modified:
    - src/app/(public)/page.tsx
decisions:
  - "formatRelativeTime() defined inline in ArticleCard.tsx — pure function, no import needed"
  - "ArticleFeed replaces initialArticles on mount if localStorage selection found — avoids server/client mismatch flicker"
  - "bezirk/[slug] page uses no ads — per locked CONTEXT.md decision"
  - "API route /api/reader/articles resolves slugs via listBezirke() on each request — acceptable for pagination use case"
metrics:
  duration_minutes: 4
  completed_date: "2026-03-22"
  tasks_completed: 2
  files_created: 5
  files_modified: 1
---

# Phase 6 Plan 04: Reader Homepage + Feed + BezirkModal Summary

**One-liner:** Personalized Bezirk feed homepage with IntersectionObserver infinite scroll, first-visit BezirkModal, Bezirk-colored article cards, and a /bezirk/[slug] browse page — implementing READ-01 and READ-02.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | ArticleCard and BezirkModal components | 1543a4b | src/components/reader/ArticleCard.tsx, src/components/reader/BezirkModal.tsx |
| 2 | Homepage, ArticleFeed, /bezirk/[slug] page, API route | 904de0b | src/app/(public)/page.tsx, src/components/reader/ArticleFeed.tsx, src/app/(public)/bezirk/[slug]/page.tsx, src/app/api/reader/articles/route.ts |

## Verification

- `npx tsc --noEmit` passes — zero errors
- Homepage file exists and imports ArticleFeed + BezirkModal
- /bezirk/[slug]/page.tsx awaits params (Next.js 15 requirement: `const { slug } = await params`)
- API route /api/reader/articles/route.ts exists and returns Response.json(articles)
- All 6 required files exist on disk

## Decisions Made

1. **formatRelativeTime() inline in ArticleCard.tsx** — Pure helper function that needs no external dependency. Handles: gerade eben, vor N Minuten/Stunden, gestern, vor N Tagen, exact date after 7 days using de-AT locale.

2. **ArticleFeed replaces initialArticles on mount if localStorage bezirk_selection found** — On mount, if a selection exists, the feed re-fetches with personalized bezirkSlugs and replaces the initial server-fetched articles. This ensures personalziation is applied correctly while still having SSR content visible on first render.

3. **No ads on /bezirk/[slug] pages** — Per locked CONTEXT.md decision: "No ads on — Impressum page, /bezirk/[slug] browse pages".

4. **API route resolves bezirk slugs on every request** — The /api/reader/articles route calls listBezirke() to resolve slug→id. This is appropriate since it's only for pagination (client already has initial server-rendered articles).

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

All 6 files (ArticleCard.tsx, BezirkModal.tsx, ArticleFeed.tsx, page.tsx, bezirk/[slug]/page.tsx, api/reader/articles/route.ts) exist on disk. Commits 1543a4b and 904de0b found in git log. TypeScript compiles with zero errors. Pre-existing next build failure in /admin pages is unrelated to this plan's changes (confirmed by git stash test).
