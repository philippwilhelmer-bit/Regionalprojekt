# Phase 47: Aerzteverzeichnis Vollkatalog und CSV-Import — Research

**Researched:** 2026-05-16
**Domain:** Bulk CSV ingest, Prisma enum migration, Vercel-serverless batch geocoding, German closed-enum UX
**Confidence:** HIGH

## Summary

Phase 47 extends the Phase-46 Ärzteverzeichnis with a bulk-import pipeline for the 3,577-row Ärztekammer Steiermark CSV. The phase is **dominated by locked decisions** (CONTEXT.md D-01..D-32 cover schema, CSV format, pipeline, geocoder, frontend, tests). Research therefore focuses on (a) verifying decision feasibility against the actual codebase, (b) filling Claude-discretion gaps (cache choice, CSV lib, transform implementation, batch geocoder form shape), and (c) confirming there are no hidden hazards in the Prisma migration sequence.

Three critical confirmations: **(1)** the Vercel function `maxDuration = 300` ceiling (5 min) is **already in use** at `src/app/api/cron/route.ts:8` — the 200-doctor batch (3.7 min) is safe. **(2)** No CSV parser is currently installed; we must add one (papaparse recommended, single new dep, requires DECISIONS.md entry per AGENTS.md anti-bloat rule). **(3)** The D-05 Fachrichtung transform was verified end-to-end against all 51 source labels — **51 unique identifiers, zero collisions**.

**Primary recommendation:** Use an **in-memory `Map<token, ParsedPreview>` cache** for dry-run state (D-15 — KV is not provisioned, in-memory survives the 15-min TTL because the admin import is single-Vercel-function-instance for the duration of the workflow). Use **papaparse** as the CSV parser. Generate the `Fachrichtung` enum statically (committed enum + label map, no runtime transform) via a one-off codegen script. Migration order: `CREATE TYPE Fachrichtung` → `TRUNCATE Doctor` → `ALTER TABLE Doctor` (add arztNr, rename website→profilUrl, alter fachrichtung type, drop kategorie) → `DROP TYPE DoctorKategorie` → recreate indexes. All in one migration directory `prisma/migrations/<ts>_phase47_csv_schema/migration.sql`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CSV upload form | Frontend Server (RSC) | API/Backend (Server Action) | Admin Server Component renders `<form action={serverAction}>`; the action parses + validates server-side. No client JS. |
| CSV parsing + validation | API/Backend (Server Action) | — | Pure server-side: papaparse runs in Node, validates against Bezirk enum + Fachrichtung enum. Never trust client. |
| Dry-run preview cache | API/Backend (in-process Map) | — | Single Vercel function instance for ~15 min TTL; admin workflow is single-editor sequential. KV adds infra surface without benefit at this scale (D-15 KV vs. in-memory tradeoff). |
| Upsert pipeline | Database/Storage (Prisma) | API/Backend (transaction) | `db.$transaction([...upsertOps])` per established Phase 44 INGEST-05 pattern. |
| Batch geocoder | API/Backend (Server Action) | External (Nominatim) | Sequential geocode loop with `await sleep(1100)`; reuses `geocodeLocation` + `generateMapImage`. Runs under `maxDuration = 300`. |
| Fachrichtung filter UI | Frontend Server (RSC) | Browser (`<datalist>`) | HTML5 `<datalist>` requires no JS framework; form submits via query-param; same pattern as Phase 46 `DoctorPublicFilters` text input but with native autocomplete. |
| JSON-LD on detail page | Frontend Server (RSC) | — | Generated in `buildDoctorJsonLd`; pure transform. |
| Enum value catalog | API/Backend (TypeScript constant) | Database (Prisma enum) | `FACHRICHTUNG_LABELS: Record<Fachrichtung, string>` co-located with Prisma enum — single source of truth. |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `papaparse` | 5.5.x | CSV parsing with multi-line quoted values, header validation, streaming optional | Most popular CSV lib in JS ecosystem; handles UTF-8 BOM, multi-line quoted strings (D-07), strict header validation. Sync API fits Server-Action use. Single new dep — keeps anti-bloat budget tight. `[ASSUMED]` — needs `npm view papaparse version` verification at install time. |
| `@types/papaparse` | 5.3.x | TypeScript types | Project is fully typed (`tsc --noEmit` in build pipeline). `[ASSUMED]` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@prisma/client` | 6.19.2 (already installed) | Schema + upsert + `$transaction` | All DB writes. `[VERIFIED: package.json]` |
| `zod` | 3.25.76 (already installed) | Server-side input validation | Validate per-row `{Bezirk, Fachrichtung, ArztNr, …}` types if we choose schema-driven validation. Optional — manual validation also works. `[VERIFIED: package.json]` |
| `@vercel/blob` | 2.3.3 (already installed) | (not used in Phase 47) | Map images via existing `generateMapImage` indirection. `[VERIFIED: package.json]` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `papaparse` | `csv-parse` (node-csv) | csv-parse has streaming + async iterators (good for very large files), but stricter API. For a one-time 3,577-row sync parse, papaparse is simpler. |
| `papaparse` | Hand-rolled `split('\n')` + state machine for quoted commas | AGENTS.md "Don't Hand-Roll" applies — multi-line CSV-quoted strings (e.g. `"Hals-, Nasen- und Ohrenheilkunde"`) require a real parser. Hand-rolling re-creates known footguns. |
| In-memory cache for dry-run | Vercel KV | KV adds new infra surface (env vars, billing, eventual-consistency), zero benefit for single-editor workflow at this scale. |
| In-memory cache for dry-run | Re-parse on commit (no cache) | Idempotent and simplest, but admin sees "X conflicts" and a "Commit Import" button — re-parse means re-uploading the file. Cache-keyed-by-token gives the cleaner UX. |
| Vercel KV | Database staging table | A `DoctorImportPreview` Prisma table would be more durable, but adds schema surface for a transient artifact. Rejected per anti-bloat. |

**Installation:**

```bash
npm install papaparse
npm install --save-dev @types/papaparse
```

**Version verification (REQUIRED at install time):**

```bash
npm view papaparse version
npm view @types/papaparse version
```

Adding `papaparse` requires a DECISIONS.md entry per AGENTS.md anti-bloat rule ("KEINE neuen npm-Dependencies ohne Eintrag in DECISIONS.md"). Suggested entry: rationale = "CSV multi-line quoted-value parsing required for Phase 47 import; npm-ecosystem standard; sync API fits Server Action; rejected csv-parse (stricter), rejected hand-roll (D-07 multi-line)."

## Package Legitimacy Audit

> slopcheck CLI was not available in this research environment. All packages below are tagged `[ASSUMED]`. The planner MUST insert a `checkpoint:human-verify` task immediately before the install commit, asking the operator to (a) run `npm view papaparse version` and `npm view @types/papaparse version` to confirm the registry returns reasonable metadata (publish date ≥1 year old, downloads/week > 1M for papaparse), and (b) cross-check against the official site `https://www.papaparse.com/` to ensure the npm name matches.

| Package | Registry | Age (claimed) | Downloads (claimed) | Source Repo | slopcheck | Disposition |
|---------|----------|---------------|---------------------|-------------|-----------|-------------|
| `papaparse` | npm | ~10 yrs (assumed) | >5M/week (assumed) | github.com/mholt/PapaParse (assumed) | not run | **ASSUMED** — gate at install with human-verify |
| `@types/papaparse` | npm | DefinitelyTyped (assumed) | aligned to papaparse | github.com/DefinitelyTyped/DefinitelyTyped (assumed) | not run | **ASSUMED** — gate at install with human-verify |

**Packages removed due to slopcheck [SLOP] verdict:** none (slopcheck not run)
**Packages flagged as suspicious [SUS]:** none (slopcheck not run)

## Architecture Patterns

### System Architecture Diagram

