---
phase: 46-aerzteverzeichnis
plan: 05
subsystem: ui
tags: [sitemap, seo, navigation, app-bar, footer, integration-smoke, phase-closure]

# Dependency graph
requires:
  - phase: 46-aerzteverzeichnis
    provides: Doctor DAL (listDoctors, DoctorWithBezirk) from Plan 01, public /aerzte routes from Plan 04, admin CRUD from Plan 03, Doctor table migration (deployed to Neon out-of-band during Plan 03 Wave 3 smoke)
provides:
  - "/aerzte index + per-doctor URLs exposed to crawlers via sitemap.xml — DIR-11"
  - "Discoverability: AppBar (desktop + mobile drawer) + Footer Rubriken column link to /aerzte — DIR-12"
  - "End-to-end Phase 46 smoke verified: admin-create → public-list filter → public-detail render → JSON-LD + slug-canonical + 404 paths → sitemap inclusion → design-token scoping → disclaimer copy → build green → test suite baseline"
  - "Phase 46 complete — Ärzteverzeichnis MVP ships"
affects: []  # Phase 46 ends here

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure helper extraction for sitemap entries — buildDoctorSitemapEntries(doctors, baseUrl) is a named export so tests exercise the mapping in isolation without defaultPrisma / Next runtime coupling. Reusable pattern: any future sitemap arm with > trivial mapping should extract the mapper as a named export and compose it inside the default sitemap()."
    - "Site chrome (LodenAppBar, Footer) uses master design tokens only — phase-local --dir-* tokens stay scoped to /aerzte and /admin/aerzte pages. New nav-link/footer-link insertions reuse adjacent links' Tailwind classes verbatim, no new tokens introduced for site chrome."
    - "BottomNav 2-tab lock honoured — discoverability for /aerzte happens via AppBar + Footer only; BottomNav untouched per CONTEXT.md."

key-files:
  created:
    - src/app/__tests__/sitemap-doctors.test.ts
  modified:
    - src/app/sitemap.ts
    - src/app/__tests__/sitemap-testmode.test.ts
    - src/components/reader/LodenAppBar.tsx
    - src/components/reader/Footer.tsx

key-decisions:
  - "Extract buildDoctorSitemapEntries as a named export rather than testing the integrated sitemap() default — testing a Next.js default sitemap() function requires mocking listArticles/listBezirke/listDoctors and defaultPrisma; the pure helper avoids the whole mock chain. The integrated path is covered by the manual smoke checkpoint (Task 5.3 Step 5)."
  - "Patch sitemap-testmode.test.ts to stub listDoctors → [] (auto-fix Rule 1 — Bug). The third Promise.all arm added in Task 5.1 broke the existing test, which mocked listArticles and listBezirke but NOT listDoctors; without the stub the non-test-mode call path in that test would hit a real DB."
  - "Use master design-system classes (hover:text-accent transition-colors) for the Ärzte nav-link, not --dir-* tokens — DESIGN.md scopes --dir-* to directory PAGES, not the chrome around them. Mirrors plan instructions verbatim."
  - "Mobile-drawer link closes the drawer on click (onClick={() => setMenuOpen(false)}) — matches the adjacent mobile-drawer link behaviour in LodenAppBar."
  - "Sitemap doctor entries use priority 0.7 + changeFrequency 'weekly' — directory listings update less frequently than news articles (0.8 daily) but more often than the impressum (0.3 monthly)."

patterns-established:
  - "Sitemap arm pattern: pure mapper as named export + composition inside default sitemap() — test the mapper, not the function. Future entity types (e.g. Author, Topic, Event) follow this shape."
  - "Site-chrome integration for phase-scoped routes: add link to LodenAppBar (both desktop nav AND mobile drawer) + Footer Rubriken column, in that order, reusing adjacent link styling. BottomNav stays locked at 2 tabs."

requirements-completed: [DIR-11, DIR-12]

# Metrics
duration: 7 min
completed: 2026-05-14
---

# Phase 46 Plan 5: Integration Polish + Phase 46 Smoke Summary

**Sitemap exposes /aerzte + every /aerzte/{publicId}/{slug} URL to crawlers via the new pure-helper `buildDoctorSitemapEntries` (5/5 tests green); LodenAppBar desktop nav + mobile drawer + Footer Rubriken column gain "Ärzte" / "Ärzteverzeichnis" links; Phase 46 end-to-end smoke approved across all 9 verifier steps — Ärzteverzeichnis MVP ships.**

## Performance

