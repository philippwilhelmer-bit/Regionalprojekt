# Project Research Summary

**Project:** Regionalprojekt / Ennstal Aktuell — v1.2 Test Deployment
**Domain:** Test/staging deployment infrastructure for an existing Next.js 15 news platform
**Researched:** 2026-03-26
**Confidence:** HIGH

## Executive Summary

This is a tightly scoped infrastructure milestone on an already-shipped platform. The existing stack (Next.js 15, Prisma v6, PostgreSQL, Tailwind CSS v4, HMAC CMS) is validated and requires no new npm packages. The entire v1.2 scope consists of four features: a visible TESTSEITE banner on every page, `noindex/nofollow` meta tags on all pages, a dynamic `robots.txt` blocking all crawlers, and a Railway deployment producing a shareable URL. All four features are gated by a single environment variable and implemented using Next.js built-ins plus Railway's platform.

The recommended approach is a single-env-var gate (`NEXT_PUBLIC_IS_TEST_SITE=true`) that simultaneously activates the banner, the noindex metadata, and the disallow-all robots.txt. This is the standard staging pattern endorsed by Google Search Central: both `robots.txt` and `noindex` meta must be active together, because neither is sufficient alone — robots.txt blocks crawling but noindex blocks indexing of URLs that Google discovers via external links. The banner must appear on both the reader frontend and the CMS admin to prevent tester confusion in either route group. Placing it once in the root `src/app/layout.tsx` achieves this with a single insertion point.

The key risks are operational, not architectural. The most dangerous: running Prisma migrations against the wrong database (the test service must have its own dedicated Railway PostgreSQL addon, never a shared or hard-coded connection string). The most common first-deploy failure: `next start` does not respect the `PORT` environment variable by default — the start script must explicitly pass `-p ${PORT:-3000}` or the Railway deployment will crash on every health check. Setting `NEXT_PUBLIC_` variables in Railway's Variables tab after a build has already run will silently produce a bundle with `undefined` baked in — they must be set before triggering the build. These are well-documented pitfalls with straightforward fixes.

## Key Findings

### Recommended Stack

No new dependencies are required. All four v1.2 features are implemented using Next.js 15 built-in APIs (Metadata API, `app/robots.ts` file convention, environment variables) and Railway's platform (Nixpacks auto-detection, PostgreSQL addon, Variables injection into the build pipeline).

**Core technologies:**
- **Next.js Metadata API (`metadata.robots` in root layout):** Injects `<meta name="robots" content="noindex, nofollow" />` on every page — zero dependencies, propagates to all child routes automatically via Next.js metadata inheritance
- **`app/robots.ts` file convention:** Generates `/robots.txt` dynamically based on environment; handles test (disallow all) and production (allow all + sitemap) from a single file; introduced in Next.js 13.3.0, fully stable in v15
- **`NEXT_PUBLIC_IS_TEST_SITE` environment variable:** Single flag gating all test-mode behaviors; `NEXT_PUBLIC_` prefix makes it available in both Server Components and the client bundle; must be set in Railway before the build runs, not after
- **Railway PaaS:** First-class Next.js support via Nixpacks/Railpack auto-detection; PostgreSQL addon with automatic `DATABASE_URL` injection via `${{Postgres.DATABASE_URL}}` reference syntax; automatic HTTPS on `*.up.railway.app` URLs; free tier sufficient for a test deployment

See `/Users/philipp/Claudebot/Regionalprojekt/.planning/research/STACK.md` for full implementation patterns and version compatibility details.

### Expected Features

All four v1.2 features are P1 — none can be deferred without making the deployment either unsafe (risk of search engine indexing) or uninformative (testers do not know they are on a test site).

