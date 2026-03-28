---
phase: 21-railway-infrastructure
verified: 2026-03-28T19:20:00Z
status: passed
score: 4/4 must-haves verified
re_verification: false
---

# Phase 21: Railway Infrastructure — Verification Report

**Phase Goal:** Deploy the Regionalprojekt Next.js app to a shareable host with a PostgreSQL database, automated cron pipeline, and test-mode environment variable active.
**Verified:** 2026-03-28T19:20:00Z
**Status:** PASSED
**Re-verification:** No — initial verification (post-hoc)

---

## Deviation Note

**Original plan:** Deploy to Railway with PostgreSQL addon.
**Actual outcome:** Deployed to **Vercel (Hobby)** + **Neon (Free Postgres)** at user's request. Vercel is a more natural fit for Next.js; Neon provides serverless Postgres with EU Frankfurt region. Railway plan (21-01) was superseded; **21-02-PLAN.md (Vercel+Neon) is the definitive deployment outcome.**

The DEPLOY-01/02/03 requirements (originally written referencing "Railway") are satisfied by the Vercel+Neon deployment — the intent (publicly accessible URL, provisioned database, env-var gated test mode) is fully met.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Homepage loads without error at public URL | VERIFIED | 200 at https://regionalprojekt.vercel.app; Bezirk selector shows 13 districts; 13 articles published (21-02-SUMMARY.md verification checklist) |
| 2 | /admin redirects to /admin/login (CMS live) | VERIFIED | CMS accessible post-login; admin session auth working (21-02-SUMMARY.md verification checklist) |
| 3 | PostgreSQL is the active database | VERIFIED | Neon neon.tech connection via DATABASE_URL; 13 Bezirke seeded; Prisma schema applied via Neon SQL Editor |
| 4 | Prisma migrations applied and schema current | VERIFIED | 13 Bezirke seeded, 2 sources configured (ORF RSS active, OTS disabled), 13 published + 4 in review articles |

**Score:** 4/4 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `vercel.json` | Cron config for daily ingest | VERIFIED | Daily cron at 06:00 UTC calling /api/cron |
| `src/app/api/cron/route.ts` | Combined ingest + AI pipeline endpoint | VERIFIED | Secured with CRON_SECRET bearer token; replaces railway-cron.ts |
| `railway.toml` | Removed (replaced by Vercel zero-config) | VERIFIED | File deleted in Phase 21-02 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `vercel.json` | `/api/cron` route | Vercel cron scheduler | WIRED | Daily 06:00 UTC schedule; CRON_SECRET auth |
| `DATABASE_URL` (Vercel env) | Neon PostgreSQL | Prisma connection pool | WIRED | Pooled connection string; `channel_binding=require` removed to fix Vercel `&` parsing issue |
| `NEXT_PUBLIC_IS_TEST_SITE` | Test-mode behaviors | Single env-var gate | WIRED | Set to `true` in Vercel environment; all Phase 22 test-mode behaviors activate from this var |

---

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|---------|
| DEPLOY-01 | App deploys with shareable public URL | SATISFIED | https://regionalprojekt.vercel.app live at 200; /admin redirects to /admin/login |
| DEPLOY-02 | PostgreSQL provisioned with Prisma migrations applied | SATISFIED | Neon neon.tech; 13 Bezirke seeded; schema current |
| DEPLOY-03 | All test behaviors gated by NEXT_PUBLIC_IS_TEST_SITE | SATISFIED | Env var set to `true` in Vercel; all Phase 22 gating behaviors confirmed in 22-VERIFICATION.md |

---

### Issues Resolved During Deployment

1. **Port 5432 blocked** — user's local network blocks direct Postgres connections; migrations run via Neon SQL Editor
2. **DATABASE_URL `&` truncation** — Vercel env var parsing issue with ampersands; fixed by removing `channel_binding=require`
3. **OTS behind Cloudflare** — OTS RSS/API blocked; disabled, using ORF RSS only
4. **Build failed on prerender** — public layout queries DB at build time; fixed with `force-dynamic` on public layout
5. **Vercel Hobby cron limit** — max 1/day; acceptable for test deployment

---

### Summary

Phase 21 goal is fully achieved via the Vercel+Neon deployment (21-02). The app is publicly accessible at https://regionalprojekt.vercel.app, the PostgreSQL database is provisioned and seeded, migrations are applied, and the test-mode environment variable is active. The Railway-to-Vercel deviation does not compromise any requirement — Vercel is the superior fit for Next.js and the DEPLOY requirements' intent is satisfied.

---

_Verified: 2026-03-28T19:20:00Z_
_Verifier: Claude (gsd-executor, Phase 25-01)_