```
[Admin (browser)]
     │ uploads CSV file
     ▼
[/admin/aerzte/import RSC]
     │ <form action={parseAndPreviewCsvAction}>
     ▼
[parseAndPreviewCsvAction (Server Action)]
     │ requireAuth()
     │ → papaparse.parse(buffer)
     │ → validate header (D-06)
     │ → for each row: validate Bezirk (alias map D-10) + Fachrichtung enum + required fields (D-08)
     │ → dedupe within batch on arztNr (last-write-wins, D-18)
     │ → write {token, parsedRows[], conflicts[]} → IN_MEMORY_PREVIEW_CACHE (15-min TTL)
     │ → return {token, summary, conflicts[]}
     ▼
[/admin/aerzte/import RSC re-render]
     │ shows summary line + collapsible conflicts table
     │ "Commit Import" <form action={commitCsvImportAction}>
     ▼
[commitCsvImportAction (Server Action)]
     │ requireAuth()
     │ → load parsedRows by token
     │ → db.$transaction([upsert × N])  (D-14, D-16)
     │   - For each row: upsert keyed on arztNr
     │   - If existing and address changed → set lat=null, lon=null, mapImageUrl=null (D-17)
     │   - Editorial fields NEVER in update payload (D-16 allow-list)
     │ → redirect /admin/aerzte?imported=N
     ▼
[/admin/aerzte RSC]
     │ shows "X von Y Ärzte geocoded (Z ausstehend)" counter (D-22)
     │ "Geocode next 200" button → <form action={geocodeBatchAction}>
     ▼
[geocodeBatchAction (Server Action — maxDuration=300)]
     │ requireAuth()
     │ → SELECT WHERE lat IS NULL LIMIT 200
     │ → for each: geocodeLocation() → updateDoctorDb(geo) → generateMapImage()
     │ → await sleep(1100) between geocode calls (AGENTS.md Nominatim rule)
     │ → return {processed, remaining}
     ▼
[Nominatim API]   (1 req/s)
```

Notes:
- All three Server Actions live in `src/lib/admin/doctors-actions.ts` extension or a new sibling `src/lib/admin/doctors-import-actions.ts` (planner picks; sibling preferred to keep diff focused). All three follow the Server-Action-Trinity Db/Action/Form pattern.
- `IN_MEMORY_PREVIEW_CACHE` is a `Map<string, { rows, conflicts, createdAt }>` module-scoped in the import-actions file; entries pruned on read if `Date.now() - createdAt > 15*60_000`.
- The Vercel function instance reuse assumption holds in practice: a single editor's "upload → preview → commit" sequence completes in the same warm function instance because the upload triggers the cold-start, then preview/commit hit the warm instance within ~30s. If cold-start drops the cache, the user re-uploads — same UX as 15-min TTL expiry. **Acceptable per D-15.**

### Recommended Project Structure

```
src/lib/admin/
├── doctors-actions.ts                       # Phase 46 — extended for editorial fields only
├── doctors-import-actions.ts                # NEW — Phase 47 import + batch geocode actions
└── import/
    ├── fachrichtung-mapping.ts              # NEW — generated FACHRICHTUNG_LABELS map + helpers
    ├── csv-parser.ts                        # NEW — papaparse wrapper, header/row validation
    ├── csv-parser.test.ts                   # NEW — D-31 unit tests
    └── bezirk-alias.ts                      # NEW — "Graz-Stadt" → "graz" alias map (D-10)

src/app/(admin)/admin/aerzte/
├── page.tsx                                 # Phase 46 — extended with geocode counter + button
├── DoctorRow.tsx                            # Phase 46 — minor: kategorie chip → fachrichtung pill
├── DoctorFilters.tsx                        # Phase 46 — drop kategorie filter
├── DoctorForm.tsx                           # Phase 46 — kategorie field removed, fachrichtung becomes <select>
├── import/
│   ├── page.tsx                             # NEW — RSC with upload form + preview render
│   └── ImportPreview.tsx                    # NEW — RSC component for summary + conflicts table
└── [id]/edit, new/                          # Phase 46 — minor form updates

src/app/(public)/aerzte/
├── page.tsx                                 # Phase 46 — kategorie filter dropped, fachrichtung filter rewritten
├── DoctorPublicFilters.tsx                  # Phase 46 — rewrite Fachrichtung input to <datalist>
└── [publicId]/[slug]/page.tsx               # Phase 46 — JSON-LD branch removal, website → profilUrl label

prisma/
├── schema.prisma                            # Modified: Fachrichtung enum, Doctor field changes
├── migrations/<ts>_phase47_csv_schema/
│   └── migration.sql                        # NEW — see migration order section
└── (no seed.ts changes)

test/fixtures/
└── aerzte-sample.csv                        # NEW — 10-row representative fixture (D-30)

scripts/
└── extract-fachrichtung-fixture.ts          # Optional one-off helper (D-30)
```

### Pattern 1: In-memory cache keyed by session token

**What:** Module-scoped `Map<string, ParsedPreview>` in `doctors-import-actions.ts` to hold the dry-run parsed rows between the "preview" and "commit" actions.
**When to use:** Dry-run + commit two-step workflows on Vercel serverless where (a) a single editor performs the sequence end-to-end, (b) the workflow tolerates cache loss (user re-uploads), and (c) the data is too large to ship through the client (3,577 rows × ~7 fields = ~600 KB).
**Example:**

```typescript
// src/lib/admin/doctors-import-actions.ts
'use server'

import { randomUUID } from 'node:crypto'
import type { ParsedRow, RowConflict } from './import/csv-parser'

interface CachedPreview {
  rows: ParsedRow[]
  conflicts: RowConflict[]
  createdAt: number
}

// Module-scoped — survives within a single warm Vercel function instance.
// Cold start → cache empty → user re-uploads (UX matches 15-min TTL expiry).
const PREVIEW_CACHE = new Map<string, CachedPreview>()
const TTL_MS = 15 * 60 * 1000

function pruneExpired() {
  const cutoff = Date.now() - TTL_MS
  for (const [token, entry] of PREVIEW_CACHE) {
    if (entry.createdAt < cutoff) PREVIEW_CACHE.delete(token)
  }
}

export function setPreview(rows: ParsedRow[], conflicts: RowConflict[]): string {
  pruneExpired()
  const token = randomUUID()
  PREVIEW_CACHE.set(token, { rows, conflicts, createdAt: Date.now() })
  return token
}

export function getPreview(token: string): CachedPreview | null {
  pruneExpired()
  return PREVIEW_CACHE.get(token) ?? null
}
```

Source: established Node.js module-scope singleton pattern; no library required.

### Pattern 2: Prisma `$transaction([...])` array form for bulk upsert

**What:** Run N upserts in a single Postgres transaction so a partial commit on crash is impossible.
**When to use:** Bulk import that must be all-or-nothing.
**Example:**

```typescript
// Source: src/lib/ingestion/ingest.ts:105 (Phase 44 INGEST-05)
const upsertOps = parsedRows.map((row) =>
  db.doctor.upsert({
    where: { arztNr: row.arztNr },
    create: {
      arztNr: row.arztNr,
      name: row.name,
      fachrichtung: row.fachrichtung,
      address: row.address,
      phone: row.phone ?? null,
      profilUrl: row.profilUrl ?? null,
      bezirkId: row.bezirkId,
      // editorial fields fall through to DB defaults (null/false/[])
    },
    update: {
      name: row.name,
      fachrichtung: row.fachrichtung,
      address: row.address,
      phone: row.phone ?? null,
      profilUrl: row.profilUrl ?? null,
      bezirkId: row.bezirkId,
      // D-17: if address changed, null out geo so batch geocoder re-runs
      ...(row.addressChanged ? { lat: null, lon: null, mapImageUrl: null } : {}),
      // Editorial fields (titel, email, editorialNote, relatedArticleIds,
      // isVerified, mapImageUrl, lat, lon) are NEVER in this payload — D-16.
    },
  })
)
await db.$transaction(upsertOps)
```

Note: `addressChanged` is computed in a pre-transaction read pass (single `findMany({where:{arztNr:{in:[...]}}, select:{arztNr:true, address:true}})`); inside-transaction read-modify-write at 3,577 rows is too slow.

