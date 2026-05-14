---
phase: 46-aerzteverzeichnis
plan: 02
subsystem: api
tags: [server-actions, prisma, geocoding, nominatim, mapgen, vercel-blob, vitest, pglite]

# Dependency graph
requires:
  - phase: 46-aerzteverzeichnis
    provides: pathPrefix option on generateMapImage (Plan 46-00); Doctor model + read DAL (Plan 46-01)
provides:
  - Server-Action-Trinity for Doctor mutations — createDoctor / updateDoctor / toggleVerified / softDeleteDoctor (DIR-04, DIR-05, DIR-09)
  - *Db pure functions with injectable PrismaClient (createDoctorDb / updateDoctorDb / toggleVerifiedDb / softDeleteDoctorDb)
  - *Form wrappers for <form action={...}> (createDoctorForm / updateDoctorForm / toggleVerifiedForm / softDeleteDoctorForm)
  - Two-phase create pattern (insert-null-geo → geocode + mapgen with stable id → update) — solves the new-row-needs-id-for-Blob-path constraint
  - geocodeAndMap internal helper — both external calls independently try/catch'd so neither blocks the save (failure → row persists with lat=null, lon=null, mapImageUrl=null)
affects: [46-03-admin-pages, 46-04-public-pages]

# Tech tracking
tech-stack:
  added: []  # No new npm deps (anti-bloat clean)
  patterns:
    - "Server-Action-Trinity (Db / Action / Form) — mirrors articles-actions.ts / sources-actions.ts"
    - "Two-phase create when external pipeline needs the row id — insert null-geo, then enrich+update"
    - "Independent try/catch per external call inside an orchestration helper — caller never sees the throw"
    - "vi.doMock inside beforeAll after pglite ready, then dynamic-import the SUT — hoist-safe prisma-swap"
    - "Positional mock.calls[N][i] assertions instead of toHaveBeenCalledWith(prismaClient, ...) — avoids deep-equal of circular PrismaClient"

key-files:
  created:
    - src/lib/admin/doctors-actions.ts
    - src/lib/admin/doctors-actions.test.ts
  modified: []

key-decisions:
  - "Two-phase create (insert null-geo → geocode + mapgen with stable id → update) — generateMapImage's Blob path is keyed on the doctor id, which is auto-assigned at insert. Alternative would be a pre-fetched sequence or nanoid-only path; two-phase is cleaner because all field knowledge stays in the single transaction site."
  - "softDeleteDoctorDb does a HARD delete — naming kept for API symmetry with articles' softDelete (status=REJECTED). Doctor has no status enum and editorial volume is low; full row removal is the right semantic. Documented inline so it's not a surprise."
  - "updateDoctor re-geocodes only when input.address !== prev.address (not on every update) — Nominatim rate limit is 1 req/s and most edits are name/contact tweaks. The prev-row read is cheap (single indexed lookup) and avoids gratuitous Nominatim load."
  - "Positional mock.calls[N][i] assertions instead of toHaveBeenCalledWith(prismaClient, ...) — Vitest's toHaveBeenCalledWith does deep equality on args; PrismaClient has circular references and blew the call stack. Switched all 'first-arg is the prisma client' assertions to gcCall[1] / mgCall[N] positional indexing."
  - "vi.mock for auth-node / geocode / mapgen at file top (hoisted); vi.doMock for ../prisma inside beforeAll AFTER pglite client is ready; dynamic-import the SUT after vi.doMock fires. This is the canonical hoist-safe pattern for swapping a singleton module that the SUT imports at evaluation time."
  - "interfaces CreateDoctorInput / UpdateDoctorInput / GeoResult co-located with the actions module rather than re-exported from content/doctors.ts — they describe the write-side input shape (post-form-parsing, pre-geocode), not the read-side row shape."

patterns-established:
  - "Server-Action-Trinity layer for entities that need geocoding + mapgen: orchestrator helper runs both as independent try/catch's, persists row even when both fail, lets caller fall back to null-geo state"
  - "Hoist-safe prisma mock pattern: vi.mock at top for stateless module deps, vi.doMock inside beforeAll for ../prisma, then dynamic-import the SUT — works whenever the SUT references the prisma singleton at module-eval time"
  - "Positional mock-call assertion when first arg is a PrismaClient — toHaveBeenCalledWith uses deep equality and PrismaClient is circular"