- **Duration:** 7 min (build + test work; the smoke checkpoint itself ran on a wider clock as a human-in-the-loop step)
- **Tasks:** 3 (Task 5.1 TDD = 2 commits RED + GREEN; Task 5.2 = 1 commit; Task 5.3 = no-code checkpoint)
- **Files created:** 1 (the test file)
- **Files modified:** 4 (sitemap.ts, existing sitemap-testmode.test.ts, LodenAppBar.tsx, Footer.tsx)

## Accomplishments

- **DIR-11 sitemap inclusion** — `/aerzte` index entry + every doctor URL emitted at priority 0.7 / weekly, lastModified passed through from `doctor.updatedAt`. Bounded `listDoctors({ limit: 5000 })` per RESEARCH.md Pitfall 8.
- **DIR-11 testability — pure helper extracted** — `buildDoctorSitemapEntries(doctors, baseUrl): MetadataRoute.Sitemap` is a named export from `src/app/sitemap.ts:20`. The test imports it directly and asserts shape across 5 cases (empty, single doctor with German diacritics, priority/frequency, lastModified pass-through, multi-doctor ordering). No defaultPrisma / Next runtime coupling in the test path.
- **DIR-12 nav-link in LodenAppBar — desktop + mobile drawer** — `<Link href="/aerzte">Ärzte</Link>` at `LodenAppBar.tsx:74` (desktop) and `LodenAppBar.tsx:99` (mobile drawer, with `onClick={() => setMenuOpen(false)}` to close drawer on tap). Both reuse adjacent links' Tailwind classes (`hover:text-accent transition-colors`).
- **DIR-12 footer link** — `<Link href="/aerzte">Ärzteverzeichnis</Link>` in `Footer.tsx:40` inside the Rubriken column, same `<li>` shape as adjacent links.
- **BottomNav.tsx untouched** — 2-tab lock honoured per CONTEXT.md; `git diff src/components/reader/BottomNav.tsx` is empty.
- **Phase 46 end-to-end smoke approved** — 9-step verifier walkthrough completed (admin create → public list filter → public detail render with JSON-LD + slug-canonical + 404 paths → discoverability via AppBar/Footer → sitemap.xml → design-token scoping → disclaimer copy → build green → test suite at baseline).

## Task Commits

Each task atomic — Task 5.1 follows TDD (RED + GREEN, no REFACTOR needed):

1. **Task 5.1 RED — failing tests for buildDoctorSitemapEntries** — `378ec0a` (`test(46-05): add failing tests for buildDoctorSitemapEntries helper`)
2. **Task 5.1 GREEN — helper + composition + testmode mock fix** — `c25baf7` (`feat(46-05): include /aerzte + doctor URLs in sitemap (DIR-11)`)
3. **Task 5.2 — AppBar + Footer Ärzte nav-link** — `7a7ff1b` (`feat(46-05): add Ärzte nav-link in AppBar + Footer (DIR-12)`)
4. **Task 5.3 — Phase 46 end-to-end smoke** — no code commit (verification-only checkpoint; verifier approved all 9 steps)

REFACTOR phase skipped for Task 5.1: the GREEN implementation is the plan's verbatim helper signature (three keys: url, lastModified, changeFrequency, priority) — no cleanup opportunity that wouldn't reduce readability.

**Plan metadata commit:** finalised below as `docs(46-05): complete integration polish + smoke`.

## Files Created/Modified

### Created
- `src/app/__tests__/sitemap-doctors.test.ts` (53 lines) — 5 vitest cases against the pure helper. No DB, no Prisma mocks, no vi.mock chains — fixture objects passed directly. Asserts: empty-array on empty input, URL pattern `{baseUrl}/aerzte/{publicId}/{slugify(name)}` with German diacritics (`Dr. Maria Müller` → `dr-maria-mueller`), priority 0.7 + weekly changeFrequency, lastModified pass-through from `doctor.updatedAt`, multi-doctor ordering preserved.

