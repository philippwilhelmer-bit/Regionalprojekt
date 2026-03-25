---
phase: 09-ad-config-wiring-auth-hardening
verified: 2026-03-24T21:00:00Z
status: passed
score: 14/14 must-haves verified
re_verification: false
---

# Phase 9: Ad Config Wiring + Auth Hardening Verification Report

**Phase Goal:** Ad placements are driven by the Bundesland config file as the requirement specifies, the `features.ads` flag actually gates ad rendering, and the Server Action auth gap is closed so that direct POST requests cannot bypass the session check.
**Verified:** 2026-03-24T21:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | AdUnit renders null when `config.features.ads` is false | VERIFIED | `if (!config.features.ads) return null` — AdUnit.tsx line 12; test in AdUnit.test.tsx line 41 |
| 2 | AdUnit renders null when matched zone has `enabled: false` | VERIFIED | `if (!zoneConfig \|\| !zoneConfig.enabled) return null` — AdUnit.tsx line 15; test at line 51 |
| 3 | AdUnit resolves slot by reading `config.adZones[zone].envVar` via `process.env` | VERIFIED | `const slot = process.env[zoneConfig.envVar]` — AdUnit.tsx line 18; bundesland.config.ts defines `envVar` per zone |
| 4 | All 3 call sites compile without changes — exported name `AdUnit` unchanged | VERIFIED | Named import `{ AdUnit }` confirmed in page.tsx (public), ArticleFeed.tsx, article detail page.tsx |
| 5 | Dev placeholder renders when pubId is undefined | VERIFIED | AdUnitClient.tsx line 33: `if (!pubId)` returns placeholder div; test at AdUnit.test.tsx line 67 |
| 6 | `requireAuth()` redirects to /admin/login when no session cookie present | VERIFIED | auth-node.ts lines 38–44; test at auth-node.test.ts line 16 |
| 7 | `requireAuth()` redirects to /admin/login when session cookie has invalid HMAC | VERIFIED | `verifySessionCookie` check in requireAuth(); test at auth-node.test.ts line 30 |
| 8 | All exported Server Action wrappers in articles-actions.ts call `requireAuth()` | VERIFIED | 9 wrappers (createManualArticle, updateArticle, togglePin, toggleFeature, softDelete, togglePinForm, toggleFeatureForm, softDeleteForm, createManualArticleForm) — all verified lines 220–267 |
| 9 | All exported Server Action wrappers in exceptions-actions.ts call `requireAuth()` | VERIFIED | 5 wrappers (approveArticle, rejectArticle, approveArticleForm, rejectArticleForm, listExceptionQueue) — lines 60–84 |
| 10 | All exported wrappers in ai-config-actions.ts, pipeline-config-actions.ts, sources-actions.ts call `requireAuth()` | VERIFIED | ai-config: 3 wrappers (lines 28, 47, 65); pipeline-config: 1 wrapper (line 19); sources: 4 wrappers (lines 175, 184, 198, 213) |
| 11 | loginAction and middleware remain exempt | VERIFIED | login-action.ts has no `requireAuth` call; middleware.ts has no `requireAuth` call |
| 12 | Impressum page renders publisherName, address, email from bundesland.config.ts | VERIFIED | impressum/page.tsx lines 31–36: `config.branding.impressum.publisherName`, `.address`, `.email`; no hardcoded strings found |
| 13 | Article detail page JSON-LD publisher.name reads from config | VERIFIED | artikel/.../page.tsx lines 43–44: both `author.name` and `publisher.name` use `config.branding.impressum.publisherName` |
| 14 | Remaining Impressum placeholders ([TELEFON] etc.) are left as static strings | VERIFIED | impressum/page.tsx lines 37–45: [TELEFON], [UNTERNEHMENSGEGENSTAND], [BLATTLINIE], [DATENSCHUTZ_EMAIL] all remain as static text per plan |