**Must have (table stakes):**
- **TESTSEITE banner on every page (reader + CMS)** — prevents tester confusion and false editorial decisions on test data; must be non-dismissible, visually distinct from production chrome (amber/yellow, not Styrian green), and in German ("TESTSEITE — Kein offizielles Angebot")
- **`robots` noindex/nofollow meta tag on all pages** — blocks Google from indexing test content discovered via external links; robots.txt alone is insufficient by Google's own documented behavior
- **`robots.txt` disallowing all crawlers** — belt-and-suspenders crawl block; works in concert with noindex meta; both must ship together in the same deployment
- **Railway deployment with shareable URL** — the delivery vehicle for the milestone; requires all existing env vars replicated plus the new test flag

**Should have (operational hygiene, same milestone):**
- **Single env var gates all test behavior** — one `NEXT_PUBLIC_IS_TEST_SITE=true` flag controls everything; no code changes needed to transition from test to production, only a redeploy with the flag unset
- **Sitemap suppression in test mode** — `sitemap.ts` should return an empty array when not in production, preventing the full article URL list from being exposed via `/sitemap.xml` on the test URL

**Defer (post-v1.2):**
- Custom domain configuration on Railway — trigger is the production launch decision
- PR preview deployments — only needed when team grows beyond solo operator
- Password-protected staging — only needed for external stakeholders who must not see unfinished features

See `/Users/philipp/Claudebot/Regionalprojekt/.planning/research/FEATURES.md` for the full feature matrix and anti-feature analysis (including why HTTP Basic Auth and separate repos are explicitly rejected).

### Architecture Approach

All four v1.2 changes are additive to the existing architecture. No schema changes, no new data models, no changes to the ingestion or AI pipeline. Two new files and three file modifications, all in the app shell layer.

**Major components:**
1. **`src/app/robots.ts`** — Next.js file convention; auto-served at `/robots.txt`; returns `Disallow: /` in test mode, `Allow: /` + sitemap reference in production; evaluated at runtime (server-side), not baked at build time
2. **`src/components/TestBanner.tsx`** — Server Component; reads `NEXT_PUBLIC_IS_TEST_SITE` at render time; returns `null` in production with no client bundle cost; renders a fixed-position, high-z-index bar in test mode; no state, no hooks, no interactivity
3. **Root `layout.tsx` metadata export** — extended with a conditional `robots: { index: false, follow: false }` field; applies to all child routes via Next.js metadata inheritance; value is evaluated at build time from the baked `NEXT_PUBLIC_IS_TEST_SITE`
4. **Railway service configuration** — all required env vars set in the Variables panel before the first build; dedicated PostgreSQL addon using `${{Postgres.DATABASE_URL}}` reference; start script updated to `next start -p ${PORT:-3000}`; Prisma migrations run via build command override (`npx prisma migrate deploy && npm run build`)

**Recommended build order for the milestone:**
1. Add `NEXT_PUBLIC_IS_TEST_SITE` to `.env.example`
2. Create `src/app/robots.ts` (no dependencies)
3. Create `src/components/TestBanner.tsx` (no dependencies)
4. Modify `src/app/layout.tsx` (add robots metadata + render TestBanner)
5. Configure Railway deployment (set env vars, connect repo, deploy)

See `/Users/philipp/Claudebot/Regionalprojekt/.planning/research/ARCHITECTURE.md` for component diagrams, data flow, and anti-pattern analysis.

### Critical Pitfalls

1. **robots.txt alone does not prevent indexing** — Google can index pages discovered via external links even when `Disallow: /` is active; this is documented Google Search Central behavior, not an edge case. Prevention: deploy noindex meta tag and robots.txt together in the same phase, never one without the other.

2. **`NEXT_PUBLIC_` variables are baked at build time, not container start time** — Setting `NEXT_PUBLIC_IS_TEST_SITE=true` in Railway's Variables tab after a build has run produces a bundle with `undefined` baked in; the banner never appears and the noindex meta is absent. Prevention: set all `NEXT_PUBLIC_` variables in Railway before triggering the first build; verify in Railway build logs.

