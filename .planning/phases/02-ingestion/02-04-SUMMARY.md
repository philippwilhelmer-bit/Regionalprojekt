---
phase: 02-ingestion
plan: 04
subsystem: ingestion
tags: [feedsmith, rss, atom, vitest, tdd, adapter]

# Dependency graph
requires:
  - phase: 02-ingestion
    plan: 01
    provides: Wave 0 test stubs; fixture XMLs (rss-sample.xml, atom-sample.xml)
  - phase: 02-ingestion
    plan: 02
    provides: RawItem interface, AdapterFn type, computeContentHash for externalId fallback

provides:
  - rssAdapter(source: Source) in src/lib/ingestion/adapters/rss.ts — parses RSS 2.0 and Atom 1.0 feeds into RawItem[]
  - 6 passing GREEN tests for ING-02

affects: [02-05, 02-06]

# Tech tracking
tech-stack:
  added:
    - feedsmith (npm dependency) — universal RSS/Atom/RDF/JSON feed parser
  patterns:
    - "feedsmith parseFeed() returns discriminated union by format; handle 'rss' and 'atom' branches separately"
    - "externalId fallback chain: item.guid.value -> item.link -> computeContentHash(title, description)"
    - "Source (Prisma model) passed to adapter instead of ArticleSource enum — adapter needs source.url to fetch"

key-files:
  created:
    - src/lib/ingestion/adapters/rss.ts
  modified:
    - src/lib/ingestion/adapters/rss.test.ts
    - package.json
    - package-lock.json

key-decisions:
  - "rssAdapter takes Source (Prisma model, has .url) not ArticleSource enum — AdapterFn is typed with enum but RSS adapter needs source.url to fetch"
  - "feedsmith RSS item.guid is a Guid object {value, isPermaLink?} — use item.guid.value for externalId, not item.guid directly"
  - "Atom entry.title and entry.summary are plain strings in feedsmith (type Text = string) — no .value unwrapping needed"

patterns-established:
  - "Dynamic import in vitest tests (await import('./rss')) ensures each test gets fresh module for vi.spyOn(fetch) isolation"

requirements-completed: [ING-02]

# Metrics
duration: 2min
completed: 2026-03-21
---

# Phase 2 Plan 04: Generic RSS/Atom feed adapter Summary

**RSS/Atom feed adapter using feedsmith — handles both formats via discriminated union, externalId fallback chain guid->link->hash, 6 tests GREEN**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-21T21:02:39Z
- **Completed:** 2026-03-21T21:04:23Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Installed feedsmith and created `src/lib/ingestion/adapters/rss.ts` implementing `rssAdapter`
- rssAdapter fetches source.url, throws on non-200, delegates to `parseFeed()` from feedsmith
- Handles feedsmith's discriminated union return type — separate branches for `format: 'rss'` and `format: 'atom'`
- externalId fallback chain: `item.guid.value ?? item.link ?? computeContentHash(title, description)`
- Atom entries: `entry.id` is required string (not optional), maps to externalId directly
- Full suite: 29 tests pass + 20 todo stubs, no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: RED tests + feedsmith install** - `c4effe6` (test)
2. **Task 2: RSS adapter implementation GREEN** - `8ea6ec1` (feat)

**Plan metadata:** (docs commit follows)

_Note: TDD tasks — RED commit first, then GREEN implementation commit_

## Files Created/Modified
- `src/lib/ingestion/adapters/rss.ts` - rssAdapter implementation using feedsmith
- `src/lib/ingestion/adapters/rss.test.ts` - 6 real tests replacing Wave 0 todo stubs
- `package.json` - feedsmith added to dependencies
- `package-lock.json` - lockfile updated

## Decisions Made
- `rssAdapter` takes a `Source` Prisma model (not the `ArticleSource` enum) because the adapter requires `source.url` to fetch the feed. The `AdapterFn` type uses `ArticleSource` but the RSS adapter signature is more specific.
- feedsmith's `Rss.Guid` is an object `{value: string, isPermaLink?: boolean}` — must use `.guid.value` for the externalId string, not `.guid` directly.
- feedsmith's `Atom.Text` type resolves to `string` — no `.value` property needed; `entry.title` and `entry.summary` are plain strings.

## Deviations from Plan

None - plan executed exactly as written. feedsmith API matched the documented interface. Both fixture files from Wave 0 were present and well-formed.

## Issues Encountered
- `npx` not on PATH in this shell environment — resolved by prefixing `PATH="/Users/philipp/.nvm/versions/node/v25.8.0/bin:$PATH"` for all commands.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `rssAdapter` exported and ready for Plan 02-05 (ingest() orchestrator) to register and call
- Any new RSS/Atom source needs only a new Source DB row with `type: 'RSS'` — no code changes required (ING-02 satisfied)
- Wave 0 rss.test.ts stubs fully replaced; 6 tests GREEN

---
*Phase: 02-ingestion*
*Completed: 2026-03-21*

## Self-Check: PASSED

All 3 required files exist (rss.ts, rss.test.ts, 02-04-SUMMARY.md). Both task commits (c4effe6, 8ea6ec1) verified in git history.
