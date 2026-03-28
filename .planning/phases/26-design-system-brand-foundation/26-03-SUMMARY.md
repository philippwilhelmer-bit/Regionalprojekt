---
phase: 26-design-system-brand-foundation
plan: "03"
subsystem: ui
tags: [branding, seo, sitemap, rss, config]

# Dependency graph
requires:
  - phase: 26-design-system-brand-foundation
    provides: plan 01 and 02 font/design token foundations
provides:
  - Wurzelwelt brand identity across bundesland.config.ts, SEO metadata, RSS feeds, sitemap, robots.txt, structured data
  - public/images/ directory ready for mascot asset
  - Zero "Ennstal Aktuell" brand references remaining in codebase
affects: [27-homepage-redesign, 28-article-page, all phases using config.siteName or BASE_URL]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "bundesland.config.ts as single source of truth for brand identity (siteName, publisherName, email)"
    - "Fallback BASE_URL updated to production domain wurzelwelt.at"

key-files:
  created:
    - public/images/ (directory for mascot asset, wurzelmann.png pending user placement)
  modified:
    - bundesland.config.ts
    - src/app/layout.tsx
    - src/app/sitemap.ts
    - src/app/robots.ts
    - src/app/rss/[slug]/route.ts
    - src/app/(public)/artikel/[publicId]/[slug]/page.tsx
    - src/lib/reader/rss.ts
    - src/lib/reader/sitemap.test.ts

key-decisions:
  - "Geographic 'Ennstal' references in test fixtures (bezirke.test.ts, setup-db.ts, step1-tag.test.ts) preserved — these are Bezirk synonym data for Liezen region, not brand references"
  - "public/images/ directory created; wurzelmann.png deferred to user placement before Phase 27"

patterns-established:
  - "Pattern: all fallback BASE_URL values use https://wurzelwelt.at"
  - "Pattern: publisherName sourced from config.branding.impressum.publisherName"

requirements-completed: [BRAND-01, BRAND-02]

# Metrics
duration: 10min
completed: 2026-03-28
---

# Phase 26 Plan 03: Brand Rename Summary

**All "Ennstal Aktuell" brand references replaced with "Wurzelwelt" across config, SEO metadata, RSS feeds, sitemap, robots.txt, article page structured data, and test fixtures**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-28T21:50:00Z
- **Completed:** 2026-03-28T22:00:00Z
- **Tasks:** 1 complete, 1 pending user action (mascot asset)
- **Files modified:** 8

## Accomplishments
- bundesland.config.ts: siteName → "Wurzelwelt", publisherName → "Wurzelwelt Medien GmbH", email → "redaktion@wurzelwelt.at"
- All fallback BASE_URL values updated from ennstal-aktuell.at to wurzelwelt.at in 4 files
- layout.tsx description updated to "Wurzelwelt — Nachrichten aus der Steiermark"
- sitemap.test.ts all 4 URL references updated; all 6 tests pass
- public/images/ directory created for mascot asset

## Task Commits

Each task was committed atomically:

1. **Task 1: Rename all brand references from Ennstal Aktuell to Wurzelwelt** - `cb89835` (feat)
2. **Task 2: Verify Wurzelmann mascot asset placement** - pending user action (public/images/wurzelmann.png must be placed before Phase 27)

## Files Created/Modified
- `bundesland.config.ts` - siteName, publisherName, email updated to Wurzelwelt brand
- `src/app/layout.tsx` - metadata description updated to include Wurzelwelt
- `src/app/sitemap.ts` - fallback BASE_URL → https://wurzelwelt.at
- `src/app/robots.ts` - fallback BASE_URL → https://wurzelwelt.at
- `src/app/rss/[slug]/route.ts` - fallback BASE_URL → https://wurzelwelt.at
- `src/app/(public)/artikel/[publicId]/[slug]/page.tsx` - fallback BASE_URL → https://www.wurzelwelt.at
- `src/lib/reader/rss.ts` - JSDoc example URL updated
- `src/lib/reader/sitemap.test.ts` - all 4 fallback URL references updated
- `public/images/` - directory created (empty, awaiting wurzelmann.png)

## Decisions Made
- Geographic "Ennstal" references in test fixtures preserved: `bezirke.test.ts`, `setup-db.ts`, and `step1-tag.test.ts` all reference "Ennstal" as a geographic synonym for Liezen Bezirk — these are correct geographic data, not brand references, and must not be changed
- `SourceFormFields.tsx` placeholder text "Steiermark, Graz, Ennstal..." preserved as a geographic keyword hint
- wurzelmann.png placement deferred: the plan acknowledges Claude cannot generate images; user must provide the file before Phase 27 component work begins

## Deviations from Plan

None — plan executed exactly as written. Geographic "Ennstal" references (non-brand) were correctly identified and preserved as out of scope for this brand rename.

## User Setup Required

**Action required before Phase 27:** Place the Wurzelmann mascot PNG at:
```
/Users/philipp/Claudebot/Regionalprojekt/public/images/wurzelmann.png
```

Verification: `ls -la public/images/wurzelmann.png`

## Next Phase Readiness
- Brand identity fully updated in config, SEO metadata, RSS, sitemap, structured data
- public/images/ directory ready — only wurzelmann.png placement remains
- Phase 27 (homepage redesign) can use `config.siteName` ("Wurzelwelt") and mascot once placed
- No blockers for Phase 27 beyond mascot asset placement

---
*Phase: 26-design-system-brand-foundation*
*Completed: 2026-03-28*
