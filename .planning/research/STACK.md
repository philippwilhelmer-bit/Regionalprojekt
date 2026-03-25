# Stack Research

**Domain:** AI-powered regional news aggregation and publishing platform
**Researched:** 2026-03-21
**Confidence:** MEDIUM — Next.js 15 verified via official release notes. AI SDK, database, and supporting library versions reflect training knowledge (cutoff August 2025); treat pinned versions as starting points and verify against npm before installing.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 15.x | Full-stack framework: frontend rendering, API routes, Server Actions | App Router enables server-side data fetching co-located with UI. ISR (Incremental Static Regeneration) fits a news site perfectly — articles are statically generated but revalidated on a schedule. Single repo covers frontend + backend + scheduled tasks via Route Handlers. React 19 included. |
| TypeScript | 5.x | Type safety across the entire codebase | News platforms accumulate data schemas fast (articles, sources, Bezirk regions, AI prompts). TypeScript prevents schema drift between ingestion, AI generation, and rendering layers. `next.config.ts` now supported natively. |
| PostgreSQL | 16.x | Primary relational database | Articles have rich relational structure: source → article → Bezirk tags → editorial metadata. PostgreSQL's JSONB handles variable AI metadata and source payloads without a schema migration per new source. Full-text search (`tsvector`) handles German search natively. |
| Prisma | 5.x | ORM and database migrations | Type-safe query client generated from schema. Migrations are version-controlled. Critical for a team-less autonomous platform where schema correctness is enforced at build time, not runtime. Works with PostgreSQL and edge runtimes. |
| Tailwind CSS | 3.4.x | Utility-first styling | The existing frontend design is already Tailwind-based — this is a constraint, not a choice. Tailwind 3.4 is the stable branch; v4 was in alpha/RC as of August 2025, do not adopt v4 until stable. |
| OpenAI SDK (Node.js) | 4.x | AI article generation via GPT-4o | GPT-4o produces publication-quality German text. The SDK supports streaming, structured outputs (JSON mode), and function calling. Central to the autonomous generation pipeline. Use `gpt-4o-mini` for classification/tagging (cost), `gpt-4o` for full article generation (quality). |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `rss-parser` | 3.x | Parse RSS/Atom feeds into structured JS objects | Every RSS source goes through this. Handles character encoding (important for German umlauts in feed titles). Extendable with custom XML element mappings. |
| `node-cron` (via Vercel Cron or self-hosted) | — | Schedule ingestion and generation jobs | Use Vercel Cron Jobs (config-based, no library needed) when deploying to Vercel. Use `node-cron` 3.x only if self-hosting on a VPS. Do not mix both. |
| `zod` | 3.x | Runtime schema validation | Validates RSS item shapes, AI-generated JSON, and OTS.at API responses before they touch the database. Prevents corrupt data from poisoning the article table. |
| `date-fns` | 3.x | Date formatting and manipulation (locale-aware) | German date formatting (`de` locale) for article timestamps. Lighter than `moment.js`. `date-fns` v3 is ESM-native and tree-shakeable. |
| `next-auth` (Auth.js) | 5.x (beta) | Editor authentication | Protects the editorial dashboard. Supports email magic links and OAuth. No reader accounts needed per project spec — this is editor-only. |
| `@vercel/postgres` or `pg` | latest | Direct PostgreSQL client | Use `@vercel/postgres` when deploying to Vercel (connection pooling handled automatically). Use `pg` 8.x with PgBouncer when self-hosting. |
| `axios` | 1.x | HTTP client for OTS.at and future APIs | Use for API sources that aren't RSS (OTS.at REST API). Provides interceptors for auth header injection, retry logic, and timeout handling per-source. |
| `sharp` | 0.33.x | Server-side image optimization | Resize and convert article images from source feeds before storing. Next.js 15 auto-uses `sharp` for the built-in `<Image>` optimizer — install it explicitly. |
| `slugify` | 1.x | Generate URL-safe article slugs | Handles German special characters (ä→ae, ö→oe, ü→ue, ß→ss) for clean SEO-friendly URLs. |
| `cheerio` | 1.x | HTML parsing for article body cleanup | Some RSS feeds include raw HTML in `<content:encoded>`. Cheerio strips unwanted tags and sanitizes before storing or passing to the AI. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `eslint` + `eslint-config-next` | Code quality | Next.js 15 ships ESLint 9 support. Use flat config format (`eslint.config.mjs`). |
| `prettier` | Code formatting | Add `prettier-plugin-tailwindcss` to auto-sort Tailwind class names. |
| `tsx` | Run TypeScript scripts directly | Use for one-off ingestion scripts, seed scripts, and testing prompts without a build step. |
| Vercel CLI | Deploy previews, environment management | Keeps `.env.local` in sync with Vercel's secret store. |
| `dotenv` | Local environment variable loading | For any standalone scripts run outside Next.js context. |
| Docker (PostgreSQL) | Local development database | Run `postgres:16` container locally. Do not rely on a shared cloud DB during development. |

