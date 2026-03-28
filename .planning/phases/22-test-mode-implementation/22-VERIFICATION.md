---
phase: 22-test-mode-implementation
verified: 2026-03-28T08:32:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
---

# Phase 22: Test Mode Implementation — Verification Report

**Phase Goal:** Every page on the live Railway deployment clearly signals "test site" to visitors and is comprehensively blocked from search engine indexing and crawling
**Verified:** 2026-03-28T08:32:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A yellow TESTSEITE banner appears at the top of every reader page when NEXT_PUBLIC_IS_TEST_SITE=true | VERIFIED | `TestSiteBanner` rendered as first child in `src/app/(public)/layout.tsx` line 32; env gate confirmed in component |
| 2 | A yellow TESTSEITE banner appears at the top of every admin page when NEXT_PUBLIC_IS_TEST_SITE=true | VERIFIED | `TestSiteBanner` rendered as first child (before sidebar div) in `src/app/(admin)/layout.tsx` line 23 |
| 3 | No banner appears when NEXT_PUBLIC_IS_TEST_SITE is unset or not 'true' | VERIFIED | Component returns `null` when env var !== 'true'; 2 of 3 unit tests cover this (undefined and 'false') |
| 4 | Every reader page includes noindex/nofollow meta when NEXT_PUBLIC_IS_TEST_SITE=true | VERIFIED | `generateMetadata()` exported from `src/app/(public)/layout.tsx` returns `{ robots: { index: false, follow: false } }` when env=true; returns `{}` otherwise |
| 5 | GET /robots.txt returns Disallow: / when NEXT_PUBLIC_IS_TEST_SITE=true | VERIFIED | `src/app/robots.ts` default export returns `{ rules: { userAgent: '*', disallow: '/' } }` in test mode; no `public/robots.txt` shadow file exists |
| 6 | GET /sitemap.xml returns an empty urlset when NEXT_PUBLIC_IS_TEST_SITE=true | VERIFIED | `src/app/sitemap.ts` early-returns `[]` at line 24-26 before any DB queries |
| 7 | The AdSense script tag is not present in the HTML when NEXT_PUBLIC_IS_TEST_SITE=true | VERIFIED | `src/app/layout.tsx` line 40: `const isTestSite = ...`; line 51: `{!isTestSite && (<Script .../>)}` |
| 8 | All four SEO/AdSense behaviors are inactive when NEXT_PUBLIC_IS_TEST_SITE is unset | VERIFIED | Each file guards with `=== 'true'` (strict equality); unset env var evaluates to false in all cases; covered by "unset" tests in all 4 test files |

**Score:** 8/8 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/TestSiteBanner.tsx` | Reusable banner component gated by env var | VERIFIED | 17 lines; env check + JSX with role="banner", yellow Tailwind classes, "TESTSEITE" text |
| `src/components/TestSiteBanner.test.tsx` | Unit tests for banner render/hide behavior | VERIFIED | 3 tests: render-true, hide-undefined, hide-false |
| `src/app/(public)/layout.tsx` | Reader layout with TestSiteBanner + generateMetadata | VERIFIED | Imports TestSiteBanner, renders as first child; exports generateMetadata() |
| `src/app/(admin)/layout.tsx` | Admin layout with TestSiteBanner injected | VERIFIED | Imports TestSiteBanner, renders above sidebar flex container via fragment |
| `src/app/robots.ts` | Dynamic robots.txt with conditional Disallow | VERIFIED | force-dynamic export; default export with isTestSite branch |
| `src/app/sitemap.ts` | Sitemap with test-mode suppression | VERIFIED | Early return `[]` added at top of function body |
| `src/app/layout.tsx` | Root layout with conditional AdSense Script | VERIFIED | isTestSite const + `{!isTestSite && <Script/>}` conditional |
| `src/app/__tests__/robots.test.ts` | Unit tests for robots.ts | VERIFIED | 2 tests: disallow-in-test-mode, allow-in-production |
| `src/app/__tests__/sitemap-testmode.test.ts` | Unit tests for sitemap suppression | VERIFIED | 2 tests: empty-in-test-mode, non-empty-in-production (DB mocked) |
| `src/app/__tests__/public-layout-metadata.test.ts` | Unit tests for noindex metadata | VERIFIED | 2 tests: noindex-when-true, empty-when-unset |
| `src/app/__tests__/root-layout-adsense.test.ts` | Unit tests for AdSense gating | VERIFIED | 2 tests: no-script-in-test-mode, script-in-production |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/(public)/layout.tsx` | `src/components/TestSiteBanner.tsx` | import + render as first child | WIRED | Line 12: `import { TestSiteBanner }`, line 32: `<TestSiteBanner />` before `<RegionalAppBar>` |
| `src/app/(admin)/layout.tsx` | `src/components/TestSiteBanner.tsx` | import + render at top of layout | WIRED | Line 6: `import { TestSiteBanner }`, line 23: `<TestSiteBanner />` before sidebar div |
| `src/app/(public)/layout.tsx` | `generateMetadata` | Named export merges robots metadata into all child pages | WIRED | `export function generateMetadata(): Metadata` at line 14; `robots: { index: false, follow: false }` confirmed |
| `src/app/robots.ts` | `/robots.txt` | Next.js App Router auto-serves at /robots.txt | WIRED | `export const dynamic = 'force-dynamic'` + default export present; no `public/robots.txt` shadow exists |
| `src/app/sitemap.ts` | `/sitemap.xml` | Early return of empty array | WIRED | `return []` at line 25 inside `if (process.env.NEXT_PUBLIC_IS_TEST_SITE === 'true')` |
| `src/app/layout.tsx` | AdSense Script tag | Conditional render with isTestSite check | WIRED | `const isTestSite = ...` line 40; `{!isTestSite && (<Script .../>)}` lines 51-57 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| TEST-01 | 22-01-PLAN.md | Visible TESTSEITE banner on every reader page | SATISFIED | `TestSiteBanner` in public layout, 3 passing unit tests |
| TEST-02 | 22-01-PLAN.md | Visible TESTSEITE banner on every admin page | SATISFIED | `TestSiteBanner` in admin layout, 3 passing unit tests |
| SEO-01 | 22-02-PLAN.md | noindex/nofollow meta on all pages in test mode | SATISFIED | `generateMetadata()` in public layout exports noindex/nofollow; 2 passing unit tests |
| SEO-02 | 22-02-PLAN.md | robots.txt disallows all crawlers in test mode | SATISFIED | `src/app/robots.ts` with Disallow: /; no shadow file; 2 passing unit tests |
| SEO-03 | 22-02-PLAN.md | Sitemap returns empty/minimal in test mode | SATISFIED | Early return `[]` in sitemap.ts; 2 passing unit tests |
| SAFETY-01 | 22-02-PLAN.md | AdSense script does not load in test mode | SATISFIED | Conditional `{!isTestSite && <Script/>}` in root layout; 2 passing unit tests |

