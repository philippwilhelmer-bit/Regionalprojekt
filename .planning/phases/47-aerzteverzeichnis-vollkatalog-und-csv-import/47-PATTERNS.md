# Phase 47: Aerzteverzeichnis Vollkatalog und CSV-Import — Pattern Map

**Mapped:** 2026-05-16
**Files analyzed:** 18 new + 11 modified = 29 files
**Analogs found:** 28 / 29 (1 has no precedent — `csv-parser.ts`, generic Prisma DAL style applies)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| **NEW — Backend / Domain** | | | | |
| `prisma/migrations/20260516_phase47_csv_schema/migration.sql` | migration | DDL | `prisma/migrations/20260515_phase46_doctors/migration.sql` | role-match (different shape: ALTER vs CREATE) |
| `src/lib/admin/import/fachrichtung-mapping.ts` | utility / label map | pure transform | `src/lib/reader/doctor-metadata.ts` (`kategorieLabel`) + `bundesland.config.ts:42-56` (region label list) | role-match |
| `src/lib/admin/import/fachrichtung-mapping.test.ts` | test | pure transform | `src/lib/reader/doctor-metadata.test.ts` | exact |
| `src/lib/admin/import/bezirk-alias.ts` | utility / alias map | pure transform | `bundesland.config.ts:59-73` (`BEZIRK_COORDS` flat Record) + `src/lib/content/bezirke.ts` (bezirk lookups) | role-match |
| `src/lib/admin/import/bezirk-alias.test.ts` | test | pure transform | `src/lib/reader/slug.test.ts` (pure-function unit test shape) | role-match |
| `src/lib/admin/import/csv-parser.ts` | parser/helper | request-response (string-in, struct-out) | **none** — closest convention is `src/lib/ingestion/dedup.ts` (pure helper module with DI) | role-only / RESEARCH analog primary |
| `src/lib/admin/import/csv-parser.test.ts` | test | pure transform | `src/lib/ingestion/dedup.test.ts` + `src/lib/ingestion/fetch-utils.test.ts` | role-match |
| `src/lib/admin/doctors-import-actions.ts` | server-action | request-response + batch | `src/lib/admin/doctors-actions.ts` (Trinity) + `src/lib/admin/map-actions.ts` (`backfillMapImages` sleep loop) | exact (two analogs compose) |
| `src/lib/admin/doctors-import-actions.test.ts` | test | integration (pglite + mocks) | `src/lib/admin/doctors-actions.test.ts` + `src/lib/admin/map-actions.test.ts` | exact |
| **NEW — Frontend Routes** | | | | |
| `src/app/(admin)/admin/aerzte/import/page.tsx` | server-component-page | request-response | `src/app/(admin)/admin/aerzte/new/page.tsx` (thin RSC + form action) | exact |
| `src/app/(admin)/admin/aerzte/import/ImportPreview.tsx` | server-component | render | `src/app/(admin)/admin/aerzte/DoctorRow.tsx` (RSC with `--dir-*` tokens + `<details>` two-step confirm) | role-match |
| **NEW — Fixtures & Scripts** | | | | |
| `test/fixtures/aerzte-sample.csv` | fixture | — | `test/fixtures/rss-sample.xml`, `test/fixtures/atom-sample.xml` (sibling fixtures) | role-match (different file type) |
| `scripts/generate-fachrichtung-mapping.ts` | utility (one-off codegen) | file I/O | — (no existing codegen scripts in repo) | no analog (treat as standalone Node script) |
| **MODIFIED — Schema & DAL** | | | | |
| `prisma/schema.prisma` | schema | DDL | self (Phase 46 lines 201-232) | exact |
| `src/lib/content/doctors.ts` | DAL | CRUD | self (Phase 46, complete rewrite of filter signature) | exact |
| `src/lib/content/doctors.test.ts` | test | pglite | self (Phase 46) | exact |
| `src/lib/admin/doctors-actions.ts` | server-action | request-response | self (Phase 46) | exact |
| `src/lib/admin/doctors-actions.test.ts` | test | pglite | self (Phase 46) | exact |
| `src/lib/reader/doctor-metadata.ts` | utility / JSON-LD | pure transform | self (Phase 46) | exact |
| `src/lib/reader/doctor-metadata.test.ts` | test | pure transform | self (Phase 46) | exact |
| **MODIFIED — Frontend** | | | | |
| `src/app/(admin)/admin/aerzte/page.tsx` | server-component-page | request-response | self (Phase 46) | exact |
| `src/app/(admin)/admin/aerzte/DoctorFilters.tsx` | client-component | UI | self (Phase 46) | exact |
| `src/app/(admin)/admin/aerzte/DoctorRow.tsx` | server-component | UI | self (Phase 46) | exact |
| `src/app/(admin)/admin/aerzte/DoctorForm.tsx` | server-component | UI | self (Phase 46) | exact |
| `src/app/(public)/aerzte/page.tsx` | server-component-page | request-response | self (Phase 46) | exact |
| `src/app/(public)/aerzte/DoctorPublicFilters.tsx` | client-component | UI | self (Phase 46) | exact |
| `src/app/(public)/aerzte/[publicId]/[slug]/page.tsx` | server-component-page | request-response | self (Phase 46) | exact |
| `src/app/sitemap.ts` | server-component | request-response | self (Phase 46 — only DAL filter changes propagate) | exact (no structural change) |
| **DOCS (not source code, but required by AGENTS.md)** | | | | |
| `DECISIONS.md` | docs | — | existing entries | exact (new entry for `papaparse` dep per anti-bloat rule) |

---

## Pattern Assignments

### `prisma/migrations/20260516_phase47_csv_schema/migration.sql` (migration, DDL)

**Analog:** `prisma/migrations/20260515_phase46_doctors/migration.sql`

**Header comment pattern** (lines 1-5):
```sql
-- Phase 46 DIR-01 / DIR-02: Doctor table + DoctorKategorie enum (Ärzteverzeichnis).
-- Additive migration; existing models untouched (Bezirk gains only a Prisma-side back-relation
-- that does NOT require a column change).
-- publicId is declared NOT NULL with no SQL DEFAULT — Prisma's @default(nanoid()) runs
-- client-side, so only Prisma-mediated inserts are expected (no raw psql / no seed inserts).
```
Phase 47 header should follow same shape: `-- Phase 47 DIR-XX: …` then a one-paragraph note about ordering (TRUNCATE → enum → ALTER → DROP TYPE) and that the Doctor table is wiped per D-12.