---

## Installation

```bash
# Core framework
npm install next@15 react@19 react-dom@19 typescript@5

# Database
npm install prisma @prisma/client
npm install pg  # or @vercel/postgres for Vercel deployments

# AI
npm install openai@4

# RSS + ingestion
npm install rss-parser axios cheerio

# Validation + utilities
npm install zod date-fns slugify sharp

# Auth (editorial dashboard)
npm install next-auth@beta

# Dev dependencies
npm install -D @types/node @types/react @types/react-dom
npm install -D eslint eslint-config-next prettier prettier-plugin-tailwindcss
npm install -D tsx dotenv
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js 15 (App Router) | Remix | Remix has excellent data mutation patterns but lacks ISR — a key requirement for a news site that auto-publishes frequently without full rebuilds. Use Remix only if SSR-only with no static generation needed. |
| Next.js 15 (App Router) | Astro | Astro is excellent for content-heavy sites but not suited to the dynamic editorial dashboard, real-time ingestion triggers, and Server Actions needed here. Consider for a purely read-only public front if performance becomes an issue later. |
| PostgreSQL | MongoDB | MongoDB's document model fits variable-schema data, but PostgreSQL's JSONB covers this while also giving you relational joins for Bezirk → article relationships, full-text search, and transaction safety for editorial operations. Only choose MongoDB if you have no relational data at all. |
| Prisma | Drizzle ORM | Drizzle is lighter and faster, but Prisma's migration toolchain and generated client are more robust for a greenfield project with frequent schema changes. Revisit Drizzle if Prisma performance becomes a bottleneck at high article volumes. |
| OpenAI SDK / GPT-4o | Anthropic Claude API | Claude 3.5 Sonnet produces comparable German text quality. Switch to Claude if OpenAI pricing becomes unsustainable or if you need longer context windows for processing long RSS feeds. The Vercel AI SDK (see below) abstracts provider switching. |
| OpenAI SDK directly | Vercel AI SDK (`ai`) | The Vercel AI SDK (`ai` package, v3.x) provides a unified interface across OpenAI/Anthropic/Google and adds streaming UI helpers. Recommended if you plan to surface AI generation in the browser (e.g., regenerate button in editorial UI). Use the direct OpenAI SDK for pure server-side batch generation. |
| `node-cron` / Vercel Cron | BullMQ + Redis | BullMQ gives you a proper job queue with retries, priorities, and dead-letter handling. Use it if ingestion jobs become complex enough to need orchestration (e.g., parallel multi-source ingestion with dependency ordering). Overkill for v1. |
| `rss-parser` | `feedparser` (npm) | `feedparser` is unmaintained. `rss-parser` is actively maintained and sufficient. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Tailwind CSS v4 (alpha/RC) | As of mid-2025, v4 was still in RC with breaking changes to the config format and plugin API. The existing design was built on v3 — migrating mid-project adds risk with no benefit. | Tailwind CSS v3.4.x |
| `moment.js` | 67 kB gzipped, not tree-shakeable, deprecated by its own maintainers. German locale support is poor. | `date-fns` v3 with `de` locale |
| `feedparser` (npm) | Last published 2020, no active maintenance, no TypeScript types. | `rss-parser` |
| WordPress / Headless CMS (Contentful, Sanity) | A full CMS adds operational overhead, per-seat costs, and an external dependency for a platform designed to run autonomously. The editorial controls are simple enough (pin, feature, edit, remove) to build as a Next.js admin UI backed by Postgres. | Custom editorial dashboard with Next.js + Prisma |
| Mongoose / MongoDB | No relational integrity for Bezirk tagging. Full-text German search requires plugins and is inferior to PostgreSQL's native `tsvector`. | PostgreSQL + Prisma |
| `next-i18next` | The platform is German-only. A full i18n library adds configuration complexity for zero benefit. Use hardcoded German strings or a simple key-value constants file. | Constants file or `react-intl` only if multi-language ever becomes a requirement |
| GraphQL (Apollo, URQL) | For this platform's data access patterns (list articles by Bezirk, get single article, editorial CRUD) REST route handlers or Prisma + Server Actions are simpler and faster to build. GraphQL's flexibility is unused overhead here. | Next.js Route Handlers + Server Actions |
| Server-Sent Events / WebSockets for editorial UI | Editorial dashboard does not need real-time collaboration. Polling or manual refresh on the editorial side is sufficient. | Standard HTTP + router refresh |

---

## Stack Patterns by Variant

**If deploying to Vercel (recommended):**
- Use Vercel Cron Jobs (defined in `vercel.json`) instead of `node-cron`
- Use `@vercel/postgres` instead of raw `pg`
- Use Vercel Blob for article image storage
- ISR revalidation integrates natively with Vercel's CDN edge cache

**If self-hosting (VPS/Docker):**
- Use `node-cron` for scheduling
- Use raw `pg` with PgBouncer for connection pooling
- Use an S3-compatible object store (MinIO or AWS S3) for images
- Run Next.js in standalone output mode (`output: 'standalone'` in `next.config.ts`)

**If AI costs need controlling:**
- Use `gpt-4o-mini` for: Bezirk classification, headline generation, tag extraction
- Use `gpt-4o` only for: full article body generation
- Add a token budget check before each generation call; skip articles already covered recently

**If source ingestion scales beyond 10 feeds:**
- Introduce BullMQ + Redis for job queuing
- One queue per source type (RSS vs. REST API)
- Dead-letter queue for failed ingestion with alerting

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `next@15` | `react@19`, `react-dom@19` | Next.js 15 App Router requires React 19. Pages Router is backwards-compatible with React 18. |
| `next@15` | `typescript@5` | `next.config.ts` TypeScript config is now natively supported. |
| `prisma@5` | `@prisma/client@5` | These must be the same major version. Run `npx prisma generate` after any schema change. |
| `next-auth@5` (Auth.js) | `next@15` | Auth.js v5 beta is the only version compatible with Next.js 15 App Router Server Actions. Auth.js v4 (`next-auth@4`) does not support Server Actions. |
| `tailwindcss@3.4` | `prettier-plugin-tailwindcss@0.6` | Plugin v0.6 supports Tailwind 3.x class sorting. Do not use `prettier-plugin-tailwindcss@0.7+` (designed for Tailwind v4). |
| `openai@4` | Node.js ≥18.18.0 | Next.js 15 minimum Node.js requirement is 18.18.0 — this aligns. |
| `date-fns@3` | `date-fns-tz@3` | If timezone-aware publishing timestamps are needed (Austria is UTC+1/+2), use `date-fns-tz@3` which is co-versioned with `date-fns@3`. |

---

## OTS.at Integration Note

OTS.at (Austria Presseagentur press wire) provides a REST API. As of this research, no public SDK exists — integration will be a custom `axios`-based adapter. Key considerations:

- Requires API key (commercial arrangement with APA-OTS)
- Responses are XML or JSON depending on endpoint — verify with OTS.at documentation
- Wrap in the pluggable source adapter interface so adding future APA services reuses the same pattern
- Confidence: LOW — OTS.at API details were not independently verified due to tool restrictions. Verify authentication method, response format, and rate limits directly with APA-OTS before building the adapter.

---

## Sources

- `https://nextjs.org/blog/next-15` — Next.js 15 release notes (verified via WebFetch, HIGH confidence): version confirmed stable, React 19 requirement, caching semantics, App Router features, minimum Node.js 18.18.0
- OpenAI Node.js SDK v4 — training knowledge (MEDIUM confidence): version 4.x stable, streaming and structured outputs available
- Prisma v5 — training knowledge (MEDIUM confidence): stable ORM, PostgreSQL support, migration toolchain
- `rss-parser` v3 — training knowledge (MEDIUM confidence): actively maintained, German encoding handled
- `date-fns` v3 — training knowledge (MEDIUM confidence): ESM-native, `de` locale available
- `next-auth` v5 (Auth.js) — training knowledge (MEDIUM confidence): beta but required for Next.js 15 App Router compatibility; verify current beta stability on npmjs.com before adopting
- Tailwind CSS v3.4 — training knowledge (HIGH confidence): stable release, v4 intentionally avoided
- OTS.at API — no external verification possible (LOW confidence): details must be confirmed directly with APA-OTS

---

*Stack research for: AI-powered regional news aggregation and publishing platform (Ennstal Aktuell / Regionalprojekt)*
*Researched: 2026-03-21*
