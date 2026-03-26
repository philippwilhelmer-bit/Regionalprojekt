# Feature Research

**Domain:** Test/staging deployment infrastructure for Next.js 15 news platform
**Researched:** 2026-03-26
**Confidence:** HIGH — verified against official Next.js 15 docs (last updated 2026-03-20), Railway documentation, and multi-source SEO staging patterns

---

## Context

This is milestone v1.2 added to an existing platform. All reader features, CMS, SEO, AdSense, and AI pipeline are already shipped. The scope of this research is limited to the four features defined in PROJECT.md for v1.2.

**Existing infrastructure relevant to this milestone:**
- `src/app/layout.tsx` exports a `metadata` object (no `robots` field yet)
- `src/app/sitemap.ts` exists and is conditionally disabled for search — no `robots.ts` exists yet
- `process.env.NEXT_PUBLIC_BASE_URL` already used in `sitemap.ts`
- Both reader (`(public)`) and CMS (`(admin)`) route groups are wrapped by the root layout

---

## Feature Landscape

### Table Stakes (Testers/Operators Expect These)

Features the test deployment must have to be useful and safe. Missing any = the deployment is either dangerous (could be indexed) or uninformative (testers don't know it's a test site).

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Visible "TESTSEITE" banner on every page | Testers and any accidental visitors must immediately know this is not production; prevents false editorial decisions on test data | LOW | Fixed-position element in root layout; conditional on `NEXT_PUBLIC_IS_TEST_DEPLOYMENT=true`; covers both reader and CMS route groups via root `layout.tsx` |
| `robots` noindex/nofollow on all pages | Prevents Google indexing test content before launch; duplicate content penalty risk otherwise | LOW | Add `robots: { index: false, follow: false }` to root layout metadata, env-conditional; Next.js 15 Metadata API propagates to all child pages automatically |
| `robots.txt` disallowing all crawlers | Belt-and-suspenders; noindex meta can be ignored by non-compliant bots; robots.txt is the canonical crawl control signal | LOW | New `src/app/robots.ts` file (Next.js 15 App Router convention); env-conditional: disallow `/` in test, normal rules in production |
| Railway deployment with live shareable URL | Goal of the milestone: a URL collaborators can visit to review the platform | MEDIUM | Railway auto-detects Next.js via Nixpacks; requires replication of all existing env vars plus the new `NEXT_PUBLIC_IS_TEST_DEPLOYMENT=true`; Railway provides `*.up.railway.app` URL automatically |

### Differentiators (Competitive Advantage)

This is infrastructure, not a user-facing product. There are no competitive differentiators to optimize for. The goal is correct, minimal, and reversible behavior.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Single env var gates all test behavior | One `NEXT_PUBLIC_IS_TEST_DEPLOYMENT=true` flag controls banner, noindex meta, and robots.txt simultaneously; no code changes needed to go from test to production | LOW | `NEXT_PUBLIC_` prefix means the value is inlined at build time; Railway rebuilds on deploy, so flipping the var and redeploying is the launch action |
| Banner covers CMS, not just reader | Editors reviewing the CMS on the test URL don't forget they're in a test environment | LOW | Root `app/layout.tsx` already wraps both `(public)` and `(admin)` groups; no separate implementation needed |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| HTTP Basic Auth on test site | Extra protection from accidental indexing | Breaks Railway health checks, blocks AI pipeline cron jobs from running, creates CORS issues with AdSense script already in layout, adds friction for testers | noindex + robots.txt is sufficient for search engine protection; share URL only with intended testers |
| Separate Railway project/repo | Clean isolation | Doubles maintenance burden; env vars drift between environments; bugs found in test may not reproduce in production if codebases diverge | Use same codebase, different Railway environment or service, with different env vars |
| Disabling AdSense on test deployment | Prevent test traffic from affecting ad metrics | AdSense script is already in the root layout tied to `NEXT_PUBLIC_ADSENSE_PUB_ID`; AdSense silently no-ops on unverified domains — no real ads will serve | No action needed; AdSense ignores non-verified Railway domains automatically |
| Test-only database with seed data | Cleaner isolated testing | Requires schema migration sync, seed script maintenance, and a second PostgreSQL instance; for a shareable review deployment, the real (or a dump of the real) database is appropriate | Use a Railway PostgreSQL add-on with a database dump from production, or share the production database read-write for the test milestone |
| Environment-specific sitemap | Prevent test URLs appearing in sitemap crawl | sitemap.ts is only linked from robots.txt in production mode; in test mode robots.txt disallows everything so sitemap is unreachable by design | The env-conditional `robots.ts` handles this implicitly — no sitemap change needed |

