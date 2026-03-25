---
phase: 10-config-branding-wiring
plan: 01
subsystem: ui
tags: [config, branding, bundesland, next.js, react, rss]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: bundesland.config.ts with BundeslandConfig type and siteName field
  - phase: 06-reader-frontend
    provides: Header.tsx, layout.tsx, rss.ts consumer files
  - phase: 05-editorial-cms
    provides: admin/login/page.tsx consumer file
provides:
  - config.siteName as single source of truth for site name across all four UI locations
  - bundesland.config.ts propagation: changing siteName updates Header, metadata, RSS feed, admin login
affects: [future-bundesland-deployments]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Config import pattern: import config from '@/../bundesland.config' for all site-wide config access"
    - "Vitest resolve.alias: '@' mapped to 'src' so @/../bundesland.config resolves in test environment"

key-files:
  created: []
  modified:
    - src/components/reader/Header.tsx
    - src/app/layout.tsx
    - src/lib/reader/rss.ts
    - src/app/admin/login/page.tsx
    - vitest.config.ts

key-decisions:
  - "vitest.config.ts gains resolve.alias for '@' to match tsconfig paths — required for @/../bundesland.config to resolve in test environment (Rule 3 auto-fix)"

patterns-established:
  - "Config propagation pattern: all hardcoded site strings replaced by config.siteName import from '@/../bundesland.config'"

requirements-completed: [CONF-01, CONF-02, READ-06]

# Metrics
duration: 4min
completed: 2026-03-24
---

# Phase 10 Plan 01: Config Branding Wiring Summary

**bundesland.config.ts siteName wired as single source of truth into Header.tsx, app/layout.tsx, rss.ts, and admin/login/page.tsx — four hardcoded 'Ennstal Aktuell' literals eliminated**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-24T20:02:55Z
- **Completed:** 2026-03-24T20:06:33Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Replaced hardcoded "Ennstal Aktuell" in Header.tsx span with `{config.siteName}` from bundesland.config
- Replaced hardcoded metadata title in app/layout.tsx with `config.siteName`
- Replaced hardcoded RSS feed title in rss.ts with `${config.siteName} – ${slug}` template literal
- Replaced hardcoded admin login heading in admin/login/page.tsx with `{config.siteName} Admin` JSX expression
- Fixed vitest alias resolution so `@/../bundesland.config` resolves in test environment (all 192 tests pass)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire config.siteName into Header.tsx and app/layout.tsx** - `5552965` (feat)
2. **Task 2: Wire config.siteName into rss.ts and admin/login/page.tsx** - `6217052` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/components/reader/Header.tsx` - Imports config, renders `{config.siteName}` instead of hardcoded string
- `src/app/layout.tsx` - Imports config, sets `metadata.title = config.siteName` instead of hardcoded string
- `src/lib/reader/rss.ts` - Imports config, uses `${config.siteName} – ${slug}` as feed title
- `src/app/admin/login/page.tsx` - Imports config, renders `{config.siteName} Admin` as h1 heading
- `vitest.config.ts` - Added `resolve.alias` for `@` → `src` so config import resolves in vitest

## Decisions Made
- Used `@/../bundesland.config` import path (same pattern established in Phase 9 for impressum/page.tsx and AdUnit.tsx) — consistent, proven in all four files
- JSX expression `{config.siteName} Admin` (not a template literal) for login heading — matches codebase JSX style
- `export const metadata` kept as static export in layout.tsx — config.siteName resolves at build time from module-level import, no need to switch to generateMetadata()

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added @/ alias to vitest.config.ts so @/../bundesland.config resolves in tests**
- **Found during:** Task 2 (rss.ts edit — running vitest)
- **Issue:** vitest.config.ts had no resolve.alias for `@`, so `@/../bundesland.config` in rss.ts failed to resolve during test run with "Failed to load url" error
- **Fix:** Added `resolve: { alias: { '@': path.resolve(__dirname, 'src') } }` to vitest.config.ts
- **Files modified:** vitest.config.ts
- **Verification:** `npx vitest run` — all 27 test files, 192 tests pass
- **Committed in:** `6217052` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking)
**Impact on plan:** Auto-fix was necessary for test suite to pass. Directly caused by the new config import in rss.ts. No scope creep.

## Issues Encountered
None beyond the alias fix documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Config branding wiring complete — changing `siteName` in `bundesland.config.ts` now propagates to all four UI locations without any other code change
- Bundesland deployments now require only a config change for site name rebranding
- No blockers for remaining Phase 10 plans

---
*Phase: 10-config-branding-wiring*
*Completed: 2026-03-24*
