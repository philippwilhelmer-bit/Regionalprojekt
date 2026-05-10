---
phase: 42-on-demand-route-cms-picker-backfill
plan: "02"
subsystem: ui
tags: [next.js, react, server-actions, admin, cms, tabs, useTransition]

requires:
  - phase: 42-01
    provides: generateMapForArticle, backfillMapImages, BackfillResult
  - existing
    provides: UnsplashPicker, removeArticleImage, saveArticleImage

provides:
  - MapPicker component (Karte tab — preview, generate, remove)
  - ImagePickerTabs component (Unsplash/Karte tab switcher)
  - BackfillButton component (bulk backfill trigger with result display)
  - Edit page wired with ImagePickerTabs (replaces bare UnsplashPicker)
  - Articles list page with BackfillButton in header

affects: [admin CMS image-management UX, INTG-04 closure]

tech-stack:
  added: []
  patterns:
    - "Tab default selection driven by current image credit ('© basemap.at' → Karte tab, else Unsplash tab)"
    - "Client components with useTransition for Server Action dispatch + isPending UX"
    - "Status messages held in component state ('Karte gespeichert', 'Bild entfernt')"
    - "Secondary-style button (border, no gradient) used for non-primary actions like Backfill"

key-files:
  created:
    - src/components/admin/MapPicker.tsx
    - src/components/admin/ImagePickerTabs.tsx
    - src/components/admin/BackfillButton.tsx
  modified:
    - src/app/(admin)/admin/articles/[id]/edit/page.tsx
    - src/app/(admin)/admin/articles/page.tsx

key-decisions:
  - "ImagePickerTabs renders both UnsplashPicker (existing, unmodified) and MapPicker (new) in tab content; tab default chosen by current image credit"
  - "MapPicker initialises savedUrl/savedCredit only when current credit equals '© basemap.at' — prevents Unsplash images from displaying in the Karte tab"
  - "BackfillButton placed in articles list header alongside 'Neuer Artikel' link, wrapped in flex gap-3 div; secondary-style border button differentiates from the primary 'Neuer Artikel' gradient button"
  - "Result display format chosen: '{succeeded} generiert, {skipped} kein Ort, {failed} Fehler (von {processed} Artikeln)' — matches BackfillResult fields directly with German labels"

patterns-established:
  - "Per-tab component composition: ImagePickerTabs is the layout (label + tab bar), individual pickers stay focused on their flow"
  - "Client component + Server Action + useTransition is the standard CMS interaction pattern (mirrors UnsplashPicker)"

requirements-completed: [CMS-01, INTG-04]

duration: 1 day (implementation) + diagnostic detour (verification)
completed: 2026-04-13 (implementation), 2026-05-10 (verification)
verified: 2026-05-10 — UAT 8/8 pass (.planning/phases/42-on-demand-route-cms-picker-backfill/42-UAT.md)
---

# Phase 42 Plan 02: CMS Map Picker Tab and Bulk Backfill Button Summary

**Three new client components (MapPicker, ImagePickerTabs, BackfillButton) wired into the existing admin edit and articles list pages — completing the CMS-side surface for editor map control and bulk backfill.**

## Performance

- **Implementation:** 1 day (committed 2026-04-13 in 761d17d)
- **Verification:** 2026-05-10 (UAT today after long pause; 8/8 pass; three upstream infrastructure fixes diagnosed and committed during UAT)
- **Files modified:** 5 (3 created + 2 modified)

## Accomplishments

- **MapPicker.tsx (85 lines):** Karte-tab UI with preview, "Karte generieren"/"Karte neu generieren" button, and "Entfernen" remove control. Calls `generateMapForArticle` (from 42-01) and `removeArticleImage` (existing). Shows `Karte gespeichert` / `Bild entfernt` / error status messages. Uses `useTransition` for non-blocking pending state.
- **ImagePickerTabs.tsx (67 lines):** Wraps existing UnsplashPicker and new MapPicker in a tab switcher. Active-tab default chosen by `currentImageCredit === '© basemap.at'`. Archivist design tokens throughout (no Tailwind defaults).
- **BackfillButton.tsx (35 lines):** Header-area trigger for `backfillMapImages` Server Action. Secondary-style (bordered) button to differentiate from primary "Neuer Artikel". Result line format: "{N} generiert, {M} kein Ort, {K} Fehler (von {P} Artikeln)".
- **Edit page wiring:** `<UnsplashPicker>` replaced with `<ImagePickerTabs>` passing the same four props.
- **Articles list page wiring:** `<BackfillButton>` added to header flex row alongside "Neuer Artikel".

