---
phase: 09-ad-config-wiring-auth-hardening
plan: 03
subsystem: ui
tags: [config, impressum, json-ld, schema.org, bundesland-config]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: bundesland.config.ts with branding.impressum values
  - phase: 06-reader-frontend
    provides: impressum/page.tsx and article detail page.tsx templates
provides:
  - Impressum page with publisherName, address, and email from bundesland.config.ts
  - Article detail page JSON-LD publisher.name and author.name from config
affects: [any future page that needs publisher branding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Config-driven branding: import config from '@/../bundesland.config' in public Server Components"

key-files:
  created: []
  modified:
    - src/app/(public)/impressum/page.tsx
    - src/app/(public)/artikel/[publicId]/[slug]/page.tsx

key-decisions:
  - "Remaining Impressum placeholders ([TELEFON], [UNTERNEHMENSGEGENSTAND], [BLATTLINIE], [DATENSCHUTZ_EMAIL]) left as static strings — operator fills before launch"
  - "author.name and publisher.name in JSON-LD both use config.branding.impressum.publisherName — consistent publisher identity in structured data"

patterns-established:
  - "Config-driven strings: public Server Components import bundesland.config directly for branding values"

requirements-completed: [AD-02]

# Metrics
duration: 5min
completed: 2026-03-24
---

# Phase 9 Plan 03: Config-driven Impressum and JSON-LD Publisher Name Summary

**Three Impressum fields (publisherName, address, email) and JSON-LD publisher.name wired to bundesland.config.ts, enabling Bundesland reuse by config-only change**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-24T18:56:35Z
- **Completed:** 2026-03-24T19:01:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- impressum/page.tsx: replaced `[MEDIENINHABER_NAME]`, hardcoded address block, and `[EMAIL]` with `config.branding.impressum` values
- artikel/[publicId]/[slug]/page.tsx: replaced hardcoded `"Ennstal Aktuell"` string in JSON-LD `author.name` and `publisher.name` with `config.branding.impressum.publisherName`
- Both files now import `config from '@/../bundesland.config'` — platform can be redeployed for any Bundesland by changing only bundesland.config.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire Impressum + JSON-LD publisher name to config** - `56fd66a` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/app/(public)/impressum/page.tsx` - Publisher name, address, and email now read from config.branding.impressum
- `src/app/(public)/artikel/[publicId]/[slug]/page.tsx` - JSON-LD author.name and publisher.name read from config.branding.impressum.publisherName

## Decisions Made
- Remaining placeholders `[TELEFON]`, `[UNTERNEHMENSGEGENSTAND]`, `[BLATTLINIE]`, `[DATENSCHUTZ_EMAIL]` left as static strings per plan — operator fills these before launch
- Both `author` and `publisher` in JSON-LD use `publisherName` — consistent with NewsArticle schema best practice

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript error in `src/lib/admin/auth-node.test.ts` (module `requireAuth` export missing) — unrelated to this plan's files, out of scope per deviation rules, logged for awareness only.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 9 success criterion 4 (Impressum publisher details from config) is closed
- Changing `bundesland.config.ts` branding.impressum values now updates both /impressum page and article JSON-LD without any component code changes

## Self-Check: PASSED
- FOUND: src/app/(public)/impressum/page.tsx
- FOUND: src/app/(public)/artikel/[publicId]/[slug]/page.tsx
- FOUND: .planning/phases/09-ad-config-wiring-auth-hardening/09-03-SUMMARY.md
- FOUND commit: 56fd66a (feat(09-03): wire Impressum and JSON-LD publisher name from bundesland.config)

---
*Phase: 09-ad-config-wiring-auth-hardening*
*Completed: 2026-03-24*