**Orphaned requirements check:** DEPLOY-01, DEPLOY-02, DEPLOY-03 are mapped to Phase 21 in REQUIREMENTS.md — none are assigned to Phase 22. No orphaned requirements for this phase.

---

### Anti-Patterns Found

No anti-patterns detected in phase 22 files.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None | — | — |

---

### Test Execution Results

All 11 unit tests executed and confirmed passing:

- `src/components/TestSiteBanner.test.tsx`: 3/3 passed
- `src/app/__tests__/robots.test.ts`: 2/2 passed
- `src/app/__tests__/sitemap-testmode.test.ts`: 2/2 passed
- `src/app/__tests__/public-layout-metadata.test.ts`: 2/2 passed
- `src/app/__tests__/root-layout-adsense.test.ts`: 2/2 passed

**Total: 11/11 tests passing**

All 4 documented commits verified in git log:
- `3561bf9` feat(22-01): implement TestSiteBanner component with tests
- `f7da013` feat(22-01): wire TestSiteBanner into public and admin layouts
- `6e13b6f` feat(22-02): robots.ts and sitemap test-mode suppression
- `1e00010` feat(22-02): noindex metadata and AdSense gating

---

### Human Verification Required

The following items cannot be verified programmatically and require manual testing on the Railway deployment:

#### 1. Banner Visual Appearance

**Test:** Deploy with NEXT_PUBLIC_IS_TEST_SITE=true. Open any reader page (homepage, article detail) and any admin page.
**Expected:** Full-width yellow banner at the very top of the page reading "TESTSEITE — Diese Seite ist nicht öffentlich zugänglich"
**Why human:** Visual rendering depends on Tailwind CSS compilation and browser rendering; z-index stacking must be confirmed visually.

#### 2. Meta Robots in Live Page Source

**Test:** On the Railway URL with NEXT_PUBLIC_IS_TEST_SITE=true, view page source of any reader page.
**Expected:** `<meta name="robots" content="noindex, nofollow">` (or equivalent Next.js-rendered form) present in `<head>`
**Why human:** Next.js merges generateMetadata at build/request time; actual rendered HTML must be confirmed.

#### 3. robots.txt Live Response

**Test:** GET `https://<railway-url>/robots.txt` with NEXT_PUBLIC_IS_TEST_SITE=true.
**Expected:** Response body contains `Disallow: /` for `User-agent: *`
**Why human:** Confirms Next.js App Router serving robots.ts correctly at the /robots.txt path in production build.

#### 4. sitemap.xml Live Response

**Test:** GET `https://<railway-url>/sitemap.xml` with NEXT_PUBLIC_IS_TEST_SITE=true.
**Expected:** Empty or minimal urlset with no article URLs
**Why human:** Confirms early-return in sitemap.ts is active in production build.

---

### Summary

Phase 22 goal is fully achieved. All 6 required artifacts (TestSiteBanner component, robots.ts, sitemap suppression, generateMetadata, AdSense gating, both layout wirings) exist, are substantive implementations (not stubs), and are correctly wired. All 11 unit tests pass. All 6 requirements (TEST-01, TEST-02, SEO-01, SEO-02, SEO-03, SAFETY-01) are satisfied with implementation evidence. No orphaned requirements. No anti-patterns.

The single env-var gate (`NEXT_PUBLIC_IS_TEST_SITE === 'true'`) is applied consistently across all 4 suppression points. Production safety is confirmed: all behaviors are inactive when the var is unset.

---

_Verified: 2026-03-28T08:32:00Z_
_Verifier: Claude (gsd-verifier)_
