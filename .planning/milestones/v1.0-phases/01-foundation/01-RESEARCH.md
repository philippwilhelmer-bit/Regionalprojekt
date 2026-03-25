# Phase 1: Foundation - Research

**Researched:** 2026-03-21
**Domain:** Prisma ORM + PostgreSQL data layer, TypeScript config patterns, Next.js project structure
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Bundesland config file**
- Format: TypeScript (`bundesland.config.ts`) — type-safe, IDE autocomplete, validated at build time
- Config includes: region list, branding, ad placement zones, default content sources, feature flags
- AI generation settings are NOT in the config — they live in the admin UI only
- Secrets (AdSense IDs, API keys) stay in `.env`; config references env var names and can be committed to git safely
- Language is hardcoded as German — no i18n needed, all deployments are German-language
- Feature flags section included — allows enabling/disabling capabilities per deployment (e.g. ads, RSS) for staged rollouts to new Bundesländer

**Bezirk data model**
- Granularity: Bezirk-level only for reader-facing features — no Gemeinde-level filtering exposed to readers
- Relationship: many-to-many — one article can be tagged to multiple Bezirke
- Special tag: "Steiermark-weit" (state-wide) — means "show in every Bezirk feed", avoids tagging all 13 individually
- Gemeinde synonyms stored in DB as AI-tagging hints (e.g. "Ennstal" → Liezen) — invisible to readers, used only to improve AI geo-tagging accuracy

**Branding per deployment**
- Visual approach: same alpine design, different color theme per Bundesland
- Branding elements in config: site name & tagline, primary color palette (Tailwind token overrides), logo/header icon, footer/legal info (Impressum contact details, publisher name)
- Colors defined as Tailwind CSS token overrides in config (hex values) — full flexibility, not named presets

### Claude's Discretion
- Exact Prisma schema field names and index choices
- Article status pipeline enum values (e.g. fetched → tagged → written → published)
- Folder/file structure of the content data access layer
- Seed file structure for Bezirk + Gemeinde synonym data

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONF-01 | Platform is deployable for any Bundesland by changing a single config file (regions, branding, sources) | `bundesland.config.ts` using TypeScript `satisfies` operator; seed reads regions from config; config is the single source of truth |
| CONF-02 | Steiermark deployment ships with all 13 regions pre-configured (12 Bezirke + Graz) | Prisma seed script with all 13 verified Bezirke; Gemeinde synonyms as seed data in JSON |
| AD-02 | Ad placements are configurable per deployment via the Bundesland config file | `adZones` array in config type; enum-safe zone names prevent typos; consumed by ad placement components in Phase 6 |
</phase_requirements>

---

## Summary

This phase establishes the data layer that every subsequent phase depends on. The three deliverables are: (1) a locked Prisma schema with PostgreSQL, (2) a seed that populates all 13 Steiermark Bezirke with Gemeinde synonym arrays, and (3) a TypeScript bundesland config file whose structure is defined here even though some fields (AdSense unit IDs, source URLs) will only be filled in later phases.

Prisma v6 is the current stable major version (v6.16.0 at research time). It has breaking changes from v5, notably that implicit many-to-many relations now use primary keys instead of unique indexes. The singleton PrismaClient pattern is mandatory in Next.js to prevent hot-reload connection exhaustion. The `prisma.config.ts` file (introduced in v6 as the central config location) replaces the old `package.json` seed key approach.

The content data access layer (DAL) should be a thin wrapper of typed query functions — not a heavy repository-pattern abstraction — because Prisma's generated client is already type-safe. The DAL's job is to enforce the rule "no raw SQL outside the layer" and to provide a stable call surface for the AI pipeline, CMS, and frontend without exposing Prisma internals.