### Pattern 3: Batch geocoder with sleep + maxDuration

**What:** Sequential loop over 200 doctors per click, awaiting Nominatim's 1 req/s rate limit.
**When to use:** When bulk geocoding cannot fit synchronously into a normal request (or cron) and the editor accepts manual triggering.
**Example:**

```typescript
// src/lib/admin/doctors-import-actions.ts
'use server'
export const maxDuration = 300  // 5 min — Vercel Hobby cap

export async function geocodeBatchAction(): Promise<{ processed: number; remaining: number }> {
  await requireAuth()
  const candidates = await defaultPrisma.doctor.findMany({
    where: { lat: null },
    select: { id: true, name: true, address: true },
    take: 200,
  })
  let processed = 0
  for (const doc of candidates) {
    const geo = await geocodeLocation(defaultPrisma, doc.address)
    await new Promise((r) => setTimeout(r, 1100))   // AGENTS.md Nominatim rule
    if (!geo) continue
    let mapImageUrl: string | null = null
    try {
      const map = await generateMapImage(geo.lat, geo.lon, doc.name, doc.id, geo.locationType, { pathPrefix: 'doctor' })
      if (map) mapImageUrl = map.url
    } catch (err) {
      console.warn(`[geocode-batch] mapgen failed for doctor=${doc.id}: ${String(err)}`)
    }
    await defaultPrisma.doctor.update({
      where: { id: doc.id },
      data: { lat: geo.lat, lon: geo.lon, mapImageUrl },
    })
    processed++
  }
  const remaining = await defaultPrisma.doctor.count({ where: { lat: null } })
  return { processed, remaining }
}
```

Note: `maxDuration = 300` is **already in use** in `src/app/api/cron/route.ts:8` — proves the 5-min cap is available on the current Vercel plan. No vercel.json change needed.

### Pattern 4: Migration order (Prisma + raw SQL)

The migration must run as a single `migration.sql` file. Prisma will not auto-derive this — it would try to ALTER the column with the old enum still in use, hitting a Postgres error. Hand-author the SQL:

```sql
-- Phase 47: CSV-import schema upgrade
-- Order: enum DDL first → TRUNCATE old data → ALTER table → DROP old enum

-- 1. Create the new Fachrichtung enum (D-04, D-05).
CREATE TYPE "Fachrichtung" AS ENUM (
  'ALLGEMEINMEDIZIN',
  'ALLGEMEINMEDIZIN_UND_FAMILIENMEDIZIN',
  'INNERE_MEDIZIN',
  -- ... 48 more (see Fachrichtung Identifier Catalog below)
  'MEDIZINISCHE_GENETIK'
);

-- 2. Wipe Phase 46 test/seed rows (D-12).
--    CASCADE not needed — no FK references TO Doctor in current schema.
TRUNCATE TABLE "Doctor" RESTART IDENTITY;

-- 3. Schema changes — single ALTER TABLE statement is cleanest.
ALTER TABLE "Doctor"
  DROP COLUMN "kategorie",
  DROP COLUMN "fachrichtung",
  ADD COLUMN "arztNr"       TEXT          NOT NULL,
  ADD COLUMN "fachrichtung" "Fachrichtung" NOT NULL,
  ADD COLUMN "profilUrl"    TEXT;

-- 4. Drop "website" column AFTER profilUrl exists (no data migration — table is empty).
ALTER TABLE "Doctor" DROP COLUMN "website";

-- 5. Unique constraint on arztNr (D-01).
CREATE UNIQUE INDEX "Doctor_arztNr_key" ON "Doctor"("arztNr");

-- 6. Replace the kategorie index with a fachrichtung index (D-03 + D-04).
--    The kategorie index was dropped automatically by step 3's DROP COLUMN.
CREATE INDEX "Doctor_fachrichtung_idx" ON "Doctor"("fachrichtung");

-- 7. Drop the now-unused DoctorKategorie enum (D-03).
DROP TYPE "DoctorKategorie";
```

**Ordering hazards investigated:**
- **DROP COLUMN drops dependent indexes automatically** — Postgres behaviour, no separate `DROP INDEX` needed. (Confirmed: PostgreSQL docs say "any indexes that depend on the column are automatically dropped".) Answers research question #3.
- **DROP TYPE must come AFTER the column using it is dropped** — Step 7 after step 3.
- **TRUNCATE before ALTER** — must wipe data BEFORE adding `arztNr NOT NULL` (no DEFAULT possible since arztNr is per-row), and BEFORE altering `fachrichtung String? → Fachrichtung NOT NULL` (otherwise USING clause needed for invalid strings).
- The `ADD COLUMN "fachrichtung" Fachrichtung NOT NULL` works because table is empty (step 2). If there were rows, we'd need a `USING fachrichtung::Fachrichtung` clause and pre-validation.
- `prisma/schema.prisma` must be updated in the same commit. The `prisma migrate dev` workflow will detect the schema diff but produce a wrong migration — the planner should run `prisma migrate dev --create-only`, then **manually replace** the generated SQL with the hand-authored sequence above, then `prisma migrate dev` to apply.

### Anti-Patterns to Avoid

- **Hand-rolled CSV split**: `line.split(',')` breaks on `"Hals-, Nasen- und Ohrenheilkunde"` (D-07). Use papaparse.
- **Synchronous geocoding during import**: would consume the full Vercel 5-min budget on the FIRST 270 rows of the 3,577 (D-19). Always import → null-geo → batch geocode later.
- **Letting Prisma auto-generate the phase-47 migration**: `prisma migrate dev` will not safely sequence DROP TYPE + ALTER COLUMN + TRUNCATE — hand-author the SQL.
- **`instanceof PrismaClient` for DI dispatch**: per AGENTS.md, use `'$connect' in clientOrOptions`. Phase 46 doctors.ts:46-47 is the reference.
- **Importing `redirect`/`revalidatePath` at top-level in test-exercised modules**: Phase 46 doctors-actions.ts uses dynamic `await import('next/navigation')` inside Form wrappers — keep the pattern.
- **`as instanceof File` in FormData parsing**: use `formData.get('file')` and check `typeof value === 'object' && 'arrayBuffer' in value` for cross-runtime safety.
- **Inline-defining the FACHRICHTUNG_LABELS map in 3 places**: define once in `src/lib/admin/import/fachrichtung-mapping.ts`, import everywhere.
- **Putting the 3,577-row file in the repo**: explicit non-goal in CONTEXT.md canonical_refs section — only the 10-row sample lives in `test/fixtures/aerzte-sample.csv`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing with quoted multi-line values | Custom state machine over `for-of` chars | `papaparse` | Multi-line quoted strings, escaped quotes, BOM stripping, header validation all in one. |
| UUID for session token | `Math.random()` or counter | `crypto.randomUUID()` (Node built-in) | Built-in, secure, no dep. |
| Sleep for Nominatim rate limit | `setTimeout` wrapped manually each call | `await new Promise((r) => setTimeout(r, 1100))` inline | Phase 46 pattern (`backfillMapImages` in `map-actions.ts:130`) — match exactly. |
| Batch Prisma upsert | Loop with `for (...) await db.doctor.upsert(...)` | `db.$transaction(parsedRows.map(...).map(db.doctor.upsert))` | Atomic; matches Phase 44 INGEST-05 pattern (`ingest.ts:105`). |
| German label → enum identifier transform | Compute at runtime | Code-generate at build time, commit the map | Static enum + static label map = compile-time enum exhaustiveness checks; runtime transform = drift risk. |

**Key insight:** Phase 47 has very few genuinely new patterns — every concern (Server-Action-Trinity, two-phase create, geocode + mapgen, Nominatim rate-limit, sitemap, JSON-LD, design tokens) has an established Phase 46 implementation to mirror. The only genuinely new external dependency is `papaparse`.

## Runtime State Inventory