**Enum DDL pattern** (line 8):
```sql
-- CreateEnum
CREATE TYPE "DoctorKategorie" AS ENUM ('ALLGEMEINMEDIZIN', 'FACHARZT', 'ZAHNARZT');
```
Phase 47 mirrors this for `CREATE TYPE "Fachrichtung" AS ENUM (…51 values…);` — same `"DoubleQuoted"` identifier convention.

**Index creation pattern** (lines 34-38):
```sql
-- CreateIndex
CREATE UNIQUE INDEX "Doctor_publicId_key" ON "Doctor"("publicId");
CREATE INDEX "Doctor_bezirkId_idx" ON "Doctor"("bezirkId");
CREATE INDEX "Doctor_kategorie_idx" ON "Doctor"("kategorie");
CREATE INDEX "Doctor_isVerified_name_idx" ON "Doctor"("isVerified", "name");
```
Phase 47 replaces `Doctor_kategorie_idx` with `Doctor_fachrichtung_idx` and adds `Doctor_arztNr_key` (UNIQUE).

**Structural deviations vs analog:**
- Phase 46 = pure `CREATE TABLE` (additive). Phase 47 = `ALTER TABLE` (mutating an existing table) + `TRUNCATE TABLE` + `DROP TYPE`. The handcrafted SQL must NOT be generated by `prisma migrate dev` directly (per RESEARCH Pitfall 1) — use `--create-only` then replace.
- Phase 47 needs a `TRUNCATE TABLE "Doctor" RESTART IDENTITY;` step BEFORE schema mutations because `arztNr NOT NULL` has no per-row backfill.
- Migration directory name MUST sort lexicographically AFTER `20260515_phase46_doctors` (RESEARCH Pitfall 6); use `20260516_phase47_csv_schema` or later.

---

### `src/lib/admin/import/fachrichtung-mapping.ts` (utility, pure transform)

**Analogs:**
- `src/lib/reader/doctor-metadata.ts:85-94` (`kategorieLabel` enum → German label transform)
- `bundesland.config.ts:42-56` (flat region list with `id` / `name` records)

**Closed-enum label pattern** (`doctor-metadata.ts:85-94`):
```typescript
export function kategorieLabel(k: DoctorKategorie): string {
  switch (k) {
    case 'ALLGEMEINMEDIZIN':
      return 'Allgemeinmediziner:in'
    case 'FACHARZT':
      return 'Facharzt/Fachärztin'
    case 'ZAHNARZT':
      return 'Zahnarzt/Zahnärztin'
  }
}
```
Phase 47 uses a `Record<Fachrichtung, string>` map instead of a `switch` because there are 51 values — the `Record` shape forces TS exhaustiveness checks (any missing key is a compile error). Already the exact shape in RESEARCH.md lines 560-612.

**Structural deviations vs analog:**
- File is **generated**, not hand-written (see RESEARCH "Don't Hand-Roll" table). Include a `// GENERATED — do not edit manually.` banner at top, source-of-truth comment pointing to `fachrichtung-values.txt`.
- Export THREE artifacts (not just labels): `FACHRICHTUNG_LABELS`, `FACHRICHTUNG_BY_LABEL` (reverse for CSV import), `FACHRICHTUNG_OPTIONS` (sorted array for `<datalist>`).

---

### `src/lib/admin/import/bezirk-alias.ts` (utility, pure transform)

**Analog:** `bundesland.config.ts:59-73` (`BEZIRK_COORDS` flat `Record<string, ...>`)

**Flat-record lookup pattern** (`bundesland.config.ts:59-73`):
```typescript
export const BEZIRK_COORDS: Record<string, { lat: number; lon: number }> = {
  'graz':                    { lat: 47.07, lon: 15.44 },
  'graz-umgebung':           { lat: 47.07, lon: 15.44 },
  // ...
}
```
Phase 47 mirrors with `Record<string, string>` for the alias map:
```typescript
const BEZIRK_ALIAS: Record<string, string> = {
  'Graz-Stadt': 'Graz (Stadt)',
}
export function resolveBezirkName(csvName: string): string {
  return BEZIRK_ALIAS[csvName] ?? csvName
}
```
(Exact form already in RESEARCH.md lines 458-464.)

**Source-of-truth comment pattern** (`bundesland.config.ts:42-56`):
The Bezirk seed lives in `bundesland.config.ts`. Phase 47 must reference this file in a header comment: `// Source of truth for canonical Bezirk names: bundesland.config.ts:42-56`.

**Structural deviations vs analog:**
- `bundesland.config.ts` is at the repo root and ships canonical data; `bezirk-alias.ts` is a translation layer specific to one CSV source. Keep it in `src/lib/admin/import/` (per RESEARCH project structure), do NOT promote to the root config.

---

### `src/lib/admin/import/csv-parser.ts` (parser/helper, request-response)

**Analog:** **None exact** — no CSV parsing exists in the codebase. Closest convention is the pure-helper-module pattern of `src/lib/ingestion/dedup.ts` (small, exports pure functions, no DI for stateless transforms, typed result interfaces).

**Pure-helper module pattern** (from `src/lib/ingestion/dedup.ts`, applied by analogy):
- File-level docstring describing inputs/outputs.
- All functions are pure (no side effects, no auth, no DB) — Server Action wrapper handles I/O.
- Typed `interface` exports for input/output shapes so callers and tests share the shape.

**Concrete pattern** (already drafted in RESEARCH.md lines 475-549):
```typescript
import Papa from 'papaparse'
import type { Fachrichtung } from '@prisma/client'
import { FACHRICHTUNG_BY_LABEL } from './fachrichtung-mapping'
import { resolveBezirkName } from './bezirk-alias'

const REQUIRED_HEADER = ['Bezirk','Fachrichtung','Name','Adresse','Telefonnummer','ArztNr','ProfilURL']

export interface ParsedRow { /* ... */ }
export interface RowConflict { /* ... */ }
export interface ParseResult { rows: ParsedRow[]; conflicts: RowConflict[] }

export function parseDoctorsCsv(csvText: string): ParseResult { /* ... */ }
```

