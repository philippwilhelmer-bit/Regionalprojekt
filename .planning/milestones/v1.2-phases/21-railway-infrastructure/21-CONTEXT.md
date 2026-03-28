# Phase 21: Railway Infrastructure - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy the current Regionalprojekt app to Railway with correct database isolation, PORT binding, and environment variable wiring. The Railway service URL must load the homepage, CMS must be accessible, and the database must be a Railway PostgreSQL addon with migrations applied. Test-mode banners and SEO blocking are Phase 22 — not this phase.

</domain>

<decisions>
## Implementation Decisions

### Test site content
- Seed database with demo data via `db:seed` so the site looks alive when shared
- AI pipeline (cron ingestion) active on the test site — full pipeline: ingest → AI rewrite → publish
- Cron interval reduced for the test site (e.g. every 2h instead of default) to save API credits
- RSS sources (ORF) are sufficient — OTS.at not needed (no credentials available)

### Environment secrets
- **DATABASE_URL**: Railway PostgreSQL addon via `${{Postgres.DATABASE_URL}}` — never hard-coded
- **ANTHROPIC_API_KEY**: User will set manually in Railway Variables (has key)
- **ADMIN_PASSWORD**: User will set manually in Railway Variables
- **ADMIN_SESSION_SECRET**: Auto-generate a secure random string during setup (user doesn't need to remember it)
- **NEXT_PUBLIC_BASE_URL**: Set to the Railway-assigned `*.up.railway.app` domain (fixes sitemap, RSS, OG meta)
- **NEXT_PUBLIC_IS_TEST_SITE**: Set to `true` (canonical env var for Phase 22 gating)
- **OTS_API_KEY**: Not set — OTS adapter silently skipped, RSS feeds still work
- **NEXT_PUBLIC_ADSENSE_PUB_ID**: Not set — AdSense skipped for test site (Phase 22 will gate it anyway)

### Deploy workflow
- GitHub auto-deploy connected to `main` branch — every push to main triggers deploy
- `railway.toml` config file checked into repo — build command, start command, health check are version-controlled
- User has an existing Railway account — phase documents project/service creation steps but account creation is not needed

### Railway region
- App deployed to EU West (Frankfurt/Amsterdam) — closest to Austrian audience
- PostgreSQL addon co-located in same EU region — minimal app-to-DB latency

### Build & start commands (carried from prior decisions)
- Build: `npx prisma migrate deploy && npm run build`
- Start: `next start -p ${PORT:-3000}` (Railway assigns dynamic PORT)
- `NEXT_PUBLIC_*` vars must be set in Railway Variables before the first build

### Claude's Discretion
- Admin seeding approach (include in db:seed or separate setup step)
- Exact cron interval for test site (within "less frequent" constraint)
- railway.toml health check configuration
- Nixpacks vs Dockerfile (Nixpacks auto-detect expected to work for Next.js)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard Railway + Next.js deployment approaches.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `package.json` scripts: `build`, `start`, `db:seed` — all usable as-is with minor modifications
- `prisma/schema.prisma` — migration system ready, `prisma migrate deploy` for production
- `.env.example` — documents DATABASE_URL pattern

### Established Patterns
- Environment variables accessed via `process.env.*` throughout codebase
- HMAC auth uses `ADMIN_SESSION_SECRET` + `ADMIN_PASSWORD` for CMS login
- AdSense conditionally loads based on `NEXT_PUBLIC_ADSENSE_PUB_ID` presence
- OTS adapter checks `OTS_API_KEY` and fails gracefully without it

### Integration Points
- `start` script needs PORT binding: `next start -p ${PORT:-3000}`
- Build command needs prisma migration: `npx prisma migrate deploy && npm run build`
- `railway.toml` is a new file — no existing deployment config in repo
- `NEXT_PUBLIC_BASE_URL` referenced in sitemap.ts, RSS routes, article OG meta

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 21-railway-infrastructure*
*Context gathered: 2026-03-26*