> Required because Phase 47 includes a rename (`website` → `profilUrl`), a column drop (`kategorie`), and an enum rename (`DoctorKategorie` → removed, `fachrichtung` String → `Fachrichtung` enum). A grep-only audit would miss runtime state.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | (a) Phase 46 Doctor rows in production are test/seed only per STATE.md "Phase 46 SHIPPED 2026-05-14… end-to-end smoke approved." User locked WIPE-AND-RELOAD in D-12. (b) `GeocodingCache` table is keyed on `normalizedName` (address string), NOT on Doctor.id — survives the TRUNCATE; cached lookups for Steiermark addresses can be REUSED by the batch geocoder. | (a) TRUNCATE in migration step 2 (confirmed in migration SQL above). (b) None — cached entries help reduce Nominatim calls during the 18-batch geocoding sweep. |
| **Live service config** | None found. Vercel cron config (`vercel.json`) only references `/api/cron`, not any doctor route. No external service has `Fachrichtung` or `kategorie` strings cached. | None. |
| **OS-registered state** | None. Project is Vercel-only deploy; no Windows Task Scheduler, no pm2, no systemd registrations. | None. |
| **Secrets and env vars** | None. No env var references `kategorie`, `website` (the Doctor field), or `DoctorKategorie`. `CRON_SECRET` and DB URL are unaffected. | None. |
| **Build artifacts / installed packages** | (a) Prisma client (`@prisma/client`) regenerates on `postinstall` → `prisma generate` (verified in `package.json:7`). Old enum types removed from generated client on next install. (b) Vercel build cache may contain stale `next/static` chunks referencing the old `DoctorKategorie` import — purged on next deploy. (c) `node_modules/.prisma/client` requires `prisma generate` after schema change (handled by `postinstall`). | (a) None — automatic. (b) None — Vercel handles. (c) Document in the plan that `npm install` or `npx prisma generate` must run after the schema edit but before tests. |

**Canonical question:** *After every file in the repo is updated, what runtime systems still have the old string cached, stored, or registered?* Answer: **nothing in production data, nothing in OS/service config, nothing in secrets**. The only artifact is the Prisma generated client, which regenerates automatically. Phase 46 was shipped with test-only data, so the schema's "real" baseline is the CSV import itself.

## Common Pitfalls

### Pitfall 1: Prisma `migrate dev` rewrites our hand-authored SQL

**What goes wrong:** Running `prisma migrate dev` AFTER editing schema.prisma without `--create-only` will generate a NEW migration alongside the hand-authored one, or worse, replace it.
**Why it happens:** Prisma derives the migration from schema diff; if the migration file exists but doesn't match what Prisma expects, it considers the schema drifted.
**How to avoid:**
1. Edit `schema.prisma` first (enum + field changes).
2. Run `npx prisma migrate dev --create-only --name phase47_csv_schema` — creates an empty migration directory.
3. **Manually replace** the generated `migration.sql` with the hand-authored sequence (TRUNCATE + ALTER + DROP TYPE).
4. Run `npx prisma migrate dev` to apply.
5. Commit BOTH `schema.prisma` and `prisma/migrations/<ts>_phase47_csv_schema/migration.sql`.
**Warning signs:** `prisma migrate status` shows "drift detected" → your manual SQL did something the schema doesn't reflect, OR your schema has changes the migration doesn't apply.

### Pitfall 2: Stale Prisma client after schema change

**What goes wrong:** Test files import `Fachrichtung` from `@prisma/client`, but the generated client still has only `DoctorKategorie`. TS errors everywhere.
**Why it happens:** `prisma generate` only runs on `npm install` (postinstall hook) or explicit invocation.
**How to avoid:** After editing `schema.prisma`, run `npx prisma generate` before `tsc --noEmit` or `vitest`. Add a `# Prerequisite` note in the plan tasks.
**Warning signs:** `TS2305: Module '"@prisma/client"' has no exported member 'Fachrichtung'` despite the schema change being applied.

### Pitfall 3: Vercel function cold-start drops in-memory preview cache

**What goes wrong:** Editor uploads CSV, walks away for 10 min, comes back to click "Commit Import" → cache empty → import fails with "preview expired".
**Why it happens:** Vercel functions scale to zero; module-scoped Maps live only as long as the function instance.
**How to avoid:** Surface the failure UX as "session abgelaufen — bitte erneut hochladen" with a re-upload button. Match Phase 46 admin error-message tone. The D-15 alternative (re-parse on commit by re-uploading) is what we fall back to anyway.
**Warning signs:** `getPreview(token)` returns null in commit action despite preview having returned a token earlier.

### Pitfall 4: papaparse `header: true` parses values as strings only

**What goes wrong:** Editor expects `bezirkId` to be a number, gets a string `"5"` and Prisma rejects on type mismatch.
**Why it happens:** papaparse's default `dynamicTyping: false` keeps everything as strings.
**How to avoid:** Either set `dynamicTyping: true` in papaparse options OR coerce explicitly when mapping CSV row → Prisma input. Recommended: **explicit coercion** in the row-validator — preserves clarity. The CSV columns are all strings anyway (Bezirk name, Fachrichtung label, ArztNr is a string per D-01); only the Prisma `bezirkId` (resolved from Bezirk name lookup) is a number.
**Warning signs:** Prisma `PrismaClientValidationError: Argument 'bezirkId' expected Int, provided String`.

### Pitfall 5: papaparse silently tolerates malformed quotes

**What goes wrong:** A row with a stray unescaped quote is parsed differently than expected; preview shows "looks fine" but commit fails inside the transaction.
**Why it happens:** papaparse defaults to graceful recovery; errors are in `results.errors`, not thrown.
**How to avoid:** After calling `Papa.parse(csvText, ...)`, inspect `results.errors`. If non-empty AND any error has `type === "Quotes"` or `type === "FieldMismatch"`, reject the entire upload — do not proceed to row-by-row validation.
**Warning signs:** Preview shows 3,577 rows parsed, conflicts table is small, but commit transaction fails on row 1,847 with a confusing Prisma error.

### Pitfall 6: Vitest pglite test DB applies migrations alphabetically — new migration must sort AFTER phase46

**What goes wrong:** Phase 47 migration uses timestamp `20260516_phase47_csv_schema` which sorts AFTER `20260515_phase46_doctors` — correct. But if the planner picks a date earlier than 2026-05-15 (e.g. during clock-skew or copy-paste from another phase), the tests apply migrations in wrong order and fail.
**Why it happens:** `src/test/setup-db.ts:loadMigrationSql()` reads `prisma/migrations/` and concatenates SQL in directory-sorted order (lexicographic on directory name).
**How to avoid:** Use today's date (or later) for the migration directory name: `20260516_phase47_csv_schema` or `20260517_…`. Verify directory sorts after `20260515_phase46_doctors`.
**Warning signs:** `vitest run` errors with "type DoctorKategorie does not exist" — Phase 47 migration ran before Phase 46 because its prefix sorted earlier.

### Pitfall 7: Re-uploading the same CSV twice double-commits

**What goes wrong:** Editor uploads, previews, commits → 3,577 rows imported. Re-uploads same file → preview says "0 new, 3,577 updates, 0 conflicts" → editor commits "to be safe" → all 3,577 rows are UPDATEd (no-op effectively, but the SQL writes happen).
**Why it happens:** Upsert is idempotent — that's the point per D-16. The double-commit is harmless (editorial fields untouched, CSV fields identical → no semantic change). BUT updatedAt changes, triggering the "address changed" detection if there's a subtle whitespace drift.
**How to avoid:** Use **exact string equality** for D-17 address-change detection (matching Phase 46 D-31: `input.address !== prev.address`). Do NOT trim/lowercase — if the editor wants to re-clear geo, they should edit one row manually. The CSV bytes are identical → addresses are identical → no spurious geo-clearing.
**Warning signs:** After a re-import of identical data, the geocode counter "X / Y geocoded" drops to 0 / Y. Means the address comparison normalized whitespace and triggered false-positive change detection.

## Code Examples

### Bezirk alias resolution (D-10)

