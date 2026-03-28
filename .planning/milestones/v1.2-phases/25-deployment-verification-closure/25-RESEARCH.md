# Phase 25: Deployment Verification & Requirements Closure - Research

**Researched:** 2026-03-28
**Domain:** Deployment verification, requirements closure, AdUnit test-mode gating
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEPLOY-01 | App deploys to Railway (now Vercel) with a shareable public URL | Phase 21-02 and Phase 23 summaries confirm live URL https://regionalprojekt.vercel.app is operational with 200 response |
| DEPLOY-02 | PostgreSQL database provisioned with Prisma migrations applied | Phase 21-02 confirms Neon PostgreSQL active; Phase 23 confirms DATABASE_URL points to neon.tech with 13 Bezirke seeded |
| DEPLOY-03 | All test behaviors gated by single NEXT_PUBLIC_IS_TEST_SITE environment variable | Phase 22 verification confirms all 4 suppression points gate on single env var; Phase 23 confirms env var is active on Vercel |
| SAFETY-01 | AdSense script tags do not load when test mode is active | Phase 22 VERIFICATION.md confirms AdSense Script is conditionally rendered via `{!isTestSite && <Script/>}` in root layout. Gap: AdUnitClient.tsx still renders a visual "Ad [zone]" placeholder when pubId is undefined, even in test mode |
</phase_requirements>

---

## Summary

Phase 25 is a closure phase — its primary work is documentation, requirements marking, and one targeted code fix. The heavy lifting (infrastructure deployment, test-mode implementation, verification) was completed in Phases 21-23. Three tasks remain:

**Task 1 — VERIFICATION.md for Phases 21 and 23.** Neither phase has a VERIFICATION.md file. Phase 22 has one (22-VERIFICATION.md) that was created by the gsd-verifier workflow. Phases 21 and 23 completed before this workflow was applied. Both need post-hoc VERIFICATION.md files created that document the evidence already gathered in their SUMMARY.md files.

**Task 2 — DEPLOY-01/02/03 marked Complete in REQUIREMENTS.md.** Currently all three are marked `[ ]` (Pending). The Phase 23 SUMMARY.md explicitly states all three are satisfied. This is a documentation update — update the checkboxes and the Traceability table.

**Task 3 — AdUnit.tsx cosmetic gap.** SAFETY-01 is marked Complete (AdSense `<script>` tag is gated). The gap is that `AdUnitClient.tsx` renders a grey "Ad [zone]" placeholder div when `pubId` is undefined. In test mode, pubId IS undefined (no real AdSense ID configured), so the placeholder renders. The requirement says no cosmetic placeholders in test mode. Fix: add a test-mode guard in AdUnit.tsx (the Server Component wrapper) that returns `null` when `NEXT_PUBLIC_IS_TEST_SITE === 'true'`, before rendering AdUnitClient.

**Primary recommendation:** Write both VERIFICATION.md files using Phase 23 SUMMARY evidence, patch AdUnit.tsx with a single null-return guard, update REQUIREMENTS.md checkboxes, and confirm all 9/9 v1.2 requirements are satisfied.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | v2 | Unit test framework | Already in use; fast Node-native test runner |
| Next.js | 15 | App Router server components | Established project stack |

### Test Patterns in This Project

| Pattern | Location | What It Does |
|---------|----------|-------------|
| `vi.mock('@/../bundesland.config', ...)` | AdUnit.test.tsx | Stubs config for isolated unit tests |
| `vi.mock('./AdUnitClient', ...)` | AdUnit.test.tsx | Returns props object so tests can inspect without jsdom |
| `process.env.NEXT_PUBLIC_IS_TEST_SITE` | All test-mode tests | Set/deleted in beforeEach/afterEach |
| Named export function components | TestSiteBanner.tsx, layouts | Required by Vitest JSX resolution |
| `import React from 'react'` | Some test files | Required in some components for Vitest JSX even with automatic transform |