requirements-completed: [DIR-04, DIR-05, DIR-09]

# Metrics
duration: 7 min
completed: 2026-05-14
---

# Phase 46 Plan 2: Doctor Server-Action-Trinity Summary

**Server-Action-Trinity for Doctor mutations (createDoctor / updateDoctor / toggleVerified / softDeleteDoctor) with two-phase create (insert-null-geo → geocode + mapgen with stable id → update) and independently try/catch'd geocode/mapgen so neither call blocks the save. 21 pglite + mocked-action tests pass; module exports 4 *Db + 4 Action + 4 Form functions plus 3 input interfaces.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-14T12:55:07Z
- **Completed:** 2026-05-14T13:02:01Z
- **Tasks:** 3 (Task 2.1 Db layer, Task 2.2 Action+Form layer, Task 2.3 tests — implemented as one consolidated RED commit + one consolidated GREEN commit)
- **Files created:** 2 (`src/lib/admin/doctors-actions.ts` 341 lines; `src/lib/admin/doctors-actions.test.ts` 514 lines)
- **Files modified:** 0
- **Tests:** 21 passing in 1.5s (in isolation)

## Accomplishments

- 12 functional exports from `doctors-actions.ts` + 3 input interfaces (CreateDoctorInput, UpdateDoctorInput, GeoResult)
- Two-phase create pattern correctly threads `doctor.id` into the Blob path: `maps/doctor-{id}.jpg` (via `{ pathPrefix: 'doctor' }` from Plan 46-00)
- `updateDoctor` re-geocodes ONLY when address changes (pre-fetch of prev row to compare)
- Independent try/catch around `geocodeLocation` and `generateMapImage` — failure of either persists row with the relevant fields null and emits `console.warn`; no rethrow ever reaches the caller
- All Server Actions enforce `requireAuth()` OUTSIDE try/catch (AGENTS.md rule — `redirect()` throws NEXT_REDIRECT)
- All Form wrappers call `revalidatePath('/admin/aerzte')` or `redirect()` after mutation
- 21 vitest tests passing in isolation: 8 Db-layer + 7 Action-layer + 6 Form-layer

## Task Commits

1. **Task 2.1+2.2+2.3 RED — failing tests for trinity** — `e074200` (`test(46-02): add failing tests for doctor Server-Action-Trinity`)
2. **Task 2.1+2.2 GREEN — implementation + test fix-up for circular-deep-equal** — `0c22a7e` (`feat(46-02): doctor Server-Action-Trinity with geocode + mapgen orchestration`)

REFACTOR phase skipped — implementation was minimal-correct on first GREEN pass. The two-test fix-up (`toHaveBeenCalledWith(prismaClient, ...)` → positional `mock.calls[0][1]`) landed in the same GREEN commit because it's a test-mechanics fix, not behavior.

**Plan metadata commit (added after this summary):** _set by orchestrator_

## Files Created/Modified

- `src/lib/admin/doctors-actions.ts` — full module, 341 lines, `'use server'` directive at top per AGENTS.md
  - 3 exported interfaces (CreateDoctorInput, UpdateDoctorInput, GeoResult)
  - 4 *Db functions (createDoctorDb, updateDoctorDb, toggleVerifiedDb, softDeleteDoctorDb)
  - 1 internal helper (`geocodeAndMap` — not exported)
  - 4 Server Actions (createDoctor, updateDoctor, toggleVerified, softDeleteDoctor)
  - 4 Form wrappers (createDoctorForm, updateDoctorForm, toggleVerifiedForm, softDeleteDoctorForm)
  - 1 internal helper (`parseRelatedArticleIds`)
- `src/lib/admin/doctors-actions.test.ts` — 514 lines, 21 tests covering all three layers

## Final export list