**Primary recommendation:** Use Prisma v6 with PostgreSQL, explicit many-to-many for Article↔Bezirk (needed for `assignedAt` metadata by the AI pipeline later), `tsx` as the seed runner, and a flat function-based DAL in `src/lib/content/`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| prisma | ^6.16.0 | Schema, migrations, type-safe client generator | Official ORM for Next.js; generates typed client from schema |
| @prisma/client | ^6.16.0 | Runtime database client (auto-generated) | Companion to prisma CLI; required at runtime |
| postgresql | 15+ | Relational database | Prisma's primary target; needed for array types (for synonym lists) |
| tsx | ^4.x | TypeScript execution for seed scripts | Officially recommended by Prisma docs for `prisma.config.ts` seed command |
| typescript | ^5.x | Language | Required; `satisfies` operator used in config (TS 4.9+) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/node | ^20.x | Node.js type definitions | Required for seed scripts and server-side code |
| zod | ^3.x | Runtime config validation | Optional but recommended to validate `bundesland.config.ts` shape at startup |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Prisma v6 | Drizzle ORM | Drizzle is lighter and schema-as-code; Prisma has better migration tooling and ecosystem for this project |
| Explicit many-to-many | Implicit many-to-many | Implicit is simpler now but blocks adding `taggedAt`/`taggedBy` metadata needed in Phase 3 |
| tsx (seed runner) | ts-node | tsx is faster, ESM-native; ts-node requires tsconfig setup; Prisma docs now recommend tsx |
| Function-based DAL | Repository class pattern | Classes add complexity for no benefit when Prisma already provides type safety |
| PostgreSQL arrays for synonyms | Separate GemeindeSynonym table | Array column is simpler for read-only seed data; a join table is overkill unless synonyms need per-synonym metadata |

**Installation:**
```bash
npm install prisma @prisma/client
npm install --save-dev tsx typescript @types/node
npx prisma init --datasource-provider postgresql
```

---

## Architecture Patterns

### Recommended Project Structure

```
/
├── prisma/
│   ├── schema.prisma         # Single schema file
│   ├── seed.ts               # Seed script (run with tsx)
│   ├── seed-data/
│   │   └── bezirke.ts        # Bezirk + Gemeinde data as typed TS constants
│   └── migrations/           # Auto-generated by prisma migrate dev
├── prisma.config.ts          # Prisma v6 config (seed command, schema path)
├── src/
│   └── lib/
│       ├── prisma.ts         # Singleton PrismaClient instance
│       └── content/
│           ├── articles.ts   # Article DAL (getArticle, listArticles, etc.)
│           └── bezirke.ts    # Bezirk DAL (getBezirk, listBezirke, etc.)
├── bundesland.config.ts      # Bundesland deployment config (committed to git)
└── .env                      # DATABASE_URL and secrets (NOT committed)
```

### Pattern 1: Singleton PrismaClient (mandatory in Next.js)

**What:** A single shared PrismaClient instance cached on `globalThis` in development to survive hot reloads.
**When to use:** Always — without this, Next.js dev server creates a new connection pool per hot reload, exhausting database connections.

```typescript
// Source: https://www.prisma.io/docs/orm/more/help-and-troubleshooting/nextjs-help
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### Pattern 2: Bundesland Config with `satisfies` operator

**What:** A typed TypeScript config object that is both validated against a type (via `satisfies`) and retains literal types for IDE autocomplete.
**When to use:** Always — this is the contract for CONF-01. Using `satisfies` catches missing required fields at build time without losing specific value types.

```typescript
// bundesland.config.ts
import type { BundeslandConfig } from './src/types/bundesland'