---

## Architecture Patterns

### AdUnit.tsx Fix — Where to Guard

The guard belongs in `AdUnit.tsx` (the Server Component wrapper), NOT in `AdUnitClient.tsx` (the Client Component). Reasons:
- AdUnit.tsx already has access to `process.env` (Server Component)
- AdUnitClient.tsx is a Client Component — it should not read `process.env.NEXT_PUBLIC_*` directly from process.env at render time in server context
- The existing pattern in this codebase is: Server Components read env vars and pass decisions down as props or return null early

### Pattern: Early null return in Server Component

```typescript
// Source: established pattern in src/app/(public)/layout.tsx (generateMetadata), src/app/robots.ts
export function AdUnit({ zone }: AdUnitProps) {
  // Test mode: return null — no ads, no placeholders
  if (process.env.NEXT_PUBLIC_IS_TEST_SITE === 'true') return null

  if (!config.features.ads) return null
  // ... rest of existing logic
}
```

The guard must be the FIRST check, before the `config.features.ads` check, so it is unconditional on config state.

### VERIFICATION.md Document Pattern

Phase 22 VERIFICATION.md establishes the template to follow:
- Frontmatter: `phase`, `verified` timestamp, `status`, `score`, `re_verification`
- Sections: Goal Achievement (Observable Truths table), Required Artifacts, Key Link Verification, Requirements Coverage, Anti-Patterns Found, Test Execution Results, Human Verification Required, Summary
- Evidence comes from SUMMARY.md files and code inspection

For Phase 21 VERIFICATION.md: primary evidence source is 21-02-SUMMARY.md (the actual Vercel+Neon deployment). Phase 21 Plan 01 was the original Railway plan (superseded); Phase 21 Plan 02 is the actual deployment.

For Phase 23 VERIFICATION.md: primary evidence source is 23-01-SUMMARY.md (all 5 checks passed).

### REQUIREMENTS.md Update Pattern

The file uses `- [x]` for complete, `- [ ]` for pending. Update:
- Line 21: `DEPLOY-01` checkbox
- Line 22: `DEPLOY-02` checkbox
- Line 23: `DEPLOY-03` checkbox
- Traceability table: change Phase 25 row statuses from `Pending` to `Complete`
- Coverage section: update `Satisfied: 6` to `Satisfied: 9`, `Pending: 3` to `Pending: 0`

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Test-mode guard in AdUnit | Custom feature flag system | Single `process.env.NEXT_PUBLIC_IS_TEST_SITE === 'true'` check | Consistent with all other test-mode gates in this codebase |
| VERIFICATION.md format | Custom verification format | Follow Phase 22 VERIFICATION.md structure exactly | Planner/verifier tooling expects this format |

**Key insight:** Every other test-mode suppression in this codebase uses a single `process.env.NEXT_PUBLIC_IS_TEST_SITE === 'true'` check. The AdUnit fix must use the same pattern.

---

## Common Pitfalls

### Pitfall 1: AdUnit Guard in Wrong File

**What goes wrong:** Adding the test-mode guard to `AdUnitClient.tsx` instead of `AdUnit.tsx`.
**Why it happens:** AdUnitClient renders the placeholder, so it seems like the right place.
**How to avoid:** AdUnitClient is `"use client"` — NEXT_PUBLIC_* env vars ARE available in Client Components, but the established pattern in this codebase places env var checks in Server Components. Putting it in AdUnit.tsx (Server Component) is consistent and keeps Client Components focused on rendering.
**Warning signs:** If the test for AdUnit has to import/test AdUnitClient behavior, the guard is in the wrong layer.

### Pitfall 2: Missing Test for the New Guard

