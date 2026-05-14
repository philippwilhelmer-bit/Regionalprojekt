---
phase: 46-aerzteverzeichnis
plan: 00
subsystem: infra
tags: [tailwind-v4, design-tokens, vercel-blob, mapgen, material3]

# Dependency graph
requires:
  - phase: 40-basemap-article-images
    provides: mapgen.ts generateMapImage pipeline + uploadToBlob helper (now parameterized)
provides:
  - generateMapImage `options?: { pathPrefix?: string }` parameter — empty-string-safe via `|| 'article'` guard
  - Blob path namespace `maps/doctor-{id}.jpg` reserved for Phase 46 Plan 02
  - `--color-dir-*` (47 tokens), `--radius-dir-*` (6 tokens), `--spacing-dir-*` (8 tokens) under Tailwind v4 `@theme`
  - Tailwind utilities `bg-dir-primary`, `text-dir-on-surface`, `rounded-dir`, `p-dir-md`, `gap-dir-gutter`, etc.
affects: [46-aerzteverzeichnis-plan-02, 46-aerzteverzeichnis-plan-03, 46-aerzteverzeichnis-plan-04, 46-aerzteverzeichnis-plan-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Phase-local design tokens under namespaced prefix (`--*-dir-*`) — additive, master tokens untouched"
    - "Empty-string-safe optional parameter: `|| 'article'` guard (NOT JS default-param) for path-prefix-style options"

key-files:
  created: []
  modified:
    - src/lib/images/mapgen.ts
    - src/lib/images/mapgen.test.ts
    - src/app/globals.css

key-decisions:
  - "Use `||` (not `??`) for pathPrefix fallback so empty string ALSO falls back to 'article' — JS default-param semantics would let `''` through and produce the broken path `maps/-{id}.jpg`"
  - "Inline parameter `articleId` renamed to `id` in mapgen.ts (function is now entity-agnostic); warn-log line follows the rename — no caller breakage because callers use positional args"
  - "Full Material 3 token surface added under `--dir-*` namespace (47 colors), not a subset — DESIGN.md YAML is authoritative, future polish phases can use secondary-fixed/tertiary-fixed without re-editing globals.css"
  - "Append-only block inside existing `@theme { ... }` — pure additive (93 insertions, 0 deletions); master tokens (--color-primary etc.) untouched"

patterns-established:
  - "Phase-local Tailwind v4 token namespaces — when a sub-feature needs its own design surface, add `--{category}-{prefix}-{key}` tokens inside the shared `@theme` block rather than creating a separate :root scope or @layer"
  - "Empty-string-safe options: any optional string parameter that produces a path/URL/identifier MUST use `|| fallback` (not JS default-param) so `''` cannot slip through"

requirements-completed: [DIR-09, DIR-13]

# Metrics
duration: 7 min
completed: 2026-05-14
---

# Phase 46 Plan 0: Foundation Pre-Work Summary

**Parameterized mapgen Blob path prefix (`maps/${prefix}-${id}.jpg`, empty-string-safe via `||` guard) and added 47 + 6 + 8 = 61 phase-local Tailwind v4 directory tokens to globals.css — unblocks Plan 02-05 of Phase 46 without touching any pre-existing token or caller.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-14T12:41:32Z
- **Completed:** 2026-05-14T12:48:37Z
- **Tasks:** 2 (one TDD, one straight-add)
- **Files modified:** 3

## Accomplishments

- `generateMapImage` accepts optional 6th argument `options?: { pathPrefix?: string }` — defaults to `'article'`, empty string also falls back to `'article'` via explicit `|| 'article'` guard inside `uploadToBlob`
- Three new mapgen.test.ts cases (article-default, doctor-prefix, empty-string-fallback) — all 40 mapgen tests still pass; all 14 map-actions tests still pass without any source edit
- 47 `--color-dir-*` + 6 `--radius-dir-*` + 8 `--spacing-dir-*` tokens appended inside existing `@theme` block — Tailwind v4 will expose `bg-dir-primary`, `rounded-dir`, `p-dir-md`, etc. on next build
- Build green; zero diff against `src/lib/admin/map-actions.ts`; master tokens (`--color-primary`, `--color-accent`, `--color-background`, `--color-text`) untouched

## Task Commits

Each task atomic, RED-GREEN-REFACTOR for Task 0.1:

1. **Task 0.1 RED — failing tests for doctor pathPrefix** — `414bb3b` (`test(46-00): add failing test for mapgen doctor pathPrefix`)
2. **Task 0.1 GREEN — implementation of pathPrefix parameter** — `bc85cbb` (`refactor(46-00): parameterize mapgen Blob path prefix`)
3. **Task 0.2 — add phase-local --dir-* design tokens** — `e557c1e` (`feat(46-00): add phase-local --dir-* design tokens (full M3 set)`)

REFACTOR phase skipped — implementation was already minimal and clean; the `|| 'article'` guard idiom is the simplest correct form.

## Files Created/Modified

- `src/lib/images/mapgen.ts` — `uploadToBlob` gains optional `pathPrefix` param with `|| 'article'` fallback; `generateMapImage` gains `options?: { pathPrefix?: string }` 6th arg; inner `articleId` renamed `id`; warn-log line follows rename; JSDoc documents the empty-string-safety choice
- `src/lib/images/mapgen.test.ts` — 3 new cases under existing `describe('generateMapImage', ...)`: maps/article-7.jpg default, maps/doctor-7.jpg with pathPrefix='doctor', maps/article-99.jpg with pathPrefix='' (verifies `|| 'article'` guard)
- `src/app/globals.css` — append-only Phase 46 token block inside existing `@theme { ... }`; 93 new lines, 0 deletions

## Mapgen signature change (before / after)

**Before:**
```typescript
async function uploadToBlob(articleId: number, imageBuffer: Buffer): Promise<string> {
  const blob = await put(`maps/article-${articleId}.jpg`, imageBuffer, { ... })
}

export async function generateMapImage(
  lat: number, lon: number, headline: string, articleId: number, locationType?: string,
): Promise<MapImage | null>
```

**After:**
```typescript
async function uploadToBlob(
  id: number, imageBuffer: Buffer, pathPrefix?: string,
): Promise<string> {
  // `||` not `??` — empty string MUST also fall back to 'article'
  const prefix = pathPrefix || 'article'
  const blob = await put(`maps/${prefix}-${id}.jpg`, imageBuffer, { ... })
}

export async function generateMapImage(
  lat: number, lon: number, headline: string, id: number,
  locationType?: string, options?: { pathPrefix?: string },
): Promise<MapImage | null>
```

Callers (positional, 4-arg + optional locationType) bind to the same prefixes and remain byte-identical at the diff level.

## Token Counts Added

| Category | Count | Plan threshold | Notes |
| --- | --- | --- | --- |
| `--color-dir-*` | 47 | `≥48` (per plan verification) | Plan's own explicit code block lists 47; the `≥48` threshold is a planner arithmetic miscount (see Deviations below) |
| `--radius-dir-*` | 6 | `≥6` | Exact |
| `--spacing-dir-*` | 8 | `≥8` | Exact |
| **Total new lines** | **93** | — | Pure additions; zero deletions |

## Decisions Made

- **`||` over `??` for pathPrefix fallback** — `pathPrefix ?? 'article'` would only fire on `null`/`undefined`, leaving `''` to produce the broken Blob path `maps/-{id}.jpg`. The plan called this out explicitly; verified with a dedicated test case (`pathPrefix: ''` → falls back to `maps/article-99.jpg`).
- **Inner rename `articleId` → `id`** — the function is now entity-agnostic (article OR doctor OR future). Warn-log message follows. No caller breakage because all callers use positional args. The existing test `expect(warnArg).toContain('99')` still passes via the new format `id=99`.
- **Full M3 token surface, not a subset** — DESIGN.md YAML is authoritative per the planner. `secondary-fixed-*` and `tertiary-fixed-*` are NOT used by Plan 03/04/05's planned UI today, but landing them now means future polish phases can reference them without re-editing globals.css. Zero runtime cost in unused state.
- **Append-only inside existing `@theme`** — alternative was a separate `@theme :root` scope or `@layer`. Plan specified inline append for Tailwind v4 utility generation (only tokens inside the first `@theme` get the bg-/rounded-/p- utility treatment). Confirmed by build pass.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] PostCSS rejected the inline-comment string `secondary-*/tertiary-fixed-*`**

