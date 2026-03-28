# Phase 23: Deployment Verification - Research

**Researched:** 2026-03-28
**Domain:** Vercel deployment verification, environment variable management, live URL smoke testing
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEPLOY-01 | App deploys to Vercel with a shareable public URL | Deployment already live at https://regionalprojekt.vercel.app — verification, not new deployment |
| DEPLOY-02 | PostgreSQL database provisioned (Neon) with Prisma migrations applied | Neon DB active, seeded, schema current — verification via Neon dashboard or `prisma migrate status` |
| DEPLOY-03 | All test behaviors gated by single `NEXT_PUBLIC_IS_TEST_SITE` environment variable | Already set to `true` in Vercel — verification only |
</phase_requirements>

---

## Summary

Phase 23 is a verification-and-gap-closure phase, not a build phase. The Vercel + Neon deployment was completed in Phase 21 (with a documented deviation from the originally planned Railway deployment). Phase 22 implemented all test-mode behaviors. The single open gap identified at the end of Phase 21 is that `NEXT_PUBLIC_BASE_URL` was never set in Vercel environment variables — it is explicitly documented as "Not yet set" in the Phase 21-02 summary.

The requirements DEPLOY-01/02/03 formally reference "Railway" in REQUIREMENTS.md, but the actual deployment target changed to Vercel + Neon during Phase 21. Phase 23 closes these requirements against the live Vercel deployment by: (1) setting `NEXT_PUBLIC_BASE_URL` in Vercel and triggering a redeploy, (2) systematically verifying each success criterion against the live URL, and (3) formally marking DEPLOY-01/02/03 as satisfied.

No new code needs to be written. The phase consists entirely of configuration actions and live URL verification.

**Primary recommendation:** Set `NEXT_PUBLIC_BASE_URL=https://regionalprojekt.vercel.app` in Vercel dashboard, trigger a redeploy, then verify all 4 success criteria against the live URL.

---

## Current Deployment State

This is critical context — the phase is entirely about what already exists:

| Component | Status | Value / Location |
|-----------|--------|-----------------|
| Live URL | LIVE | https://regionalprojekt.vercel.app |
| Neon PostgreSQL | ACTIVE | EU Central (Frankfurt), branch `production` |
| `DATABASE_URL` | SET | Neon pooled connection string |
| `ANTHROPIC_API_KEY` | SET | In Vercel environment variables |
| `ADMIN_PASSWORD` | SET | In Vercel environment variables |
| `ADMIN_SESSION_SECRET` | SET | In Vercel environment variables |
| `NEXT_PUBLIC_IS_TEST_SITE` | SET = `true` | In Vercel environment variables |
| `CRON_SECRET` | SET | In Vercel environment variables |
| `NEXT_PUBLIC_BASE_URL` | **NOT SET** | **The integration gap to close** |

Source: Phase 21-02-SUMMARY.md, verified 2026-03-26.

---

## The Integration Gap: NEXT_PUBLIC_BASE_URL

### What it does

`NEXT_PUBLIC_BASE_URL` is used by at least three subsystems:
- `src/app/sitemap.ts` — constructs absolute article URLs in the sitemap
- RSS route(s) — constructs `<link>` and item URLs in feeds
- OG meta tags — constructs `og:url` for article social sharing

Without it, these subsystems use empty string or fall back to relative paths, producing broken/incomplete output.

### Why it wasn't set in Phase 21

Port 5432 was blocked on the user's local network. The user completed the deployment via the Neon SQL Editor and Vercel dashboard. In the rush to get the app live, `NEXT_PUBLIC_BASE_URL` was documented as a known gap to fix next.

### Critical constraint: NEXT_PUBLIC_* must be set before build

`NEXT_PUBLIC_BASE_URL` is inlined at Next.js build time. Simply setting it in the Vercel dashboard does nothing until a new deploy is triggered. The sequence MUST be:
1. Set the variable in Vercel dashboard
2. Trigger a new deployment (redeploy — no code changes needed)
3. Verify the variable is active in the new build

---

## Architecture: Admin Redirect Chain

The Phase 23 success criterion states `/admin` redirects to `/admin/login`. This is confirmed in the codebase:

- `src/app/admin/page.tsx` — redirects to `/admin/articles`
- `src/app/(admin)/layout.tsx` — server component that calls `verifySessionCookie`; redirects to `/admin/login` if no valid session
- `src/middleware.ts` — matcher `['/admin/:path*']` — redirects unauthenticated requests to `/admin/login`

Therefore: visiting `/admin` without a session → middleware redirects to `/admin/login`. This is already implemented; Phase 23 verifies it works on the live URL.

---

## Architecture: Database Verification

Neon (not Railway) is the live database. The verification approach:

| Method | Command | Notes |
|--------|---------|-------|
| Vercel CLI (if available) | `vercel env pull` | Gets env vars locally |
| Neon dashboard | Check branch `production` table list | Visual confirmation |
| Vercel logs | Check build logs for prisma migration output | Confirms migrations ran |
| Live site behavior | 13 Bezirke show in selector, articles load | Implicit DB verification |

