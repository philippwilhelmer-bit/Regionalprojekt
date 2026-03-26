# Pitfalls Research

**Domain:** Adding test deployment features to a Next.js 15 app (banners, noindex/robots.txt, Railway hosting)
**Milestone:** v1.2 Test Deployment
**Researched:** 2026-03-26
**Confidence:** HIGH (Next.js and Railway official docs; Google Search Central official guidance; verified across multiple sources)

---

## Critical Pitfalls

### Pitfall 1: robots.txt Disallow Alone Does Not Prevent Indexing

**What goes wrong:**
The robots.txt blocks crawling but Google can still index any page that is linked from elsewhere. If the Railway test URL leaks (shared in a Slack message, a tweet, a GitHub README, etc.), Google can find the URL via that external link, index the page title and snippet, and show it in search results — even though robots.txt says `Disallow: /`. The test deployment appears in search results for the brand name.

**Why it happens:**
`robots.txt` is a crawling directive, not an indexing block. Google distinguishes between "we couldn't crawl it" and "we won't show it". A URL that appears in external link text can be indexed without the page ever being crawled. This is documented behavior in Google Search Central, not an edge case.

**How to avoid:**
Use both layers simultaneously:
1. `robots.txt` (via `app/robots.ts`) — `Disallow: /` for all user agents when `NEXT_PUBLIC_DEPLOYMENT_ENV !== 'production'`
2. `noindex, nofollow` meta tag on every page — set via `metadata.robots` in the root `layout.tsx` when the same env flag is set

Both layers must be active. Neither is sufficient alone. The robots.txt stops crawling; the noindex meta tag stops indexing of any URL Google discovers through links.

**Warning signs:**
- Test URL shows up in Google Search Console impressions
- Google Search Console reports "Indexed, though blocked by robots.txt" (a known issue — indicates a URL was indexed without crawling)

**Phase to address:**
Phase that implements robots.txt and the noindex meta tag — these must ship together in the same phase, not sequentially.

---

### Pitfall 2: NEXT_PUBLIC_ Variables Are Baked at Build Time

**What goes wrong:**
`NEXT_PUBLIC_DEPLOYMENT_ENV=test` is set in Railway's Variables tab. The team expects the banner to appear. The build runs. The banner does not appear — because Railway's build container did not have the variable injected during `next build`. The JavaScript bundle has `undefined` baked in where the variable should be. The test banner never renders.

**Why it happens:**
`NEXT_PUBLIC_` variables are string-inlined into the JavaScript bundle at `next build` time, not at server start time. Railway's Variables tab sets environment variables for the running container, but by then the bundle is already compiled. The variable must be available to the build process itself.