```typescript
// src/lib/admin/import/bezirk-alias.ts
// Source: bundesland.config.ts:42-56 (Bezirk seed) + CSV header inspection

// The CSV has one Bezirk name that doesn't exact-match the DB seed:
//   CSV "Graz-Stadt" → DB "Graz (Stadt)" (slug "graz")
// All other 12 Bezirk names match exactly.
const BEZIRK_ALIAS: Record<string, string> = {
  'Graz-Stadt': 'Graz (Stadt)',
}

export function resolveBezirkName(csvName: string): string {
  return BEZIRK_ALIAS[csvName] ?? csvName
}

// Used by the row-validator:
//   const dbName = resolveBezirkName(row.Bezirk)
//   const bezirk = await db.bezirk.findUnique({ where: { name: dbName } })
//   if (!bezirk) return { rejected: true, reason: `Unbekannter Bezirk: "${row.Bezirk}"` }
```

### CSV row validation skeleton

```typescript
// src/lib/admin/import/csv-parser.ts
import Papa from 'papaparse'
import type { Fachrichtung } from '@prisma/client'
import { FACHRICHTUNG_BY_LABEL } from './fachrichtung-mapping'
import { resolveBezirkName } from './bezirk-alias'

const REQUIRED_HEADER = ['Bezirk', 'Fachrichtung', 'Name', 'Adresse', 'Telefonnummer', 'ArztNr', 'ProfilURL']

export interface ParsedRow {
  arztNr: string
  name: string
  fachrichtung: Fachrichtung
  bezirkName: string       // resolved to DB name (post-alias)
  address: string
  phone: string | null
  profilUrl: string | null
}

export interface RowConflict {
  csvLineNumber: number    // 1-based, header is line 1, first data row is line 2
  arztNr: string | null    // null if ArztNr cell was empty
  reason: string           // German user-facing message
}

export interface ParseResult {
  rows: ParsedRow[]
  conflicts: RowConflict[]
}

export function parseDoctorsCsv(csvText: string): ParseResult {
  // Strip BOM if present (D-07)
  const cleaned = csvText.replace(/^\uFEFF/, '')

  const result = Papa.parse<Record<string, string>>(cleaned, {
    header: true,
    skipEmptyLines: 'greedy',     // also skips whitespace-only lines
    dynamicTyping: false,
  })

  // Fail-fast on header mismatch (D-06)
  const actualHeader = result.meta.fields ?? []
  if (
    actualHeader.length !== REQUIRED_HEADER.length ||
    !REQUIRED_HEADER.every((h, i) => actualHeader[i] === h)
  ) {
    throw new Error(
      `Ungültiger CSV-Header. Erwartet: ${REQUIRED_HEADER.join(',')}. Erhalten: ${actualHeader.join(',')}`,
    )
  }

  // Fail-fast on Quotes/FieldMismatch errors (Pitfall 5)
  const fatalErrors = result.errors.filter(
    (e) => e.type === 'Quotes' || e.type === 'FieldMismatch',
  )
  if (fatalErrors.length > 0) {
    throw new Error(`CSV ist fehlerhaft formatiert: ${fatalErrors[0].message}`)
  }

  const rows: ParsedRow[] = []
  const conflicts: RowConflict[] = []
  const seenArztNr = new Map<string, number>() // arztNr → row index in `rows`

  result.data.forEach((row, i) => {
    const lineNumber = i + 2  // +1 for 0-index, +1 for header
    const arztNr = (row.ArztNr ?? '').trim()
    if (!arztNr) {
      conflicts.push({ csvLineNumber: lineNumber, arztNr: null, reason: 'ArztNr fehlt' })
      return
    }
    // ... validate Bezirk via alias, Fachrichtung via FACHRICHTUNG_BY_LABEL, required fields,
    //     dedupe within batch (D-18: later wins) ...
  })

  return { rows, conflicts }
}
```

### Generated Fachrichtung enum + label map

```typescript
// src/lib/admin/import/fachrichtung-mapping.ts
// GENERATED — do not edit manually. Source: fachrichtung-values.txt (51 entries).
// Re-generate via scripts/generate-fachrichtung-mapping.ts if the source changes.
import type { Fachrichtung } from '@prisma/client'

export const FACHRICHTUNG_LABELS: Record<Fachrichtung, string> = {
  ALLGEMEINMEDIZIN: 'Allgemeinmedizin',
  ALLGEMEINMEDIZIN_UND_FAMILIENMEDIZIN: 'Allgemeinmedizin und Familienmedizin',
  INNERE_MEDIZIN: 'Innere Medizin',
  FRAUENHEILKUNDE_UND_GEBURTSHILFE: 'Frauenheilkunde und Geburtshilfe',
  AUGENHEILKUNDE_UND_OPTOMETRIE: 'Augenheilkunde und Optometrie',
  ALLGEMEINCHIRURGIE_UND_VISZERALCHIRURGIE: 'Allgemeinchirurgie und Viszeralchirurgie',
  ORTHOPAEDIE_UND_TRAUMATOLOGIE: 'Orthopädie und Traumatologie',
  UNFALLCHIRURGIE: 'Unfallchirurgie',
  ORTHOPAEDIE_UND_ORTHOPAEDISCHE_CHIRURGIE: 'Orthopädie und Orthopädische Chirurgie',
  PSYCHIATRIE_U_PSYCHOTHERAPEUTISCHE_MEDIZIN: 'Psychiatrie u. Psychotherapeutische Medizin',
  HAUT_UND_GESCHLECHTSKRANKHEITEN: 'Haut- und Geschlechtskrankheiten',
  KINDER_UND_JUGENDHEILKUNDE: 'Kinder- und Jugendheilkunde',
  HALS_NASEN_UND_OHRENHEILKUNDE: 'Hals-, Nasen- und Ohrenheilkunde',
  NEUROLOGIE: 'Neurologie',
  RADIOLOGIE: 'Radiologie',
  UROLOGIE: 'Urologie',
  ANAESTHESIOLOGIE_UND_INTENSIVMEDIZIN: 'Anästhesiologie und Intensivmedizin',
  PLASTISCHE_REKONSTRUKTIVE_U_AESTHETISCHE_CHIRURGIE: 'Plastische, Rekonstruktive u. Ästhetische Chirurgie',
  INNERE_MEDIZIN_UND_KARDIOLOGIE: 'Innere Medizin und Kardiologie',
  LUNGENKRANKHEITEN: 'Lungenkrankheiten',
  PSYCHIATRIE_UND_NEUROLOGIE: 'Psychiatrie und Neurologie',
  MUND_KIEFER_UND_GESICHTSCHIRURGIE: 'Mund-, Kiefer- und Gesichtschirurgie',
  NEUROLOGIE_UND_PSYCHIATRIE: 'Neurologie und Psychiatrie',
  NEUROCHIRURGIE: 'Neurochirurgie',
  KINDER_U_JUGENDPSYCHIATRIE_U_PSYCHOTHERAPEUTISCHE_MEDIZIN: 'Kinder- u. Jugendpsychiatrie u. Psychotherapeutische Medizin',
  APPROBIERTER_ARZT: 'Approbierter Arzt',
  MEDIZINISCHE_UND_CHEMISCHE_LABORDIAGNOSTIK: 'Medizinische und Chemische Labordiagnostik',
  PHYSIKALISCHE_MEDIZIN_U_ALLGEMEINE_REHABILITATION: 'Physikalische Medizin u. Allgemeine Rehabilitation',
  PSYCHIATRIE: 'Psychiatrie',
  ALLGEMEINCHIRURGIE_UND_GEFAESSCHIRURGIE: 'Allgemeinchirurgie und Gefäßchirurgie',
  INNERE_MEDIZIN_UND_PNEUMOLOGIE: 'Innere Medizin und Pneumologie',
  NUKLEARMEDIZIN: 'Nuklearmedizin',
  KINDER_UND_JUGENDPSYCHIATRIE: 'Kinder- und Jugendpsychiatrie',
  KLINISCHE_PATHOLOGIE_UND_MOLEKULARPATHOLOGIE: 'Klinische Pathologie und Molekularpathologie',
  KINDER_UND_JUGENDCHIRURGIE: 'Kinder- und Jugendchirurgie',
  HERZCHIRURGIE: 'Herzchirurgie',
  INNERE_MEDIZIN_UND_GASTROENTEROLOGIE_UND_HEPATOLOGIE: 'Innere Medizin und Gastroenterologie und Hepatologie',
  KLINISCHE_MIKROBIOLOGIE_UND_HYGIENE: 'Klinische Mikrobiologie und Hygiene',
  STRAHLENTHERAPIE_RADIOONKOLOGIE: 'Strahlentherapie-Radioonkologie',
  ANATOMIE: 'Anatomie',
  KLINISCHE_IMMUNOLOGIE: 'Klinische Immunologie',
  THORAXCHIRURGIE: 'Thoraxchirurgie',
  ARBEITSMEDIZIN: 'Arbeitsmedizin',
  GERICHTSMEDIZIN: 'Gerichtsmedizin',
  INNERE_MEDIZIN_UND_ANGIOLOGIE: 'Innere Medizin und Angiologie',
  INNERE_MEDIZIN_UND_ENDOKRINOLOGIE_U_DIABETOLOGIE: 'Innere Medizin und Endokrinologie u. Diabetologie',
  INNERE_MEDIZIN_UND_HAEMATOLOGIE_UND_INTERNISTISCHE_ONKOLOGIE: 'Innere Medizin und Hämatologie und internistische Onkologie',
  INNERE_MEDIZIN_UND_INFEKTIOLOGIE: 'Innere Medizin und Infektiologie',
  INNERE_MEDIZIN_UND_INTENSIVMEDIZIN: 'Innere Medizin und Intensivmedizin',
  INNERE_MEDIZIN_UND_NEPHROLOGIE: 'Innere Medizin und Nephrologie',
  MEDIZINISCHE_GENETIK: 'Medizinische Genetik',
}

// Reverse-lookup for CSV import: German label → enum value
export const FACHRICHTUNG_BY_LABEL: Record<string, Fachrichtung> = Object.fromEntries(
  Object.entries(FACHRICHTUNG_LABELS).map(([k, v]) => [v, k as Fachrichtung]),
)

// Sorted list for the public datalist UI (D-25)
export const FACHRICHTUNG_OPTIONS: Array<{ id: Fachrichtung; label: string }> =
  Object.entries(FACHRICHTUNG_LABELS)
    .map(([id, label]) => ({ id: id as Fachrichtung, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'de'))
```