**Score:** 14/14 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/reader/AdUnit.tsx` | Server Component wrapper — config gating and slot resolution | VERIFIED | No `"use client"` directive; imports `bundesland.config`; exports `AdUnit`; 21 lines, substantive |
| `src/components/reader/AdUnitClient.tsx` | Client Component — useEffect AdSense push, ins tag, dev placeholder | VERIFIED | `"use client"` at line 1; `useEffect` present; dev placeholder and `<ins>` tag — 50 lines |
| `src/components/reader/AdUnit.test.tsx` | Unit tests for AD-02 gating behavior | VERIFIED | 75 lines; 4 test cases covering all gating behaviors; uses `vi.mock` for config |
| `src/lib/admin/auth-node.ts` | `requireAuth()` export alongside `signSessionCookie` and `verifySessionCookie` | VERIFIED | 44 lines; all 3 functions exported; `await cookies()` and `redirect()` correctly implemented |
| `src/lib/admin/auth-node.test.ts` | Unit tests for requireAuth() redirect behavior | VERIFIED | 61 lines; 3 test cases (no cookie, invalid HMAC, valid cookie) |
| `src/app/(public)/impressum/page.tsx` | Impressum page with 3 config-driven fields wired | VERIFIED | `config.branding.impressum.publisherName`, `.address`, `.email` all present |
| `src/app/(public)/artikel/[publicId]/[slug]/page.tsx` | Article detail page with JSON-LD publisher.name from config | VERIFIED | Both `author.name` and `publisher.name` use `config.branding.impressum.publisherName` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `AdUnit.tsx` | `bundesland.config.ts` | `import config from '@/../bundesland.config'` | WIRED | Line 2; `config.adZones.find` used at line 14 |
| `AdUnit.tsx` | `AdUnitClient.tsx` | JSX render of `<AdUnitClient` | WIRED | Line 20: `return <AdUnitClient pubId={pubId} slot={slot} zone={zone} />` |
| `articles-actions.ts` | `auth-node.ts` | `import { requireAuth }` + `await requireAuth()` first line | WIRED | Line 17 (import); 9 wrappers call it as first executable statement |
| `auth-node.ts` | `next/headers` | `await cookies()` | WIRED | Line 5 (import); line 39: `const cookieStore = await cookies()` |
| `impressum/page.tsx` | `bundesland.config.ts` | `import config from '@/../bundesland.config'` | WIRED | Line 3; `config.branding.impressum` used at lines 31, 32, 36 |
| `artikel/.../page.tsx` | `bundesland.config.ts` | `import config from '@/../bundesland.config'` | WIRED | Line 9; `config.branding.impressum.publisherName` at lines 43–44 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| AD-02 | Plans 01, 02, 03 | Ad placements configurable per deployment via Bundesland config file | SATISFIED | (1) AdUnit resolves slots from `bundesland.config.adZones[zone].envVar`; (2) `features.ads` flag gates all ad rendering; (3) auth hardening closes Server Action bypass; (4) impressum/JSON-LD wired to config branding |

**Note on requirement scope:** All three plans declare AD-02. Plans 02 (auth hardening) and 03 (Impressum wiring) are phase-level deliverables connected to the broader "configurable per deployment" requirement (changing bundesland.config.ts should be the only change needed per Bundesland). REQUIREMENTS.md maps AD-02 exclusively to Phase 9 — no orphaned requirements.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `articles-actions.ts` | 214 | `// NOTE: requireAuth() is a placeholder for the auth module (Phase 6).` | Info | Stale comment left from before Phase 9; does not affect runtime behavior. Comment is immediately followed by live `await requireAuth()` calls — misleading but harmless |

No blockers or warnings found. The stale comment in articles-actions.ts is informational only.

---

### Human Verification Required

#### 1. AdSense slot resolution at runtime

**Test:** Deploy with `ADSENSE_UNIT_HERO=ca-slot-123` set as a server-side env var (no `NEXT_PUBLIC_` prefix). Load the homepage.
**Expected:** AdSense `<ins>` tag rendered with `data-ad-slot="ca-slot-123"`; slot value is NOT exposed in client-side bundle.
**Why human:** Server-only env var behavior cannot be verified by grep — requires actual Next.js runtime to confirm the var is accessible server-side and not leaked to the client bundle.

#### 2. features.ads=false kills all ad rendering at runtime

**Test:** Set `features: { ads: false }` in bundesland.config.ts, run `next build && next start`, load any page with an AdUnit.
**Expected:** No `<ins>` tags appear in the rendered HTML; no AdSense script errors in the console.
**Why human:** Server Component rendering behavior can only be confirmed in a running Next.js build.

#### 3. requireAuth() redirect fires on direct POST

**Test:** Using curl or a REST client, POST directly to a Server Action endpoint (e.g. `/admin/articles`) without a valid session cookie.
**Expected:** Response is a redirect to `/admin/login` (HTTP 307/302), not a 200 with data.
**Why human:** Next.js Server Action POST redirect behavior over HTTP cannot be verified statically.

---

### Gaps Summary

No gaps. All 14 must-have truths are satisfied by the actual codebase. The phase goal is fully achieved:

1. **Ad config-driven:** `AdUnit.tsx` reads zones and the `features.ads` flag exclusively from `bundesland.config.ts`. The old hardcoded `NEXT_PUBLIC_ADSENSE_*_SLOT` env var map is gone. Deploying to a new Bundesland requires only `bundesland.config.ts` changes.

2. **features.ads gate:** The flag is checked as the first guard in `AdUnit()`. If false, nothing renders regardless of zone configuration.

3. **Auth hardening:** `requireAuth()` is implemented in `auth-node.ts` using async `cookies()` and `redirect()` (Next.js 15 pattern). It is wired as the first call in 22 exported Server Action wrappers across 5 admin action files. `loginAction` and `middleware.ts` are correctly exempt. No commented-out `// await requireAuth()` placeholders remain.

4. **Impressum + JSON-LD:** Publisher name, address, and email are config-driven in the Impressum page; `publisher.name` and `author.name` in the article JSON-LD schema are config-driven.

---

_Verified: 2026-03-24T21:00:00Z_
_Verifier: Claude (gsd-verifier)_