- **Found during:** Task 0.2 build verification (`npm run build`)
- **Issue:** The orientational comment header inside the new `@theme` block contained the literal sequence `secondary-*/tertiary-fixed-*`. The `*/` inside a CSS `/* ... */` comment terminates the comment early; PostCSS then saw `tertiary-fixed-* families that may not be referenced …` as a stray CSS token, throwing `Syntax error: Unknown word (104:77)`. Build failed.
- **Fix:** Rewrote the comment to prose: `including the secondary and tertiary-fixed families that may not be referenced by Plan 03/04/05 UI yet but are present for future polish.` No content lost; only the prose form changed.
- **Files modified:** `src/app/globals.css` (single-line edit inside the new comment block)
- **Verification:** `npm run build` completed cleanly with full route table output.
- **Committed in:** `e557c1e` (the fix and the rest of Task 0.2 land together — caught and fixed before commit)

### Out-of-Scope Observations (logged, not fixed)

**1. Plan verification threshold off-by-one (`grep -c '\-\-color-dir-' ≥48`)** — The plan's explicit token list contains 47 color tokens (matches DESIGN.md YAML lines 102–148 verbatim, including `background`, `on-background`, and `surface-variant`); the planner's arithmetic in the `<done>` block claimed "14 surface/text + 5 inverse/outline/tint + … = 48" but the surface+text family is actually 9 + 4 = 13 (not 14). My output (47) matches the authoritative YAML-listed content exactly. Not a deviation from the plan's authoritative source — flagging the threshold for the verifier so it doesn't get tripped by `≥48`.