**Structural deviations vs analog:**
- Imports a new external dep (`papaparse`) — REQUIRES a new entry in `DECISIONS.md` per AGENTS.md anti-bloat rule.
- No PrismaClient DI is needed here (pure string parsing). DB-touching enrichment (Bezirk name → bezirkId lookup) happens in `doctors-import-actions.ts` AFTER `parseDoctorsCsv` returns.
- Must fail-fast on header mismatch AND on papaparse `Quotes` / `FieldMismatch` errors (RESEARCH Pitfall 5).

---

### `src/lib/admin/doctors-import-actions.ts` (server-action, request-response + batch)

**Analogs (compose two):**
- `src/lib/admin/doctors-actions.ts` (Phase 46 Server-Action-Trinity)
- `src/lib/admin/map-actions.ts:95-184` (`backfillMapImages` — `await sleep(1100)` batch loop with `requireAuth()`)

**Server-Action-Trinity skeleton** (from `doctors-actions.ts:80-104, 221-234, 277-297`):
```typescript
// 1. *Db function — pure, injectable PrismaClient, no auth, testable.
export async function createDoctorDb(
  db: PrismaClient,
  input: CreateDoctorInput,
  geo?: GeoResult,
  mapImageUrl?: string | null,
): Promise<Doctor> {
  return db.doctor.create({ /* ... */ })
}

// 2. Server Action — `'use server'` (file-level), requireAuth(), delegates to Db.
export async function createDoctor(input: CreateDoctorInput): Promise<Doctor> {
  await requireAuth()
  const created = await createDoctorDb(defaultPrisma, input)
  // ... orchestration ...
  return created
}

// 3. Form wrapper — FormData parsing, redirect/revalidate.
export async function createDoctorForm(formData: FormData): Promise<void> {
  await requireAuth()
  const { redirect } = await import('next/navigation')   // ← dynamic import (test-friendly)
  await createDoctor({ /* ...formData.get(...) coercions... */ })
  redirect('/admin/aerzte')
}
```
Phase 47 follows this triplet for **three** actions: `parseAndPreviewCsv*`, `commitCsvImport*`, `geocodeBatch*`.

**`requireAuth()` placement rule** (from `doctors-actions.ts:222` + AGENTS.md):
```typescript
export async function createDoctor(input: CreateDoctorInput): Promise<Doctor> {
  await requireAuth()                              // OUTSIDE any try/catch
  const created = await createDoctorDb(defaultPrisma, input)
  // ...
}
```
`requireAuth()` throws `NEXT_REDIRECT` — catching it breaks the redirect. Every Server Action and Form wrapper in Phase 47 must call it FIRST, outside any `try`.

**Dynamic import for `next/navigation` in Form wrappers** (from `doctors-actions.ts:279, 301, 337`):
```typescript
const { redirect } = await import('next/navigation')
```
Phase 47 Form wrappers (and `commitCsvImportForm` redirecting to `/admin/aerzte?imported=N`) must use the dynamic-import idiom — top-level imports break vitest module isolation per RESEARCH Anti-Patterns.

**Nominatim sleep-loop pattern** (from `map-actions.ts:113-172`):
```typescript
for (let i = 0; i < articles.length; i++) {
  const article = articles[i]
  try {
    // ... extract location ...
    const geo = await geocodeLocation(prisma, locationName)

    // Rate-limit: wait 1100ms after each geocodeLocation call (Nominatim 1 req/s policy).
    // This delay applies even when GeocodingCache returns a cached result, because
    // the cache-hit path is indistinguishable at this layer.
    await new Promise((r) => setTimeout(r, 1100))

    if (!geo) { skipped++; continue }

    const mapImage = await generateMapImage(geo.lat, geo.lon, /* ... */)
    if (!mapImage) { failed++; continue }

    await prisma.article.update({ /* ... */ })
    succeeded++
  } catch (err) {
    failed++
  }
}
```
Phase 47 `geocodeBatchAction` mirrors this exactly, swapping `article` → `doctor`, capping at 200 (not 10), and using `{ pathPrefix: 'doctor' }` on `generateMapImage`.

**Two-phase create / address-change re-geocode pattern** (from `doctors-actions.ts:240-255`):
```typescript
export async function updateDoctor(input: UpdateDoctorInput): Promise<Doctor> {
  await requireAuth()
  const prev = await defaultPrisma.doctor.findUniqueOrThrow({ where: { id: input.id } })
  const addressChanged = input.address !== undefined && input.address !== prev.address

  if (!addressChanged) {
    return updateDoctorDb(defaultPrisma, input)
  }

  const { geo, mapImageUrl } = await geocodeAndMap(input.address!, input.name ?? prev.name, input.id)
  return updateDoctorDb(defaultPrisma, input, geo ?? null, mapImageUrl ?? null)
}
```
Phase 47 `commitCsvImportAction` uses the same `input.address !== prev.address` comparison (RESEARCH Pitfall 7: **exact string equality, no trim/lowercase**). But Phase 47 does NOT call `geocodeAndMap` inline (D-19 forbids synchronous geocode during import) — it only sets `lat: null, lon: null, mapImageUrl: null` in the update payload so the batch geocoder picks it up later.

**Bulk upsert via `$transaction([...])` array form** (from `src/lib/ingestion/ingest.ts:105-114, 163-179`):
```typescript
await db.$transaction([
  db.ingestionRun.update({
    where: { id: run.id },
    data: { finishedAt: new Date(), error: errMsg },
  }),
  db.source.update({
    where: { id: src.id },
    data: { consecutiveFailures: newFailures, healthStatus: newHealth },
  }),
])
```
Phase 47 `commitCsvImportDb` builds an N-element array of `db.doctor.upsert(...)` ops and passes it to `db.$transaction([...])`. Exact shape (with allow-listed update payload) already in RESEARCH.md lines 229-256.