## Task Commits

- **`761d17d feat(42-02)`** — implementation: components + page wiring (2026-04-13).
- **`af51de6 fix(42-02)`** — three infrastructure fixes diagnosed during UAT (2026-05-10).
- **`1a1c240 docs(42-02)`** — UAT.md with 8/8 pass + diagnostics (2026-05-10).

## Files Created/Modified

| File | Status | Purpose |
|---|---|---|
| `src/components/admin/MapPicker.tsx` | created | Karte-tab UI (preview + generate + remove) |
| `src/components/admin/ImagePickerTabs.tsx` | created | Unsplash/Karte tab switcher |
| `src/components/admin/BackfillButton.tsx` | created | Bulk backfill trigger + result display |
| `src/app/(admin)/admin/articles/[id]/edit/page.tsx` | modified | Replaces UnsplashPicker with ImagePickerTabs |
| `src/app/(admin)/admin/articles/page.tsx` | modified | Adds BackfillButton to header |

## Decisions Made

- **Tab default by credit:** ImagePickerTabs initialises `activeTab=1` (Karte) only when `currentImageCredit === '© basemap.at'`, else `activeTab=0` (Unsplash). Editors land on the tab matching the article's current state.
- **Preview gate:** MapPicker only displays the preview when credit matches `'© basemap.at'`. Prevents Unsplash images from leaking into the Karte tab UI.
- **Secondary button style for Backfill:** Border-only, no gradient. The primary "Neuer Artikel" stays visually dominant.
- **Result format:** Counts in declarative German rather than icons/colours, matching the rest of the admin's text-first design.
- **Don't modify UnsplashPicker:** Component left fully unchanged; ImagePickerTabs wraps it. UnsplashPicker's internal "Artikelbild" label is double-printed under the tab label (acceptable trade — modifying UnsplashPicker would scope-creep this plan).

## Deviations from Plan

None at the implementation layer.

**Verification surfaced three pre-existing infrastructure issues** that blocked end-to-end UAT and were resolved in `af51de6`:

1. **`mapgen.ts` round-robin to NXDOMAIN subdomains** (Phase 40 regression — `maps1`–`maps4`.wien.gv.at retired upstream). Reduced to `BASEMAP_SERVERS = ['maps']`.
2. **Prisma Rust engine timing out at 5s on Neon pooler** from local dev. Migrated `src/lib/prisma.ts` to use the `PrismaPg` driver adapter; Prisma now uses `pg` for transport. Added `@prisma/adapter-pg`, `pg`, `@types/pg` deps.
3. **Local env config drift** — `DATABASE_URL` in `.env.local` was truncated mid-host; no Vercel Blob store was provisioned. Resolved via `.env.local` patch and Blob store creation (`regionalprojekt-blob`, public, eu-central-1). Production-side: verify `BLOB_READ_WRITE_TOKEN` exists in Vercel project env before next deploy.

None of these were Phase 42 bugs; the Phase 42 UI was correct from initial implementation in `761d17d`.

## Issues Encountered

- Phase 42-02 SUMMARY was never written when the plan was originally implemented (2026-04-13); GSD accounting carried this gap until UAT today (2026-05-10). This document closes that gap retrospectively.
- UAT pause: dev server orphan PIDs accumulated across terminals during the diagnostic detour; resolved by `pkill -f next-server`. Worth knowing for future verification sessions.

## User Setup Required

For local dev to run end-to-end after a clean clone:

- `.env.local` must contain a working `DATABASE_URL` (use `vercel env pull` or copy from `.env.vercel`)
- `.env.local` must contain `BLOB_READ_WRITE_TOKEN` (auto-added when a Vercel Blob store is connected to the project)
- Optional but recommended: `UNSPLASH_ACCESS_KEY` for full Unsplash search testing (without it, the Unsplash tab renders a clear configuration error rather than crashing)

## Next Phase Readiness

- **CMS-01 + INTG-04 fully closed.**
- **v3.1 milestone substantively complete** — pending production deploy of `af51de6` so the basemap subdomain fix takes effect for cron-driven map generation in prod (currently failing tile fetches the same way local was).
- Once deployed and verified in prod, `/gsd:complete-milestone 3.1` should run cleanly.
- Next milestone (v3.2 Text Engine Optimization) is pre-planned in `.planning/TEXT-ENGINE-OPTIMIZATION-PLAN.md` and `.planning/drafts/`; ready for `/gsd:new-milestone` when v3.1 closes.

---
*Phase: 42-on-demand-route-cms-picker-backfill*
*Implemented: 2026-04-13*
*Verified: 2026-05-10*