**What goes wrong:** Patching AdUnit.tsx without adding a test case for the test-mode null return.
**Why it happens:** Existing tests don't cover NEXT_PUBLIC_IS_TEST_SITE.
**How to avoid:** Add a new `it('returns null when NEXT_PUBLIC_IS_TEST_SITE is true')` test to AdUnit.test.tsx, following the existing pattern (set process.env before calling AdUnit(), delete in afterEach).
**Warning signs:** The test file has no test covering `NEXT_PUBLIC_IS_TEST_SITE`.

### Pitfall 3: SAFETY-01 Already Marked Complete

**What goes wrong:** Changing SAFETY-01 status or treating it as incomplete.
**Why it happens:** The phase description mentions a "SAFETY-01 gap" but REQUIREMENTS.md shows `[x] SAFETY-01: Complete`.
**How to avoid:** SAFETY-01 is already satisfied (AdSense `<script>` gating). The AdUnit cosmetic fix is an ADDITIONAL improvement for test-mode quality — it does NOT change SAFETY-01 status. The requirement says "AdSense script tags do not load" — that's already true. The cosmetic placeholder is a UX improvement beyond the requirement.
**Warning signs:** Reopening or re-closing SAFETY-01 in REQUIREMENTS.md.

### Pitfall 4: Phase 21 vs Phase 23 VERIFICATION.md Scope

**What goes wrong:** Writing Phase 21 VERIFICATION.md based on the Railway plan (21-01) instead of the actual Vercel deployment (21-02).
**Why it happens:** Phase 21 Plan 01 was Railway; Plan 02 was the actual Vercel deployment (deviation).
**How to avoid:** Phase 21 VERIFICATION.md must document what actually shipped (Vercel+Neon from 21-02-SUMMARY.md), not the original Railway plan. Note the Railway → Vercel deviation prominently.

### Pitfall 5: REQUIREMENTS.md Traceability Table Shows Phase 25

**What goes wrong:** After marking DEPLOY-01/02/03 complete, forgetting to update the Traceability table and Coverage count.
**Why it happens:** The table and coverage section are separate from the checkbox lines.
**How to avoid:** Three edits needed: checkboxes (lines ~21-23), Traceability table rows, Coverage section counts.

---

## Code Examples

### AdUnit.tsx — Patched Version

```typescript
// Source: src/components/reader/AdUnit.tsx (patch)
import React from 'react'
import config from '@/../bundesland.config'
import { AdUnitClient } from './AdUnitClient'

type AdZone = 'hero' | 'between-articles' | 'article-detail'

interface AdUnitProps {
  zone: AdZone
}

export function AdUnit({ zone }: AdUnitProps) {
  // Test mode: no ads or placeholders — suppress entirely
  if (process.env.NEXT_PUBLIC_IS_TEST_SITE === 'true') return null

  if (!config.features.ads) return null

  const zoneConfig = config.adZones.find(z => z.id === zone)
  if (!zoneConfig || !zoneConfig.enabled) return null

  const pubId = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID
  const slot = process.env[zoneConfig.envVar]

  return <AdUnitClient pubId={pubId} slot={slot} zone={zone} />
}
```

### AdUnit.test.tsx — New Test Case to Add

```typescript
// Add to existing describe block in src/components/reader/AdUnit.test.tsx
it('returns null when NEXT_PUBLIC_IS_TEST_SITE is true', () => {
  process.env.NEXT_PUBLIC_IS_TEST_SITE = 'true'
  const result = AdUnit({ zone: 'hero' })
  expect(result).toBeNull()
})
```

The `afterEach` already restores `process.env`, so no cleanup needed in the new test.

### VERIFICATION.md Frontmatter Template