**Structural deviations vs analog:**
- `parseAndPreviewCsvAction` consumes `FormData` directly (file upload), then writes results into a **module-scoped in-memory `Map<token, CachedPreview>`** (RESEARCH Pattern 1, lines 181-217). No Phase 46 action has module-scoped state — this is a Phase 47 first.
- `commitCsvImportAction` consumes a `token: string` (not FormData), looks up cached `ParsedRow[]`, and runs the transaction. Different input shape from the Phase 46 Trinity (which always takes a typed input object). Trinity shape still applies: pure `commitCsvImportDb(db, rows)`, action `commitCsvImport(token)`, form `commitCsvImportForm(formData)` that reads the token from a hidden input.
- `geocodeBatchAction` adds `export const maxDuration = 300` at module top (mirrors `src/app/api/cron/route.ts:8`). Phase 46 actions do not set `maxDuration` because they're single-row.
- Editorial-field allow-list in upsert `update` payload (D-16): the update side of `db.doctor.upsert` must NEVER include `titel`, `email`, `editorialNote`, `relatedArticleIds`, `isVerified`, `mapImageUrl`, `lat`, `lon` (latter three only via the address-change branch).

---

### `src/lib/admin/doctors-import-actions.test.ts` (test, integration)

**Analogs (compose two):**
- `src/lib/admin/doctors-actions.test.ts` (Phase 46 Server-Action-Trinity test shape)
- `src/lib/admin/map-actions.test.ts` (batch loop with `vi.useFakeTimers` for sleep verification — D-31 R-13)

**Test bootstrap pattern** (from `doctors-actions.test.ts:30-76`):
```typescript
vi.mock('./auth-node', () => ({ requireAuth: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../images/geocode', () => ({ geocodeLocation: vi.fn() }))
vi.mock('../images/mapgen', () => ({ generateMapImage: vi.fn() }))

import { createTestDb } from '../../test/setup-db'
import { seedBezirke } from '../../../prisma/seed'

let db: PrismaClient
let actions: typeof import('./doctors-actions')

beforeAll(async () => {
  db = await createTestDb()
  await seedBezirke(db, 'steiermark')
  // vi.doMock (NOT hoisted) — fires AFTER pglite db is ready
  vi.doMock('../prisma', () => ({ prisma: db }))
  // Dynamic import — module evaluates NOW with the mocked prisma
  actions = await import('./doctors-actions')
})

beforeEach(async () => {
  await db.doctor.deleteMany({})
  vi.clearAllMocks()
})

afterAll(async () => {
  await db.$disconnect()
  vi.doUnmock('../prisma')
})
```
Phase 47 import-actions test file uses this exact shape, additionally mocking nothing extra (the cache is module-scoped, not injected).

**Positional `mock.calls[N][i]` assertion pattern** (from Phase 46 D-32 — `toHaveBeenCalledWith(prismaClient, …)` blows the stack because PrismaClient has too many self-references for the deep equality walker):
- Test assertions on mocked `geocodeLocation` must use `expect(mockedGeocode.mock.calls[0][1]).toBe('Hauptplatz 1')` (positional) not `expect(mockedGeocode).toHaveBeenCalledWith(db, 'Hauptplatz 1')`.

**Structural deviations vs analog:**
- Phase 47 adds a `vi.useFakeTimers()` block for R-13 (verify `await sleep(1100)` between geocoder calls). Phase 46 has no fake-timer tests yet.
- Phase 47 tests the in-memory cache (set token → get by token → cache miss after manual TTL expiry) — new test category not present in Phase 46.

---

### `src/app/(admin)/admin/aerzte/import/page.tsx` (server-component-page, request-response)

**Analog:** `src/app/(admin)/admin/aerzte/new/page.tsx`

**Thin RSC + form action pattern** (`new/page.tsx:1-29`):
```typescript
import Link from 'next/link'
import { listBezirke } from '@/lib/content/bezirke'
import { createDoctorForm } from '@/lib/admin/doctors-actions'
import DoctorForm from '../DoctorForm'

export const dynamic = 'force-dynamic'

export default async function NewDoctorPage() {
  const bezirke = await listBezirke()
  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-dir-md mb-dir-md">
        <Link href="/admin/aerzte" className="text-sm text-ink-muted hover:text-ink">
          &larr; Zurück
        </Link>
        <h1 className="text-2xl font-bold text-ink font-headline">Neuer Arzt</h1>
      </div>
      <DoctorForm
        bezirke={bezirke}
        formAction={createDoctorForm}
        submitLabel="Anlegen"
      />
    </div>
  )
}
```
Phase 47 import page mirrors: `export const dynamic = 'force-dynamic'`, "← Zurück" link, h1 with `font-headline`, `<form action={parseAndPreviewCsvForm}>` with `<input type=file accept=".csv">`.

**No `requireAuth()` in page** (Phase 46 D-40, confirmed in `new/page.tsx`):
The admin layout (`src/app/(admin)/layout.tsx`) gates `/admin/*`. Pages do NOT call `requireAuth()`; Server Actions DO. Phase 47 import page follows this — only the actions auth-gate.

**Structural deviations vs analog:**
- `new/page.tsx` uses a controlled component (`DoctorForm`). Phase 47 import page has a much simpler `<form>` (just file input + submit). No shared component needed.
- Phase 47 page is **stateful across renders** via `searchParams`: after dry-run, it re-renders with `?token=…` and shows the `<ImportPreview>` component reading from the cache. Phase 46 pages don't do searchParams-driven render state.

---

### `src/app/(admin)/admin/aerzte/import/ImportPreview.tsx` (server-component, render)

**Analog:** `src/app/(admin)/admin/aerzte/DoctorRow.tsx`

**Design-token + `<details>` two-step confirm pattern** (`DoctorRow.tsx:82-100`):
```tsx
{/*
  DoctorRow is a Server Component, so we can't wire onSubmit with
  confirm(). We use <details> as a JS-less two-step confirmation:
  first click reveals the "Wirklich löschen" submit button.
*/}
<form action={softDeleteDoctorForm}>
  <input type="hidden" name="id" value={doctor.id} />
  <details className="inline-block">
    <summary className="text-xs px-dir-sm py-dir-xs rounded-dir-sm border border-dir-outline-variant text-dir-error cursor-pointer list-none hover:bg-dir-error-container">
      Löschen
    </summary>
    <button type="submit" className="mt-dir-xs text-xs px-dir-sm py-dir-xs rounded-dir-sm bg-dir-error text-dir-on-error hover:opacity-90">
      Wirklich löschen
    </button>
  </details>
</form>
```
Phase 47 `ImportPreview` uses the SAME `<details>`/`<summary>` pattern for the "Commit Import" confirm — JS-less, RSC-friendly. The collapsible conflicts table also uses `<details>` per RESEARCH Reusable Assets.