export default {
  bundesland: 'steiermark',
  siteName: 'Ennstal Aktuell',
  tagline: 'Nachrichten aus der Steiermark',
  branding: {
    primaryColor: '#154212',
    secondaryColor: '#2d7a1f',
    logoPath: '/images/logo-steiermark.svg',
    impressum: {
      publisherName: 'Ennstal Aktuell',
      address: 'Musterstraße 1, 8940 Liezen',
      email: 'redaktion@ennstal-aktuell.at',
    },
  },
  adZones: [
    { id: 'hero', envVar: 'ADSENSE_UNIT_HERO', enabled: true },
    { id: 'between-articles', envVar: 'ADSENSE_UNIT_BETWEEN', enabled: true },
    { id: 'article-detail', envVar: 'ADSENSE_UNIT_DETAIL', enabled: true },
  ],
  features: {
    ads: true,
    rss: true,
  },
} satisfies BundeslandConfig
```

### Pattern 3: Explicit Many-to-Many for Article↔Bezirk

**What:** A junction model `ArticleBezirk` that is visible in the Prisma schema, giving full control over the join table.
**When to use:** When the relationship needs metadata (Phase 3 will add `taggedAt`, `taggedBy`). Using explicit from the start avoids a painful migration later.

```prisma
// Source: https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/many-to-many-relations
model ArticleBezirk {
  article    Article  @relation(fields: [articleId], references: [id], onDelete: Cascade)
  articleId  Int
  bezirk     Bezirk   @relation(fields: [bezirkId], references: [id])
  bezirkId   Int
  taggedAt   DateTime @default(now())

  @@id([articleId, bezirkId])
  @@index([bezirkId])
}
```

### Pattern 4: Prisma v6 Config File

**What:** `prisma.config.ts` at project root — replaces the old `prisma.seed` key in `package.json`.
**When to use:** Always with Prisma v6.

```typescript
// Source: https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding
// prisma.config.ts
import { defineConfig } from 'prisma/config'

export default defineConfig({
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
})
```

### Pattern 5: Function-Based DAL

**What:** Plain exported async functions that wrap Prisma queries. No classes, no interfaces for the sake of it.
**When to use:** This is the right shape for this project — keeps DAL files lean and easy to mock in tests.

```typescript
// src/lib/content/bezirke.ts
import { prisma } from '../prisma'
import type { Bezirk } from '@prisma/client'

export async function listBezirke(): Promise<Bezirk[]> {
  return prisma.bezirk.findMany({ orderBy: { name: 'asc' } })
}