```yaml
---
phase: 21  # or 23
slug: railway-infrastructure  # or deployment-verification
verified: 2026-03-28T{time}Z
status: passed
score: {N}/{N} must-haves verified
re_verification: false
---
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Railway deployment | Vercel + Neon | Phase 21-02 (deviation) | REQUIREMENTS.md still says "Railway" in DEPLOY-01/02 — text says "Railway" but Vercel is what shipped; DEPLOY wording is aspirational and satisfied by Vercel equivalent |

**Deployment platform note:** REQUIREMENTS.md lines 21-22 say "deploys to Railway" and "provisioned on Railway." The actual deployment is Vercel+Neon per the Phase 21 deviation. The VERIFICATION.md files should document what actually shipped, and the REQUIREMENTS.md checkboxes should be marked complete based on the Vercel+Neon deployment satisfying the intent. No requirement text changes needed — the checkboxes suffice.

---

## Open Questions

1. **REQUIREMENTS.md Railway wording vs Vercel reality**
   - What we know: Requirements say "Railway" but deployment is Vercel+Neon
   - What's unclear: Whether to update the requirement text or just mark checkboxes complete
   - Recommendation: Mark checkboxes complete without changing requirement text. The intent (shareable public URL + provisioned database) is satisfied. Updating requirement text would change the audit trail. Add a note in VERIFICATION.md acknowledging the platform deviation.

2. **Phase 21 VERIFICATION.md scope**
   - What we know: Phase 21 had two plans — Plan 01 (Railway config, superseded) and Plan 02 (Vercel+Neon actual deployment)
   - What's unclear: Should Phase 21 VERIFICATION.md cover both plans or only Plan 02?
   - Recommendation: Cover the actual deployment state (Plan 02) as the definitive outcome. Reference Plan 01 only to note it was superseded by the Railway → Vercel deviation.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest v2 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEPLOY-01 | App serves homepage and admin redirect | manual-smoke | `curl -s -o /dev/null -w "%{http_code}" https://regionalprojekt.vercel.app` | N/A |
| DEPLOY-02 | Neon DB active with current schema | manual-verify | Vercel dashboard: DATABASE_URL contains neon.tech | N/A |
| DEPLOY-03 | Single env var gates all test behaviors | unit | `npm test` (robots, sitemap, metadata, adsense tests) | ✅ |
| SAFETY-01 (AdUnit fix) | AdUnit returns null in test mode | unit | `npm test -- src/components/reader/AdUnit.test.tsx` | ✅ Wave 0: add 1 test case |

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] Add test case to `src/components/reader/AdUnit.test.tsx` — covers SAFETY-01 test-mode null return

*(All other test infrastructure exists. This single new test case is the only gap.)*

---

## Sources

### Primary (HIGH confidence)

- `.planning/phases/23-deployment-verification/23-01-SUMMARY.md` — confirms all 5 deployment checks passed, DEPLOY-01/02/03 satisfied
- `.planning/phases/21-railway-infrastructure/21-02-SUMMARY.md` — actual Vercel+Neon deployment record
- `.planning/phases/22-test-mode-implementation/22-VERIFICATION.md` — VERIFICATION.md format to replicate for phases 21 and 23
- `src/components/reader/AdUnit.tsx` — current implementation missing NEXT_PUBLIC_IS_TEST_SITE guard
- `src/components/reader/AdUnitClient.tsx` — confirms placeholder renders when pubId is undefined
- `src/components/reader/AdUnit.test.tsx` — confirms no test for test-mode guard (gap to fill)
- `.planning/REQUIREMENTS.md` — current status: DEPLOY-01/02/03 still marked [ ] pending

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` — phase 23 noted complete, accumulated decisions confirm single env-var pattern
- `.planning/phases/22-test-mode-implementation/22-02-SUMMARY.md` — pattern for NEXT_PUBLIC_IS_TEST_SITE === 'true' checks

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tooling is established and in active use
- Architecture: HIGH — AdUnit fix pattern is identical to existing test-mode guards in robots.ts, sitemap.ts, layout.tsx
- Pitfalls: HIGH — derived from direct code inspection and project history
- VERIFICATION.md format: HIGH — Phase 22 VERIFICATION.md is a concrete template

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable deployment, no fast-moving dependencies)