**How to avoid:**
In Railway, set `NEXT_PUBLIC_DEPLOYMENT_ENV` as a build-time variable (in the service's "Variables" section, which Railway does make available during Railpack/Nixpacks builds). Verify by checking Railway's build logs for the variable appearing in the build context. Alternatively, do not use `NEXT_PUBLIC_` for the banner at all: read a server-only `DEPLOYMENT_ENV` variable in a Server Component and pass it as a prop to the banner. This is more explicit and avoids the build-time trap entirely.

**Warning signs:**
- Banner does not render on the live Railway deployment
- `console.log(process.env.NEXT_PUBLIC_DEPLOYMENT_ENV)` in the browser shows `undefined`
- Railway build logs do not show the variable being set before `next build`

**Phase to address:**
The phase that implements the test banner and wires up Railway environment variables. Must verify in the Railway build log, not just the Variables UI.

---

### Pitfall 3: sitemap.ts Still Serves All Article URLs on the Test Deployment

**What goes wrong:**
robots.txt blocks crawling and noindex blocks indexing. But the sitemap at `/sitemap.xml` still lists all 1,000+ article URLs with full production-style entries. A crawler or SEO tool that ignores robots.txt will find every article URL. More practically: sharing the sitemap URL with a test reviewer accidentally reveals the full URL structure and article count of a "non-public" deployment.

**Why it happens:**
`sitemap.ts` has no environment guard — it was built for production. It's easy to forget that the sitemap is also a public endpoint that needs suppression in test mode.

**How to avoid:**
In `app/sitemap.ts`, check `process.env.DEPLOYMENT_ENV`. If not production, return an empty array (`return []`). This is a server-side variable check (not `NEXT_PUBLIC_`), so it works correctly at runtime without build-time injection concerns.

**Warning signs:**
- `/sitemap.xml` on the Railway test URL returns a populated list of article URLs
- The sitemap contains the Railway `.up.railway.app` domain mixed with `ennstal-aktuell.at` base URLs (caused by `NEXT_PUBLIC_BASE_URL` not being set for the test environment)

**Phase to address:**
The phase that implements robots.txt / noindex — sitemap suppression should be part of the same SEO-blocking work, not a separate task.

---

### Pitfall 4: Next.js start Command Does Not Respect the PORT Environment Variable

**What goes wrong:**
Railway assigns a dynamic `$PORT` to the service. The `next start` command in `package.json` is `"start": "next start"` with no port flag. Next.js defaults to port 3000. Railway's health checks and routing target `$PORT`, not 3000. The deployment appears to succeed (build passes) but the service is unreachable — Railway shows the deployment as crashed or unhealthy.

**Why it happens:**
Unlike most Node.js frameworks, Next.js does not read `PORT` from the environment automatically. The port must be passed explicitly as a CLI flag: `next start -p $PORT`. This is a documented Railway/Next.js integration requirement and a consistently reported first-deploy gotcha.

**How to avoid:**
Change `package.json` start script to:
```json
"start": "next start -p ${PORT:-3000}"
```
The `${PORT:-3000}` fallback ensures local development still works without setting `PORT`.

**Warning signs:**
- Railway deployment shows "crashed" or repeated health check failures immediately after a successful build
- Railway logs show `next start` listening on port 3000 while Railway expects a different port
- Service shows "Service Unavailable" at the Railway URL despite a green build

**Phase to address:**
The Railway deployment phase — this must be verified before marking the deployment as successful.

---

### Pitfall 5: Prisma Migrate Runs Against Production Database if DATABASE_URL Points to Wrong Environment

**What goes wrong:**
The developer has the production `DATABASE_URL` in their local `.env` (or accidentally sets it in Railway for the test service). Running `prisma migrate deploy` applies pending migrations to the production database. For an autonomous news platform, this can drop columns or alter tables affecting live published articles.

**Why it happens:**
Railway makes it easy to copy-paste the PostgreSQL connection string. If the Railway project has both a production service and a test service, and the test service's `DATABASE_URL` points to the production database (easy copy/paste mistake), any migration run in CI or release commands hits production.

**How to avoid:**
- The Railway test service must have its own dedicated PostgreSQL addon — not a shared connection to the production database.
- Add a `release` command in Railway that runs `prisma migrate deploy` only, and verify in the Railway Variables UI that `DATABASE_URL` resolves to the test-service Postgres addon (`${{Postgres.DATABASE_URL}}`), not a hard-coded production URL.
- Never hard-code a `DATABASE_URL` value — always use Railway's variable references.

**Warning signs:**
- `DATABASE_URL` in the test service Variables tab contains a hard-coded hostname (e.g., `monorail.proxy.rlwy.net`) rather than a Railway reference (`${{Postgres.DATABASE_URL}}`)
- Migration logs reference tables or data volumes that seem too large for a freshly seeded test DB

**Phase to address:**
The Railway deployment setup phase — database isolation must be confirmed before running any migrations.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hard-code `NEXT_PUBLIC_DEPLOYMENT_ENV=test` in `next.config.ts` | Avoids Railway variable setup | Test banner appears in all environments including production after config change | Never — always use env var |
| Use a single Railway Postgres addon for both test and production | Saves a few euros/month | Schema migrations on test break production | Never |
| Only implement robots.txt without noindex meta tag | Simpler code | Test pages indexable via external links | Never for a public-URL deployment |
| Suppress AdSense script globally on non-production without checking pub ID env var | Simpler banner logic | AdSense fires on test if env var check is forgotten on redeploy | Acceptable short-term if AdSense pub ID env var is simply not set on test service |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Railway + Next.js | `next start` without `-p $PORT` — service unreachable | `next start -p ${PORT:-3000}` in package.json start script |
| Railway + Prisma | Running migrations against wrong database | Use `${{Postgres.DATABASE_URL}}` reference, never hard-coded URL |
| Next.js robots.ts | Reading `NEXT_PUBLIC_BASE_URL` inside `robots.ts` — variable may be wrong host for test env | Use a server-only `SITE_URL` env var in robots.ts, or explicitly return the disallow-all config when not production |
| Next.js metadata + robots | Setting robots only in `generateMetadata` per-page — root layout robots override not set | Set `robots: { index: false, follow: false }` in root `layout.tsx` metadata export so every page inherits it |
| Google AdSense on test | AdSense script loads on test deployment — generates invalid traffic impressions from reviewers | Gate the AdSense `<Script>` in `layout.tsx` behind `process.env.DEPLOYMENT_ENV === 'production'` |
| Railway Railpack/Nixpacks + Next.js | Build tool doesn't detect `NEXT_PUBLIC_` vars need to be available at build time | Confirm all `NEXT_PUBLIC_` vars are set in Railway Variables before triggering a build, not after |

---

## Performance Traps

Not applicable at test deployment scale. The test deployment is for human review, not load testing.

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing the Railway test URL publicly (in a public GitHub repo README, public tweet) | Google indexes the test deployment; ADMIN_SESSION_SECRET leaks if `.env` is committed | Keep test URL in private channels; confirm `.gitignore` covers `.env`; use Railway's private networking for DB |
| No auth on test CMS | Test reviewers can accidentally create or delete articles in the test DB | HMAC session auth already exists — confirm it is active on test deployment too (middleware.ts covers `/admin/:path*`) |
| `ADMIN_SESSION_SECRET` reused between test and production | Compromise of test environment yields production admin access | Set a different `ADMIN_SESSION_SECRET` value for the test Railway service |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Test banner is same color as editorial header (dark green) | Reviewers may not notice it, defeating its purpose | Use a high-contrast color (amber/yellow) that clearly distinguishes test mode from production chrome |
| Banner only appears on reader pages, not in CMS | Editor reviewing CMS on test thinks they are on production | Render banner in the admin layout (`app/(admin)/layout.tsx`) as well as root layout |
| Banner text is in English ("TEST ENVIRONMENT") | German-language platform; reviewers may be Austrian stakeholders | Use German: "TESTSEITE — Kein öffentliches Angebot" |
| Banner is dismissible on test deployment | Reviewer dismisses it, then forgets it is a test site | Make test banner non-dismissible (unlike EilmeldungBanner which uses sessionStorage dismiss) |

---

## "Looks Done But Isn't" Checklist

- [ ] **robots.txt blocking:** Verify `/robots.txt` on the Railway URL returns `Disallow: /` — not just that `robots.ts` exists
- [ ] **noindex meta tag:** Inspect page source of a live Railway page and confirm `<meta name="robots" content="noindex,nofollow">` is present
- [ ] **Sitemap suppression:** Confirm `/sitemap.xml` on Railway returns an empty or minimal response, not 1,000 article URLs
- [ ] **PORT binding:** Confirm the Railway deployment is healthy (green checkmark) and the service URL loads — not just that the build succeeded
- [ ] **Test banner visibility:** Confirm banner renders on both a reader page AND the `/admin` CMS dashboard on the Railway URL
- [ ] **AdSense disabled on test:** Inspect page source on Railway URL and confirm no `pagead2.googlesyndication.com` script tag loads
- [ ] **Separate DB:** Confirm the Railway test service's `DATABASE_URL` resolves to a different Postgres instance than any production environment
- [ ] **Admin auth active:** Confirm `/admin` redirects to `/admin/login` on the Railway test URL (middleware is working)
- [ ] **ADMIN_SESSION_SECRET differs:** Confirm the secret set in the Railway test service Variables is not the same value as production

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Test deployment indexed by Google | MEDIUM | Add noindex immediately; submit URL removal request in Google Search Console; wait up to 2 weeks for de-indexing |
| Wrong DATABASE_URL — migration hit production | HIGH | Restore from Railway's automatic Postgres backup; audit what migration changed; roll back manually if needed |
| PORT mismatch — deployment unreachable | LOW | Fix `package.json` start script, push, Railway auto-redeploys |
| NEXT_PUBLIC_ var not baked into build | LOW | Set variable in Railway Variables, trigger a manual redeploy (forces rebuild) |
| AdSense running on test deployment | LOW | Remove or gate the Script tag, redeploy; no AdSense account action expected for brief accidental impressions from known reviewers |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| robots.txt alone insufficient | SEO blocking phase (robots.ts + noindex meta tag together) | Inspect live page source for noindex meta; check robots.txt endpoint |
| NEXT_PUBLIC_ baked at build time | Railway environment setup phase (set vars before first build) | Check Railway build logs; inspect deployed page for banner |
| sitemap.ts exposes all URLs | SEO blocking phase (same phase as robots.ts) | Request `/sitemap.xml` on Railway URL; confirm empty/minimal |
| PORT not respected | Railway deployment phase (fix start script first) | Confirm healthy service in Railway dashboard |
| Wrong DB for migrations | Railway deployment setup phase (create dedicated Postgres addon) | Inspect Variables tab for `${{Postgres.DATABASE_URL}}` reference |
| AdSense on test | Banner/layout phase (gate Script tag by env) | Inspect page source for absence of AdSense script |
| Test banner missing from CMS | Banner implementation phase (add to admin layout) | Manually navigate to `/admin` on Railway URL and verify banner |

---

## Sources

- [Next.js robots.txt file conventions](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots) — official docs, current
- [Next.js generateMetadata / metadata.robots](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) — official docs
- [Railway: Deploy a Next.js App](https://docs.railway.com/guides/nextjs) — official Railway guide
- [Railway: Deploy Prisma app](https://www.prisma.io/docs/orm/prisma-client/deployment/traditional/deploy-to-railway) — Prisma official docs
- [Google Search Central: Block indexing with noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing) — authoritative on noindex vs disallow distinction
- [Google Search Central: robots.txt introduction](https://developers.google.com/search/docs/crawling-indexing/robots/intro) — robots.txt crawling vs indexing distinction
- [Next.js: NEXT_PUBLIC_ baked at build time](https://nextjs.org/docs/pages/guides/environment-variables) — official docs on build-time inlining
- [Next.js: PORT environment variable not respected natively](https://github.com/vercel/next.js/discussions/23978) — community-confirmed, requires `-p $PORT` flag
- [Google on Disallow vs noindex](https://support.google.com/webmasters/thread/101742927) — Google Search Central Community
- [Indexed though blocked by robots.txt (Google)](https://www.siteguru.co/seo-academy/indexed-blocked-by-robots-txt) — explains why robots.txt alone fails

---
*Pitfalls research for: Next.js 15 test deployment (banners, noindex, robots.txt, Railway)*
*Milestone: v1.2 Test Deployment*
*Researched: 2026-03-26*
