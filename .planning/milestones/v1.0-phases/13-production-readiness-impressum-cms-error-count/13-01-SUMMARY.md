---
phase: 13-production-readiness-impressum-cms-error-count
plan: 01
subsystem: ui, api
tags: [bundesland-config, impressum, legal, prisma, sources, cms]

# Dependency graph
requires:
  - phase: 09-ad-config-wiring-auth-hardening
    provides: Impressum page with placeholder strings that needed replacing
  - phase: 05-editorial-cms
    provides: listSourcesAdmin with type-based error count needing fix

provides:
  - BundeslandBranding.impressum extended with telefon, unternehmensgegenstand, blattlinie, datenschutzEmail, uid?
  - Impressum page reads 4 legal fields from config (no more [BRACKET] placeholders)
  - listSourcesAdmin counts article errors by sourceId FK (exact, not approximate by type)

affects: [impressum-page, admin-sources-dashboard, bundesland-config]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Cast config as BundeslandConfig to expose optional impressum fields that satisfies narrows away
    - Dev-mode console.warn for TODO: placeholder fields in legal config

key-files:
  created: []
  modified:
    - src/types/bundesland.ts
    - bundesland.config.ts
    - src/app/(public)/impressum/page.tsx
    - src/lib/admin/sources-actions.ts
    - src/lib/admin/sources-actions.test.ts
    - src/types/bundesland.test-types.ts

key-decisions:
  - "Cast config as BundeslandConfig in impressum page — satisfies narrows away optional uid field, cast restores access"
  - "Use TODO: prefixed placeholder values in bundesland.config.ts — operator replaces before launch, dev-mode warn fires until replaced"
  - "sourceId: source.id FK query in listSourcesAdmin — exact per-source count replacing approximate enum-based type match"

patterns-established:
  - "BundeslandBranding.impressum is the canonical source for all Impressum legal fields"
  - "Dev-mode console.warn pattern for detecting unfilled config placeholders"

requirements-completed: [READ-05, CMS-04]

# Metrics
duration: 3min
completed: 2026-03-25
---

# Phase 13 Plan 01: Production Readiness — Impressum & CMS Error Count Summary

**Config-driven Impressum page with 4 legal fields (telefon, unternehmensgegenstand, blattlinie, datenschutzEmail) from bundesland.config.ts, and exact per-source error counts in listSourcesAdmin via sourceId FK**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-25T13:14:52Z
- **Completed:** 2026-03-25T13:17:54Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Extended `BundeslandBranding.impressum` with 4 required fields + optional `uid?` (ECG §5 VAT ID)
- Replaced all 4 `[BRACKET]` placeholder strings in impressum/page.tsx with `config.branding.impressum.*` reads; added conditional uid rendering and dev-mode TODO: warn
- Fixed `listSourcesAdmin()` to count FAILED+ERROR articles by `sourceId: source.id` FK instead of `source: source.type` enum, eliminating approximate multi-source counts

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend impressum type, config, and page rendering** - `c4f664d` (feat)
2. **Task 2: Fix listSourcesAdmin error count query and update test** - `7e78d0b` (fix)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/types/bundesland.ts` - Added telefon, unternehmensgegenstand, blattlinie, datenschutzEmail (required) and uid? (optional) to BundeslandBranding.impressum
- `bundesland.config.ts` - Added 4 required impressum fields with TODO: prefix placeholders
- `src/app/(public)/impressum/page.tsx` - Replaced [BRACKET] placeholders with config reads; added uid conditional rendering; added dev-mode console.warn
- `src/lib/admin/sources-actions.ts` - Changed failedErrorCount query from source type to sourceId FK
- `src/lib/admin/sources-actions.test.ts` - Added sourceId: source.id to article create calls for FK-based count
- `src/types/bundesland.test-types.ts` - Updated type test fixture with new required impressum fields

## Decisions Made

- Cast `config as BundeslandConfig` in the impressum page — `satisfies` narrows the inferred type to the literal shape (no `uid` field), so the cast restores access to the optional field without widening to `any`
- TODO: prefixed placeholder values in `bundesland.config.ts` instead of empty strings — makes unfilled fields visually obvious, and the dev-mode `console.warn` catches them programmatically

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated bundesland.test-types.ts fixture to include new required impressum fields**
- **Found during:** Task 1 (tsc --noEmit verification)
- **Issue:** The type-level test file had a fixture with only 3 impressum fields — adding 4 required fields to the interface caused tsc to error on the fixture's `@ts-expect-error` becoming unused AND the fixture object missing the new fields
- **Fix:** Added the 4 new required impressum fields to the fixture object in bundesland.test-types.ts
- **Files modified:** src/types/bundesland.test-types.ts
- **Verification:** tsc --noEmit passes after fix
- **Committed in:** c4f664d (Task 1 commit)

**2. [Rule 1 - Bug] Cast config as BundeslandConfig in impressum page for optional uid access**
- **Found during:** Task 1 (tsc --noEmit verification)
- **Issue:** `satisfies BundeslandConfig` narrows the inferred type to the literal shape — since `uid` is not in bundesland.config.ts, the narrowed type has no `uid` property, causing tsc error on `config.branding.impressum.uid`
- **Fix:** Import config as `_config` and re-export as `const config = _config as BundeslandConfig` to restore the interface-typed shape with optional uid
- **Files modified:** src/app/(public)/impressum/page.tsx
- **Verification:** tsc --noEmit passes, uid renders conditionally
- **Committed in:** c4f664d (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — build-blocking type errors)
**Impact on plan:** Both fixes required for tsc to pass. No scope creep.

## Issues Encountered

- Pre-existing test failure in `src/lib/content/bezirke.test.ts` (gemeindeSynonyms data missing) — 2 tests fail. Out of scope for this plan; failure predates our changes and is unrelated to impressum or sources-actions work.

## User Setup Required

None — no external service configuration required. However, the operator must fill in the 4 TODO: placeholder values in `bundesland.config.ts` before launch:
- `telefon`
- `unternehmensgegenstand`
- `blattlinie`
- `datenschutzEmail`

The dev-mode `console.warn` will fire until these are replaced.

## Next Phase Readiness

- Impressum page is production-ready pending operator filling in the 4 TODO: fields
- listSourcesAdmin error counts are now exact per-source (not approximate by type)
- BundeslandBranding.impressum type is the canonical source for all legal config fields

---
*Phase: 13-production-readiness-impressum-cms-error-count*
*Completed: 2026-03-25*