Vercel CLI is not currently installed in the project. Verification can be done entirely through the Vercel dashboard + browser.

---

## Verification Checklist Design

Each success criterion maps to a concrete verification action:

| Success Criterion | How to Verify | Method |
|---|---|---|
| Homepage loads without error | GET https://regionalprojekt.vercel.app — 200 response, homepage renders | Browser/curl |
| /admin redirects to /admin/login | GET https://regionalprojekt.vercel.app/admin — should end at /admin/login | Browser (follow redirects) |
| Neon PostgreSQL is active database with current schema | Vercel dashboard env vars show DATABASE_URL pointing to neon.tech; Neon dashboard shows correct tables | Dashboard inspection |
| NEXT_PUBLIC_BASE_URL is set in Vercel env vars | Vercel dashboard → Project → Settings → Environment Variables | Dashboard inspection |

---

## Standard Stack

### Core Tools for This Phase
| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| Vercel dashboard | web | Set env vars, trigger redeploy | No CLI needed |
| Browser or curl | — | Smoke test live URLs | Any HTTP client works |
| Neon dashboard | web | Confirm DB is active, schema correct | Optional — live site behavior is sufficient |

### No New Libraries

This phase adds no code dependencies. The only action is:
1. Dashboard configuration (Vercel env var)
2. Trigger redeploy
3. Manual URL verification

---

## Common Pitfalls

### Pitfall 1: Setting NEXT_PUBLIC_BASE_URL Without Triggering a Redeploy

**What goes wrong:** Variable appears in Vercel dashboard as set, but the live site still has empty `NEXT_PUBLIC_BASE_URL` in the bundle.

**Why it happens:** Next.js inlines `NEXT_PUBLIC_*` at build time, not at request time. The current production deployment was built without the variable. Setting it in the dashboard does not retroactively update the running deployment.

**How to avoid:** After setting the variable, explicitly trigger a new deployment. In Vercel dashboard: Deployments → "Redeploy" on the latest deployment (or push an empty commit to main). Wait for the new deployment to go live before verifying.

**Warning signs:** Sitemap still returns empty URLs; OG tags show no URL; variable appears set in dashboard but live site HTML shows empty string.

---

### Pitfall 2: Verifying Against the Old Deployment

**What goes wrong:** Verification passes because the tester opens the site before the new deployment is live, or opens a preview URL instead of production.

**Why it happens:** Vercel shows both production and preview deployments. The production domain `regionalprojekt.vercel.app` points to the current production deployment, which updates only after the new deployment passes health checks.

**How to avoid:** After triggering the redeploy, wait for "Ready" status in Vercel dashboard before running verification. Always verify against `https://regionalprojekt.vercel.app` (production domain), not a preview URL.

---

### Pitfall 3: NEXT_PUBLIC_BASE_URL Set With Trailing Slash

**What goes wrong:** URLs in sitemap/RSS become double-slashed: `https://regionalprojekt.vercel.app//artikel/...`

**Why it happens:** Code that builds URLs typically does `${NEXT_PUBLIC_BASE_URL}/artikel/...` — if the base URL has a trailing slash, the result is malformed.

**How to avoid:** Set the value as `https://regionalprojekt.vercel.app` (no trailing slash).

---

### Pitfall 4: /admin Redirect Chain Confusion

**What goes wrong:** Tester reports "/admin does not redirect to /admin/login" because they are already logged in.

**Why it happens:** If the tester previously logged in to the CMS, the session cookie is valid and the middleware allows through to `/admin/articles`, not `/admin/login`.

**How to avoid:** Test the redirect in an incognito/private browser window (no session cookie). Expected behavior: unauthenticated request to `/admin` → middleware redirects to `/admin/login`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL verification | Custom curl script | Browser (incognito) or `curl -L` | Simpler, no setup needed |
| Env var confirmation | Reading Vercel API | Vercel dashboard → Settings → Environment Variables | Visual confirmation is sufficient for a one-time check |
| Schema verification | Writing a check script | Neon dashboard table list OR live site Bezirk count | Live site behavior proves DB is populated and schema correct |

---

## Architecture Patterns

### Pattern 1: Vercel Environment Variable Update Flow

**What:** Setting a build-time env var and getting it into the live deployment.

**When to use:** Whenever a `NEXT_PUBLIC_*` variable is added or changed.

**Steps:**
```
1. Vercel Dashboard → Project → Settings → Environment Variables
2. Add: NEXT_PUBLIC_BASE_URL = https://regionalprojekt.vercel.app
   Scope: Production (and optionally Preview)
3. Deployments → latest deployment → "Redeploy" (no changes needed)
4. Wait for deployment status: "Ready"
5. Verify: view-source:https://regionalprojekt.vercel.app
   Search for "regionalprojekt.vercel.app" in sitemap link or OG tags
```

### Pattern 2: Smoke Test via curl

**What:** Quick HTTP verification without browser.