---

## Feature Dependencies

```
[Railway Deployment]
    └──requires──> [DATABASE_URL set in Railway]
    └──requires──> [HMAC_SECRET set in Railway]
    └──requires──> [ANTHROPIC_API_KEY set in Railway]
    └──requires──> [NEXT_PUBLIC_IS_TEST_DEPLOYMENT=true set in Railway]
    └──requires──> [NEXT_PUBLIC_BASE_URL set in Railway]

[TESTSEITE Banner]
    └──requires──> [NEXT_PUBLIC_IS_TEST_DEPLOYMENT env var]
    └──enhances──> [noindex meta] (visual + technical together signal "not production")

[robots noindex meta]
    └──requires──> [root layout.tsx metadata object updated with conditional robots field]
    └──conflicts──> [existing SEO metadata in layout.tsx] (must be additive/conditional, not permanent override)

[robots.txt disallow all]
    └──requires──> [src/app/robots.ts created] (does not yet exist in project)
    └──references──> [NEXT_PUBLIC_BASE_URL] (same var already used in sitemap.ts)
    └──compatible──> [existing sitemap.ts] (robots.ts conditionally omits sitemap reference in test mode)
```

### Dependency Notes

- **Railway Deployment requires all existing env vars:** The AI pipeline cron, HMAC session auth, database connection, AdSense publisher ID, and Anthropic API key are all required for the app to function on Railway. These must be replicated from the production environment.
- **noindex is additive, not a replacement:** The existing `metadata` export in `layout.tsx` has no `robots` field (currently defaults to index/follow). Adding a conditional `robots` field does not affect production builds where `NEXT_PUBLIC_IS_TEST_DEPLOYMENT` is unset.
- **robots.ts is a new file:** No `src/app/robots.ts` or `public/robots.txt` exists yet. The Next.js 15 App Router convention (`src/app/robots.ts` returning `MetadataRoute.Robots`) is the correct approach and takes precedence over a static `public/robots.txt` file if both exist.
- **Banner must be server-side:** `NEXT_PUBLIC_IS_TEST_DEPLOYMENT` is inlined at build time, so the banner can be a simple Server Component with a build-time conditional — no client-side hydration or useEffect needed.

---

## MVP Definition

### Launch With (v1.2)

All four features are required for a safe, shareable test deployment. None can be deferred.

- [ ] TESTSEITE banner visible on every page (reader + CMS) — prevents tester confusion and false editorial decisions
- [ ] `robots: { index: false, follow: false }` in root layout metadata, conditional on `NEXT_PUBLIC_IS_TEST_DEPLOYMENT` — blocks search engine indexing
- [ ] `src/app/robots.ts` disallowing all crawlers in test mode — belt-and-suspenders crawl block
- [ ] Railway deployment producing a shareable `*.up.railway.app` URL — the delivery vehicle for the test milestone

### Add After Validation (post-v1.2)

- [ ] Remove test banner and noindex for production launch — trigger: launch decision made; handled by removing or setting `NEXT_PUBLIC_IS_TEST_DEPLOYMENT=false` and redeploying — no code changes required
- [ ] Custom domain configuration on Railway — trigger: public launch; requires `NEXT_PUBLIC_BASE_URL` update for sitemap and canonical URL correctness

### Future Consideration (v2+)

- [ ] Automated Railway preview deployments per PR — trigger: team grows beyond solo operator; adds CI/CD overhead not needed now
- [ ] Password-protected staging environment — trigger: external stakeholders who should not see unfinished features; current milestone is for trusted collaborators only

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Railway deployment | HIGH — enables all sharing | MEDIUM | P1 |
| TESTSEITE banner | HIGH — tester safety | LOW | P1 |
| noindex robots meta | HIGH — SEO safety | LOW | P1 |
| robots.txt disallow | MEDIUM — redundant but belt-and-suspenders | LOW | P1 |

