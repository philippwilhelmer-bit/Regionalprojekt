---
phase: 21-railway-infrastructure
plan: 02
status: complete
started: 2026-03-26T11:19:00Z
finished: 2026-03-26T13:30:00Z
---

# Plan 21-02 Summary: Vercel + Neon Deployment

## Deviation from Plan

**Original plan:** Deploy to Railway with PostgreSQL addon.
**Actual:** Deployed to Vercel (Hobby) + Neon (Free) at user's request. Vercel is a more natural fit for Next.js; Neon provides serverless Postgres with EU Frankfurt region.

## What Shipped

- **Vercel project:** `regionalprojekt` on Hobby plan, auto-deploys from `main` branch
- **Production URL:** https://regionalprojekt.vercel.app
- **Neon database:** `regionalprojekt` in EU Central (Frankfurt), branch `production`
- **Cron endpoint:** `/api/cron` secured with `CRON_SECRET` bearer token
- **Database seeded:** 13 Bezirke (Steiermark), 2 sources (ORF RSS active, OTS disabled)
- **Pipeline tested:** 17 articles ingested from ORF RSS, 13 published, 4 in review

## Key Files

### Created
- `vercel.json` — cron config (daily at 06:00 UTC)
- `src/app/api/cron/route.ts` — combined ingest + AI pipeline endpoint

### Modified
- `src/app/(public)/layout.tsx` — added `force-dynamic` (DB queries prevent static prerender)
- `package.json` — reverted start script to `next start` (Vercel handles PORT)

### Removed
- `railway.toml` — replaced by Vercel zero-config
- `scripts/railway-cron.ts` — replaced by API route

## Environment Variables (Vercel)

| Variable | Set |
|----------|-----|
| DATABASE_URL | Yes (Neon pooled) |
| ANTHROPIC_API_KEY | Yes |
| ADMIN_PASSWORD | Yes |
| ADMIN_SESSION_SECRET | Yes |
| NEXT_PUBLIC_IS_TEST_SITE | true |
| CRON_SECRET | Yes |
| NEXT_PUBLIC_BASE_URL | Not yet set |

## Issues Encountered

1. **Port 5432 blocked** — user's local network blocks Postgres port; migrations run via Neon SQL Editor
2. **DATABASE_URL truncated** — Vercel env var `&` parsing issue; fixed by removing `channel_binding=require`
3. **OTS behind Cloudflare** — OTS RSS/API blocked by Cloudflare challenge; disabled, using ORF RSS only
4. **Build failed on prerender** — public layout queries DB at build time; fixed with `force-dynamic`
5. **Vercel Hobby cron limit** — max 1/day; external cron service needed for higher frequency

## Verification

- [x] Homepage loads at https://regionalprojekt.vercel.app
- [x] Bezirk selector shows 13 Steiermark districts
- [x] Articles appear on homepage (13 published)
- [x] /admin/login accessible, CMS loads after login
- [x] NEXT_PUBLIC_IS_TEST_SITE = true
- [ ] NEXT_PUBLIC_BASE_URL not yet set (needs redeploy after setting)

## Self-Check: PASSED