```bash
# Check homepage loads (200)
curl -s -o /dev/null -w "%{http_code}" https://regionalprojekt.vercel.app

# Check /admin redirect chain (follow redirects, print final URL)
curl -s -o /dev/null -w "%{url_effective}" -L https://regionalprojekt.vercel.app/admin

# Check robots.txt (should contain Disallow: / in test mode)
curl -s https://regionalprojekt.vercel.app/robots.txt

# Check NEXT_PUBLIC_BASE_URL is in sitemap
curl -s https://regionalprojekt.vercel.app/sitemap.xml
```

Note: Sitemap will return empty `<urlset/>` because `NEXT_PUBLIC_IS_TEST_SITE=true` — this is expected and correct.

### Pattern 3: Vercel Dashboard Navigation

```
vercel.com/dashboard
  → regionalprojekt project
  → Settings tab
    → Environment Variables: add NEXT_PUBLIC_BASE_URL
  → Deployments tab
    → Latest production deployment → "..." menu → "Redeploy"
  → Wait for green "Ready" badge
  → Domains tab: confirm regionalprojekt.vercel.app is pointing to new deployment
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|---|---|---|
| Railway deployment (original plan) | Vercel + Neon (Phase 21 deviation) | REQUIREMENTS.md still says "Railway" — requirements are satisfied by Vercel equivalent |
| NEXT_PUBLIC_BASE_URL unset (Phase 21 gap) | Will be set in this phase | Closes the integration gap; fixes sitemap, RSS, OG meta |

---

## Open Questions

1. **Does the sitemap confirm correct base URL after redeploy?**
   - What we know: `NEXT_PUBLIC_IS_TEST_SITE=true` causes sitemap to return `[]` (empty) — this is correct behavior
   - What's unclear: Cannot directly inspect base URL from sitemap while test mode is active
   - Recommendation: Verify by checking Vercel build logs for the env var being picked up, or temporarily inspect OG tags on the homepage (which are NOT suppressed by test mode)

2. **Does the Vercel Hobby plan daily cron still run?**
   - What we know: Vercel Hobby limits cron to once per day (daily at 06:00 UTC per vercel.json)
   - What's unclear: Whether the cron ran successfully after Phase 21 deployment
   - Recommendation: Check Vercel dashboard Functions tab for cron execution logs — out of scope for this phase if the pipeline is working (articles are already published)

---

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is required.

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
| DEPLOY-01 | Live URL https://regionalprojekt.vercel.app returns 200 | smoke (manual) | Manual: browser or `curl -s -o /dev/null -w "%{http_code}" https://regionalprojekt.vercel.app` | N/A — infra test |
| DEPLOY-01 | `/admin` redirects to `/admin/login` (unauthenticated) | smoke (manual) | Manual: incognito browser or `curl -s -o /dev/null -w "%{url_effective}" -L https://regionalprojekt.vercel.app/admin` | N/A — infra test |
| DEPLOY-02 | Neon PostgreSQL is the active database | smoke (manual) | Manual: Vercel dashboard env vars show neon.tech DATABASE_URL | N/A — config test |
| DEPLOY-02 | Current Prisma schema is applied | smoke (manual) | Manual: live site shows 13 Bezirke; or `vercel run npx prisma migrate status` | N/A — infra test |
| DEPLOY-03 | `NEXT_PUBLIC_BASE_URL` set in Vercel environment variables | smoke (manual) | Manual: Vercel dashboard → Settings → Environment Variables | N/A — config test |

**Note:** All Phase 23 success criteria are infrastructure/configuration tests that cannot be automated as unit tests. They require a live Vercel deployment to verify. The existing Vitest suite (unit tests with pgLite) is unaffected.

### Sampling Rate
- **Per task commit:** `npm test` (verify no regressions — no code changes expected)
- **Per wave merge:** `npm test`
- **Phase gate:** All 4 success criteria verified manually against https://regionalprojekt.vercel.app

### Wave 0 Gaps
None — no new test files are needed. This phase makes no code changes.

---

## Sources

### Primary (HIGH confidence)
- Phase 21-02-SUMMARY.md — documents exact deployment state including `NEXT_PUBLIC_BASE_URL` gap
- `src/middleware.ts` — confirms `/admin/:path*` matcher and redirect to `/admin/login`
- `src/app/admin/page.tsx` — confirms `/admin` redirects to `/admin/articles` (then to login if unauthenticated)
- `src/app/(admin)/layout.tsx` — confirms server-side session verification with redirect
- Phase 21-02-SUMMARY.md verification checklist — `[ ] NEXT_PUBLIC_BASE_URL not yet set`

### Secondary (MEDIUM confidence)
- Phase 21-RESEARCH.md — Pitfall 2 documents NEXT_PUBLIC_* build-time inlining requirement
- Phase 22-VERIFICATION.md — confirms all 11 test-mode unit tests pass; documents human verification items still pending on live URL

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Current deployment state: HIGH — documented in Phase 21-02 summary with explicit "not yet set" flag
- Integration gap (NEXT_PUBLIC_BASE_URL): HIGH — explicitly documented in Phase 21-02 summary
- Admin redirect chain: HIGH — verified in codebase (middleware.ts + admin/page.tsx + admin/layout.tsx)
- Verification approach: HIGH — standard Vercel dashboard workflow, no novel tooling needed

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (Vercel dashboard UI may change but env var + redeploy flow is stable)