| Symbol                  | Layer  | Type      | Auth-gated |
| ----------------------- | ------ | --------- | ---------- |
| `CreateDoctorInput`     | types  | interface | n/a        |
| `UpdateDoctorInput`     | types  | interface | n/a        |
| `GeoResult`             | types  | interface | n/a        |
| `createDoctorDb`        | Db     | function  | no         |
| `updateDoctorDb`        | Db     | function  | no         |
| `toggleVerifiedDb`      | Db     | function  | no         |
| `softDeleteDoctorDb`    | Db     | function  | no         |
| `createDoctor`          | Action | function  | **yes**    |
| `updateDoctor`          | Action | function  | **yes**    |
| `toggleVerified`        | Action | function  | **yes**    |
| `softDeleteDoctor`      | Action | function  | **yes**    |
| `createDoctorForm`      | Form   | function  | **yes**    |
| `updateDoctorForm`      | Form   | function  | **yes**    |
| `toggleVerifiedForm`    | Form   | function  | **yes**    |
| `softDeleteDoctorForm`  | Form   | function  | **yes**    |

8 `await requireAuth()` calls across the 8 auth-gated functions. Verified: no `try` block precedes any of them.

## Two-phase create design note

`generateMapImage` writes to `maps/doctor-{id}.jpg` (parameterized via `{ pathPrefix: 'doctor' }` per Plan 46-00). The id is the doctor's primary key — but Postgres assigns it on insert, so we can't have the id before the row exists.

Two-phase resolves this:

```
createDoctor(input)
  ├── Phase 1: INSERT doctor row with lat=null, lon=null, mapImageUrl=null  → id known here
  ├── geocodeAndMap(address, name, id)
  │   ├── try { geocodeLocation(prisma, address) } catch { warn; geo = null }
  │   └── if (geo) try { generateMapImage(lat, lon, name, id, locType, { pathPrefix: 'doctor' }) } catch { warn; mapImageUrl = null }
  └── Phase 2 (only if geo || mapImageUrl): UPDATE row with geo + mapImageUrl
```

If both fail, the Phase 1 row is what persists — Plan 03's admin edit page will surface this as a non-blocking warning block (`bg-dir-error-container`), closing the cross-plan loop for DIR-05.

## Test coverage notes

| Layer  | Tests | Coverage                                                                            |
| ------ | ----- | ----------------------------------------------------------------------------------- |
| Db     | 8     | create defaults, geo arg, mapUrl arg, no-geo; update preserves omitted + clears geo; toggleVerified flip + flip-back + throws on missing; softDelete deletes row |
| Action | 7     | createDoctor: geocode success / null / throws / mapgen null; updateDoctor: address unchanged vs changed; toggleVerified delegates to Db |
| Form   | 6     | createDoctorForm: full FormData parse + 3 relatedArticleIds CSV cases (empty / "abc,def" / "abc, ,def" whitespace-stripped) + redirect-throws-NEXT_REDIRECT assertion |
| **Total** | **21** | All three failure-mode contracts verified (geocode null, geocode throws, mapgen null) |

`createDoctorForm` is asserted by reading DB state after `await expect(...).rejects.toThrow()` — `redirect()` throws NEXT_REDIRECT in the Next.js runtime, so the assertion proves the underlying `createDoctor` ran to completion before the redirect fired.

## Mocked dependencies

| Module                     | Mock strategy                                  | Why                                                 |
| -------------------------- | ---------------------------------------------- | --------------------------------------------------- |
| `./auth-node`              | `vi.mock` (hoisted) — resolves `requireAuth` to no-op | Cookies / Next runtime aren't relevant to action contract tests |
| `../images/geocode`        | `vi.mock` — `geocodeLocation: vi.fn()`         | Deterministic test results; no Nominatim HTTP        |
| `../images/mapgen`         | `vi.mock` — `generateMapImage: vi.fn()`        | No sharp / blob calls; no basemap.at HTTP            |
| `../prisma`                | `vi.doMock` inside `beforeAll` AFTER pglite ready, then dynamic-import the SUT | Hoisted `vi.mock` can't reference the pglite client (initialized in `beforeAll`); `vi.doMock` defers binding until the db exists |

## Decisions Made

See key-decisions in frontmatter. Notable:

- **Two-phase create vs nanoid path:** could have keyed the Blob path on `doctor.publicId` (nanoid, available at insert) instead of `doctor.id` (Postgres serial). Stuck with `id` because (a) Plan 46-00 already shipped the `pathPrefix` API keyed on a numeric id parameter, (b) article-style consistency with `maps/article-{id}.jpg`, (c) two-phase is exactly one extra UPDATE — negligible cost.
- **Hard delete vs soft delete:** Doctor has no `status` enum (DIR-01 schema), so "soft delete" would require adding one. Editorial volume is low and the trinity API symmetry argument is purely cosmetic — kept the name `softDeleteDoctor` for caller-side consistency with `softDelete` on articles, but the operation is `db.doctor.delete({ where: { id } })`. Inline JSDoc flags this so it's not a surprise.
- **Re-geocode iff address changed:** A naive impl would re-geocode on every `updateDoctor` call to keep lat/lon "fresh". That hits Nominatim's 1 req/s limit gratuitously (AGENTS.md note). One `findUniqueOrThrow` to compare prev.address is cheap and correct.
- **Positional mock-call assertions:** discovered via stack-overflow during initial test runs — Vitest's `toHaveBeenCalledWith(db, 'addr')` does deep equality on the args, which traverses the PrismaClient's circular references until it hits the stack limit. Switched two assertions to `mockedGeocode.mock.calls[0][1]` — equally precise, never blows.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] DoctorKategorie enum typo in test — 'APOTHEKE' is not a valid enum value**

- **Found during:** Task 2.1+2.2 GREEN (typecheck after writing the impl revealed the test file had `kategorie: 'APOTHEKE'` for one test case)
- **Issue:** The DoctorKategorie enum (Plan 46-01 schema) has three values: ALLGEMEINMEDIZIN, FACHARZT, ZAHNARZT. I wrote `'APOTHEKE'` in the test for `createDoctorDb` mapImageUrl-from-arg — that's a different domain (pharmacy categorization). tsc TS2322.
- **Fix:** Renamed to `'FACHARZT'` — same test semantic, valid enum value.
- **Files modified:** `src/lib/admin/doctors-actions.test.ts` (single token change)
- **Verification:** `npm run typecheck` clean for doctors files (pre-existing out-of-scope errors in map-actions.test.ts and mapgen.test.ts unchanged).
- **Committed in:** `0c22a7e` (Task 2.2 GREEN — fix landed alongside the impl in the same commit, before staging)

**2. [Rule 1 - Bug] Vitest `toHaveBeenCalledWith(prismaClient, ...)` blew the stack on PrismaClient deep-equality**

- **Found during:** Task 2.3 GREEN (initial test run after impl landed — 2 of 21 tests failed with `Maximum call stack size exceeded`)
- **Issue:** Two action-layer assertions used `expect(mockedGeocode).toHaveBeenCalledWith(db, 'address')`. `toHaveBeenCalledWith` does deep equality on every arg; PrismaClient is a Proxy with circular references (the test pglite client is the same shape), and the deep walker recursed until the stack overflowed.
- **Fix:** Replaced both with positional asserts: `expect(mockedGeocode).toHaveBeenCalledTimes(1)` + `expect(mockedGeocode.mock.calls[0][1]).toBe('address')`. Same precision (validates that the second arg is the expected string), zero deep-equal traversal of the circular first arg.
- **Files modified:** `src/lib/admin/doctors-actions.test.ts` (two test cases — `createDoctor geocode-success` and `updateDoctor address-changed`)
- **Verification:** 21/21 tests pass in 1.5s.
- **Committed in:** `0c22a7e` (Task 2.2 GREEN — same commit as the impl, since the fix is a test-mechanics adjustment)

### Out-of-Scope Observations (logged, not fixed)

**1. Pre-existing TypeScript errors in unrelated test files** — `src/lib/admin/map-actions.test.ts` is missing `afterEach` import; `src/lib/images/mapgen.test.ts` has an ArrayBuffer/SharedArrayBuffer type collision under Node 24. Both predate Plan 46-02 and are documented in `.planning/phases/43-ai-pipeline-quick-wins/deferred-items.md`. Scope-boundary applies. (Plan 46-01 SUMMARY noted the same.)

