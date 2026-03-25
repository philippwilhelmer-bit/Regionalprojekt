---
phase: 12-config-driven-region-list-rss-feature-flag
verified: 2026-03-25T14:00:00Z
status: passed
score: 13/13 must-haves verified
gaps: []
human_verification:
  - test: "BezirkModal renders DB-loaded Bezirke at runtime"
    expected: "All 13 Steiermark Bezirke appear as chips in the modal; selecting and saving updates localStorage and reloads the page with filtered articles"
    why_human: "Requires a running app with a seeded database — chip rendering and localStorage interaction cannot be verified statically"
  - test: "Header displays correct Bezirk name after selection"
    expected: "After selecting 'Liezen' in BezirkModal and saving, the header button label changes from 'Steiermark' to 'Liezen'"
    why_human: "Requires runtime localStorage read + prop-driven lookup — cannot be verified via static analysis"
---

# Phase 12: Config-Driven Region List + RSS Feature Flag Verification Report

**Phase Goal:** The Bundesland config file is the single source of truth for the region list — BezirkModal and Header load Bezirke from the database rather than hardcoded arrays, and the `features.rss` flag is enforced by the RSS route handler
**Verified:** 2026-03-25T14:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | `BundeslandConfig` interface has a `regions: BezirkItem[]` field | VERIFIED | `src/types/bundesland.ts` line 33: `regions: BezirkItem[]` |
| 2  | `bundesland.config.ts` has a `regions` array with all 13 Steiermark Bezirke | VERIFIED | Lines 38-52: 13 entries with slugs and display names, enforced by `satisfies BundeslandConfig` |
| 3  | `seedBezirke` reads from `config.regions` instead of `steiermarkBezirke` import | VERIFIED | `prisma/seed.ts` line 37: `for (const region of config.regions)` — no `steiermarkBezirke` import present |
| 4  | Wrong bundesland param (`'tirol'`) to `seedBezirke` produces 0 rows | VERIFIED | `prisma/seed.ts` lines 32-35: early return guard `if (bundesland !== config.bundesland)` |
| 5  | `steiermarkBezirke` import removed from `seed.ts` | VERIFIED | `prisma/seed.ts` imports only `PrismaClient`, `config`, `steiermarkSources`, `SourceSeedEntry` — no bezirke import |
| 6  | `BezirkModal` renders regions from the `bezirke` prop — no hardcoded `BEZIRKE` array | VERIFIED | `BezirkModal.tsx` has no `BEZIRKE` const; line 8: `({ bezirke }: { bezirke: BezirkItem[] })`, line 119: `{bezirke.map(...)}` |
| 7  | `Header` resolves slug→name from the `bezirke` prop — no hardcoded `BEZIRK_NAMES` record | VERIFIED | `Header.tsx` has no `BEZIRK_NAMES` const; line 7: `({ bezirke }: { bezirke: BezirkItem[] })`, line 16: `Object.fromEntries(bezirke.map(...))` |
| 8  | `(public)/layout.tsx` calls `listBezirke()` once and passes the result to both Header and BezirkModal | VERIFIED | `layout.tsx` line 13: `const bezirke = await listBezirke()`, line 16: `<Header bezirke={bezirke} />`, line 21: `<BezirkModal bezirke={bezirke} />` |
| 9  | No extra API route introduced for Bezirke | VERIFIED | Layout is an async Server Component calling DAL directly — no new route files found |
| 10 | `GET /rss/liezen` returns 404 when `config.features.rss` is false | VERIFIED | `route.ts` lines 18-20: guard before any `await` — tests in `route.test.ts` mock `rss: false` and assert `status 404` |
| 11 | `GET /rss/steiermark` returns 404 when `config.features.rss` is false | VERIFIED | Same guard in `route.ts` applies before slug is parsed — `route.test.ts` line 44 covers this case |
| 12 | Silent 404 — no body when RSS flag is false | VERIFIED | `route.ts` line 19: `new Response(null, { status: 404 })` — `route.test.ts` line 52: `expect(text).toBe('')` |
| 13 | Feature flag check happens before any DB calls | VERIFIED | Guard at line 18, before `await params` at line 23 — no async work precedes it |