### HTML5 datalist filter (D-25)

```tsx
// src/app/(public)/aerzte/DoctorPublicFilters.tsx (rewritten)
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { Bezirk } from '@prisma/client'
import { FACHRICHTUNG_OPTIONS, FACHRICHTUNG_LABELS } from '@/lib/admin/import/fachrichtung-mapping'
import type { Fachrichtung } from '@prisma/client'

type ActiveFilters = { bezirk?: string; fachrichtung?: Fachrichtung }
type Props = { bezirke: Bezirk[]; active: ActiveFilters }

export default function DoctorPublicFilters({ bezirke, active }: Props) {
  const router = useRouter()
  const sp = useSearchParams()

  function setParam(key: string, value: string | undefined) {
    const next = new URLSearchParams(sp?.toString() ?? '')
    if (value === undefined || value === '') next.delete(key)
    else next.set(key, value)
    router.push(next.toString() ? `/aerzte?${next}` : '/aerzte')
  }

  return (
    <div className="flex flex-col gap-dir-md p-dir-md bg-dir-surface-container rounded-dir-md">
      {/* Bezirk chips — unchanged from Phase 46 */}
      <div className="flex flex-wrap gap-dir-xs">
        {bezirke.map((b) => {
          const isActive = active.bezirk === b.slug
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setParam('bezirk', isActive ? undefined : b.slug)}
              className={isActive ? '…active…' : '…idle…'}
            >
              {b.name}
            </button>
          )
        })}
      </div>

      {/* Fachrichtung searchable datalist (D-25) */}
      <div className="flex flex-wrap items-center gap-dir-sm">
        <input
          type="text"
          list="fachrichtungen"
          placeholder="Fachrichtung wählen…"
          // Display the label, not the enum identifier
          defaultValue={active.fachrichtung ? FACHRICHTUNG_LABELS[active.fachrichtung] : ''}
          onBlur={(e) => {
            const label = e.target.value.trim()
            // Reverse-lookup label → enum; only set query param if it matches a known label
            const id = FACHRICHTUNG_OPTIONS.find((o) => o.label === label)?.id
            setParam('fachrichtung', id ?? undefined)
          }}
          className="bg-dir-surface-container-lowest rounded-dir-md px-dir-md py-dir-xs border border-dir-outline-variant"
        />
        <datalist id="fachrichtungen">
          {FACHRICHTUNG_OPTIONS.map((o) => (
            <option key={o.id} value={o.label} />
          ))}
        </datalist>
      </div>
    </div>
  )
}
```

Note: `<datalist>` is supported in all modern browsers; the UX is "type to filter, click to select". Native — no Combobox library needed. The `fachrichtung` URL param carries the enum identifier (D-26), the input field carries the German label.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Phase 46 single-row admin form for each doctor | Phase 47 bulk CSV import with dry-run preview | 2026-05-16 (CONTEXT.md) | Editor can seed 3,577 rows in one workflow instead of 3,577 manual saves. |
| Phase 46 `kategorie` (3-value enum) + free-text `fachrichtung` filter | Phase 47 closed 51-value `Fachrichtung` enum, no `kategorie` | 2026-05-16 (CONTEXT.md D-03, D-04) | Type-safe at compile time; CSV validation rejects typos; JSON-LD `medicalSpecialty` populated correctly. |
| Phase 46 synchronous geocode-on-save | Phase 47 import → null-geo → admin-triggered batch geocoder | 2026-05-16 (CONTEXT.md D-19, D-21) | 3,577-row import completes in seconds instead of 65 minutes; editor performs 18 batches over days. |
| Phase 46 `website` field | Phase 47 `profilUrl` field (rename only) | 2026-05-16 (CONTEXT.md D-02) | Reflects domain semantics: it's a profile page on aekstmk.or.at, not a personal website. |

**Deprecated/outdated:**
- `DoctorKategorie` enum: dropped entirely (no data uses it post-TRUNCATE).
- Phase 46 `<input type=text placeholder="Fachrichtung…">` free-text filter: replaced with HTML5 datalist over 51 closed values.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `papaparse` is the right choice (vs csv-parse) | Standard Stack | Low — both work; papaparse has simpler API and is the more common pick. Planner can swap if KV-tier latency concerns surface. |
| A2 | `papaparse` and `@types/papaparse` packages are legitimate and current | Package Legitimacy Audit | Medium — slopcheck not run. Planner inserts `checkpoint:human-verify` task. |
| A3 | Vercel function instance persistence is good enough for 15-min in-memory cache | Architecture / Pattern 1 | Low — if instance cycles, user re-uploads (acceptable UX per D-15). |
| A4 | The CSV file has exactly the header `Bezirk,Fachrichtung,Name,Adresse,Telefonnummer,ArztNr,ProfilURL` and the 51 distinct Fachrichtung values listed in fachrichtung-values.txt | Code Examples | High — locked by D-06 + fachrichtung-values.txt (sourced from CSV directly per discussion log). Verified by user during Phase 47 discuss-phase. |
| A5 | The Fachrichtung transform `uppercase + Ä→AE + Ö→OE + Ü→UE + ß→SS + strip .,() + space/dash→_ + collapse repeats` is collision-free over the 51 inputs | Code Examples | Verified end-to-end by ad-hoc Node script during this research session — 51 unique outputs. |
| A6 | Postgres' `DROP COLUMN` automatically drops dependent indexes | Migration order | Low — this is documented PostgreSQL behaviour. |
| A7 | The `BEZIRK_ALIAS` map only needs the one `Graz-Stadt → Graz (Stadt)` entry | Code Examples | Locked by D-10 + research question 5 (12 other Bezirke match exact-name). |
| A8 | Editorial team accepts the 18-click manual batch-geocode burden as one-time | Architecture | Locked in CONTEXT.md D-22 ("Acceptable per project policy"). |
| A9 | `<datalist>` accessibility is sufficient for the directory filter use case | Code Examples | Low — native HTML, screen-reader-supported across browsers. |