3. **`next start` ignores the `PORT` environment variable** — Railway assigns a dynamic port; Next.js defaults to 3000; health checks target the assigned port; deployment shows as crashed despite a green build. Prevention: change `package.json` start script to `next start -p ${PORT:-3000}` before the first deploy.

4. **Prisma migrations against the wrong database** — Copy-pasting the production `DATABASE_URL` into the test service Variables (or accidentally reusing it) runs migrations against live data. Prevention: use a dedicated Railway PostgreSQL addon referenced as `${{Postgres.DATABASE_URL}}`, never a hard-coded connection string.

5. **Sitemap exposes all article URLs on the test deployment** — `/sitemap.xml` has no environment guard in the current codebase and lists every article if not suppressed. Prevention: add a `process.env.DEPLOYMENT_ENV !== 'production'` guard to `sitemap.ts` in the same phase as robots.txt, not separately.

## Implications for Roadmap

The milestone scope is small enough that all code changes could ship in a single phase. However, the pitfall research reveals a natural two-phase split: Railway infrastructure must be confirmed working before SEO-blocking code is deployed, because a misconfigured deployment (wrong PORT, wrong DB) that gets indexed before the noindex meta is active creates a recovery burden.

### Phase 1: Railway Infrastructure Setup

**Rationale:** Database isolation and PORT binding are deployment-level prerequisites that have nothing to do with application code. A misconfigured Railway service means every subsequent deploy attempt fails or, worse, touches the wrong database. Confirm the infrastructure is solid before writing any feature code.
**Delivers:** A working Railway deployment of the current app (v1.1, no test-mode features yet) with correct DB isolation, PORT configuration, and env var wiring verified.
**Addresses:** Railway deployment (FEATURES.md P1); all existing env vars replicated
**Avoids:** Pitfall 4 (Prisma against wrong DB), Pitfall 3 (PORT mismatch), Pitfall 2 (NEXT_PUBLIC_ vars set before build)
**Verification:** Railway dashboard shows a healthy (green) service; the shareable URL loads; `/admin` redirects to `/admin/login`; `DATABASE_URL` resolves to the test-service Postgres addon (not a hard-coded string).

### Phase 2: SEO Blocking, Sitemap Suppression, and Test Banner

**Rationale:** With a confirmed working deployment in Phase 1, the SEO-blocking features and banner can be implemented and verified against the live Railway URL. All three SEO features (noindex meta, robots.txt, sitemap suppression) must ship in the same phase — partial deployment leaves a protection gap.
**Delivers:** A safe, clearly labelled test deployment with comprehensive crawler/indexing protection active simultaneously.
**Addresses:** TESTSEITE banner, noindex meta tag, robots.txt, sitemap suppression (all FEATURES.md P1/P1-adjacent)
**Avoids:** Pitfall 1 (robots.txt alone insufficient; both layers active together), Pitfall 2 (banner verified in Railway build logs before marking done), UX pitfalls (amber color, German text, non-dismissible, present in CMS admin as well as reader)
**Verification checklist:** Live page source shows `<meta name="robots" content="noindex, nofollow">`; `/robots.txt` on Railway URL returns `Disallow: /`; `/sitemap.xml` returns empty or minimal response; banner visible on a reader article page AND on the `/admin` CMS dashboard; no `pagead2.googlesyndication.com` script in page source.

### Phase Ordering Rationale

- Phase 1 before Phase 2: a crashed Railway service cannot be used to verify SEO or banner behavior — you need a healthy deployment to inspect page source and test endpoints.
- All three SEO features in Phase 2 together: deploying any one without the others creates a partial protection window. Robots.txt without noindex leaves indexing possible; noindex without robots.txt leaves crawling possible; both without sitemap suppression exposes all article URLs.
- Banner and SEO blocking belong in the same phase: a deployment that looks like a test site (banner visible) must also behave like one (noindex active) — they are semantically inseparable.

### Research Flags