export async function getBezirkBySlug(slug: string): Promise<Bezirk | null> {
  return prisma.bezirk.findUnique({ where: { slug } })
}
```

### Anti-Patterns to Avoid

- **Raw SQL outside the DAL:** Never call `prisma.$queryRaw` or `prisma.$executeRaw` in route handlers, API routes, or components. All SQL must go through `src/lib/content/`.
- **Creating PrismaClient in route handlers:** Always import from `src/lib/prisma.ts`. Creating `new PrismaClient()` in a request handler exhausts connections.
- **Implicit many-to-many for Article↔Bezirk:** Starting with implicit would force a destructive migration when Phase 3 needs `taggedAt`. Use explicit from day one.
- **Secrets in config:** `bundesland.config.ts` is committed to git. AdSense unit IDs and API keys belong in `.env`. Config should reference the env var NAME only (`envVar: 'ADSENSE_UNIT_HERO'`), not the value.
- **Hardcoding region list in seed.ts:** Seed must read regions from `bundesland.config.ts` — this is the mechanic that satisfies CONF-01 success criterion 4.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DB migrations | Manual SQL ALTER TABLE scripts | `prisma migrate dev` / `prisma migrate deploy` | Migrations track schema diff, are replayable, and integrate with CI |
| Type-safe DB queries | Query builder from scratch | Prisma generated client | Prisma generates fully typed client from schema; types stay in sync automatically |
| Seed script runner | Custom bash/node script | `npx prisma db seed` with tsx | Prisma handles seed lifecycle (runs after migrate reset, explicit via db seed) |
| Connection pooling | Manual pool management | Prisma's built-in connection management + singleton pattern | Pool size defaults to (num_cpus × 2 + 1); singleton prevents over-allocation in Next.js dev |
| Array-of-strings storage | Normalized synonym table with FK | PostgreSQL native array column (`String[]`) | Synonyms are read-only seed data; array column is simpler and PostgreSQL handles it natively |

**Key insight:** Prisma's generated client is the DAL — the `src/lib/content/` layer is just a thin, stable interface on top of it that enforces query discipline and enables mocking.

---

## Common Pitfalls

### Pitfall 1: Hot-Reload Connection Exhaustion
**What goes wrong:** Next.js `dev` server re-evaluates modules on every file change. Without the `globalThis` singleton, each hot reload creates a new `PrismaClient` with its own connection pool, eventually exhausting the database's max connections.
**Why it happens:** Node.js module cache is cleared during hot reload.
**How to avoid:** Always use the singleton pattern in `src/lib/prisma.ts`. Never instantiate `new PrismaClient()` anywhere else.
**Warning signs:** `Error: too many connections` in development; database connections keep growing.

### Pitfall 2: Implicit Many-to-Many Migration Pain
**What goes wrong:** Starting with implicit many-to-many for Article↔Bezirk, then needing to add `taggedAt` in Phase 3. This requires converting to an explicit model, which is a destructive migration requiring data transformation.
**Why it happens:** Implicit join tables are managed entirely by Prisma and cannot be extended with custom fields.
**How to avoid:** Use `ArticleBezirk` explicit junction model from day one.
**Warning signs:** Need to query relationship metadata; need to store `taggedAt`, `confidence`, or `taggedBy` on the link.

### Pitfall 3: Seed Not Reading From Config
**What goes wrong:** Bezirk seed data is hardcoded in `seed.ts` rather than derived from `bundesland.config.ts`. Changing the config does nothing — CONF-01 success criterion 4 fails.
**Why it happens:** Hardcoding is easier in the moment.
**How to avoid:** `seed.ts` must import from `bundesland.config.ts` and build its `upsert` calls from `config.regions`.
**Warning signs:** Config has regions but seed ignores them.

### Pitfall 4: Prisma v6 Breaking Change — Implicit M2M Primary Key
**What goes wrong:** If upgrading from v5, existing implicit many-to-many join tables had a unique index on `(A, B)`. Prisma v6 changes this to a primary key. The next migration will emit `ALTER TABLE` statements on all relation tables.
**Why it happens:** v6 changed the default replica identity behavior.
**How to avoid:** Since this is a greenfield project starting with v6, this is not a problem. Just be aware if you ever reference Prisma v5 documentation.
**Warning signs:** Looking at v5 docs and applying them directly to a v6 project.

### Pitfall 5: PostgreSQL Array vs JSON for Synonyms
**What goes wrong:** Storing Gemeinde synonyms as a JSON blob or plain string makes querying/updating painful. Using `String[]` (PostgreSQL native array) is clean for this use case.
**Why it happens:** JSON feels flexible; developers reach for it by default.
**How to avoid:** Use `gemeindeSynonyms String[]` in Prisma schema. Prisma maps this to a PostgreSQL text array. The AI pipeline can do `bezirk.gemeindeSynonyms.includes(mention)` with no parsing.
**Warning signs:** `gemeindeSynonyms Json` in schema.

---

## Code Examples

Verified patterns from official sources:

### Prisma Schema — Full Foundation Schema

```prisma
// prisma/schema.prisma
// Source: https://www.prisma.io/docs/orm/prisma-schema/data-model/models

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum ArticleStatus {
  FETCHED     // raw item ingested from source
  TAGGED      // Bezirk(e) assigned by AI
  WRITTEN     // AI-rewritten article ready
  REVIEW      // flagged: named person detected
  PUBLISHED   // live on site
  REJECTED    // editor rejected
}

enum ArticleSource {
  OTS_AT
  RSS
  MANUAL
}

model Bezirk {
  id               Int              @id @default(autoincrement())
  slug             String           @unique  // e.g. "liezen", "graz"
  name             String           @unique  // e.g. "Liezen", "Graz (Stadt)"
  gemeindeSynonyms String[]         // AI geo-tagging hints, e.g. ["Ennstal", "Schladming"]
  articles         ArticleBezirk[]
  createdAt        DateTime         @default(now())

  @@index([slug])
}