## Open Questions

None blocking. CONTEXT.md D-01..D-32 locks every decision the planner needs. The remaining "Claude's Discretion" items are all answered above:
- **Cache vs KV (D-15):** in-memory Map — recommended above.
- **Fachrichtung identifier transform (D-05):** verified collision-free; static map committed.
- **Batch geocoder form shape:** plain `<form action={geocodeBatchAction}>` (no client boundary needed) — recommended above.
- **Import preview UI:** apply Phase 46 admin styling (`--dir-*` tokens already in `globals.css`). Color-code conflicts with `--dir-error-container` background, summary with `--dir-tertiary-container`. Match Phase 46 admin pages.
- **German error message tone:** "Ungültiger CSV-Header. Erwartet: …" / "Unbekannter Bezirk: '…'" / "Fachrichtung nicht erkannt: '…'" / "ArztNr fehlt" / "ArztNr doppelt im Upload (Zeile X)" — match Phase 46 admin error tone.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All | ✓ (project standard) | 20+ (@types/node `^20`) | — |
| PostgreSQL | DB layer (production) | ✓ via Neon | hosted | — |
| pglite | DB layer (tests) | ✓ | 0.4.1 | — |
| Prisma | ORM | ✓ | 6.19.2 | — |
| papaparse | CSV parsing | ✗ | needs install | none — required for Phase 47 |
| @types/papaparse | TS types | ✗ | needs install | tsconfig allows untyped, but `tsc --noEmit` will fail |
| Vercel | Deploy | ✓ | hosted | — |
| Vercel Hobby (5-min function cap) | Batch geocoder | ✓ (already used at `/api/cron`) | confirmed via `maxDuration = 300` on existing route | none needed |
| Nominatim | Geocoding | ✓ external | rate-limited 1 req/s | none — handled by `await sleep(1100)` |

**Missing dependencies with no fallback:**
- `papaparse`, `@types/papaparse` — install required. Add DECISIONS.md entry per AGENTS.md anti-bloat rule.

