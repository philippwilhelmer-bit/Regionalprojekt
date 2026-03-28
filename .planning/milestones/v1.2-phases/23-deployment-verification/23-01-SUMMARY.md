---
phase: 23-deployment-verification
plan: 01
status: complete
started: 2026-03-28T08:20:00Z
completed: 2026-03-28T08:35:00Z
---

# Summary: Set NEXT_PUBLIC_BASE_URL and verify deployment

## What Was Built

Formally verified the live Vercel+Neon deployment satisfies all DEPLOY requirements. Set the final missing environment variable (NEXT_PUBLIC_BASE_URL) and confirmed all Phase 23 success criteria against the production URL.

## Key Outcomes

1. **NEXT_PUBLIC_BASE_URL** set to `https://regionalprojekt.vercel.app` in Vercel environment variables
2. **Homepage** loads at 200 with articles and Bezirk selector
3. **/admin** correctly redirects to /admin/login when unauthenticated
4. **DATABASE_URL** points to Neon PostgreSQL with current Prisma schema
5. **Test mode active**: TESTSEITE banner visible, noindex/nofollow meta present, robots.txt returns `Disallow: /`, sitemap.xml empty

## Issues Encountered

- **Code not pushed to remote**: Initial verification failed because Phase 22 commits (TestSiteBanner, robots.ts, SEO suppression) were local-only. After `git push`, Vercel built with the correct code and all checks passed.
- **First redeploy used build cache**: Required a second redeploy without cache to inline `NEXT_PUBLIC_*` env vars into the build.

## Deviations

None. All success criteria met as specified.

## Key Files

No code changes in this phase — verification only.

### Environment Variables Configured
- `NEXT_PUBLIC_BASE_URL` = `https://regionalprojekt.vercel.app`
- `NEXT_PUBLIC_IS_TEST_SITE` = `true`
- `DATABASE_URL` = neon.tech connection string

## Requirements Satisfied

- **DEPLOY-01**: Homepage loads without error, /admin redirects to /admin/login
- **DEPLOY-02**: Neon PostgreSQL is active with current Prisma schema
- **DEPLOY-03**: NEXT_PUBLIC_BASE_URL set, test mode env var active