No phase in this milestone requires `/gsd:research-phase` during planning. All patterns are resolved with HIGH confidence from official sources.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Railway setup):** Pitfalls are known and specific (PORT flag, `${{Postgres.DATABASE_URL}}` reference syntax, build-time env var injection); official Railway and Next.js docs verified.
- **Phase 2 (SEO blocking + banner):** Entirely Next.js built-in APIs; implementation patterns are code-complete in STACK.md and ARCHITECTURE.md; no novel integration required.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All APIs verified against Next.js 15 official docs (version 16.2.1, updated 2026-03-20); no new packages — existing stack only |
| Features | HIGH | Scope is precisely defined in PROJECT.md; all four features implementable with zero new dependencies; anti-features explicitly researched and rejected |
| Architecture | HIGH | Integration points verified against existing codebase inspection (`layout.tsx`, `sitemap.ts`, route group structure); additive changes only, no structural changes |
| Pitfalls | HIGH | Sourced from Google Search Central official docs, Next.js official docs, and Next.js community issue tracker (PORT behavior); multiple independent sources agree on all critical pitfalls |

**Overall confidence:** HIGH

### Gaps to Address

- **Env var name consistency:** The three research files use slightly different names for the test flag (`NEXT_PUBLIC_IS_TEST_SITE`, `NEXT_PUBLIC_IS_TEST_DEPLOYMENT`, `NEXT_PUBLIC_TEST_MODE`). Implementation must pick one name and apply it consistently across all files. `NEXT_PUBLIC_IS_TEST_SITE` (used in STACK.md) is recommended as the most readable.
- **AdSense gating:** FEATURES.md notes that AdSense silently no-ops on unverified Railway domains, making explicit gating unnecessary. PITFALLS.md flags the Script tag loading at all as a risk. Confirm during Phase 2 verification whether the placeholder pub ID approach is sufficient or whether the Script tag should be explicitly gated behind `process.env.NEXT_PUBLIC_IS_TEST_SITE !== 'true'`.
- **Prisma migrate deploy in build command:** STACK.md recommends `npx prisma migrate deploy && npm run build` as the Railway build command. Confirm this does not conflict with any existing `postinstall` lifecycle hook before Phase 1 Railway setup.

## Sources

### Primary (HIGH confidence)
- [Next.js generateMetadata — robots field](https://nextjs.org/docs/app/api-reference/functions/generate-metadata#robots) — `metadata.robots` object behavior; verified 2026-03-20, docs v16.2.1
- [Next.js robots.ts file convention](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots) — `MetadataRoute.Robots`, App Router file convention; verified 2026-03-20
- [Google Search Central: Block indexing with noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing) — definitive source on robots.txt vs noindex distinction
- [Google Search Central: robots.txt introduction](https://developers.google.com/search/docs/crawling-indexing/robots/intro) — crawling vs indexing behavior
- [Next.js: NEXT_PUBLIC_ build-time inlining](https://nextjs.org/docs/pages/guides/environment-variables) — build-time vs runtime variable behavior

### Secondary (MEDIUM confidence)
- [Railway Next.js deployment guide](https://docs.railway.com/guides/nextjs) — Nixpacks auto-detection, env var support; WebSearch-confirmed
- [Railway environment variables](https://docs.railway.com/variables) — `${{Service.VAR}}` reference syntax for addon linking; WebSearch-confirmed
- [Prisma deploy to Railway](https://www.prisma.io/docs/orm/prisma-client/deployment/traditional/deploy-to-railway) — official Prisma docs; WebSearch-confirmed
- [Search Engine Journal: Google on Staging Sites](https://www.searchenginejournal.com/google-on-staging-sites-preventing-accidental-indexing/484257/) — dual-protection rationale (robots.txt + noindex meta)

### Tertiary (community-confirmed)
- [Next.js GitHub Discussions: PORT not respected natively](https://github.com/vercel/next.js/discussions/23978) — community-confirmed, requires explicit `-p $PORT` flag in start command

---
*Research completed: 2026-03-26*
*Ready for roadmap: yes*