**Missing dependencies with fallback:**
- None.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/lib/admin/import/` (per-file scope) |
| Full suite command | `npm test` (= `vitest run`) |

### Phase Requirements → Test Map

> Phase 47 requirement IDs are TBD — the planner mints DIR-14..DIR-NN. The mapping below uses provisional `R-XX` placeholders that the planner replaces with minted IDs. Each row maps a CONTEXT.md decision (D-XX) to its test type.

| Prov-Req | Decision | Behavior | Test Type | Automated Command | File Exists? |
|----------|----------|----------|-----------|-------------------|-------------|
| R-01 | D-01 | `Doctor.arztNr` unique and required at Prisma level | unit (pglite) | `npx vitest run src/lib/content/doctors.test.ts -t "arztNr"` | ❌ Wave 0 — add to existing doctors.test.ts |
| R-02 | D-02 | `Doctor.profilUrl` accepted; `website` no longer in client | unit (pglite) | `npx vitest run src/lib/content/doctors.test.ts -t "profilUrl"` | ❌ Wave 0 |
| R-03 | D-03 | `kategorie` removed from DAL filter signature | unit | `npx vitest run src/lib/content/doctors.test.ts -t "kategorie"` (negative — expect no chip-filter test) | ❌ Wave 0 — delete kategorie tests |
| R-04 | D-04, D-05 | `Fachrichtung` enum: round-trips 51 values | unit (pglite) | `npx vitest run src/lib/admin/import/fachrichtung-mapping.test.ts` | ❌ Wave 0 — new file |
| R-05 | D-06, D-07 | CSV parser: rejects bad header, accepts BOM, supports multi-line quoted values | unit | `npx vitest run src/lib/admin/import/csv-parser.test.ts -t "header\|BOM\|multi-line"` | ❌ Wave 0 — new file |
| R-06 | D-08 | Required fields enforced (Bezirk, Fachrichtung, Name, Adresse, ArztNr) | unit | `npx vitest run src/lib/admin/import/csv-parser.test.ts -t "required"` | ❌ Wave 0 |
| R-07 | D-10 | `"Graz-Stadt"` resolves to `"Graz (Stadt)"` Bezirk | unit | `npx vitest run src/lib/admin/import/bezirk-alias.test.ts` | ❌ Wave 0 — new file |
| R-08 | D-11 | Unknown Fachrichtung rejects row | unit | `npx vitest run src/lib/admin/import/csv-parser.test.ts -t "unknown Fachrichtung"` | ❌ Wave 0 |
| R-09 | D-12 | TRUNCATE in migration; pglite test DB applies cleanly | smoke (vitest startup) | `npx vitest run src/lib/content/doctors.test.ts` (loads migration sequence) | ✓ infra exists |
| R-10 | D-14, D-16 | `commitCsvImportAction` upserts inside `db.$transaction`; editorial fields untouched on update | integration (pglite + vi.mock) | `npx vitest run src/lib/admin/doctors-import-actions.test.ts -t "preserves editorial"` | ❌ Wave 0 — new file |
| R-11 | D-17 | Address-change triggers `lat: null, lon: null, mapImageUrl: null` | integration (pglite) | `npx vitest run src/lib/admin/doctors-import-actions.test.ts -t "address change"` | ❌ Wave 0 |
| R-12 | D-18 | Within-batch dupe arztNr: later wins, flagged as warning | unit | `npx vitest run src/lib/admin/import/csv-parser.test.ts -t "dedupe"` | ❌ Wave 0 |
| R-13 | D-21 | `geocodeBatchAction` respects `await sleep(1100)` between Nominatim calls | unit (vi.useFakeTimers) | `npx vitest run src/lib/admin/doctors-import-actions.test.ts -t "sleep"` | ❌ Wave 0 |
| R-14 | D-22 | Counter "X / Y / Z" matches DB state | manual smoke | manual — `/admin/aerzte` render check after import + batch | manual-only |
| R-15 | D-25 | `/aerzte` filter UI renders `<datalist>` with 51 options | unit (rendering) OR manual | manual — visual check, native browser autocomplete | manual-only (no React-DOM test harness in project) |
| R-16 | D-27 | JSON-LD always `@type: 'Physician'`, `medicalSpecialty` = German label | unit | `npx vitest run src/lib/reader/doctor-metadata.test.ts -t "Physician\|medicalSpecialty"` | ❌ Wave 0 — update existing |
| R-17 | D-28 | `profilUrl` rendered as `sameAs` in JSON-LD | unit | `npx vitest run src/lib/reader/doctor-metadata.test.ts -t "profilUrl\|sameAs"` | ❌ Wave 0 — update existing |
| R-18 | D-30 | 10-row fixture parses cleanly, covers Graz-Stadt alias + multi-line value | integration | `npx vitest run src/lib/admin/import/csv-parser.test.ts -t "fixture"` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** scoped vitest, e.g. `npx vitest run src/lib/admin/import/`
- **Per wave merge:** `npm test` (full suite) + `npx tsc --noEmit`
- **Phase gate:** Full suite green; manual smoke on `/admin/aerzte/import` end-to-end (upload sample → preview → commit → verify 10 rows in DB → geocode batch → verify lat/lon populated)

### Wave 0 Gaps

- [ ] `src/lib/admin/import/fachrichtung-mapping.ts` — generated map + reverse lookup + sorted options
- [ ] `src/lib/admin/import/fachrichtung-mapping.test.ts` — round-trip + label uniqueness + count = 51
- [ ] `src/lib/admin/import/bezirk-alias.ts` — alias map + `resolveBezirkName` helper
- [ ] `src/lib/admin/import/bezirk-alias.test.ts` — Graz-Stadt case + passthrough case
- [ ] `src/lib/admin/import/csv-parser.ts` — papaparse wrapper + row validator
- [ ] `src/lib/admin/import/csv-parser.test.ts` — header/BOM/multi-line/required/dupe/unknown-enum cases
- [ ] `src/lib/admin/doctors-import-actions.ts` — `parseAndPreviewCsvAction`, `commitCsvImportAction`, `geocodeBatchAction` + in-memory cache
- [ ] `src/lib/admin/doctors-import-actions.test.ts` — preserves editorial fields, transaction atomicity, address-change geo-clearing, sleep timing
- [ ] `test/fixtures/aerzte-sample.csv` — 10-row fixture covering 4 Bezirke (incl. Graz-Stadt) and 5 Fachrichtungen (incl. one comma-in-quotes "Hals-, Nasen- und Ohrenheilkunde")
- [ ] `prisma/migrations/<ts>_phase47_csv_schema/migration.sql` — hand-authored migration (see "Pattern 4" above)
- [ ] Update `src/lib/content/doctors.ts` — drop kategorie filter, change fachrichtung signature to `Fachrichtung` enum
- [ ] Update `src/lib/content/doctors.test.ts` — replace kategorie tests with fachrichtung enum tests, add arztNr tests, add profilUrl tests
- [ ] Update `src/lib/admin/doctors-actions.ts` — drop kategorie, rename website→profilUrl, change fachrichtung to enum
- [ ] Update `src/lib/admin/doctors-actions.test.ts` — update test factories per D-32
- [ ] Update `src/lib/reader/doctor-metadata.ts` + test — remove ZAHNARZT/Dentist branch, change website→profilUrl, populate medicalSpecialty from FACHRICHTUNG_LABELS
- [ ] Update `src/app/(public)/aerzte/page.tsx` + `DoctorPublicFilters.tsx` — drop kategorie chip filter, add datalist
- [ ] Update `src/app/(admin)/admin/aerzte/page.tsx` + `DoctorFilters.tsx` + `DoctorRow.tsx` + `DoctorForm.tsx` — drop kategorie, add fachrichtung select
- [ ] Add `src/app/(admin)/admin/aerzte/import/page.tsx` + `ImportPreview.tsx`
- [ ] Add scripts/generate-fachrichtung-mapping.ts (optional, one-off codegen)

## Security Domain

**`security_enforcement` setting:** No `.planning/config.json` exists → treating as **enabled** per protocol.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `requireAuth()` (cookie-based HMAC-SHA-256, per AGENTS.md). Every Server Action in this phase calls it. |
| V3 Session Management | yes | Cookie-based, fixed value `'authenticated'` per AGENTS.md. No phase-47 changes. |
| V4 Access Control | yes | `(admin)/layout.tsx` gates all `/admin/*` routes; per-action `requireAuth()` is defence-in-depth. |
| V5 Input Validation | yes | CSV parser is the input boundary. Header validation (D-06), per-row required-field validation (D-08), enum validation (D-11), Bezirk lookup with alias (D-10) — all defensive. |
| V6 Cryptography | no | No new crypto. Session token uses `crypto.randomUUID()` (built-in CSPRNG); not a security boundary — cache is server-only. |

### Known Threat Patterns for Node.js + Prisma + Next.js Server Actions

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via Bezirk name | Tampering | Prisma's parameterized `findUnique({where:{name}})` — no raw SQL. |
| Path traversal via uploaded filename | Tampering | We do NOT write the uploaded CSV to disk. Buffer stays in-memory in the Server Action. Filename is never trusted. |
| CSV formula injection (e.g. `=cmd|…`) | Tampering | We import strings into a database, not export to a spreadsheet. No execution surface in the consume path. Detail-page rendering escapes via React. |
| Memory exhaustion via huge upload | DoS | Vercel has a 4.5 MB body limit on Server Actions by default — the 3,577-row CSV is ~600 KB, well under. No explicit guard needed, but the planner should document the limit. |
| Cache poisoning (token guess) | Tampering | Token is `crypto.randomUUID()` — 122 bits of entropy; not guessable. Cache lookup is auth-gated upstream. |
| Editorial-field overwrite via crafted CSV | Tampering | Update payload allow-list in `commitCsvImportAction` explicitly excludes editorial fields (D-16). Schema-level: no CSV column names match editorial-field names. |
| Mass-assignment via Server Action input | Tampering | `commitCsvImportAction` consumes pre-validated `ParsedRow[]` from cache, NOT raw FormData on commit. The validation boundary is the upload action. |
| Open redirect via `profilUrl` | Tampering | Detail page renders `<a href={doctor.profilUrl} rel="noopener noreferrer">…</a>`. The pattern `https://www.aekstmk.or.at/aerztesuche-46?arztnr={n}` is the canonical case; arbitrary URLs are admissible via CSV. **Planner consideration:** add a URL allow-list (`aekstmk.or.at` only) in row validation if the editorial team accepts that constraint. |
| Reflected DOS via wide CSV (10,000+ rows) | DoS | Practical input is 3,577 fixed rows. Future-proofing: cap at e.g. 10,000 rows in row validator. |

## Sources

### Primary (HIGH confidence)
- Project codebase grep across `src/`, `prisma/`, `package.json`, `vercel.json` — all paths, line numbers, version strings verified directly.
- `src/app/api/cron/route.ts:8` — `maxDuration = 300` (proves 5-min Vercel cap is available).
- `prisma/migrations/20260515_phase46_doctors/migration.sql` — Phase 46 baseline; phase-47 SQL composes on top of this.
- `src/lib/admin/doctors-actions.ts` (Phase 46) — Server-Action-Trinity reference for new Phase 47 actions.
- `src/lib/ingestion/ingest.ts:105` — `db.$transaction([...])` array-form pattern (Phase 44 INGEST-05).
- `src/lib/admin/map-actions.ts:130` — `await new Promise((r) => setTimeout(r, 1100))` Nominatim rate-limit pattern.
- `src/test/setup-db.ts:loadMigrationSql` — confirms migration-directory lexicographic sort ordering.
- `bundesland.config.ts:42-56` — confirms 12-of-13 Bezirk-name exact match, single alias needed.
- `AGENTS.md` — anti-bloat, Server-Action-Trinity, DI duck-typing, error-handling rules.
- `fachrichtung-values.txt` (phase-local) — source of truth for 51 enum values + row counts.
- `47-CONTEXT.md` — 32 locked decisions D-01..D-32.

### Secondary (MEDIUM confidence)
- PostgreSQL docs convention: `DROP COLUMN` cascades to dependent indexes (standard SQL behaviour).
- HTML5 datalist browser support (Chrome/Firefox/Safari/Edge ≥ years).
- `[ASSUMED]` papaparse npm metadata — to be verified at install with `npm view`.

### Tertiary (LOW confidence)
- None. All technical claims trace to project files or locked decisions.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Prisma/Next/Vitest versions verified from package.json; papaparse is the standard JS CSV lib with a 10-year track record (assumed pending slopcheck).
- Architecture: HIGH — every pattern matches an existing Phase 46/44 reference.
- Migration order: HIGH — derived from Postgres DDL semantics; tested mentally against pglite migration-loading semantics.
- Pitfalls: HIGH — Pitfalls 1-7 are all observable from project artifacts (migrate-dev workflow, Postgres docs, papaparse defaults, pglite migration sort order, Phase 46 D-31 pattern).
- Fachrichtung transform: HIGH — verified end-to-end with a Node script during this session; 51 unique outputs.
- In-memory cache choice: MEDIUM — depends on assumption A3 (Vercel instance persistence). Fallback (re-upload) is graceful.

**Research date:** 2026-05-16
**Valid until:** 2026-06-15 (30 days — stable Prisma/Next/Vercel/papaparse stack; faster expiry only if Vercel changes function-instance lifecycle or papaparse goes unmaintained)