### Modified
- `src/app/sitemap.ts` (+29 lines net) — Added third Promise.all arm `listDoctors({ limit: 5000 })`; added `buildDoctorSitemapEntries` named export at line 20; added `/aerzte` index entry at line 74; spread `...doctorEntries` into the final return. Existing article + bezirk + impressum + homepage entries unchanged. `force-dynamic` preserved; test-mode short-circuit unchanged.
- `src/app/__tests__/sitemap-testmode.test.ts` (+4 lines) — Added `vi.mock` stub for `listDoctors` returning `[]`. **Auto-fix Rule 1 — Bug:** the new Promise.all arm in `sitemap.ts` would have broken the existing test path (which only mocked listArticles + listBezirke). Now all three DAL functions are stubbed at the module boundary.
- `src/components/reader/LodenAppBar.tsx` (+2 lines) — Desktop nav (`LodenAppBar.tsx:74`) and mobile drawer (`LodenAppBar.tsx:99`) each gained one `<Link href="/aerzte">Ärzte</Link>` line. Positioned between Bibliothek and bezirk selector. Uses master design-system classes only.
- `src/components/reader/Footer.tsx` (+1 line) — Rubriken column gained `<li><Link href="/aerzte">Ärzteverzeichnis</Link></li>` at `Footer.tsx:40`. Same `<li>` + `<Link>` shape as adjacent links.

## Nav-link Exact Line Numbers (post-edit)

```
src/components/reader/LodenAppBar.tsx:74:  <Link href="/aerzte" className="hover:text-accent transition-colors">Ärzte</Link>
src/components/reader/LodenAppBar.tsx:99:  <Link href="/aerzte" onClick={() => setMenuOpen(false)} className="transition-colors hover:text-accent">Ärzte</Link>
src/components/reader/Footer.tsx:40:       <li><Link href="/aerzte">Ärzteverzeichnis</Link></li>
```

grep -E "href=['\"]/aerzte['\"]" against both files returns **3 matches**, meeting the plan's `≥3` threshold.

## Sitemap Entry Count

At smoke time the dev DB held 1 doctor row (`Dr. Test E2E`, created by the verifier in Step 1). Sitemap output for that state:

| Section          | Count | Priority | changeFrequency |
| ---------------- | ----- | -------- | --------------- |
| Homepage         | 1     | 1.0      | hourly          |
| Impressum        | 1     | 0.3      | monthly         |
| **/aerzte index**| **1** | **0.7**  | **weekly**      |
| Bezirke          | 13    | 0.6      | daily           |
| Articles (PUB)   | varies| 0.8      | daily           |
| **Doctor URLs**  | **1** | **0.7**  | **weekly**      |

Bounded ceiling at `take: 5000` doctor rows (per RESEARCH.md Pitfall 8). With Steiermark's ~2000+ active doctors the ceiling has 2-3x headroom even at full data pflege.

## buildDoctorSitemapEntries — Named Export Confirmed

The plan blocker-fix mandated extraction. Verified via grep:

```
$ grep -n "export function buildDoctorSitemapEntries" src/app/sitemap.ts
20:export function buildDoctorSitemapEntries(
```

And the test imports the helper directly:

```typescript
// src/app/__tests__/sitemap-doctors.test.ts:2
import { buildDoctorSitemapEntries } from '../sitemap'
```

No `vi.mock` of `defaultPrisma`, `listDoctors`, or any DAL function in the doctors test path. The 5 cases exercise pure-function shape only.

## Phase 46 End-to-End Smoke Outcomes

All 9 verifier steps approved. Smoke ran on dev server `npm run dev` with a fresh `.next` cache.

| #  | Step                              | Outcome | Notes                                                                                 |
| -- | --------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 1  | Admin create flow                 | PASS    | Created `Dr. Test E2E` (FACHARZT / Orthopädie / Herrengasse 16 Graz). Geocode + mapgen ran on save; lat/lon ~47.07/15.44 visible in detail map. |
| 2  | Public list flow                  | PASS    | `/aerzte` rendered the new row; bezirk chip + kategorie chip filters updated URL and list correctly. |
| 3  | Public detail flow                | PASS    | Detail rendered with correct subtitle, address, map image, editorial note paragraphs, JSON-LD with `@type: 'Physician'` + `medicalSpecialty: 'Orthopädie'`, slug-canonical 301 redirect on wrong slug, 404 on wrong publicId. |
| 4  | Discoverability                   | PASS    | AppBar desktop link, mobile drawer link, Footer link all routed to `/aerzte`. BottomNav still 2 tabs. |
| 5  | Sitemap                           | PASS    | `/sitemap.xml` returned 200; `/aerzte` index entry present; new doctor URL present at priority 0.7 weekly; canonical host matched detail-page JSON-LD url field (single source of truth via BASE_URL constant). |
| 6  | Design tokens                     | PASS    | `/aerzte` page elements compute against `--color-dir-*` tokens; `/` homepage does NOT reference `--color-dir-*` (master tokens only — phase-local scope honoured). |
| 7  | Disclaimer copy                   | PASS    | "Angaben ohne Gewähr" present in detail-page footer with "Stand: {de-AT date}". |
| 8  | Build green                       | PASS    | `npm run build` succeeded; `/aerzte` and `/aerzte/[publicId]/[slug]` both shipped as `ƒ` dynamic routes. |
| 9  | Full test suite                   | PASS    | Doctor-specific tests green (sitemap-doctors 5/5, doctor-metadata 13/13, doctors-actions full suite). Only baseline failures from STATE.md remain (mapgen.test.ts ArrayBuffer post-Node24, map-actions.test.ts afterEach import, bezirke.test.ts CONF-02 drift, root-layout-adsense Plus_Jakarta_Sans) — all pre-existing and out-of-scope per `.planning/phases/43-ai-pipeline-quick-wins/deferred-items.md`. |

