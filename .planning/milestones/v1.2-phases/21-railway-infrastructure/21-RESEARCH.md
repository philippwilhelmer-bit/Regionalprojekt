# Phase 21: Railway Infrastructure - Research

**Researched:** 2026-03-26
**Domain:** Railway deployment — Next.js 15, Prisma v6, PostgreSQL, environment variables, cron scheduling
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **DATABASE_URL**: Railway PostgreSQL addon via `${{Postgres.DATABASE_URL}}` — never hard-coded
- **ANTHROPIC_API_KEY**: User will set manually in Railway Variables (has key)
- **ADMIN_PASSWORD**: User will set manually in Railway Variables
- **ADMIN_SESSION_SECRET**: Auto-generate a secure random string during setup (user doesn't need to remember it)
- **NEXT_PUBLIC_BASE_URL**: Set to the Railway-assigned `*.up.railway.app` domain (fixes sitemap, RSS, OG meta)
- **NEXT_PUBLIC_IS_TEST_SITE**: Set to `true` (canonical env var for Phase 22 gating)
- **OTS_API_KEY**: Not set — OTS adapter silently skipped, RSS feeds still work
- **NEXT_PUBLIC_ADSENSE_PUB_ID**: Not set — AdSense skipped for test site (Phase 22 will gate it anyway)
- GitHub auto-deploy connected to `main` branch — every push to main triggers deploy
- `railway.toml` config file checked into repo — build command, start command, health check are version-controlled
- App deployed to EU West (Frankfurt/Amsterdam) — closest to Austrian audience
- PostgreSQL addon co-located in same EU region — minimal app-to-DB latency
- Build: `npx prisma migrate deploy && npm run build` (**CORRECTED — see Critical Finding below**)
- Start: `next start -p ${PORT:-3000}` (Railway assigns dynamic PORT)
- `NEXT_PUBLIC_*` vars must be set in Railway Variables before the first build
- Seed database with demo data via `db:seed` so the site looks alive when shared
- AI pipeline (cron ingestion) active on the test site — full pipeline: ingest → AI rewrite → publish
- Cron interval reduced for the test site (e.g. every 2h instead of default) to save API credits
- RSS sources (ORF) are sufficient — OTS.at not needed (no credentials available)

### Claude's Discretion

- Admin seeding approach (include in db:seed or separate setup step)
- Exact cron interval for test site (within "less frequent" constraint)
- railway.toml health check configuration
- Nixpacks vs Dockerfile (Nixpacks auto-detect expected to work for Next.js)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEPLOY-01 | App deploys to Railway with a shareable public URL | railway.toml config, start command, domain generation |
| DEPLOY-02 | PostgreSQL database provisioned on Railway with Prisma migrations applied | `${{Postgres.DATABASE_URL}}` reference variable, `prisma migrate deploy` in start command |
| DEPLOY-03 | All test behaviors gated by single `NEXT_PUBLIC_IS_TEST_SITE` environment variable | Environment variable set in Railway Variables before first build |
</phase_requirements>

---

## Summary

Railway provides zero-configuration Next.js deployment via Railpack (formerly Nixpacks). A `railway.toml` file checked into the repo is the standard way to version-control build commands, start commands, and health check configuration. For this project, the key tasks are: creating the Railway project and service, provisioning a PostgreSQL addon in the EU West region, wiring environment variables, and configuring the cron pipeline to trigger the ingest and AI scripts on a reduced schedule.

**Critical finding:** `prisma migrate deploy` cannot run during the build phase — Railway's internal network (where the PostgreSQL addon lives) is not accessible at build time. Migrations must run in the start command, not the build command. The locked decision in CONTEXT.md has this backwards and must be corrected.

**Second finding:** Railway cron jobs are separate services within the same Railway project. The pipeline (ingest + AI run) requires two separate cron services — or a single combined script — scheduled via Railway's built-in cron service type.

**Primary recommendation:** Use `railway.toml` for all config, run `prisma generate` in build, run `prisma migrate deploy` in start before `next start`, seed via `npx prisma db seed` as a one-time post-deploy step.

---

## Standard Stack

### Core
| Library/Tool | Version | Purpose | Why Standard |
|---|---|---|---|
| Railway CLI | latest | Project setup, one-off commands | Official tool for Railway project management |
| Railpack | auto | Build detection | Railway's default builder since 2024 — replaces Nixpacks |
| railway.toml | — | Config as code | Version-controlled build/deploy settings |
| `${{Postgres.DATABASE_URL}}` | — | DB reference variable | Dynamic reference — survives addon rename/reconfiguration |

### Supporting
| Library/Tool | Version | Purpose | When to Use |
|---|---|---|---|
| `npx prisma generate` | Prisma v6 | Generate Prisma client at build time | In build command — no DB connection needed |
| `npx prisma migrate deploy` | Prisma v6 | Apply pending migrations at runtime | In start command — DB available at runtime |
| `npx prisma db seed` | Prisma v6 | Seed initial data | One-time post-deploy manual step |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|---|---|---|
| `railway.toml` | Dashboard settings only | Dashboard settings not version-controlled; `railway.toml` is better |
| Railpack (auto) | Dockerfile | Dockerfile adds maintenance overhead; Railpack handles Next.js well |
| Railway cron service | External cron (Cronitor, etc.) | Railway-native cron is simpler, no external dependency |

**Installation:**
```bash
npm install -g @railway/cli
# or use npx railway <command>
```

---

## Architecture Patterns

### Railway Project Structure

```
Railway Project: regionalprojekt
├── Service: web                  # Next.js app (main service)
│   ├── Source: GitHub main branch
│   ├── Build: npx prisma generate && npm run build
│   ├── Start: npx prisma migrate deploy && next start -p ${PORT:-3000}
│   ├── Region: EU West (europe-west4-drams3a)
│   └── Domain: *.up.railway.app (auto-generated)
├── Service: ingest-cron          # Ingestion cron (separate service)
│   ├── Start: npx tsx scripts/ingest-run.ts
│   ├── Cron: 0 */2 * * *        # every 2 hours (UTC)
│   └── Region: EU West
├── Service: ai-cron              # AI pipeline cron (separate service)
│   ├── Start: npx tsx src/scripts/ai-run.ts
│   ├── Cron: 30 */2 * * *       # every 2 hours, offset 30min
│   └── Region: EU West
└── Service: postgres             # PostgreSQL addon
    ├── Region: EU West
    └── DATABASE_URL: auto-exposed as ${{Postgres.DATABASE_URL}}
```

### Pattern 1: Build vs. Start Command Separation

**What:** `prisma generate` at build time, `prisma migrate deploy` at start time.

**When to use:** Always on Railway — internal network is only available at runtime, not build time.

**Example:**
```toml
# railway.toml
[build]
buildCommand = "npx prisma generate && npm run build"

[deploy]
startCommand = "npx prisma migrate deploy && next start -p ${PORT:-3000}"
healthcheckPath = "/"
healthcheckTimeout = 120
restartPolicyType = "ON_FAILURE"
```

### Pattern 2: Environment Variable Reference (Railway-native)

**What:** Use `${{ServiceName.VARIABLE}}` syntax to reference another service's variables.

**When to use:** Any time the app service needs to connect to the database addon.

**Example:**
```
# In Railway Variables tab for the web service:
DATABASE_URL = ${{Postgres.DATABASE_URL}}
```

This is a dynamic reference. If the Postgres addon's internal URL changes, all references update automatically.

### Pattern 3: Railway Cron as Separate Service

**What:** Railway cron jobs are separate services whose start command runs on a schedule and must exit cleanly.

**When to use:** For the ingest and AI pipeline scripts — they are already written to run-and-exit (no daemon loop).

**Example:**
```toml
# In cron service settings (or separate railway-cron.toml if using monorepo):
[deploy]
cronSchedule = "0 */2 * * *"
startCommand = "npx tsx scripts/ingest-run.ts"
```

Minimum cron interval: 5 minutes. All times are UTC.

### Pattern 4: NEXT_PUBLIC_* Variables Must Pre-Exist the Build

**What:** `NEXT_PUBLIC_*` variables are inlined at build time by Next.js. Setting them after the build does nothing.

**When to use:** Always — set `NEXT_PUBLIC_BASE_URL` and `NEXT_PUBLIC_IS_TEST_SITE` in Railway Variables *before* triggering the first deploy.

### Anti-Patterns to Avoid

- **Migrations in build command:** `npx prisma migrate deploy` in `buildCommand` will fail — internal network is unavailable at build time. The error is `can't reach database server at postgres.railway.internal:5432`.
- **Hard-coding DATABASE_URL:** Never paste the actual connection string. Use `${{Postgres.DATABASE_URL}}` so the reference stays live.
- **Setting NEXT_PUBLIC_* after first deploy:** The values will not take effect until a rebuild. Set them first.
- **Standalone output (optional but recommended):** Railway docs recommend `output: "standalone"` in `next.config.ts` for a leaner deployment. Without it, `next start` still works but the image is heavier.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Cron scheduling | Custom Node.js setInterval daemon | Railway cron service type | Railway handles scheduling, retries, and execution isolation |
| DB migrations on deploy | Custom migration runner | `npx prisma migrate deploy` | Prisma handles migration history, checksums, and idempotency |
| Environment variable management | Dotenv files in repo | Railway Variables tab + reference syntax | Secrets stay out of git; reference syntax avoids copy-paste errors |
| Health checks | Custom `/api/health` route | Railway `healthcheckPath = "/"` on the root | Next.js homepage returns 200 on success — no extra route needed |

**Key insight:** Railway's internal service-to-service networking (`*.railway.internal`) means the web service can reach the database without public egress costs. Never use the public Postgres URL from within Railway.

---

## Common Pitfalls

### Pitfall 1: Migrations in Build Command (CRITICAL)

**What goes wrong:** Build fails with `can't reach database server at postgres.railway.internal:5432`. Deploy never completes.

**Why it happens:** Railway's internal network is not available during the build phase — only at runtime. The Postgres addon's private hostname resolves only after the service containers are networked together.

**How to avoid:** Put `npx prisma migrate deploy` in the `startCommand`, not `buildCommand`. Build command: `npx prisma generate && npm run build`.

**Warning signs:** Build logs show Prisma connection error before the Next.js build begins.

---

### Pitfall 2: NEXT_PUBLIC_* Variables Not Set Before First Build

**What goes wrong:** `NEXT_PUBLIC_BASE_URL` is empty — sitemap, RSS feeds, and OG meta tags use empty/wrong URLs in production. `NEXT_PUBLIC_IS_TEST_SITE` is undefined — Phase 22 test-mode gating silently does nothing.

**Why it happens:** Next.js inlines `NEXT_PUBLIC_*` values at build time. Variables set after the first build have no effect until a rebuild is triggered.

**How to avoid:** Set ALL required Railway Variables before clicking "Deploy" the first time. After setting variables, trigger a redeploy.

**Warning signs:** Sitemap returns localhost URLs; test banner (Phase 22) never appears.

---

### Pitfall 3: OTS Source Enabled Without API Key

**What goes wrong:** Ingest cron fails on every run because the OTS adapter tries to connect to `https://www.ots.at/api/liste` without credentials. Error logs fill up, ingestion count stays 0.

**Why it happens:** `seed.ts` seeds the OTS source as `enabled: true` with `pollIntervalMinutes: 15`. Without `OTS_API_KEY`, the OTS adapter should fail gracefully, but the source will log errors on every cron run.

**How to avoid:** After seeding, manually disable the OTS source in the Railway-deployed CMS (`/admin/sources`) or modify the seed to set `enabled: false` for OTS when `OTS_API_KEY` is absent. Alternatively, set `OTS_API_KEY=""` and rely on adapter's silent-skip logic.

**Warning signs:** Cron logs show OTS errors; no OTS articles appear (acceptable), but error noise is high.

---

### Pitfall 4: Seed Script Runs Against Production DB by Accident

**What goes wrong:** If `npx prisma db seed` is included in the start command, it re-runs on every deploy, potentially duplicating sources or conflicting with live data.

**Why it happens:** Seed is designed as a one-time setup, not an idempotent deploy step (seed uses `upsert`, so duplication is prevented, but pipeline config rows could be affected).

**How to avoid:** Run `npx prisma db seed` exactly once, manually via Railway CLI or as a one-shot manual deploy step. Never include it in `startCommand`.

**Warning signs:** Duplicate source rows; unexpected pipeline config resets.

---

### Pitfall 5: Cron Services Share the Same DATABASE_URL

**What goes wrong:** Cron services (ingest-cron, ai-cron) also need `DATABASE_URL` — they connect to the same Postgres addon as the web service. If not configured, cron scripts will exit with DB connection errors.

**Why it happens:** Each Railway service has its own Variables scope. The web service's `DATABASE_URL` is not automatically shared with sibling services.

**How to avoid:** Add `DATABASE_URL = ${{Postgres.DATABASE_URL}}` (and `ANTHROPIC_API_KEY`) to the Variables of every cron service, not just the web service.

---

## Code Examples

### railway.toml (main web service)
```toml
# Source: https://docs.railway.com/reference/config-as-code

[build]
buildCommand = "npx prisma generate && npm run build"

[deploy]
startCommand = "npx prisma migrate deploy && next start -p ${PORT:-3000}"
healthcheckPath = "/"
healthcheckTimeout = 120
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

### next.config.ts — Standalone output (recommended)
```typescript
// Source: https://docs.railway.com/guides/nextjs
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

If `output: "standalone"` is used, the start command changes to:
```
node .next/standalone/server.js
```
And PORT/HOSTNAME must be passed differently:
```
HOSTNAME=0.0.0.0 PORT=${PORT:-3000} node .next/standalone/server.js
```

**Recommendation:** Use `next start -p ${PORT:-3000}` (no standalone) to avoid touching `next.config.ts` and the start script simultaneously. Standalone is an optimization for image size — not required for correctness.

### DATABASE_URL reference variable (Railway Variables tab)
```
# Set in Railway Variables for web service, ingest-cron, and ai-cron:
DATABASE_URL = ${{Postgres.DATABASE_URL}}
```

### Cron schedule syntax for every 2 hours (UTC)
```
Ingest cron:  0 */2 * * *    # runs at :00 of every even hour
AI cron:     30 */2 * * *    # runs at :30 of every even hour (after ingest completes)
```

### Generate ADMIN_SESSION_SECRET
```bash
# Run locally to generate a secure random 64-char hex string:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Nixpacks | Railpack | 2024 | Railpack is now default; Nixpacks still works for existing services |
| Manual DB URL copy-paste | `${{Postgres.DATABASE_URL}}` reference | 2023 | References survive addon rename/reconfigure |
| Procfile for PORT | `next start --port ${PORT}` in railway.toml | — | railway.toml is cleaner, version-controlled |

**Deprecated/outdated:**
- Nixpacks: Still works but no longer receives new features. Railway auto-selects Railpack for new services.
- `RAILWAY_STATIC_URL`: Old Railway URL variable. Current Railway assigns `*.up.railway.app` domain via the Networking settings tab.

---

## Open Questions

1. **Does the OTS adapter silently skip on missing `OTS_API_KEY`, or does it throw?**
   - What we know: CONTEXT.md states "OTS adapter silently skipped" — this is an established pattern per codebase
   - What's unclear: Whether the error is logged (causing cron noise) or truly silent
   - Recommendation: Verify adapter code during implementation; if noisy, disable OTS source in CMS after first seed

2. **railway.toml region configuration**
   - What we know: EU West region is `europe-west4-drams3a`; region can be set in Account Settings or per-service
   - What's unclear: Whether region can be specified in `railway.toml` (docs are ambiguous on this)
   - Recommendation: Set region via Railway dashboard during service creation; do not rely on `railway.toml` for region

3. **Cron service count: one combined script vs. two separate services**
   - What we know: Both `scripts/ingest-run.ts` and `src/scripts/ai-run.ts` exist as separate scripts
   - What's unclear: Whether combining into a single sequential script (`ingest-run.ts && ai-run.ts`) is simpler than two cron services
   - Recommendation: Use a single combined cron script (`tsx scripts/ingest-run.ts && tsx src/scripts/ai-run.ts`) to reduce Railway service count; offset from web deploy timing

---

## Validation Architecture

### Test Framework
| Property | Value |
|---|---|
| Framework | Vitest v2 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| DEPLOY-01 | Railway service URL returns 200 on homepage | smoke (manual) | Manual: open `https://*.up.railway.app` in browser | N/A — infra test |
| DEPLOY-01 | `/admin` redirects to `/admin/login` | smoke (manual) | Manual: curl or browser | N/A — infra test |
| DEPLOY-02 | PostgreSQL addon is active database (not hard-coded string) | smoke (manual) | Manual: verify Railway Variables tab shows reference variable | N/A — config test |
| DEPLOY-02 | Prisma migrations applied, schema current | smoke (manual) | Manual: `railway run npx prisma migrate status` | N/A — infra test |
| DEPLOY-03 | `NEXT_PUBLIC_IS_TEST_SITE=true` set in Railway Variables | smoke (manual) | Manual: verify Railway Variables tab | N/A — config test |

**Note:** All Phase 21 success criteria are infrastructure/configuration tests that cannot be automated as unit or integration tests. They require a live Railway deployment to verify. The existing Vitest suite (unit tests with pgLite) continues to run unaffected.

### Sampling Rate
- **Per task commit:** `npm test` (unit suite — verifies no regressions in codebase changes)
- **Per wave merge:** `npm test`
- **Phase gate:** All 4 success criteria verified manually in the live Railway environment before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all automated test coverage. No new test files needed for infrastructure configuration.

---

## Sources

### Primary (HIGH confidence)
- [Railway: Deploy a Next.js App](https://docs.railway.com/guides/nextjs) — standalone output, start command, PORT config
- [Railway: Config as Code](https://docs.railway.com/reference/config-as-code) — railway.toml format, all build/deploy fields
- [Railway: Cron Jobs](https://docs.railway.com/reference/cron-jobs) — cron service architecture, syntax, minimum interval
- [Railway: Deployment Regions](https://docs.railway.com/reference/deployment-regions) — EU West region identifier
- [Railway: PostgreSQL docs](https://docs.railway.com/databases/postgresql) — DATABASE_URL reference variable, connection types
- [Railway: Database Reference Variables](https://blog.railway.com/p/database-reference-variables) — `${{Postgres.DATABASE_URL}}` syntax confirmed

### Secondary (MEDIUM confidence)
- [Railway Help Station: PORT configuration](https://station.railway.com/questions/does-railway-support-ability-to-set-port-7988bfb3) — `next start --port ${PORT}` confirmed by Railway employee
- [Railway Help Station: Prisma can't reach database during build](https://station.railway.com/questions/prisma-can-t-reach-database-server-duri-9f43403f) — internal network not available at build time, confirmed by multiple community reports

### Tertiary (LOW confidence)
- WebSearch result: Nixpacks deprecated in favor of Railpack — confirmed by Railway docs but exact cutover date unclear for existing projects

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all verified via official Railway docs
- Architecture: HIGH — patterns confirmed by official docs + community evidence
- Critical build/start split: HIGH — confirmed by multiple Railway Help Station reports + official Prisma docs
- Cron architecture: HIGH — verified via official Railway cron docs
- Pitfalls: HIGH — most are verified against official sources or confirmed community patterns

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (Railway configuration APIs are stable; Railpack continues evolving)