All four features are P1. This is the entire scope of v1.2.

---

## Implementation Notes for Next.js 15

### robots metadata in layout.tsx

The existing `layout.tsx` exports a static `metadata` object with `title` and `description`. The `robots` field is not yet set (defaults to index/follow). Extend conditionally:

```typescript
export const metadata: Metadata = {
  title: config.siteName,
  description: "Aktuelle Nachrichten aus der Steiermark",
  ...(process.env.NEXT_PUBLIC_IS_TEST_DEPLOYMENT === 'true' && {
    robots: { index: false, follow: false },
  }),
};
```

Output when test mode active: `<meta name="robots" content="noindex, nofollow" />` on every page. Verified against Next.js 15 Metadata API (official docs version 16.2.1, last updated 2026-03-20). The `robots` field in layout metadata propagates to all child routes unless a child page overrides it with its own `robots` field. None of the current page files set a `robots` field, so root layout is sufficient.

### robots.ts (new file at src/app/robots.ts)

```typescript
import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://ennstal-aktuell.at'
const isTest = process.env.NEXT_PUBLIC_IS_TEST_DEPLOYMENT === 'true'

export default function robots(): MetadataRoute.Robots {
  if (isTest) {
    return {
      rules: { userAgent: '*', disallow: '/' },
    }
  }
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
```

The test version intentionally omits the sitemap reference — linking a sitemap in a disallow-all robots.txt is contradictory and confusing to crawlers.

### TESTSEITE banner component

Fixed-position element in root layout body, rendered only in test mode. Should be visually prominent. Use warning amber rather than Styrian green to distinguish it from production UI elements. As a Server Component, it can read the build-time env var directly without client-side code:

```typescript
// In layout.tsx body:
{process.env.NEXT_PUBLIC_IS_TEST_DEPLOYMENT === 'true' && <TestBanner />}
```

The `TestBanner` component itself requires no state, hooks, or client-side interactivity.

### Railway deployment

Railway's Nixpacks builder auto-detects Next.js and runs `next build` + serves via standalone output. Key env vars to set in Railway dashboard:

| Var | Value |
|-----|-------|
| `DATABASE_URL` | Railway PostgreSQL connection string |
| `HMAC_SECRET` | Copy from production env |
| `ANTHROPIC_API_KEY` | Copy from production env |
| `NEXT_PUBLIC_BASE_URL` | Railway-provided URL (e.g. `https://regionalprojekt.up.railway.app`) |
| `NEXT_PUBLIC_ADSENSE_PUB_ID` | Copy from production env (will no-op on unverified domain) |
| `NEXT_PUBLIC_IS_TEST_DEPLOYMENT` | `true` |

Railway provides health checks and automatic HTTPS for `*.up.railway.app` domains. No custom Dockerfile needed for a standard Next.js app.

---

## Sources

- [Next.js generateMetadata API Reference (v16.2.1, last updated 2026-03-20)](https://nextjs.org/docs/app/api-reference/functions/generate-metadata#robots) — `robots` field in Metadata object confirmed, HIGH confidence
- [Next.js Metadata Files: robots.txt](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots) — `src/app/robots.ts` App Router convention confirmed
- [Railway Next.js Deployment Guide](https://docs.railway.com/guides/nextjs) — Nixpacks auto-detection, env var support confirmed
- [Railway Environments](https://docs.railway.com/environments) — parallel environment support for test/production separation
- [searchviu.com: robots.txt and noindex for staging environments](https://www.searchviu.com/en/robots-txt-staging-environment/) — dual-protection rationale (robots.txt + noindex meta)
- [Search Engine Journal: Google on Staging Sites](https://www.searchenginejournal.com/google-on-staging-sites-preventing-accidental-indexing/484257/) — confirmed pattern: use both robots.txt AND noindex meta for staging

---

*Feature research for: test/staging deployment infrastructure (v1.2 milestone)*
*Researched: 2026-03-26*