## Operational Notes (Out-of-band Events During Smoke)

These are documented for traceability — they were operator-driven recoveries, not code changes in Plan 46-05.

- **Dev server cache reset** — Mid-checkpoint, the dev server hit stale `.next` webpack chunks (`Cannot find module './5873.js'`). Orchestrator ran `pkill -f "next dev"; rm -rf .next; npm run dev` and the fresh build cleanly served all 6 smoke routes (`/admin/login` 200, `/aerzte` 200, `/sitemap.xml` 200, etc.). Cause: incremental dev-cache corruption from rapid file edits across Tasks 5.1 + 5.2 + parallel Wave 4 work; not a code defect.
- **Neon dev DB migration deploy** — Earlier in Wave 3 (during Plan 46-03 smoke), the Neon dev branch was missing the Doctor table. Orchestrator ran `npx prisma migrate deploy` to apply the migration that was committed via Plan 46-01. **Cross-reference:** documented in detail at `.planning/phases/46-aerzteverzeichnis/46-03-SUMMARY.md`. Plan 46-05 smoke exercises that same migration end-to-end (Step 1 admin-create writes the first row to the table, Step 5 sitemap includes that row's URL).

Reusable insight for future phases: cron/test/dev DB branches need explicit `prisma migrate deploy` after each PR with a new migration, since Vercel build doesn't auto-run it (already tracked in STATE.md Pending Todos as "Add `prisma migrate deploy` to Vercel build script").

## Decisions Made

See `key-decisions` in frontmatter for the full set. Highlights:

- **Helper extraction over integrated-function tests** — `buildDoctorSitemapEntries` is the named export the test consumes; the default `sitemap()` is tested via the manual smoke checkpoint (Step 5) instead of through a Vitest mock chain over three DAL functions + defaultPrisma. Cheaper to write, more honest about what's being asserted (pure mapper logic).
- **Test-mode stub patch is a Bug auto-fix (Rule 1)** — adding a third Promise.all arm to a function with an existing mocked test path silently breaks the test (would hit real DB on non-test-mode branches). Caught by running the existing test suite during GREEN; resolved by adding `vi.mock` for `listDoctors → []` in the same commit. Documented in the GREEN commit body so the fix is discoverable in `git blame`.
- **Master design tokens for nav-link, not --dir-***  — DESIGN.md scopes `--dir-*` to directory PAGES (`/aerzte`, `/admin/aerzte`). Site chrome (AppBar, Footer, BottomNav) keeps the master token surface. The nav-link inherits its style from adjacent links via copy-paste of their `className`.
- **`/aerzte` index entry at priority 0.7 weekly** — sits between bezirk pages (0.6 daily) and article pages (0.8 daily). Directory pages don't shift content as often as news but more often than the impressum (0.3 monthly).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] sitemap-testmode test broken by additive Promise.all arm**
- **Found during:** Task 5.1 GREEN (running the full sitemap test suite after wiring the third arm)
- **Issue:** `src/app/__tests__/sitemap-testmode.test.ts` mocked `listArticles` and `listBezirke` but not `listDoctors`. Once the GREEN implementation added a third `Promise.all` arm calling `listDoctors`, the non-test-mode path inside that test would hit the real Prisma client (no mock present), breaking the test.
- **Fix:** Added `vi.mock('@/lib/content/doctors', () => ({ listDoctors: vi.fn().mockResolvedValue([]) }))` at the top of `sitemap-testmode.test.ts` (4 lines added).
- **Files modified:** `src/app/__tests__/sitemap-testmode.test.ts`
- **Verification:** `npm test -- --run src/app/__tests__/sitemap-testmode.test.ts` passes after the stub addition.
- **Committed in:** `c25baf7` (Task 5.1 GREEN commit, bundled per AGENTS.md "Eine logische Änderung pro Commit" — the broken test is part of the same logical change as the new arm)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Single auto-fix needed for correctness — the same commit that added the new sitemap arm restored the existing test. No scope creep, no new behaviour beyond what the plan specified.

## Issues Encountered

None during planned task work. Two operational events during the smoke checkpoint (dev-server cache reset, prior migrate-deploy carry-over from Plan 46-03) are documented in **Operational Notes** above for traceability — they required no code change in this plan.

## User Setup Required

None — purely additive code change. No new environment variables, no external service configuration, no new dependencies (zero npm additions in this plan).

## Next Phase Readiness

**Phase 46 is complete.** All 13 DIR-* requirements complete in REQUIREMENTS.md after this plan closes (DIR-11 + DIR-12 flipping to Complete here; the other 11 already done in earlier plans).

**Ärzteverzeichnis MVP is shippable:**
- Schema + migration deployed to Neon dev branch (production migrate on next push if cron triggers it, or manual `npx prisma migrate deploy` per the existing playbook).
- DAL + Server-Action-Trinity + admin CRUD + public pages + sitemap + nav-links + JSON-LD + slug-canonical all in place.
- Phase-local design tokens scoped correctly (verified in Smoke Step 6).
- Disclaimer copy ("Angaben ohne Gewähr") in detail-page footer.
- Build green, doctor-specific test suite green.

**Carried forward as known limitations (documented in earlier summaries, not regressions):**
- `localStorage.bezirk_selection` auto-prefill on `/aerzte` filters is **deferred to a future polish task** — URL query params are the source of truth in MVP (decision recorded in 46-04-SUMMARY.md). A header comment in `DoctorPublicFilters.tsx` documents the deferral.
- BASE_URL in `src/app/(public)/artikel/[publicId]/[slug]/page.tsx` still uses `www.lodenundleute.at` (pre-existing drift, NOT addressed in Phase 46 to keep scope tight — sitemap.ts and aerzte/[publicId]/[slug] are unified). Tracked for a future unification task (probably a shared `lib/constants/base-url.ts`).

**Next step for the project:** Pick up parked v3.2 work — `/gsd:plan-phase 44` to replan 44-01/02/03 with legacy-is-live context, or `/gsd:plan-phase 45` to start the REVIEW Heuristic & Quality Loop. Or close out v3.3 with a milestone-completion step if no further directory expansion is planned this milestone.

## Self-Check

Verifying claimed artifacts and commits exist before handoff:

- `src/app/__tests__/sitemap-doctors.test.ts` — exists, 53 lines, 5 vitest cases importing `buildDoctorSitemapEntries` from `../sitemap`
- `src/app/sitemap.ts` — modified, exports `buildDoctorSitemapEntries` at line 20 (named function), composes helper at line 69, `/aerzte` index entry at line 74, third Promise.all arm at line 53
- `src/app/__tests__/sitemap-testmode.test.ts` — modified with `listDoctors` mock stub (4 lines added)
- `src/components/reader/LodenAppBar.tsx` — modified, `/aerzte` link at line 74 (desktop) and line 99 (mobile drawer)
- `src/components/reader/Footer.tsx` — modified, `/aerzte` link at line 40 (Rubriken column)
- `src/components/reader/BottomNav.tsx` — unchanged (2-tab lock verified)
- Commit `378ec0a` — `test(46-05): add failing tests for buildDoctorSitemapEntries helper`
- Commit `c25baf7` — `feat(46-05): include /aerzte + doctor URLs in sitemap (DIR-11)`
- Commit `7a7ff1b` — `feat(46-05): add Ärzte nav-link in AppBar + Footer (DIR-12)`
- `grep -n "export function buildDoctorSitemapEntries" src/app/sitemap.ts` returns exactly 1 hit (line 20)
- `grep -E "href=['\"]/aerzte['\"]" src/components/reader/{LodenAppBar,Footer}.tsx | wc -l` returns 3 (≥3 threshold met)
- Phase 46 smoke checkpoint: verifier replied "approved" after all 9 steps

## Self-Check: PASSED

All 5 file targets verified on disk (1 created + 4 modified); all 3 task commits resolvable in `git log`; both verification greps return their thresholds; BottomNav untouched per CONTEXT.md 2-tab lock; smoke approved.

---
*Phase: 46-aerzteverzeichnis*
*Completed: 2026-05-14*
*Phase 46 COMPLETE — Ärzteverzeichnis MVP shipped (13/13 DIR-* requirements satisfied)*