**2. Parallel-track Plan 46-04 commits interleaved with this plan's commits** — `41146c1` (feat 46-04 list page) and `9044980` (feat 46-04 detail page) landed between my RED commit (`e074200`) and my GREEN commit (`0c22a7e`). No file-level conflict — 46-04 touches `src/app/(public)/aerzte/*` which is disjoint from my `src/lib/admin/doctors-actions.{ts,test.ts}`. The interleaving is visible in `git diff --stat HEAD~2..HEAD` but `git diff --stat 0c22a7e^ 0c22a7e` confirms my GREEN commit touched only my two files.

---

**Total deviations:** 2 auto-fixed (2 bug fixes — both test correctness; zero impact on production code). 2 out-of-scope observations logged for the verifier.

**Impact on plan:** Zero on production behavior. Both auto-fixes are test-mechanics adjustments. Plan executed exactly as written for the impl side.

## Issues Encountered

- **Stack overflow on Vitest deep-equality of PrismaClient** — root cause described above (Deviation #2). Initial GREEN run showed 19/21 pass with two `Maximum call stack size exceeded` failures. Diagnosed via step-by-step `console.error` insertions in one failing test; the error surfaced between step 4 (post-doctor-state asserts) and step 5 (`toHaveBeenCalledWith`). Fix took ~3 lines per affected test; all 21 tests pass after fix.

- **AGENTS.md note about parallel agent** — the working tree still shows pre-existing modifications by other plans (`AGENTS.md` staged elsewhere, `src/app/(public)/aerzte/` directory from Plan 46-04). Per scope-boundary I did NOT touch these. My commits stage only `src/lib/admin/doctors-actions.{ts,test.ts}` explicitly.

## User Setup Required

None — purely internal TypeScript module. No env vars, no external service, no migration. The Nominatim HTTP path is exercised at runtime when `createDoctor` / `updateDoctor` are actually called from the admin UI (Plan 46-03), not at build time.

## Next Phase Readiness

- **Plan 46-03 (admin pages)** is unblocked — can import `createDoctor`, `updateDoctor`, `toggleVerified`, `softDeleteDoctor` (typed Server Actions) or any of the four `*Form` wrappers. Form wrappers redirect to `/admin/aerzte` or `/admin/aerzte/{id}/edit`; toggle uses `revalidatePath('/admin/aerzte')`.
- **Plan 46-04 (public pages)** does not depend on this plan — already in-flight on parallel track (commits `41146c1`, `9044980`), uses only the read DAL from Plan 46-01.
- **Test isolation:** 21/21 pass in isolation in 1.5s. Full-suite parallelism flakiness flagged in STATE.md may affect this file too — run in isolation if a full-suite run reports failures here.
- **Plan-03 must:** (a) show non-blocking warning block when `doctor.lat === null` after save (signals geocode failure); (b) wire the four `*Form` actions to its <form> elements. The trinity API is stable.

## Self-Check: PASSED

- [x] `src/lib/admin/doctors-actions.ts` exists, 341 lines, 15 exports verified by `grep -n "^export "`
- [x] `src/lib/admin/doctors-actions.test.ts` exists, 514 lines, 21 tests
- [x] Commit `e074200` resolvable in `git log --all`: `test(46-02): add failing tests for doctor Server-Action-Trinity`
- [x] Commit `0c22a7e` resolvable in `git log --all`: `feat(46-02): doctor Server-Action-Trinity with geocode + mapgen orchestration`
- [x] `npm test -- --run src/lib/admin/doctors-actions.test.ts` → 21/21 pass in 1.5s
- [x] `npm run typecheck` clean for doctors files (pre-existing out-of-scope errors unchanged)
- [x] 8 `requireAuth()` calls, none inside try blocks (verified by grep)
- [x] Only 2 try/catch blocks in the impl file (both inside `geocodeAndMap` — exactly as designed)
- [x] `git diff --stat 0c22a7e^ 0c22a7e` → only 2 files changed (no collateral edits)

---
*Phase: 46-aerzteverzeichnis*
*Completed: 2026-05-14*