**Color-coded chip pattern** (`DoctorRow.tsx:40-52`):
```tsx
{doctor.isVerified && (
  <span className="bg-dir-tertiary-container text-dir-on-tertiary-container rounded-dir-full px-dir-sm py-dir-xs text-xs">
    Verifiziert
  </span>
)}
{doctor.lat === null && (
  <span className="bg-dir-error-container text-dir-on-error-container rounded-dir-full px-dir-sm py-dir-xs text-xs">
    ⚠ keine Koordinaten
  </span>
)}
```
Phase 47 `ImportPreview` uses `--dir-tertiary-container` for the green "X new" summary chip and `--dir-error-container` for conflict rows. No new tokens required — DESIGN.md already covers it (RESEARCH Open Questions).

**Structural deviations vs analog:**
- `DoctorRow` renders ONE entity per row. `ImportPreview` renders a summary line + a conflicts table (mass UI). Different layout density.
- Phase 46 admin uses `text-ink` / `font-headline` (legacy tokens) for page chrome AND `--dir-*` tokens for the row body. Phase 47 import preview should stick to `--dir-*` throughout (it's the consistent direction per DESIGN.md).

---

### `src/app/(public)/aerzte/DoctorPublicFilters.tsx` (client-component, UI) — MODIFIED

**Analog:** self (Phase 46 — full rewrite of Fachrichtung input)

**`'use client'` + `useRouter` + `useSearchParams` filter pattern** (`DoctorPublicFilters.tsx:1-44`):
```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { Bezirk } from '@prisma/client'

export default function DoctorPublicFilters({ bezirke, active }: Props) {
  const router = useRouter()
  const sp = useSearchParams()

  function setParam(key: string, value: string | undefined) {
    const next = new URLSearchParams(sp?.toString() ?? '')
    if (value === undefined || value === '') next.delete(key)
    else next.set(key, value)
    const qs = next.toString()
    router.push(qs ? `/aerzte?${qs}` : '/aerzte')
  }
  // ...
}
```
Phase 47 keeps this exact shape. The mutation is structural:
1. **Delete** the `KATEGORIEN` chip array + the `{KATEGORIEN.map(...)}` block (lines 17-21, 72-95).
2. **Replace** the free-text Fachrichtung `<input type="text">` (lines 98-115) with a `<datalist>`-paired `<input>` per RESEARCH.md lines 670-694 (concrete code there).
3. Drop `kategorie?: string` from `ActiveFilters` type, replace with `fachrichtung?: Fachrichtung` (enum).
4. Reverse-lookup label → enum on `onBlur` to translate display label to URL param (RESEARCH lines 679-683).

**Structural deviations vs analog:** Phase 46 used `kategorie` as a 3-chip filter. Phase 47 replaces with a 51-option searchable `<datalist>` over `Fachrichtung`. The URL contract changes: `?kategorie=…` is deleted; `?fachrichtung=ENUM_ID` is added.

---

### `src/lib/reader/doctor-metadata.ts` (utility, JSON-LD) — MODIFIED

**Analog:** self (Phase 46)

**JSON-LD shape pattern** (`doctor-metadata.ts:47-83`):
```typescript
export function buildDoctorJsonLd(
  doctor: DoctorForMetadata,
  canonicalUrl: string,
): Record<string, unknown> {
  const baseType = doctor.kategorie === 'ZAHNARZT' ? 'Dentist' : 'Physician'
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': baseType,
    name: [doctor.titel, doctor.name].filter(Boolean).join(' '),
    url: canonicalUrl,
    address: {
      '@type': 'PostalAddress',
      streetAddress: doctor.address,
      addressLocality: doctor.bezirk.name,
      addressRegion: 'Steiermark',
      addressCountry: 'AT',
    },
  }

  if (doctor.lat !== null && doctor.lon !== null) {
    jsonLd.geo = { '@type': 'GeoCoordinates', latitude: doctor.lat, longitude: doctor.lon }
  }

  if (doctor.kategorie === 'FACHARZT' && doctor.fachrichtung) {
    jsonLd.medicalSpecialty = doctor.fachrichtung
  }

  if (doctor.email) jsonLd.email = doctor.email
  if (doctor.phone) jsonLd.telephone = doctor.phone
  if (doctor.website) jsonLd.sameAs = [doctor.website]

  return jsonLd
}
```

**Structural deviations vs analog (Phase 47 rewrite):**
- Delete the `baseType` ternary (line 51) and the `kategorie === 'ZAHNARZT' ? 'Dentist' : 'Physician'` conditional (D-27). Always `'@type': 'Physician'`.
- Delete the `if (doctor.kategorie === 'FACHARZT' && doctor.fachrichtung)` guard (line 74). Always emit `medicalSpecialty` because `fachrichtung` is now NOT NULL — value is `FACHRICHTUNG_LABELS[doctor.fachrichtung]` (the German label, not the enum identifier).
- Rename `doctor.website` → `doctor.profilUrl` (line 80) — same `sameAs: […]` mapping (D-28).
- Delete `kategorieLabel` function (lines 85-94) — no longer used after `kategorie` column is dropped. Replace any imports with `FACHRICHTUNG_LABELS[doctor.fachrichtung]` direct lookup. Update `buildDoctorMetadata` (line 35) to use `FACHRICHTUNG_LABELS[doctor.fachrichtung]` instead of `kategorieLabel(doctor.kategorie)`.

---

### `src/lib/content/doctors.ts` (DAL, CRUD) — MODIFIED

**Analog:** self (Phase 46)

**DI duck-typing overload pattern** (`doctors.ts:32-54`):
```typescript
export async function listDoctors(options?: ListDoctorsOptions): Promise<DoctorWithBezirk[]>
export async function listDoctors(
  client: PrismaClient,
  options?: ListDoctorsOptions,
): Promise<DoctorWithBezirk[]>
export async function listDoctors(
  clientOrOptions?: PrismaClient | ListDoctorsOptions,
  options?: ListDoctorsOptions,
): Promise<DoctorWithBezirk[]> {
  let db: PrismaClient
  let opts: ListDoctorsOptions

  if (
    clientOrOptions !== null &&
    typeof clientOrOptions === 'object' &&
    '$connect' in clientOrOptions          // ← AGENTS.md duck-typing rule
  ) {
    db = clientOrOptions as PrismaClient
    opts = options ?? {}
  } else {
    db = defaultPrisma
    opts = (clientOrOptions as ListDoctorsOptions) ?? {}
  }
  // ...
}
```
Phase 47 preserves this exact overload + dispatch shape; only the `ListDoctorsOptions` interface changes.

**Filter spread pattern** (`doctors.ts:75-88`):
```typescript
return db.doctor.findMany({
  where: {
    ...(resolvedBezirkId !== undefined ? { bezirkId: resolvedBezirkId } : {}),
    ...(kategorie !== undefined ? { kategorie } : {}),
    ...(fachrichtung !== undefined
      ? { fachrichtung: { contains: fachrichtung, mode: 'insensitive' } }
      : {}),
    ...(isVerified !== undefined ? { isVerified } : {}),
  },
  // ...
})
```

**Structural deviations vs analog:**
- Delete `kategorie?: DoctorKategorie` from `ListDoctorsOptions` (line 24).
- Change `fachrichtung?: string` (free-text contains) → `fachrichtung?: Fachrichtung` (enum exact match) (lines 26, 79-81). The `{ contains: …, mode: 'insensitive' }` branch becomes `{ fachrichtung }` (direct enum equality).
- Delete the `import type { ... DoctorKategorie ... }` (line 14) — `DoctorKategorie` will no longer exist in the generated client.

---

### `src/lib/admin/doctors-actions.ts` (server-action, request-response) — MODIFIED

**Analog:** self (Phase 46)

**Structural deviations vs analog:**
- Remove `kategorie: DoctorKategorie` from `CreateDoctorInput` (line 41) and `UpdateDoctorInput` (line 56).
- Change `fachrichtung?: string` (lines 42, 57) → `fachrichtung: Fachrichtung` (required) in `CreateDoctorInput`, `fachrichtung?: Fachrichtung` in `UpdateDoctorInput`.
- Rename `website?: string` (lines 46, 61) → `profilUrl?: string` everywhere (incl. `data: { ... website: input.website, ... }` line 95 → `profilUrl: input.profilUrl`).
- Add `arztNr: string` to `CreateDoctorInput` (required). The admin form (`/admin/aerzte/new`) is for one-off manual additions; the CSV import owns bulk inserts. The admin form needs an ArztNr text input added to `DoctorForm.tsx`.
- Form wrappers (`createDoctorForm`, `updateDoctorForm`) drop the `kategorie:` FormData read (lines 286, 311) and rename `website` → `profilUrl` (lines 291, 319). Add `arztNr` read.
- The geocode + mapgen orchestration in `geocodeAndMap()` (lines 175-208) stays IDENTICAL — Phase 47 admin single-row create still uses the two-phase create pattern. Only the CSV-import path skips synchronous geocoding (D-19).

---

### `src/app/(admin)/admin/aerzte/page.tsx` (server-component-page) — MODIFIED

**Analog:** self (Phase 46)

**Structural deviations vs analog (`admin/aerzte/page.tsx:25-30, 44, 49-55, 77`):**
- Delete `parseKategorie` helper (lines 25-30).
- Delete the `kategorie` extraction (line 44) and the `kategorie` arg passed to `listDoctors` (line 51).
- Add the geocode-counter (`X von Y Ärzte geocoded, Z ausstehend`) — query `prisma.doctor.count({ where: { lat: null } })` and total count via DAL helper, render in header (per D-22).
- Add a `<form action={geocodeBatchAction}>` button labeled `"Geocode next 200 (~4 min)"` below the header, before the filter bar.
- Add a `<Link href="/admin/aerzte/import">CSV importieren</Link>` button next to `"Neuer Arzt"` (line 63-68 area).

---

### `src/app/(admin)/admin/aerzte/DoctorFilters.tsx` (client-component) — MODIFIED

**Analog:** self (Phase 46)

**Structural deviations vs analog:**
- Delete the entire `KATEGORIE_OPTIONS` array and its `{KATEGORIE_OPTIONS.map(...)}` chip row (lines 15-19, ~"Kategorie row").
- Add a Fachrichtung `<datalist>` row using the same pattern as `DoctorPublicFilters.tsx` (RESEARCH lines 670-694).
- Drop `kategorie?: DoctorKategorie` from the `active` prop type.

---

### `src/app/(admin)/admin/aerzte/DoctorRow.tsx` (server-component) — MODIFIED

**Analog:** self (Phase 46)

**Structural deviations vs analog (`DoctorRow.tsx:3, 24-27, 55-56`):**
- Remove `import { kategorieLabel } from '@/lib/reader/doctor-metadata'` (line 3) — function is deleted in metadata.ts.
- Replace `fachrichtungLine` logic (lines 24-27): no more `doctor.kategorie === 'FACHARZT'` guard, no more `doctor.fachrichtung` nullish check. Always show `FACHRICHTUNG_LABELS[doctor.fachrichtung]`.
- Replace `{kategorieLabel(doctor.kategorie)}{fachrichtungLine}` (lines 55-56) with `{FACHRICHTUNG_LABELS[doctor.fachrichtung]}`. ArztNr can also be shown as a small monospaced chip per editor preference.

---

### `src/app/(admin)/admin/aerzte/DoctorForm.tsx` (server-component) — MODIFIED

**Analog:** self (Phase 46)

**Structural deviations vs analog (`DoctorForm.tsx:87-127, 192-209`):**
- Delete the entire "Kategorie" field (lines 87-106) — column dropped.
- Replace the free-text "Fachrichtung" `<input type="text">` (lines 108-127) with a `<select name="fachrichtung" required>` populated by `FACHRICHTUNG_OPTIONS.map(o => <option value={o.id}>{o.label}</option>)`.
- Rename the "Website" field (lines 192-209): label "Profil-URL (Ärztekammer)", `id="profilUrl"`, `name="profilUrl"`, `defaultValue={doctor?.profilUrl ?? ''}`, `placeholder="https://www.aekstmk.or.at/aerztesuche-46?arztnr=…"`.
- Add a new "ArztNr" `<input type="text" required>` field above Name (the natural key — admins need to enter it for manual creates).

---

### `src/lib/content/doctors.test.ts` & `src/lib/admin/doctors-actions.test.ts` — MODIFIED

**Analog:** self (Phase 46)

**Structural deviations vs analog (per D-32):**
- Update all `seedDoctor({ ... })` test factories: REMOVE `kategorie: 'ALLGEMEINMEDIZIN'`, ADD `arztNr: '12345'` (unique per-row, easy to generate), CHANGE `fachrichtung: 'Orthopädie'` (free-text string) → `fachrichtung: 'ALLGEMEINMEDIZIN'` (enum value). Example: `doctors.test.ts:48-58` factory must be rewritten.
- Replace `kategorie`-filter tests with `fachrichtung`-enum-filter tests.
- Add new tests: `arztNr` uniqueness, `profilUrl` round-trip.
- Form-wrapper tests in `doctors-actions.test.ts` drop the `kategorie:` FormData key and rename `website` → `profilUrl`.
- Keep the `vi.mock` / `vi.doMock` / dynamic-import bootstrap pattern unchanged (`doctors-actions.test.ts:30-66`).

---

### `test/fixtures/aerzte-sample.csv` (fixture) — NEW

**Analog:** `test/fixtures/rss-sample.xml`, `test/fixtures/atom-sample.xml` (sibling fixtures in same dir)

**Pattern:** Sibling fixtures are static text files committed to the repo, loaded via `readFileSync(join('test/fixtures', '…'), 'utf-8')` in tests. No code-side analog; just file placement.

**Structural deviations vs analog:** CSV format (vs XML). Header line per D-06: `Bezirk,Fachrichtung,Name,Adresse,Telefonnummer,ArztNr,ProfilURL`. 10 data rows covering 4 Bezirke (incl. `"Graz-Stadt"` for alias case) and 5 Fachrichtungen (incl. one multi-line-quoted value like `"Hals-, Nasen- und Ohrenheilkunde"`) per D-30.

---

## Shared Patterns

### Authentication (Server Action gating)

**Source:** `src/lib/admin/auth-node.ts:39-45` + `src/lib/admin/doctors-actions.ts:222`
**Apply to:** All three Phase 47 Server Actions (`parseAndPreviewCsv*`, `commitCsvImport*`, `geocodeBatch*`) and ALL Form wrappers.

```typescript
export async function requireAuth(): Promise<void> {
  const cookieStore = await cookies()
  const session = cookieStore.get(SESSION_COOKIE_NAME)
  if (!session || !verifySessionCookie(session.value)) {
    redirect('/admin/login')  // throws NEXT_REDIRECT — do NOT wrap in try/catch
  }
}
```

Usage at top of every action (NEVER inside `try`):
```typescript
export async function commitCsvImport(token: string): Promise<{ inserted: number; updated: number }> {
  await requireAuth()                              // ← FIRST line, outside try
  // ... action body ...
}
```

Admin pages (RSC) do NOT call `requireAuth()` — `(admin)/layout.tsx` gates the whole route group per Phase 46 D-40.

### DI Duck-Typing for DAL/Db functions

**Source:** `src/lib/content/doctors.ts:44-54` (also `src/lib/ingestion/ingest.ts:63-74`)
**Apply to:** Every new `*Db` function in `doctors-import-actions.ts` (`commitCsvImportDb`, `geocodeBatchDb` if extracted).

```typescript
if (
  clientOrOptions !== null &&
  typeof clientOrOptions === 'object' &&
  '$connect' in clientOrOptions          // ← duck-typing, NEVER instanceof PrismaClient
) {
  db = clientOrOptions as PrismaClient
  opts = options ?? {}
} else {
  db = defaultPrisma
  opts = (clientOrOptions as ListDoctorsOptions) ?? {}
}
```

Per AGENTS.md: `instanceof PrismaClient` breaks vitest module isolation. Always duck-type via `'$connect' in clientOrOptions`.

### Error Handling

**Source:** `src/lib/admin/doctors-actions.ts:175-208` (`geocodeAndMap`) + `src/lib/admin/map-actions.ts:117-171` (`backfillMapImages` per-article try/catch)
**Apply to:** `geocodeBatchAction` per-doctor loop.

Per-doctor try/catch around `geocodeLocation` and `generateMapImage`. Failures get a `console.warn`, NEVER rethrow (would abort the rest of the batch). Per AGENTS.md: "Externe HTTP-Calls: stiller Fallback mit `console.warn`, niemals Exception zur Caller-Komponente durchreichen."

`requireAuth()` and `redirect()` are OUTSIDE any try/catch (they throw `NEXT_REDIRECT` which must propagate).

CSV-parser uses the AGENTS.md "no try/catch without known case" rule strictly: header mismatch and `Quotes`/`FieldMismatch` errors are caught with explicit `throw new Error('Ungültiger CSV-Header. …')` — known cases only.

### Validation / Input boundary

**Source:** `src/lib/admin/doctors-actions.ts:277-297` (FormData parsing in Form wrappers)
**Apply to:** `parseAndPreviewCsvForm` (FormData with file blob), `commitCsvImportForm` (FormData with hidden token), `geocodeBatchForm` (no inputs needed).

```typescript
export async function createDoctorForm(formData: FormData): Promise<void> {
  await requireAuth()
  const { redirect } = await import('next/navigation')   // ← dynamic import!
  // ... formData.get('field')?.toString() ?? '' coercion ...
  redirect('/admin/aerzte')
}
```

For file upload: `formData.get('file')` returns `File | string | null`. Use `typeof value === 'object' && 'arrayBuffer' in value` (NOT `instanceof File` — Anti-Pattern per RESEARCH).

### Force-dynamic on DB-reading routes

**Source:** `src/app/(admin)/admin/aerzte/page.tsx:17`, `src/app/(public)/aerzte/page.tsx:8`, `src/app/(admin)/admin/aerzte/new/page.tsx:11`
**Apply to:** `src/app/(admin)/admin/aerzte/import/page.tsx` (NEW), and the existing modified pages keep theirs.

```typescript
export const dynamic = 'force-dynamic'
```

Per AGENTS.md: "Routen, die DB lesen, tragen `export const dynamic = 'force-dynamic'`."

### Vercel function maxDuration

**Source:** `src/app/api/cron/route.ts:8`
**Apply to:** `src/lib/admin/doctors-import-actions.ts` at file top (for `geocodeBatchAction`).

```typescript
export const maxDuration = 300   // 5 min — Vercel Hobby cap
```

Only the geocode-batch action needs this; the import (parse + commit) finishes in seconds. The cron route already proves this is on the current Vercel plan — no `vercel.json` change needed.

### Nominatim rate limit (1 req/s)

**Source:** `src/lib/admin/map-actions.ts:130, 139`
**Apply to:** `geocodeBatchAction` loop in `doctors-import-actions.ts`.

```typescript
await new Promise((r) => setTimeout(r, 1100))
```

Per AGENTS.md "Externe Rate-Limits": every loop with geocoding MUST have `await sleep(1100)` between calls — even on cache hits (the cache-hit path is indistinguishable at this layer).

### Bulk write atomicity

**Source:** `src/lib/ingestion/ingest.ts:105-114, 163-179` (Phase 44 INGEST-05 pattern)
**Apply to:** `commitCsvImportDb` upsert batch.

```typescript
await db.$transaction([
  db.doctor.upsert({ where: { arztNr: row.arztNr }, create: {...}, update: {...} }),
  // ...N more...
])
```

Array form `$transaction([...ops])` (not the callback form). Ensures all-or-nothing semantics for 3,577 rows.

### Address-change re-geocode trigger

**Source:** `src/lib/admin/doctors-actions.ts:243` (Phase 46 D-31)
**Apply to:** `commitCsvImportDb` upsert `update` branch — set `lat: null, lon: null, mapImageUrl: null` IFF `input.address !== existing.address`.

```typescript
const addressChanged = input.address !== undefined && input.address !== prev.address
```

Exact string equality — DO NOT trim/lowercase (RESEARCH Pitfall 7). Phase 47 must pre-compute `addressChanged` per row via a single `findMany({ where: { arztNr: { in: [...] } }, select: { arztNr: true, address: true } })` BEFORE the transaction (inside-transaction read-modify-write is too slow at 3,577 rows).

### Test bootstrap (pglite + vi.doMock)

**Source:** `src/lib/admin/doctors-actions.test.ts:30-76`
**Apply to:** `src/lib/admin/doctors-import-actions.test.ts`.

`vi.mock` (hoisted) for auth/geocode/mapgen, `vi.doMock('../prisma', ...)` AFTER `createTestDb()` in `beforeAll`, dynamic `await import('./doctors-import-actions')` AFTER doMock fires.

### Positional mock.calls assertions

**Source:** Phase 46 D-32 (documented in CONTEXT.md `code_context > Reusable Assets`)
**Apply to:** All Phase 47 test files asserting on Prisma-touching mocks.

`expect(mockedGeocode.mock.calls[0][1]).toBe('Hauptplatz 1')` (positional `[N][i]`) — NOT `toHaveBeenCalledWith(prismaClient, …)` (recursion blows the stack).

### Design tokens

**Source:** `src/app/(admin)/admin/aerzte/DoctorRow.tsx` (`--dir-*` token usage), `.planning/phases/46-aerzteverzeichnis/DESIGN.md`
**Apply to:** `src/app/(admin)/admin/aerzte/import/page.tsx`, `ImportPreview.tsx`, modified `DoctorFilters.tsx` Fachrichtung row.

Use existing `bg-dir-surface`, `bg-dir-surface-container`, `text-dir-on-surface`, `bg-dir-tertiary-container` (positive summary), `bg-dir-error-container` (conflicts), `rounded-dir-md`, `p-dir-md`, etc. No new tokens — DESIGN.md covers the palette.

---

## No Analog Found

| File | Role | Data Flow | Reason | Mitigation |
|------|------|-----------|--------|------------|
| `src/lib/admin/import/csv-parser.ts` | parser | request-response | No CSV parsing exists in the codebase | Use the pure-helper convention from `src/lib/ingestion/dedup.ts` (file-level docstring, typed interfaces, no DI for pure transforms). Concrete papaparse-based code already drafted in RESEARCH.md lines 475-549 — planner copies that. |
| `scripts/generate-fachrichtung-mapping.ts` | one-off codegen | file I/O | No `scripts/` directory codegen precedent | Optional helper; if planner skips it, the mapping file is hand-maintained from `fachrichtung-values.txt`. No pattern to follow — write as a plain Node `tsx` script using `readFileSync`/`writeFileSync`. |

---

## Cross-Cutting Hazards Reminder

**Prisma client regeneration:** After `schema.prisma` edits, `npx prisma generate` MUST run before `tsc --noEmit` or `vitest`. Add a `# Prerequisite` note in each Phase 47 plan that touches `@prisma/client` types (RESEARCH Pitfall 2).

**Migration ordering for pglite tests:** Directory name MUST sort after `20260515_phase46_doctors`. Use `20260516…` or later (RESEARCH Pitfall 6).

**Module-scoped in-memory cache cold-start UX:** Vercel function cold-start drops the `PREVIEW_CACHE` Map. Surface as `"Session abgelaufen — bitte erneut hochladen"` German error in `commitCsvImportAction` (RESEARCH Pitfall 3).

**DECISIONS.md entry required:** Adding `papaparse` + `@types/papaparse` triggers the AGENTS.md anti-bloat rule. Planner mints a DECISIONS.md entry naming the dep, version, rationale, and rejected alternatives.

---

## Metadata

**Analog search scope:**
- `src/lib/admin/` (Trinity + batch loop)
- `src/lib/content/` (DAL DI overloads)
- `src/lib/reader/` (JSON-LD + label transforms)
- `src/lib/ingestion/` (`$transaction([...])`, pure-helper convention)
- `src/app/(admin)/admin/aerzte/` (admin RSC + client filters + form components)
- `src/app/(public)/aerzte/` (public RSC + client filter + detail JSON-LD)
- `src/app/api/cron/` (maxDuration evidence)
- `prisma/migrations/20260515_phase46_doctors/` (migration template)
- `bundesland.config.ts` (Bezirk seed source)
- `test/fixtures/`, `src/test/setup-db.ts` (test infrastructure)

**Files read (full):** 11 source files
**Files grepped for line targeting:** 6 additional files
**Pattern extraction date:** 2026-05-16