**2. Concurrent agent activity on `main`** — A parallel agent was executing Plan 46-01 during this run (visible in `git log`: commits `758ba3b`, `b0cee4d`/`f6e12e6` — later cleaned/amended — and `7800b6a`/`eb5e914` — same). Several times my unstaged mapgen.ts / globals.css edits were briefly visible inside their commit stat output (likely because they ran `git add -A` and then amended after I rebased). Each time the parallel agent cleaned up, my files returned to "unstaged" and I committed them cleanly as `bc85cbb` (Task 0.1 GREEN) and `e557c1e` (Task 0.2). End state: each plan's commits attribute to the correct plan ID in the commit message. No code lost; no rebase needed.

---

**Total deviations:** 1 auto-fixed (1 bug — CSS comment terminator). 2 out-of-scope observations logged for the verifier (planner arithmetic; parallel-agent commit hygiene).

**Impact on plan:** Zero — the CSS-comment fix is a one-character delta inside a non-functional prose line. Behavior, token counts, and signatures all match the plan exactly.

## Issues Encountered

- **Concurrent agent on main rewrote commits underneath this run.** Twice I observed the parallel Plan-46-01 agent's commit-stat lines including my Plan-46-00 edits (because of `git add -A` patterns). Each time they amended/rebased away those non-46-01 changes within seconds, returning my files to unstaged so I could commit them with proper 46-00 attribution. Resolved by waiting for their cleanup cycle, then re-staging single files (`git add src/lib/images/mapgen.ts` / `git add src/app/globals.css`) and committing. No code lost. Final commit log shows clean separation: 46-00 commits and 46-01 commits are distinct.

## User Setup Required

None — both changes are internal (TypeScript signature + CSS tokens). No env vars, dashboard config, or external service touched.

## Next Phase Readiness

- **Ready for Plan 02 (Doctor admin CRUD + actions):** `generateMapImage(lat, lon, name, doctorId, locType, { pathPrefix: 'doctor' })` will land at `maps/doctor-{id}.jpg` without colliding with `maps/article-{id}.jpg`. Article callers (`map-actions.ts`, `generate-map/route.ts`) need zero changes.
- **Ready for Plan 03/04/05 (admin + public UI):** Tailwind utilities `bg-dir-primary`, `bg-dir-surface`, `text-dir-on-surface`, `rounded-dir`, `p-dir-md`, `gap-dir-gutter`, `border-dir-outline-variant`, etc. resolve via `@theme` and will be available the moment Plan 03+ writes class names referencing them.
- **No blockers.** Test suite green (54 tests across mapgen + map-actions). Build green. Master tokens preserved. Plan 46-01 (DAL + schema) is already in flight on a parallel track and does not conflict with anything this plan changed.

## Self-Check: PASSED

- All key files exist on disk (`src/lib/images/mapgen.ts`, `src/lib/images/mapgen.test.ts`, `src/app/globals.css`, this SUMMARY.md)
- All three commit hashes present in `git log --all`: `414bb3b` (RED test), `bc85cbb` (GREEN impl), `e557c1e` (Task 0.2)
- `npm test -- --run src/lib/images/mapgen.test.ts src/lib/admin/map-actions.test.ts` → 54/54 pass
- `npm run build` → green
- `git diff src/lib/admin/map-actions.ts HEAD~3..HEAD` → empty (zero collateral changes)

---
*Phase: 46-aerzteverzeichnis*
*Completed: 2026-05-14*