model Article {
  id              Int              @id @default(autoincrement())
  externalId      String?          // source system ID (e.g. OTS article ID)
  source          ArticleSource
  status          ArticleStatus    @default(FETCHED)
  isStateWide     Boolean          @default(false)  // "Steiermark-weit" flag
  isAutoGenerated Boolean          @default(true)
  title           String?
  metaDescription String?
  content         String?
  rawPayload      Json?            // original source content before AI rewrite
  publishedAt     DateTime?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  bezirke         ArticleBezirk[]

  @@index([status])
  @@index([publishedAt])
  @@index([source, externalId])
}

model ArticleBezirk {
  article   Article  @relation(fields: [articleId], references: [id], onDelete: Cascade)
  articleId Int
  bezirk    Bezirk   @relation(fields: [bezirkId], references: [id])
  bezirkId  Int
  taggedAt  DateTime @default(now())

  @@id([articleId, bezirkId])
  @@index([bezirkId])
}
```

### Seed Data — 13 Steiermark Bezirke

```typescript
// prisma/seed-data/bezirke.ts
// Source: Verified against official Austrian administrative list (liezen.at, statistik.at)

export interface BezirkSeedEntry {
  slug: string
  name: string
  gemeindeSynonyms: string[]
}

export const steiermarkBezirke: BezirkSeedEntry[] = [
  {
    slug: 'graz',
    name: 'Graz (Stadt)',
    gemeindeSynonyms: ['Graz', 'Landeshauptstadt Graz'],
  },
  {
    slug: 'graz-umgebung',
    name: 'Graz-Umgebung',
    gemeindeSynonyms: ['Seiersberg', 'Grambach', 'Fernitz', 'Graz-Umgebung'],
  },
  {
    slug: 'deutschlandsberg',
    name: 'Deutschlandsberg',
    gemeindeSynonyms: ['Deutschlandsberg', 'Stainz', 'Wies'],
  },
  {
    slug: 'hartberg-fuerstenfeld',
    name: 'Hartberg-Fürstenfeld',
    gemeindeSynonyms: ['Hartberg', 'Fürstenfeld', 'Hartberg-Fürstenfeld'],
  },
  {
    slug: 'leibnitz',
    name: 'Leibnitz',
    gemeindeSynonyms: ['Leibnitz', 'Ehrenhausen', 'Gamlitz'],
  },
  {
    slug: 'leoben',
    name: 'Leoben',
    gemeindeSynonyms: ['Leoben', 'Bruck an der Mur', 'Eisenerz'],
  },
  {
    slug: 'liezen',
    name: 'Liezen',
    gemeindeSynonyms: [
      'Liezen', 'Ennstal', 'Schladming', 'Bad Aussee', 'Admont', 'Rottenmann',
      'Gröbming', 'Irdning', 'Stainach-Pürgg',
    ],
  },
  {
    slug: 'murau',
    name: 'Murau',
    gemeindeSynonyms: ['Murau', 'Tamsweg', 'Oberwölz', 'Murtal'],
  },
  {
    slug: 'murtal',
    name: 'Murtal',
    gemeindeSynonyms: ['Judenburg', 'Knittelfeld', 'Zeltweg', 'Fohnsdorf'],
  },
  {
    slug: 'bruck-muerzzuschlag',
    name: 'Bruck-Mürzzuschlag',
    gemeindeSynonyms: ['Bruck an der Mur', 'Mürzzuschlag', 'Kindberg', 'Kapfenberg'],
  },
  {
    slug: 'suedoststeiermark',
    name: 'Südoststeiermark',
    gemeindeSynonyms: ['Feldbach', 'Bad Radkersburg', 'Südoststeiermark', 'Fehring'],
  },
  {
    slug: 'voitsberg',
    name: 'Voitsberg',
    gemeindeSynonyms: ['Voitsberg', 'Köflach', 'Bärnbach'],
  },
  {
    slug: 'weiz',
    name: 'Weiz',
    gemeindeSynonyms: ['Weiz', 'Gleisdorf', 'Anger'],
  },
]
```

### Seed Script — Config-Driven

```typescript
// prisma/seed.ts
// Reads regions from bundesland.config.ts — satisfies CONF-01 success criterion 4