**Score:** 13/13 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types/bundesland.ts` | `BezirkItem` interface + `BundeslandConfig.regions` field | VERIFIED | Lines 18-21: `BezirkItem { slug, name }`; line 33: `regions: BezirkItem[]` in `BundeslandConfig` |
| `bundesland.config.ts` | `regions[]` array with 13 Steiermark slugs and names | VERIFIED | 13 entries, `satisfies BundeslandConfig` enforces shape at compile time |
| `prisma/seed.ts` | Config-driven `seedBezirke` using `config.regions` | VERIFIED | Iterates `config.regions`, guards by `config.bundesland`, no hardcoded data |
| `prisma/seed.test.ts` | Tests using `config.regions.length` | VERIFIED | Line 29: `expect(count).toBe(config.regions.length)`, config imported at line 13 |
| `src/app/(public)/layout.tsx` | Async Server Component calling `listBezirke()` | VERIFIED | `async function PublicLayout`, `await listBezirke()`, props passed to both components |
| `src/components/reader/Header.tsx` | Accepts `bezirke: BezirkItem[]` prop | VERIFIED | Prop-driven lookup via `Object.fromEntries(bezirke.map(...))` inside `useEffect` |
| `src/components/reader/BezirkModal.tsx` | Accepts `bezirke: BezirkItem[]` prop | VERIFIED | All `BEZIRKE` references replaced with the `bezirke` prop |
| `src/app/rss/[slug]/route.ts` | RSS route with `config.features.rss` guard | VERIFIED | Guard is first statement in `GET`, before `await params` |
| `src/app/rss/[slug]/route.test.ts` | Tests for RSS feature flag (3 tests) | VERIFIED | 3 tests covering Bezirk slug 404, steiermark 404, and empty body |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `bundesland.config.ts` | `src/types/bundesland.ts` | `satisfies BundeslandConfig` | WIRED | Line 53: `} satisfies BundeslandConfig` — compile-time enforcement |
| `prisma/seed.ts` | `bundesland.config.ts` | `config.regions` | WIRED | Line 14: `import config from '../bundesland.config'`; line 37: `for (const region of config.regions)` |
| `src/app/(public)/layout.tsx` | `src/components/reader/Header.tsx` | `bezirke` prop | WIRED | Line 16: `<Header bezirke={bezirke} />` |
| `src/app/(public)/layout.tsx` | `src/components/reader/BezirkModal.tsx` | `bezirke` prop | WIRED | Line 21: `<BezirkModal bezirke={bezirke} />` |
| `src/app/(public)/layout.tsx` | `src/lib/content/bezirke.ts` | `listBezirke()` import | WIRED | Line 1: `import { listBezirke } from "@/lib/content/bezirke"`; line 13: `await listBezirke()` |
| `src/app/rss/[slug]/route.ts` | `bundesland.config.ts` | `config.features.rss` | WIRED | Line 1: `import config from '@/../bundesland.config'`; line 18: `if (!config.features.rss)` |

---

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CONF-01 | 12-01, 12-02, 12-03, 12-04 | Platform is deployable for any Bundesland by changing a single config file (regions, branding, sources) | SATISFIED | `bundesland.config.ts` is the single source of truth for regions: type system enforces shape, seed reads from it, UI derives from it, RSS guard reads from it. Changing `regions[]` + `bundesland` in config propagates to all layers without code changes. REQUIREMENTS.md marks CONF-01 as complete at Phase 12. |

No orphaned requirements found for Phase 12 — all IDs declared in plans are accounted for.

---

## Anti-Patterns Found

No anti-patterns detected across phase-modified files:

- No `TODO`/`FIXME`/`PLACEHOLDER` comments in any modified file
- No stub implementations (`return null`, `return {}`, empty handlers)
- No hardcoded `BEZIRK_NAMES` or `BEZIRKE` arrays remaining in `Header.tsx` or `BezirkModal.tsx`
- No `steiermarkBezirke` import remaining in `seed.ts`
- Note: `BEZIRKE` identifier appears in `src/test/setup-db.ts` and `src/lib/reader/sitemap.test.ts` — these are test fixtures unrelated to this phase and not affected by it

---

## Human Verification Required

### 1. BezirkModal renders DB-loaded Bezirke at runtime

**Test:** Run the app with a seeded database. Navigate to the public site — the BezirkModal should auto-open on first visit. Verify all 13 Steiermark Bezirke appear as chips.
**Expected:** 13 Bezirk chips rendered: Graz (Stadt), Graz-Umgebung, Deutschlandsberg, Hartberg-Fuerstenfeld, Leibnitz, Leoben, Liezen, Murau, Murtal, Bruck-Murzzuschlag, Sudoststeiermark, Voitsberg, Weiz
**Why human:** Requires a running Next.js app with a seeded PGLite/Postgres database — chip rendering and count verification depend on DB state and client hydration

### 2. Header displays correct Bezirk label after selection

**Test:** Select one or more Bezirke in BezirkModal and save. Verify the header button label updates from "Steiermark" to the selected Bezirk name (or "Name +N" for multiple).
**Expected:** Header shows selected Bezirk name derived from the `bezirke` prop lookup — not from any hardcoded record
**Why human:** Requires runtime localStorage interaction and client-side state update — cannot be verified via static analysis

---

## Gaps Summary

No gaps. All phase must-haves are verified at all three levels (exists, substantive, wired).

The phase goal is fully achieved: `bundesland.config.ts` is the single source of truth for the region list. `BezirkModal` and `Header` receive Bezirke from the database via prop-passing from the async Server Component layout. The `features.rss` flag is enforced as the first statement in the RSS route handler before any async work.

CONF-01 is satisfied end-to-end: changing `regions[]` + `bundesland` in `bundesland.config.ts` propagates to the seed layer (via `config.regions`), the UI layer (via `listBezirke()` → DB → props), and the RSS feature flag layer (via `config.features.rss`).

---

_Verified: 2026-03-25T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