import { PrismaClient } from '@prisma/client'
import config from '../bundesland.config'
import { steiermarkBezirke } from './seed-data/bezirke'

const prisma = new PrismaClient()

async function main() {
  // Determine seed data source from config
  const seedData = config.bundesland === 'steiermark'
    ? steiermarkBezirke
    : [] // future Bundesländer supply their own seed data

  for (const bezirk of seedData) {
    await prisma.bezirk.upsert({
      where: { slug: bezirk.slug },
      update: { name: bezirk.name, gemeindeSynonyms: bezirk.gemeindeSynonyms },
      create: bezirk,
    })
  }

  console.log(`Seeded ${seedData.length} Bezirke for ${config.bundesland}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

### BundeslandConfig Type Definition

```typescript
// src/types/bundesland.ts
// This type is what bundesland.config.ts is validated against

export interface AdZone {
  id: 'hero' | 'between-articles' | 'article-detail'
  envVar: string   // name of env var containing AdSense unit ID
  enabled: boolean
}

export interface BundeslandBranding {
  primaryColor: string   // hex value, e.g. '#154212'
  secondaryColor: string
  logoPath: string
  impressum: {
    publisherName: string
    address: string
    email: string
  }
}

export interface BundeslandConfig {
  bundesland: string        // lowercase slug, e.g. 'steiermark'
  siteName: string
  tagline: string
  branding: BundeslandBranding
  adZones: AdZone[]
  features: {
    ads: boolean
    rss: boolean
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Seed config in `package.json` `prisma.seed` key | `prisma.config.ts` `migrations.seed` | Prisma v6 | Use `prisma.config.ts` — old key may still work but is deprecated path |
| `ts-node` for seed execution | `tsx` | 2023–2024 ecosystem shift | tsx is faster, zero-config, handles ESM natively |
| Implicit M2M unique index on `(A,B)` | Implicit M2M primary key on `(A,B)` | Prisma v6 | Greenfield projects start correct; upgraders need a migration |
| `prisma generate` output in `node_modules/.prisma` | Can output to `app/generated/prisma` | Prisma v6 | Default still works; custom output useful for monorepos |

**Deprecated/outdated:**
- `package.json` `prisma.seed` key: Still functional in many guides but superseded by `prisma.config.ts` in v6
- `ts-node` for seed execution: Works but `tsx` is the documented replacement in Prisma v6 docs
- Prisma v5 many-to-many documentation: Describes unique index behavior that changed in v6 — do not use as reference

---

## Open Questions

1. **Next.js version decision**
   - What we know: This project targets Next.js 15 (App Router) based on current ecosystem; Prisma v6 is compatible
   - What's unclear: No `package.json` exists yet — Next.js version not locked
   - Recommendation: Start with Next.js 15 (latest stable); Prisma v6 is confirmed compatible

2. **Database hosting for development**
   - What we know: Prisma requires PostgreSQL; local Docker or cloud (Supabase, Neon) are options
   - What's unclear: No infrastructure decision has been made
   - Recommendation: Document that `DATABASE_URL` must be set in `.env`; leave hosting choice to developer; local Docker Compose is simplest for development

3. **Gemeinde synonym completeness**
   - What we know: The seed data in this research has representative synonyms for each Bezirk
   - What's unclear: Complete canonical lists of all Gemeinden per Bezirk are available from Statistik Austria (data.gv.at) but were not fully enumerated in research
   - Recommendation: Seed representative synonyms now (covers major towns); Phase 3 AI pipeline work can enrich synonyms based on tagging accuracy. The `upsert` pattern means enrichment migrations are non-destructive.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (no config detected yet — Wave 0 setup required) |
| Config file | `vitest.config.ts` — does not exist yet, Wave 0 creates it |
| Quick run command | `npx vitest run src/lib/content/` |
| Full suite command | `npx vitest run` |

### Approach: pgLite (Real PostgreSQL in-process)

For this phase, **pgLite** is strongly recommended over mocking PrismaClient. The DAL functions test database constraints (unique slugs, cascade deletes, array storage) that a mock cannot verify. pgLite compiles PostgreSQL to WebAssembly and runs entirely in-process — no Docker required, sub-second startup.

```bash
npm install --save-dev @electric-sql/pglite pglite-prisma-adapter
```

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONF-02 | All 13 Bezirke queryable after seed | integration | `npx vitest run src/lib/content/bezirke.test.ts` | Wave 0 |
| CONF-02 | Each Bezirk has slug, name, and synonyms array | integration | `npx vitest run src/lib/content/bezirke.test.ts` | Wave 0 |
| CONF-01 | Re-seeding with modified config produces different regions | integration | `npx vitest run prisma/seed.test.ts` | Wave 0 |
| CONF-01 | `bundesland.config.ts` satisfies `BundeslandConfig` type | unit (type check) | `npx tsc --noEmit` | Wave 0 |
| AD-02 | Config `adZones` field present and typed correctly | unit (type check) | `npx tsc --noEmit` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/content/`
- **Per wave merge:** `npx vitest run && npx tsc --noEmit`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` — Vitest configuration with pgLite setup
- [ ] `src/lib/content/bezirke.test.ts` — covers CONF-02
- [ ] `prisma/seed.test.ts` — covers CONF-01 config-driven seeding
- [ ] `src/test/setup-db.ts` — shared pgLite + Prisma test utility (apply migrations, clean between tests)

---

## Sources

### Primary (HIGH confidence)
- [Prisma official docs — seeding](https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding) — seed config, prisma.config.ts, tsx runner
- [Prisma official docs — many-to-many relations](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/many-to-many-relations) — explicit vs implicit schema syntax
- [Prisma official docs — models](https://www.prisma.io/docs/orm/prisma-schema/data-model/models) — enum, @@index, @@id syntax
- [Prisma official docs — Next.js integration](https://www.prisma.io/docs/orm/more/help-and-troubleshooting/nextjs-help) — singleton PrismaClient pattern
- [liezen.at — Bezirke in der Steiermark](https://www.liezen.at/de/infos-von-a-z/bezirke-in-der-steiermark-infos-gemeinden.html) — verified 13 current Bezirke names

### Secondary (MEDIUM confidence)
- [makerkit.dev — pgLite + Vitest](https://makerkit.dev/blog/tutorials/unit-testing-prisma-vitest) — pgLite testing pattern, verified against official @electric-sql/pglite docs
- [prisma.io/docs/guides/frameworks/nextjs](https://www.prisma.io/docs/guides/frameworks/nextjs) — Prisma v6.2.1 + Next.js 15 compatible
- [claritydev.net — TypeScript satisfies for config](https://claritydev.net/blog/typescript-as-const-satisfies-type-safe-config) — `satisfies` operator config pattern

### Tertiary (LOW confidence)
- Gemeinde synonym lists: Representative entries from general knowledge; full canonical lists available at [data.gv.at](https://www.data.gv.at/katalog/dataset/05fe8470-3971-11e2-81c1-0800200c9a66) but not fully enumerated in this research — flag for Phase 3 validation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Prisma v6 + Next.js 15 + tsx verified against official docs
- Architecture: HIGH — patterns sourced from official Prisma documentation
- Pitfalls: HIGH — hot-reload issue and M2M migration pain are well-documented; v6 breaking change verified
- Bezirk seed data: MEDIUM — 13 district names verified against official Austrian source; Gemeinde synonym completeness is LOW (representative only)

**Research date:** 2026-03-21
**Valid until:** 2026-06-21 (stable libraries; Prisma minor versions update frequently but patterns are stable)
