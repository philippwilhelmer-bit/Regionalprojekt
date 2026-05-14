# Phase 46: Ärzteverzeichnis (Doctor Directory) — Research

**Researched:** 2026-05-14
**Domain:** Editorial CRUD + public directory pages on Next.js 15 App Router + Prisma/Postgres, with Nominatim geocoding and static map pins.
**Confidence:** HIGH (all patterns sourced from live code in this repo; the only external dependency consideration — Leaflet — is cross-checked against npmjs/bundlephobia)

## Summary

Phase 46 builds a public doctor directory at `/aerzte` with admin CRUD at `/admin/aerzte`. Every requirement in CONTEXT.md maps cleanly onto patterns that already ship in this repo: the Article DAL + Server-Action-Trinity (`src/lib/content/articles.ts`, `src/lib/admin/articles-actions.ts`), the slug-canonical detail-page pattern (`src/app/(public)/artikel/[publicId]/[slug]/page.tsx`), the single-call Nominatim helper (`src/lib/images/geocode.ts`), and the existing static-map pipeline (`src/lib/images/mapgen.ts` + `src/app/api/admin/generate-map/route.ts`).

There is **one structural ambiguity** that the user already deferred to plan-phase: static-map-via-mapgen vs interactive-Leaflet for the detail-page pin. Research finds: the mapgen pipeline is *over-engineered for a single fixed address* (it ships full 5×3 tile composite to Vercel Blob — heavy for an address-pin use case). Static map at the editorial-tier is fine; an interactive Leaflet would cost a new dep (~39 KB gz JS + 4 KB gz CSS) plus DECISIONS.md entry. **Recommendation:** static via mapgen for MVP — no new dep, infrastructure already proven; revisit interactive in a later "directory polish" plan.

The phase-local design tokens are **additive only**: 16 truly-new tokens (Material 3 surface-container ramps, fixed-tone variants, error palette) plus 4 phase-divergent overrides (`--dir-primary`, `--dir-on-surface`, `--dir-on-surface-variant`, `--dir-outline`). Master `--color-primary` etc. stay untouched.

**Primary recommendation:** Implement as a single Prisma additive migration + new `src/lib/content/doctors.ts` DAL + new `src/lib/admin/doctors-actions.ts` Server-Action-Trinity, mirroring the articles modules verbatim. Mint `DIR-01..DIR-13` requirement IDs and backfill them into `REQUIREMENTS.md`. Use static map via mapgen. Token prefix: `--dir-*` (confirmed). Discoverability: AppBar nav-link "Ärzte" + Footer-link, no new BottomNav tab.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Datasource**
- Editorial CRUD in admin — no external API, no scraping, no public submit.
- New Prisma table `Doctor`; admin route `/admin/aerzte` mirrors `/admin/articles` patterns.
- Server-Action-Trinity per AGENTS.md: `xxxDb(db, input)` / `xxxAction(input)` / `xxxForm(formData)`.
- DI via duck-typing (`'$connect' in clientOrOptions`), pglite-injectable for tests.

**Eintragstypen**
- One `Doctor` table, three categories via enum `kategorie`: `ALLGEMEINMEDIZIN`, `FACHARZT` (with free-text `fachrichtung`), `ZAHNARZT`.
- Apotheken NOT in this phase.

**Routing**
- `/aerzte` public list, Server Component, `export const dynamic = 'force-dynamic'`.
- `/aerzte/{publicId}/{slug}` detail page, `slugify()` from `lib/reader/slug`, `permanentRedirect` on slug mismatch.
- Filters as query params: `?bezirk=...&kategorie=...&fachrichtung=...`.
- **No new BottomNav tab** — discoverable via AppBar nav-link + Footer.
- Admin: `/admin/aerzte` (list + new) and `/admin/aerzte/[id]/edit` (edit).

**Geocoding**
- Columns `address: string`, `lat: number | null`, `lon: number | null`.
- Geocode at admin-save in the Server Action via Nominatim — single call per save, rate-limit safe.
- Reuse `src/lib/images/geocode.ts`. Bulk loops MUST `await sleep(1100)`; single-save needs no sleep.
- If Nominatim fails: persist `lat/lon = null`, surface admin warning, detail page falls back to address-only.

**Map View** (decision-deferred-to-plan)
- Option A: static via existing `lib/images/mapgen.ts` pipeline (no new dep).
- Option B: Leaflet client component (new dep).
- This research recommends Option A — see "Map Engine" below.

**Editorial Notes + Cross-Links**
- `editorialNote: string | null` — Markdown rendered with the article-detail `split('\n\n')` paragraph pattern.
- `relatedArticleIds: string[]` — manual curated list of `Article.publicId`s, "Mehr zum Thema" using `EditorialStackCard variant="row"`.
- One-way only: article detail does not back-reference doctors.

**Verification Badge**
- `isVerified: boolean`, default `false`.
- Admin toggle. Public list + detail render Eyebrow-style badge when true.

**Bezirk-Zuordnung**
- Single `bezirkId: number` FK to `Bezirk`. Multi-Bezirk practices out of scope.

**Design Tokens — Phase-Local**
- Phase-local design system lives in `.planning/phases/46-aerzteverzeichnis/DESIGN.md`.
- Master `DESIGN.md` at project root NOT touched.
- New tokens added to `globals.css` under `--dir-*` namespace (this research confirms the prefix).
- Only `/aerzte` and `/admin/aerzte` reference new tokens.
- YAML values authoritative for the two prose-vs-YAML conflicts.

### Claude's Discretion

The 9 open questions from CONTEXT.md (felder-vollkatalog, map-engine, suche-modus, JSON-LD, sortierung, bulk-import, AppBar/Footer-link, sitemap, token-prefix) — concrete recommendations given below in **Open Questions Answered**.

### Deferred Ideas (OUT OF SCOPE)

- Apotheken (separate schema: Notdienst, Öffnungszeiten-Slots) → possible Phase 47.
- User-submitted entries / crowd-sourcing.
- User ratings / reviews.
- AI-tagged article→doctor cross-linking (manual only for MVP).
- Doctor→article back-reference (one-way for MVP).
- Multi-Bezirk practice support.
- Global migration of the new design tokens.
- Bulk CSV import.
</user_constraints>

<phase_requirements>
## Phase Requirements

No `DIR-*` IDs exist in `REQUIREMENTS.md` yet. **This research proposes minting them** (existing naming pattern: AIPL-, INGEST-, QUAL-, TLM-) and backfilling them into `REQUIREMENTS.md` as part of plan-phase or its first plan. Proposed set:

| Proposed ID | Description | Research Support |
|----|-------------|-----------------|
| **DIR-01** | New `Doctor` Prisma model with columns id, publicId (nanoid), kategorie (enum), fachrichtung, name, titel, address, lat, lon, bezirkId FK, email?, website?, phone?, editorialNote?, relatedArticleIds (String[]), isVerified, createdAt, updatedAt | "Prisma Schema" section — additive migration based on `prisma/migrations/20260514_phase44_source_cursor/migration.sql` pattern |
| **DIR-02** | `DoctorKategorie` enum: `ALLGEMEINMEDIZIN`, `FACHARZT`, `ZAHNARZT` | "Prisma Schema" section |
| **DIR-03** | DAL `src/lib/content/doctors.ts` with overloaded `listDoctors(filter)`, `getDoctorById(id)`, `getDoctorByPublicId(publicId)` — duck-typed DI | "Architecture Patterns — DAL" section, mirrors `articles.ts` |
| **DIR-04** | Server-Action-Trinity `src/lib/admin/doctors-actions.ts`: `createDoctorDb / createDoctor / createDoctorForm`, same for `update`, `softDelete`, `toggleVerified` | "Architecture Patterns — Server-Action-Trinity" section |
| **DIR-05** | Geocoding integrated into create/update Server Action: single Nominatim call via `geocodeLocation(db, address)`; on null/throw → persist row with `lat/lon=null` and surface admin warning | "Nominatim Integration" section |
| **DIR-06** | Admin pages: `/admin/aerzte` (list with filters + "Neuer Arzt" link), `/admin/aerzte/new`, `/admin/aerzte/[id]/edit` | "Admin Pages" section, mirrors `(admin)/admin/articles/*` |
| **DIR-07** | Public list page `/aerzte`: Server Component, `dynamic = 'force-dynamic'`, query-param filters bezirk/kategorie/fachrichtung, alphabetical sort with `isVerified=true` first, "Mein Bezirk" auto-prefill via existing `bezirk_selection` localStorage convention | "Public Pages" section |
| **DIR-08** | Public detail page `/aerzte/[publicId]/[slug]`: slug canonicalization via `permanentRedirect`, address + map + editorial note + verification badge + related articles block | "Public Pages — Detail" section, mirrors `(public)/artikel/[publicId]/[slug]/page.tsx` |
| **DIR-09** | Static map asset generated at admin-save via reused `generateMapImage(lat, lon, name, doctorId, locationType)`; persisted as `mapImageUrl` column on `Doctor`. Failure logs a warning but does not block save | "Map Engine" section |
| **DIR-10** | JSON-LD on detail page: `MedicalBusiness` for ALLGEMEINMEDIZIN/FACHARZT, `Dentist` for ZAHNARZT, with `medicalSpecialty` for FACHARZT, `address: PostalAddress`, `geo: GeoCoordinates` when lat/lon present | "JSON-LD Schema" section |
| **DIR-11** | Sitemap inclusion: `src/app/sitemap.ts` extended with `/aerzte/{publicId}/{slug}` entries (priority 0.7, weekly) | "Sitemap" section |
| **DIR-12** | AppBar nav-link "Ärzte" added to desktop nav + mobile drawer in `src/components/reader/LodenAppBar.tsx`; Footer "Rubriken" column gets "Ärzte" link | "Discoverability" section |
| **DIR-13** | Phase-local CSS tokens added to `src/app/globals.css` under `--dir-*` prefix; only `/aerzte` and `/admin/aerzte` pages reference them | "Design Token Integration" section |
</phase_requirements>

## Standard Stack

### Core (all already in repo — zero new deps)

| Library | Version (in repo) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15 (App Router) | Server Components, Server Actions, sitemap | Already foundation of the project — every page in `(public)` is async Server Component |
| Prisma | (current) | DB schema + DAL with DI | All content DALs use this pattern (`articles.ts`, `bezirke.ts`, `sources.ts`) |
| React 19 | (current) | Server-by-default; `'use client'` only where needed | Project convention — admin form is server-action-driven, not state-machine |
| TypeScript strict | (current) | Type safety | AIPL-02 explicitly bans `as any` casts; Prisma generates types |
| Tailwind v4 | (current) | Styling via `@theme` in `globals.css` | No `tailwind.config.js` exists — config lives in CSS per Tailwind v4 |
| Vitest + pglite | (current) | DAL tests + action tests | `src/test/setup-db.ts` provides `createTestDb` (in-process WASM Postgres) |
| `@vercel/blob` | (current) | Static map asset hosting | Already used by `mapgen.ts` |
| `sharp` | (current) | Map tile compositing | Already used by `mapgen.ts` |

### Supporting (already in repo)

| Library | Purpose | When to Use |
|---------|---------|-------------|
| `src/lib/images/geocode.ts` | Nominatim with Postgres cache (`GeocodingCache`) | Use unchanged at admin save for address → lat/lon |
| `src/lib/images/mapgen.ts` | basemap.at static map composite (1200×630 JPEG with `© basemap.at`) | Reuse for doctor pin map; `articleId` parameter is just a Blob path key — pass `doctorId` |
| `src/lib/reader/slug.ts` | German-aware `slugify` | URL canonicalization for detail page |
| `src/lib/admin/auth-node.ts` | `requireAuth()` HMAC cookie check | Every Server Action needs this |
| `EditorialStackCard` (`variant="row"`) | Article card | "Mehr zum Thema" related-articles block on detail page |

### Alternatives Considered (and rejected)

| Instead of | Could Use | Tradeoff | Decision |
|------------|-----------|----------|----------|
| `mapgen` static map | Leaflet client component | +39 KB gz JS + 4 KB gz CSS, interactive zoom/pan. NEW DEP — needs DECISIONS.md entry. | **Static** — mapgen pipeline already proven, no new dep, no DECISIONS.md churn |
| `String[]` `relatedArticleIds` | Join table `DoctorArticle` | Join table allows referential integrity + ordered position via `position Int`. String[] is simpler but lets dangling `publicId` refs accumulate. | **`String[]`** — manual curation, low volume (5-10 refs/doctor max), no validation overhead. If volume grows, migrate to join table in a later phase. |
| Markdown via `marked` | Hand-rolled `split('\n\n')` | Already what `(public)/artikel/.../page.tsx` does for body text. No need for full Markdown parser at MVP. | **Hand-rolled** per Anti-Bloat — same paragraph pattern as article body |
| Full-text search on doctor name | Filter chips only | Adds Prisma `contains` query — trivial code, no infra change | **Filter chips only for MVP**; the directory is small enough (Graz region) that browsing by Bezirk + Kategorie is sufficient. Add full-text in a polish plan. |

**Installation:** None. All work uses existing dependencies.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── (public)/
│   │   └── aerzte/
│   │       ├── page.tsx                 # list — Server Component, dynamic
│   │       └── [publicId]/
│   │           └── [slug]/
│   │               └── page.tsx         # detail with slug canonicalization
│   ├── (admin)/
│   │   └── admin/
│   │       └── aerzte/
│   │           ├── page.tsx             # list w/ filters
│   │           ├── new/page.tsx
│   │           ├── DoctorRow.tsx        # row component
│   │           ├── DoctorFilters.tsx    # filter chips client
│   │           └── [id]/edit/page.tsx
│   └── sitemap.ts                       # ← extend with doctor URLs
├── lib/
│   ├── content/
│   │   ├── doctors.ts                   # DAL (public-facing reads)
│   │   ├── doctors.test.ts              # pglite tests
│   │   └── doctors-utils.ts             # optional helpers (kategorie label)
│   ├── admin/
│   │   ├── doctors-actions.ts           # Server-Action-Trinity
│   │   └── doctors-actions.test.ts
│   └── reader/
│       └── doctor-metadata.ts           # JSON-LD + Next.js Metadata helper
├── components/
│   └── reader/
│       └── DoctorCard.tsx               # list card (use Eyebrow + verification badge)
│       └── DoctorMap.tsx                # if static: <img>; if Leaflet: 'use client'
└── app/globals.css                       # ← append --dir-* tokens
prisma/
├── migrations/
│   └── 20260515_phase46_doctors/
│       └── migration.sql                # additive migration
└── schema.prisma                        # ← add Doctor + DoctorKategorie
```

### Pattern 1: DAL with Overload + Duck-Type DI

**What:** Two overloaded signatures so production usage stays clean (`listDoctors({ bezirkId: 1 })`) while tests inject a pglite client (`listDoctors(testDb, { bezirkId: 1 })`).

**When to use:** Every read function in `src/lib/content/`. Verbatim pattern from `articles.ts:13-78`.

**Code:**

```typescript
// src/lib/content/doctors.ts
import type { Doctor, DoctorKategorie, Prisma, PrismaClient } from '@prisma/client'
import { prisma as defaultPrisma } from '../prisma'

export type DoctorWithBezirk = Doctor & { bezirk: { id: number; slug: string; name: string } }

export interface ListDoctorsOptions {
  bezirkId?: number
  bezirkSlug?: string
  kategorie?: DoctorKategorie
  fachrichtung?: string // contains-match for FACHARZT free text
  isVerified?: boolean
  limit?: number
  offset?: number
}

export async function listDoctors(options?: ListDoctorsOptions): Promise<DoctorWithBezirk[]>
export async function listDoctors(client: PrismaClient, options?: ListDoctorsOptions): Promise<DoctorWithBezirk[]>
export async function listDoctors(
  clientOrOptions?: PrismaClient | ListDoctorsOptions,
  options?: ListDoctorsOptions,
): Promise<DoctorWithBezirk[]> {
  let db: PrismaClient
  let opts: ListDoctorsOptions

  if (clientOrOptions !== null && typeof clientOrOptions === 'object' && '$connect' in clientOrOptions) {
    db = clientOrOptions as PrismaClient
    opts = options ?? {}
  } else {
    db = defaultPrisma
    opts = (clientOrOptions as ListDoctorsOptions) ?? {}
  }

  const { bezirkId, bezirkSlug, kategorie, fachrichtung, isVerified, limit = 50, offset = 0 } = opts

  // Resolve slug→id if needed (cheap; Bezirk table is 13 rows)
  let resolvedBezirkId = bezirkId
  if (resolvedBezirkId === undefined && bezirkSlug !== undefined) {
    const b = await db.bezirk.findUnique({ where: { slug: bezirkSlug } })
    if (!b) return []
    resolvedBezirkId = b.id
  }

  return db.doctor.findMany({
    where: {
      ...(resolvedBezirkId !== undefined ? { bezirkId: resolvedBezirkId } : {}),
      ...(kategorie !== undefined ? { kategorie } : {}),
      ...(fachrichtung !== undefined ? { fachrichtung: { contains: fachrichtung, mode: 'insensitive' } } : {}),
      ...(isVerified !== undefined ? { isVerified } : {}),
    },
    include: { bezirk: { select: { id: true, slug: true, name: true } } },
    orderBy: [{ isVerified: 'desc' }, { name: 'asc' }],  // verified first, then alphabetical
    take: limit,
    skip: offset,
  })
}

export async function getDoctorByPublicId(publicId: string): Promise<DoctorWithBezirk | null>
export async function getDoctorByPublicId(client: PrismaClient, publicId: string): Promise<DoctorWithBezirk | null>
export async function getDoctorByPublicId(
  clientOrPublicId: PrismaClient | string,
  publicId?: string,
): Promise<DoctorWithBezirk | null> {
  if (typeof clientOrPublicId === 'string') {
    return defaultPrisma.doctor.findUnique({
      where: { publicId: clientOrPublicId },
      include: { bezirk: { select: { id: true, slug: true, name: true } } },
    })
  }
  return clientOrPublicId.doctor.findUnique({
    where: { publicId: publicId! },
    include: { bezirk: { select: { id: true, slug: true, name: true } } },
  })
}
```

**Source:** Mirrors `src/lib/content/articles.ts:13-117` verbatim — same overload shape, same duck-type check.

### Pattern 2: Server-Action-Trinity for Mutations

**What:** Every mutation is exposed three ways: pure `*Db` (testable), `*Action` (auth + delegates), `*Form` (FormData + redirect/revalidate).

**When to use:** All admin CRUD endpoints. Verbatim pattern from `articles-actions.ts:233-304` and `sources-actions.ts:177-254`.

**Code:**

```typescript
// src/lib/admin/doctors-actions.ts
'use server'

import type { Doctor, DoctorKategorie, PrismaClient } from '@prisma/client'
import { prisma as defaultPrisma } from '../prisma'
import { requireAuth } from './auth-node'
import { geocodeLocation } from '../images/geocode'
import { generateMapImage } from '../images/mapgen'

// ─── Input types ──────────────────────────────────────────────────────────────

export interface CreateDoctorInput {
  name: string
  titel?: string
  kategorie: DoctorKategorie
  fachrichtung?: string  // required only if kategorie === 'FACHARZT'
  address: string
  bezirkId: number
  email?: string
  website?: string
  phone?: string
  editorialNote?: string
  relatedArticleIds?: string[]
}

export interface UpdateDoctorInput extends Partial<CreateDoctorInput> {
  id: number
}

// ─── DB-layer (pure, no auth) ─────────────────────────────────────────────────

/**
 * Pure DB-level create. Does NOT geocode — caller is responsible.
 * Geocoded fields (lat, lon, mapImageUrl) passed as optional params.
 */
export async function createDoctorDb(
  db: PrismaClient,
  input: CreateDoctorInput,
  geo?: { lat: number; lon: number; locationType?: string },
  mapImageUrl?: string | null,
): Promise<Doctor> {
  return db.doctor.create({
    data: {
      name: input.name,
      titel: input.titel,
      kategorie: input.kategorie,
      fachrichtung: input.fachrichtung,
      address: input.address,
      bezirkId: input.bezirkId,
      email: input.email,
      website: input.website,
      phone: input.phone,
      editorialNote: input.editorialNote,
      relatedArticleIds: input.relatedArticleIds ?? [],
      lat: geo?.lat ?? null,
      lon: geo?.lon ?? null,
      mapImageUrl: mapImageUrl ?? null,
      isVerified: false,
    },
  })
}

export async function updateDoctorDb(db: PrismaClient, input: UpdateDoctorInput): Promise<Doctor> {
  const { id, ...fields } = input
  return db.doctor.update({ where: { id }, data: fields })
}

export async function toggleVerifiedDb(db: PrismaClient, doctorId: number): Promise<Doctor> {
  const cur = await db.doctor.findUniqueOrThrow({ where: { id: doctorId } })
  return db.doctor.update({ where: { id: doctorId }, data: { isVerified: !cur.isVerified } })
}

export async function softDeleteDoctorDb(db: PrismaClient, doctorId: number): Promise<void> {
  // No status enum for Doctor → hard delete (admin-only, low volume)
  await db.doctor.delete({ where: { id: doctorId } })
}

// ─── Server Action wrappers (auth + orchestration) ───────────────────────────

/**
 * Create a doctor. Server Action — runs geocoding inline (single call, no sleep needed).
 * Falls back to lat/lon=null + no map asset on Nominatim failure.
 */
export async function createDoctor(input: CreateDoctorInput): Promise<Doctor> {
  await requireAuth()

  let geo: { lat: number; lon: number; locationType: string } | null = null
  try {
    const result = await geocodeLocation(defaultPrisma, input.address)
    if (result) geo = result
  } catch (err) {
    console.warn(`[doctors-actions] geocode failed for "${input.address}": ${String(err)}`)
  }

  // Map generation in its own try/catch — must not block save (AGENTS.md error-handling rule)
  let mapImageUrl: string | null = null
  if (geo) {
    try {
      const map = await generateMapImage(geo.lat, geo.lon, input.name, /* temp id */ 0, geo.locationType)
      if (map) mapImageUrl = map.url
    } catch (err) {
      console.warn(`[doctors-actions] mapgen failed: ${String(err)}`)
    }
  }

  return createDoctorDb(defaultPrisma, input, geo ?? undefined, mapImageUrl)
}

export async function updateDoctor(input: UpdateDoctorInput): Promise<Doctor> {
  await requireAuth()
  // If address changed, re-geocode. (Cheap: cache hits are free.)
  // Detection: compare to existing row. Out-of-scope for skeleton — plan-phase decides.
  return updateDoctorDb(defaultPrisma, input)
}

export async function toggleVerified(doctorId: number): Promise<Doctor> {
  await requireAuth()
  return toggleVerifiedDb(defaultPrisma, doctorId)
}

// ─── FormData wrappers ────────────────────────────────────────────────────────

export async function createDoctorForm(formData: FormData): Promise<void> {
  await requireAuth()
  const { redirect } = await import('next/navigation')
  const relatedRaw = formData.get('relatedArticleIds')?.toString() ?? ''
  const relatedArticleIds = relatedRaw.split(',').map(s => s.trim()).filter(Boolean)

  await createDoctor({
    name: formData.get('name')?.toString() ?? '',
    titel: formData.get('titel')?.toString() || undefined,
    kategorie: formData.get('kategorie')?.toString() as DoctorKategorie,
    fachrichtung: formData.get('fachrichtung')?.toString() || undefined,
    address: formData.get('address')?.toString() ?? '',
    bezirkId: Number(formData.get('bezirkId')),
    email: formData.get('email')?.toString() || undefined,
    website: formData.get('website')?.toString() || undefined,
    phone: formData.get('phone')?.toString() || undefined,
    editorialNote: formData.get('editorialNote')?.toString() || undefined,
    relatedArticleIds,
  })
  redirect('/admin/aerzte')
}

export async function toggleVerifiedForm(formData: FormData): Promise<void> {
  await requireAuth()
  const { revalidatePath } = await import('next/cache')
  const id = Number(formData.get('id'))
  await toggleVerifiedDb(defaultPrisma, id)
  revalidatePath('/admin/aerzte')
}
```

**Source:** Mirrors `src/lib/admin/articles-actions.ts:233-304` (typed wrappers) and `:264-303` (FormData wrappers), plus `map-actions.ts:39-84` for the inline-geocoding-and-mapgen pattern.

### Pattern 3: Slug-Canonical Detail Page

**What:** `permanentRedirect` when URL slug doesn't match `slugify(name)`. Pure server component — no client state.

**Code (skeleton):**

```typescript
// src/app/(public)/aerzte/[publicId]/[slug]/page.tsx
import { notFound, permanentRedirect } from 'next/navigation'
import { getDoctorByPublicId } from '@/lib/content/doctors'
import { slugify } from '@/lib/reader/slug'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ publicId: string; slug: string }> }

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.lodenundleute.at'

export default async function DoctorDetailPage({ params }: Props) {
  const { publicId, slug } = await params
  const doctor = await getDoctorByPublicId(publicId)
  if (!doctor) notFound()

  const canonical = slugify(doctor.name)
  if (slug !== canonical) {
    permanentRedirect(`/aerzte/${publicId}/${canonical}`)
  }

  const canonicalUrl = `${BASE_URL}/aerzte/${publicId}/${canonical}`

  // ... rest of detail page
}
```

**Source:** Verbatim shape from `src/app/(public)/artikel/[publicId]/[slug]/page.tsx:27-38`.

### Anti-Patterns to Avoid

- **Don't `instanceof PrismaClient`** — breaks Vitest module isolation. Use `'$connect' in clientOrOptions` (AGENTS.md DI rule).
- **Don't wrap `requireAuth()` in try/catch** — it calls `redirect()` which throws `NEXT_REDIRECT`; catching breaks the redirect (AGENTS.md auth rule).
- **Don't reach for a new dep** — Leaflet looked like the obvious choice; it's the wrong choice for MVP. Static map ships zero new deps.
- **Don't put a Markdown parser in for `editorialNote`** — the article body already uses `content.split('\n\n')`; reuse the pattern (Anti-Bloat).
- **Don't add a third BottomNav tab** — explicit user decision; discoverability happens via AppBar + Footer.
- **Don't touch `--color-primary` etc. in master `globals.css`** — phase-local tokens are additive under `--dir-*`. Master design system stays untouched.
- **Don't store HTML in `editorialNote`** — accept Markdown-flavored plain text, render with paragraph split.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Geocoding | Custom Nominatim wrapper | `geocodeLocation()` from `src/lib/images/geocode.ts` | Already cached via `GeocodingCache` table, already handles P2002 race, already sets `User-Agent: LodenUndLeute/1.0 (https://lodenundleute.at)` |
| Tile compositing | Custom map renderer | `generateMapImage()` from `src/lib/images/mapgen.ts` | Handles 5×3 tile grid, attribution SVG (font-free for Vercel lambda), Vercel Blob upload, 5xx retry — proven in production |
| URL slugs | Custom regex | `slugify()` from `src/lib/reader/slug.ts` | Already handles ä/ö/ü/ß — the German-aware mapping is intentional and used across all article URLs |
| HMAC session check | `cookieStore.get(...)` + custom verify | `requireAuth()` from `src/lib/admin/auth-node.ts` | timing-safe equals, throws `NEXT_REDIRECT`, single source of truth for session validation |
| Server-side Markdown | `marked` / `remark` | `content.split('\n\n').filter(Boolean)` paragraphs | Matches article-detail body rendering exactly (see `src/app/(public)/artikel/[publicId]/[slug]/page.tsx:83`) |
| Public-ID generation | `randomUUID()` or custom nanoid | Prisma `@default(nanoid())` | Already used on `Article.publicId` — same DB-level generation, no app logic needed |
| Filter chips component | Custom checkbox-group | Existing `ArticleFilters` pattern from `(admin)/admin/articles/ArticleFilters.tsx` | Already paired with searchParams; mirror the shape |
| Related-article block | New card component | `EditorialStackCard variant="row"` (already supports it) | `src/components/reader/EditorialStackCard.tsx:8,22` — the row variant exists |

**Key insight:** Phase 46 needs almost no new infrastructure. Every load-bearing piece — Nominatim cache, tile compositing, Blob upload, slug rules, auth, DI helper, paragraph rendering — already ships and is battle-tested in v3.0/v3.1/v3.2.

## Common Pitfalls

### Pitfall 1: Geocoding Failure Blocks Save
**What goes wrong:** Nominatim returns 5xx or 0 results; the Server Action throws; the admin loses their typed-in form data.
**Why it happens:** Forgetting to wrap `geocodeLocation` in try/catch in the action layer.
**How to avoid:** Wrap the geocode call in try/catch; persist row with `lat=null, lon=null`; show admin warning. See the `createDoctor` skeleton above.
**Warning signs:** Action handlers without try/catch around external HTTP calls (AGENTS.md error-handling rule explicitly bans this).

### Pitfall 2: Bulk-Loop Without `await sleep(1100)`
**What goes wrong:** If anyone later writes a CSV importer or a "regeocode all" admin button, hitting Nominatim in a tight loop will trip the 1 req/s policy → IP block.
**Why it happens:** Easy to miss the rate-limit obligation when geocoding is "just a single call" in the happy path.
**How to avoid:** Single-save flow needs no sleep (one call). Any loop MUST `await new Promise(r => setTimeout(r, 1100))` after each call. Reference: `src/lib/admin/map-actions.ts:130, 139` for the canonical pattern.
**Warning signs:** A loop calling `geocodeLocation` without a sleep — same lint pattern as `pipeline.ts:217-248` flagged in DECISIONS.md.

### Pitfall 3: Slug Drift on Name Change
**What goes wrong:** Doctor renamed from "Dr. Meier" to "Dr. Müller" — old URL `/aerzte/abc123/dr-meier` returns the doctor but slug mismatches and `permanentRedirect` fires → 301 chain accumulates over multiple renames.
**Why it happens:** Slug is regenerated on every page render from the current name.
**How to avoid:** This is **acceptable** — same behavior as Article detail page. `permanentRedirect` is idempotent; Google handles 301 chains. Plan-phase should accept it explicitly.
**Warning signs:** Editor renames cause user-visible broken bookmarks. Acceptable risk; mitigation = `publicId` is the stable handle.

### Pitfall 4: Forgetting `dynamic = 'force-dynamic'`
**What goes wrong:** Build-time prerender attempts to query DB; build fails with "Prisma client called during prerender."
**Why it happens:** Default page rendering mode in Next.js 15 App Router tries to statically generate.
**How to avoid:** Every `page.tsx` that reads DB MUST `export const dynamic = 'force-dynamic'` (AGENTS.md rendering rule). Both `/aerzte` and `/aerzte/[publicId]/[slug]` need this.
**Warning signs:** Production build error mentioning prerender + Prisma.

### Pitfall 5: pglite Test Parallelism Flakiness
**What goes wrong:** Phase 43 docs note "Test-Parallelismus-Flakiness" because shared seeded Bezirke rows interact with concurrent tests.
**Why it happens:** Each `createTestDb()` is isolated (separate WASM instance), so this is actually OK *if* tests don't share a single PrismaClient. The existing `articles.test.ts` pattern (one `prisma` per describe, `seedBezirke` once in `beforeAll`, clean tables in `beforeEach`) is safe.
**How to avoid:** Follow articles.test.ts structure verbatim. Don't share the test-DB across test files.
**Warning signs:** Inconsistent test failures only under parallel runs.

### Pitfall 6: Nominatim Returns Wrong Country
**What goes wrong:** Address "Hauptstraße 1, 8010 Graz" without `countrycodes=at` could resolve to a Graz in Germany.
**Why it happens:** Nominatim defaults to global search.
**How to avoid:** `geocodeLocation` already appends `countrycodes=at` (see `geocode.ts:62`). Don't bypass it.
**Warning signs:** Map pin lands hundreds of km from the actual practice.

### Pitfall 7: Map Asset Path Collision
**What goes wrong:** `mapgen.uploadToBlob` uses path `maps/article-${articleId}.jpg`. If doctor IDs and article IDs collide (both start at 1), maps overwrite each other.
**Why it happens:** Path scheme hardcoded to "article-".
**How to avoid:** Plan-phase MUST extend `mapgen` or fork the upload path: e.g. parameterize the prefix, or write a thin `generateDoctorMap(doctorId, ...)` that writes to `maps/doctor-${doctorId}.jpg`. Currently `mapgen.ts:587-594` hardcodes the prefix.
**Warning signs:** Existing article maps disappear after admin saves a doctor.

### Pitfall 8: `force-dynamic` Sitemap Performance
**What goes wrong:** `/sitemap.xml` queries DB on every request — adding doctors increases query time.
**Why it happens:** `sitemap.ts:8` sets `dynamic = 'force-dynamic'`.
**How to avoid:** Current scale (hundreds of doctors) is far from the 50k URL Sitemaps spec limit. Plan-phase should add a `take: 5000` limit to `listDoctors` call in sitemap to bound query cost — same defensive pattern as `articles` `take: 1000`.
**Warning signs:** `/sitemap.xml` request taking seconds; bot crawl traffic spiking.

## Code Examples

### Prisma Schema Addition

```prisma
// Add to prisma/schema.prisma

enum DoctorKategorie {
  ALLGEMEINMEDIZIN
  FACHARZT
  ZAHNARZT
}

model Doctor {
  id                Int             @id @default(autoincrement())
  publicId          String          @unique @default(nanoid())
  name              String          // e.g. "Dr. Maria Müller"
  titel             String?         // optional Titel prefix, e.g. "Univ.-Doz. Dr."
  kategorie         DoctorKategorie
  fachrichtung      String?         // free-text, required when kategorie === FACHARZT (enforced in action layer, not DB)
  address           String          // full address as one line
  lat               Float?
  lon               Float?
  bezirk            Bezirk          @relation(fields: [bezirkId], references: [id])
  bezirkId          Int
  email             String?
  website           String?
  phone             String?
  editorialNote     String?         // Markdown-flavored, rendered as paragraphs
  relatedArticleIds String[]        @default([])  // array of Article.publicId strings; manual curation
  mapImageUrl       String?         // Vercel Blob URL of static map asset
  isVerified        Boolean         @default(false)
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  @@index([bezirkId])
  @@index([kategorie])
  @@index([publicId])
  @@index([isVerified, name])
}

// Add to Bezirk model (relation back-reference):
model Bezirk {
  // ... existing fields ...
  doctors   Doctor[]
}
```

**Source:** Schema fields modeled on CONTEXT.md "Eintragstypen" + "Bezirk-Zuordnung" + "Editorial Notes" + "Verification Badge" sections; FK shape mirrors `ArticleBezirk` (junction-via-relation) but doctor is single-bezirk so direct FK on Doctor is correct.

### Additive Migration SQL

```sql
-- prisma/migrations/20260515_phase46_doctors/migration.sql

-- CreateEnum
CREATE TYPE "DoctorKategorie" AS ENUM ('ALLGEMEINMEDIZIN', 'FACHARZT', 'ZAHNARZT');

-- CreateTable
CREATE TABLE "Doctor" (
    "id"                SERIAL          NOT NULL,
    "publicId"          TEXT            NOT NULL,
    "name"              TEXT            NOT NULL,
    "titel"             TEXT,
    "kategorie"         "DoctorKategorie" NOT NULL,
    "fachrichtung"      TEXT,
    "address"           TEXT            NOT NULL,
    "lat"               DOUBLE PRECISION,
    "lon"               DOUBLE PRECISION,
    "bezirkId"          INTEGER         NOT NULL,
    "email"             TEXT,
    "website"           TEXT,
    "phone"             TEXT,
    "editorialNote"     TEXT,
    "relatedArticleIds" TEXT[]          NOT NULL DEFAULT ARRAY[]::TEXT[],
    "mapImageUrl"       TEXT,
    "isVerified"        BOOLEAN         NOT NULL DEFAULT false,
    "createdAt"         TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3)    NOT NULL,
    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_publicId_key" ON "Doctor"("publicId");
CREATE INDEX "Doctor_bezirkId_idx" ON "Doctor"("bezirkId");
CREATE INDEX "Doctor_kategorie_idx" ON "Doctor"("kategorie");
CREATE INDEX "Doctor_publicId_idx" ON "Doctor"("publicId");
CREATE INDEX "Doctor_isVerified_name_idx" ON "Doctor"("isVerified", "name");

-- AddForeignKey
ALTER TABLE "Doctor"
  ADD CONSTRAINT "Doctor_bezirkId_fkey"
  FOREIGN KEY ("bezirkId") REFERENCES "Bezirk"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
```

**Source:** Migration shape mirrors `prisma/migrations/20260514_phase44_source_cursor/migration.sql` (recent additive pattern). Indexes mirror Article-table conventions.

### Sitemap Extension

```typescript
// src/app/sitemap.ts — add to existing function

import { listDoctors } from '../lib/content/doctors'

// ... inside sitemap():
const [articles, bezirke, doctors] = await Promise.all([
  listArticles({ status: 'PUBLISHED', limit: 1000 }),
  listBezirke(),
  listDoctors({ limit: 5000 }),  // bounded
])

const doctorEntries: MetadataRoute.Sitemap = doctors.map(d => ({
  url: `${BASE_URL}/aerzte/${d.publicId}/${slugify(d.name)}`,
  lastModified: d.updatedAt,
  changeFrequency: 'weekly',
  priority: 0.7,
}))

return [
  { url: BASE_URL, changeFrequency: 'hourly', priority: 1.0 },
  { url: `${BASE_URL}/impressum`, changeFrequency: 'monthly', priority: 0.3 },
  { url: `${BASE_URL}/aerzte`, changeFrequency: 'daily', priority: 0.7 },  // index page
  ...bezirkEntries,
  ...articleEntries,
  ...doctorEntries,
]
```

**Source:** Existing `src/app/sitemap.ts:23-52` pattern; add doctors as a third parallel `Promise.all` arm.

### JSON-LD Schema

```typescript
// src/lib/reader/doctor-metadata.ts

import type { Doctor, DoctorKategorie } from '@prisma/client'
import type { Metadata } from 'next'
import { slugify } from './slug'

export function buildDoctorMetadata(
  doctor: (Doctor & { bezirk: { name: string } }) | null,
  baseUrl: string,
): Metadata {
  if (!doctor) return {}

  const slug = slugify(doctor.name)
  const canonical = `${baseUrl}/aerzte/${doctor.publicId}/${slug}`
  const titleParts = [doctor.titel, doctor.name].filter(Boolean).join(' ')

  return {
    title: `${titleParts} — ${kategorieLabel(doctor.kategorie)} in ${doctor.bezirk.name}`,
    description: doctor.editorialNote?.slice(0, 160) ?? `${titleParts}: ${doctor.address}`,
    alternates: { canonical },
    openGraph: {
      title: titleParts,
      description: doctor.editorialNote?.slice(0, 160),
      url: canonical,
      type: 'profile',
    },
  }
}

export function buildDoctorJsonLd(
  doctor: Doctor & { bezirk: { name: string } },
  canonicalUrl: string,
): Record<string, unknown> {
  // Schema.org: MedicalBusiness covers physicians; Dentist is a sub-type.
  // Spec: https://schema.org/MedicalBusiness, https://schema.org/Dentist
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
    jsonLd.geo = {
      '@type': 'GeoCoordinates',
      latitude: doctor.lat,
      longitude: doctor.lon,
    }
  }

  if (doctor.kategorie === 'FACHARZT' && doctor.fachrichtung) {
    jsonLd.medicalSpecialty = doctor.fachrichtung
  }

  if (doctor.email) jsonLd.email = doctor.email
  if (doctor.phone) jsonLd.telephone = doctor.phone
  if (doctor.website) jsonLd.sameAs = [doctor.website]

  return jsonLd
}

function kategorieLabel(k: DoctorKategorie): string {
  switch (k) {
    case 'ALLGEMEINMEDIZIN': return 'Allgemeinmediziner:in'
    case 'FACHARZT':         return 'Facharzt/Fachärztin'
    case 'ZAHNARZT':         return 'Zahnarzt/Zahnärztin'
  }
}
```

**Source:**
- `MedicalBusiness` parent type — https://schema.org/MedicalBusiness
- `Physician` (most-specific for general practitioners + specialists) — https://schema.org/Physician
- `Dentist` (sub-type for dentists) — https://schema.org/Dentist
- `medicalSpecialty` field shape — https://schema.org/medicalSpecialty (accepts free-text or `MedicalSpecialty` enum; free-text is valid for the FACHARZT free-text case)
- Existing JSON-LD emit pattern from `src/app/(public)/artikel/[publicId]/[slug]/page.tsx:40-49`

### AppBar Nav Addition

```diff
 // src/components/reader/LodenAppBar.tsx

         <nav className="hidden md:flex items-center gap-6 text-sm text-primary/80">
           <Link href="/" className="hover:text-accent transition-colors">Startseite</Link>
           <Link href="/suche" className="hover:text-accent transition-colors">Bibliothek</Link>
+          <Link href="/aerzte" className="hover:text-accent transition-colors">Ärzte</Link>
           <button ...>
```

Plus same line in mobile drawer (the `{menuOpen && ...}` block).

### Footer Link

```diff
 // src/components/reader/Footer.tsx — inside "Rubriken" column

             <ul className="...">
               <li><Link href="/">Startseite</Link></li>
               <li><Link href="/suche">Bibliothek</Link></li>
+              <li><Link href="/aerzte">Ärzteverzeichnis</Link></li>
             </ul>
```

### Phase-Local Token Additions to `globals.css`

```css
/* Append to src/app/globals.css inside @theme { ... } */

/* === PHASE 46 DIRECTORY TOKENS (additive, scoped to /aerzte and /admin/aerzte) === */
/* See .planning/phases/46-aerzteverzeichnis/DESIGN.md for full spec.
   Master tokens (--color-primary etc.) intentionally untouched. */

/* Surface ramp (Material 3 tonal) */
--color-dir-surface-container-lowest: #ffffff;
--color-dir-surface-container:         #efeeea;
--color-dir-surface-container-high:    #e9e8e4;
--color-dir-surface-container-highest: #e3e2df;
--color-dir-surface-dim:               #dbdad6;
--color-dir-surface-variant:           #e3e2df;

/* Divergent text on directory surfaces — slightly cooler than master --color-text */
--color-dir-on-surface:         #1b1c1a;
--color-dir-on-surface-variant: #434840;
--color-dir-on-background:      #1b1c1a;

/* Inverse surface (for dark callouts inside directory) */
--color-dir-inverse-surface:    #2f312e;
--color-dir-inverse-on-surface: #f2f1ed;

/* Outline (slightly darker than master --color-outline-variant) */
--color-dir-outline:         #737970;
--color-dir-surface-tint:    #4a6546;

/* Directory primary — darker than master (#0F270D vs master #1B2D18) */
--color-dir-primary:               #0f270d;
--color-dir-primary-container:     #243d21;
--color-dir-on-primary-container:  #8ba884;
--color-dir-inverse-primary:       #b1cfa8;

/* Secondary container (Alpine Clay lighter shade) */
--color-dir-secondary-container:    #fd885f;
--color-dir-on-secondary-container: #732100;

/* Tertiary (Burgund — new color slot for verification/highlight) */
--color-dir-tertiary:               #381624;
--color-dir-tertiary-container:     #512b3a;
--color-dir-on-tertiary-container:  #c592a3;

/* Error palette (M3 standard — used for "geocoding failed" admin warning) */
--color-dir-error:               #ba1a1a;
--color-dir-on-error:             #ffffff;
--color-dir-error-container:     #ffdad6;
--color-dir-on-error-container:  #93000a;

/* Fixed-tone Material 3 tokens (kept consistent w/ DESIGN.md; only emit if used) */
--color-dir-primary-fixed:           #ccebc3;
--color-dir-primary-fixed-dim:       #b1cfa8;
--color-dir-on-primary-fixed:        #082008;
--color-dir-on-primary-fixed-variant: #334d2f;

/* Directory radius scale */
--radius-dir-sm:      0.25rem;
--radius-dir-default: 0.5rem;
--radius-dir-md:      0.75rem;
--radius-dir-lg:      1rem;
--radius-dir-xl:      1.5rem;

/* Directory spacing tokens (margin-mobile / margin-desktop are new) */
--spacing-dir-xs:              4px;
--spacing-dir-sm:              8px;
--spacing-dir-md:              16px;
--spacing-dir-lg:              24px;
--spacing-dir-xl:              48px;
--spacing-dir-margin-mobile:   16px;
--spacing-dir-margin-desktop:  64px;
```

**Source:** Reconciliation table in `.planning/phases/46-aerzteverzeichnis/DESIGN.md:11-95` — every "NEW" or "divergent" row gets a `--dir-*` declaration; "identical — reuse live var" rows are intentionally absent (use existing `--color-*` tokens).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `instanceof PrismaClient` | Duck-typed `'$connect' in clientOrOptions` | Phase 18-ish (vitest module isolation issue) | All new DALs MUST use duck-typing — AGENTS.md hard rule |
| `tailwind.config.js` | `@theme {...}` in `globals.css` | Tailwind v4 migration | Phase 46 token additions live in CSS, not JS config |
| Mixed auth imports from `auth.ts` barrel | Direct imports from `auth-edge` or `auth-node` | Phase 33-ish edge/node split | Server Actions use `auth-node`; barrel is dead |
| Articles `revalidate` strategy | `export const dynamic = 'force-dynamic'` for DB-touching pages | v3.0 | New `/aerzte` pages MUST set this — build-time prerender breaks otherwise |
| Hand-rolled tile maps | `mapgen.ts` static composite via basemap.at | Phase 40 | Reuse for doctor pins; no new dep |

**Deprecated/outdated to ignore:**
- `step1-tag.ts` / `step2-write.ts` AI schemas — AGENTS.md flags these for v3.3 cleanup; not relevant here.
- Anything importing from `src/lib/admin/auth.ts` (dead barrel).
- BottomNav as a 3-tab structure — user explicitly locked 2-tab in CONTEXT.md.

## Open Questions Answered (from CONTEXT.md)

### Q1: Felder-Vollkatalog (MVP scope)

**Recommendation — MVP minimum + optional fields with sensible defaults:**

| Field | MVP? | Reason |
|-------|------|--------|
| `name`, `titel`, `kategorie`, `fachrichtung`, `address`, `bezirkId`, `lat`, `lon` | **YES** | Required for the directory function |
| `email`, `website`, `phone` | **YES (nullable)** | Standard contact-data; trivial DB cost; high editorial value |
| `editorialNote`, `relatedArticleIds` | **YES** | Locked in CONTEXT.md |
| `isVerified` | **YES** | Locked in CONTEXT.md |
| `mapImageUrl` | **YES** | Static map decision |
| `öffnungszeiten` (Sprechzeiten) | **NO (defer)** | Structured form is complex (recurring time slots, holidays); free-text "Mo-Fr 8-12 Uhr" leaks formatting inconsistency. Defer to "directory polish" plan. |
| `sprachen[]` | **NO (defer)** | Low MVP value; would need a tag UI in admin. |
| `kassen[]` | **NO (defer)** | Enum is complex (ÖGK, SVS, BVAEB, KFA, private only). Defer. |
| `barrierefrei: boolean`, `neuePatienten: boolean` | **NO (defer)** | Both are pure-display flags; easy to add in a polish plan. |

**Rationale:** Anti-Bloat — ship the smallest schema that covers the user story ("find a doctor near me + see editorial trust signals"); defer compliance fields (Kassen, Barrierefreiheit) to a follow-up.

### Q2: Map Engine — Static vs Interactive

**Recommendation: Static via `mapgen.ts` for MVP. Defer Leaflet.**

| Aspect | Static (mapgen) | Leaflet (interactive) |
|--------|-----------------|----------------------|
| New dep? | **No** | **Yes** — `leaflet` ~39 KB gz JS + 4 KB gz CSS (plus `@types/leaflet` dev). Needs DECISIONS.md entry. |
| User experience | Single PNG/JPEG pin, no zoom/pan | Pan, zoom, future clustering (list view) |
| Bundle impact | Zero | +43 KB gz on every page that loads it (lazy-loadable via dynamic import → only on detail page) |
| Server cost | One basemap.at request burst at admin-save (cheap) | Tiles fetched per-visitor at view-time (more tile traffic but distributed) |
| Vercel Blob cost | One asset/doctor saved permanently | Zero blob storage |
| Implementation complexity | **Low** — reuse `generateMapImage(lat, lon, name, doctorId, locType)`; one-line call | **Higher** — `'use client'` component, hydration, no-SSR dynamic import, CSS imports, marker icon path config |
| Editorial-tier aesthetic | **Better** — matches existing static OG-image map style | Less editorial feel ("app-like") |

**Caveat:** `mapgen.ts:587` hardcodes the Blob path `maps/article-${articleId}.jpg`. Plan-phase MUST parameterize this. Option A: add a `pathPrefix` parameter to `generateMapImage`. Option B: write a 10-line `generateDoctorMap()` wrapper in `src/lib/images/mapgen-doctor.ts` that calls the same internals but with `maps/doctor-${doctorId}.jpg`. **Option A is cleaner** — extends mapgen's API once, reused by both callers.

### Q3: Verzeichnis-Suche — Filter Chips Only or +Full-Text?

**Recommendation: Filter chips only for MVP. Defer full-text.**

- Filter chips: `bezirk`, `kategorie`, `fachrichtung` (free-text `contains` match on FACHARZT entries)
- Server-side filtering via query params — no client-side state
- The directory will start at maybe 50-200 entries (Graz + adjacent Bezirke per CONTEXT.md "Datenpflege-Aufwand" risk); browsing by Bezirk is sufficient
- Full-text on `name` is trivial Prisma `contains` — add in polish plan when entry count > 500

### Q4: SEO JSON-LD — MedicalBusiness vs Dentist Schema

**Recommendation: Emit `Physician` JSON-LD for ALLGEMEINMEDIZIN + FACHARZT, `Dentist` for ZAHNARZT.**

Both are valid sub-types of `MedicalBusiness` per schema.org. Code is in "JSON-LD Schema" example above. For FACHARZT, populate `medicalSpecialty` with the free-text `fachrichtung` value (schema.org accepts free-text or `MedicalSpecialty` enum).

### Q5: Listen-Sortierung — Alphabetical, Verified-First, or Both?

**Recommendation: Both. `isVerified DESC, name ASC`.**

Editorial trust signal first, then alphabetical within each tier. Code shown in DAL example (`orderBy: [{ isVerified: 'desc' }, { name: 'asc' }]`).

### Q6: Bulk Import (CSV)

**Recommendation: OUT OF SCOPE for Phase 46.** Locked in CONTEXT.md "Out of scope" list. Single-entry CRUD is sufficient for the projected Graz-area starting volume. Revisit if entry count > 200 and editorial team needs batch onboarding (separate plan).

### Q7: AppBar — Nav-Link "Ärzte" + Footer Link?

**Recommendation: Both.**

- AppBar desktop nav: add "Ärzte" between "Bibliothek" and the bezirk selector
- AppBar mobile drawer: same link added
- Footer "Rubriken" column: add "Ärzteverzeichnis"

Concrete diffs shown in "AppBar Nav Addition" + "Footer Link" code examples. **Do NOT touch BottomNav** — explicit user lock-in.

### Q8: Sitemap Inclusion

**Recommendation: YES, include `/aerzte` index + every `/aerzte/{publicId}/{slug}` URL.**

Code shown in "Sitemap Extension" example. Priority 0.7 (between Bezirk 0.6 and Article 0.8), `changeFrequency: 'weekly'` (doctors update much less than news).

### Q9: Token Prefix — `--dir-*` vs `--directory-*`

**Recommendation: `--dir-*` (confirmed).**

- Shorter, no readability loss
- Matches existing `--color-*` / `--spacing-*` / `--shadow-*` naming brevity
- All other phase-local prefixes (if any future phases adopt this pattern) can mirror: `--lib-*`, `--shop-*`, etc.
- Reconciliation table in DESIGN.md already uses `--dir-*` as leading candidate; lock it in.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 1.x (current in repo) |
| Config file | `vitest.config.ts` at repo root (existing) |
| Quick run command | `npm test -- --run src/lib/content/doctors.test.ts` |
| Full suite command | `npm test -- --run` |
| Test DB infra | `src/test/setup-db.ts` — pglite (WASM Postgres), in-process per-test isolation |
| API-route mocking | `vi.mock` (existing convention) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DIR-01 | Migration creates `Doctor` table + indexes; pglite `createTestDb()` includes migration | smoke | `npm test -- --run src/test/setup-db.test.ts` (existing) — auto-loads all migrations in directory order | ❌ Wave 0 (test file does not need adding; pglite picks up new migration automatically once committed) |
| DIR-02 | `DoctorKategorie` enum accepts all 3 values; invalid value throws Prisma error | unit (Prisma) | `npm test -- --run src/lib/content/doctors.test.ts -t "kategorie enum"` | ❌ Wave 0 |
| DIR-03 | `listDoctors()` no-args returns array; filters by bezirkId, kategorie, fachrichtung, isVerified; sorts verified-first | unit (pglite) | `npm test -- --run src/lib/content/doctors.test.ts -t "listDoctors"` | ❌ Wave 0 |
| DIR-03 | `getDoctorByPublicId()` returns doctor with bezirk relation; returns null for unknown ID | unit (pglite) | `npm test -- --run src/lib/content/doctors.test.ts -t "getDoctorByPublicId"` | ❌ Wave 0 |
| DIR-04 | `createDoctorDb()` persists row with relatedArticleIds=[] default | unit (pglite) | `npm test -- --run src/lib/admin/doctors-actions.test.ts -t "createDoctorDb"` | ❌ Wave 0 |
| DIR-04 | `toggleVerifiedDb()` flips isVerified | unit (pglite) | `npm test -- --run src/lib/admin/doctors-actions.test.ts -t "toggleVerifiedDb"` | ❌ Wave 0 |
| DIR-04 | `softDeleteDoctorDb()` removes row | unit (pglite) | `npm test -- --run src/lib/admin/doctors-actions.test.ts -t "softDelete"` | ❌ Wave 0 |
| DIR-05 | `createDoctor()` action persists `lat/lon=null` when `geocodeLocation` throws (test via `vi.mock`) | integration | `npm test -- --run src/lib/admin/doctors-actions.test.ts -t "geocode failure"` | ❌ Wave 0 |
| DIR-05 | `createDoctor()` action persists `lat/lon` when `geocodeLocation` returns result | integration | `npm test -- --run src/lib/admin/doctors-actions.test.ts -t "geocode success"` | ❌ Wave 0 |
| DIR-06 | Admin list page renders with all kategorie filters; filtered query passed to DAL (test via `vi.mock` of doctors DAL) | integration (RSC harness) | manual-only (RSC test harness not standard in this repo) | — manual-only |
| DIR-07 | Public `/aerzte` page renders 200; query params drive `listDoctors` call | smoke | manual-only (E2E not part of v3.x test infra; rely on `/api/healthcheck` post-deploy + Vercel preview review) | — manual-only |
| DIR-08 | Slug mismatch on `/aerzte/{publicId}/{slug}` triggers `permanentRedirect` to canonical slug | unit (pure logic) | `npm test -- --run src/test/doctor-slug-canonical.test.ts` (test the slugify call alone; redirect side-effect via Next test runner unavailable) | ❌ Wave 0 |
| DIR-09 | `generateDoctorMap()` (or `generateMapImage` with parameterized prefix) writes to `maps/doctor-{id}.jpg` Blob path | unit | `npm test -- --run src/lib/images/mapgen.test.ts -t "doctor path"` | ❌ Wave 0 — extends existing mapgen.test.ts |
| DIR-10 | `buildDoctorJsonLd()` emits `@type: 'Dentist'` for ZAHNARZT, `'Physician'` otherwise; includes `medicalSpecialty` only for FACHARZT; includes `geo` only when lat/lon non-null | unit (pure) | `npm test -- --run src/lib/reader/doctor-metadata.test.ts` | ❌ Wave 0 |
| DIR-11 | Sitemap includes `/aerzte/{publicId}/{slug}` entries for every doctor; `/aerzte` index entry present | unit | `npm test -- --run src/app/__tests__/sitemap-doctors.test.ts` | ❌ Wave 0 (use existing `sitemap-testmode.test.ts` as template) |
| DIR-12 | `LodenAppBar` renders "Ärzte" link in desktop nav and mobile drawer; Footer "Rubriken" lists "Ärzteverzeichnis" | unit (snapshot or DOM-query via Testing Library if present, else visual inspection) | manual-only (no React Testing Library in this repo per audit) | — manual-only |
| DIR-13 | `--dir-*` tokens parse-valid in `globals.css`; build passes | smoke | `npm run build` (catches CSS parse errors) | ✅ existing infra |

### Sampling Rate

- **Per task commit:** `npm test -- --run src/lib/content/doctors.test.ts src/lib/admin/doctors-actions.test.ts src/lib/reader/doctor-metadata.test.ts`
- **Per wave merge:** `npm test -- --run` (full suite)
- **Phase gate:** Full suite green + `npm run build` green + manual smoke of `/aerzte` and `/admin/aerzte` on Vercel preview before `/gsd:verify-work`.

### Wave 0 Gaps (test files / fixtures to create before implementation begins)

- [ ] `src/lib/content/doctors.test.ts` — covers DIR-02, DIR-03 (listDoctors / getDoctorByPublicId behaviors, including ordering)
- [ ] `src/lib/admin/doctors-actions.test.ts` — covers DIR-04, DIR-05 (Db functions + geocode-failure path with `vi.mock`)
- [ ] `src/lib/reader/doctor-metadata.test.ts` — covers DIR-10 (JSON-LD shape per kategorie + presence of geo only when lat/lon set)
- [ ] `src/app/__tests__/sitemap-doctors.test.ts` — covers DIR-11 (sitemap output includes doctor URLs); copy structure from existing `sitemap-testmode.test.ts`
- [ ] `src/test/doctor-slug-canonical.test.ts` — covers DIR-08 slug logic in isolation
- [ ] Extend `src/lib/images/mapgen.test.ts` with one case for the parameterized doctor path (DIR-09)
- [ ] No new fixtures required — Doctor records seed via the existing pglite + `seedBezirke` setup in `src/test/setup-db.ts`

**Manual-only verifications** (test infra does not support automation cheaply):
- DIR-06 admin page render (no RSC test harness)
- DIR-07 public page render (no E2E framework)
- DIR-12 AppBar/Footer DOM (no React Testing Library; visual inspection on preview)

These are covered by the standard pre-deploy checklist (build success, Vercel preview screenshot review).

## Open Questions

1. **Map path parameterization** — `mapgen.ts:587-594` hardcodes `maps/article-${articleId}.jpg`. Plan-phase needs to choose Option A (extend `generateMapImage` signature with `pathPrefix` parameter) vs Option B (new `generateDoctorMap` wrapper). Both are 5-line changes; A is cleaner.
2. **Address-change re-geocoding** — `updateDoctor` action should detect address-field-changed and trigger re-geocode + re-mapgen. Currently sketched as TODO; plan-phase to flesh out.
3. **`relatedArticleIds` validation** — should the action layer verify each `publicId` exists in `Article` table at save-time? If yes, that's N extra queries per save. Recommendation: defer (manual editorial entry, validation at render-time = "skip missing refs"). Plan-phase confirms.
4. **REQUIREMENTS.md backfill timing** — should the first plan add `DIR-01..13` to `REQUIREMENTS.md` traceability table, or should plan-phase do it as a side-effect of plan generation? Repo convention: traceability filled by roadmapper. Plan-phase to either add a "REQUIREMENTS.md update" task to the first plan or instruct the next phase to do it.
5. **Whether to refactor `mapgen.ts` first** — DIR-09 implies extending `mapgen.ts` API. If the refactor is non-trivial, it could be a dedicated Plan 0 ("mapgen path parameterization") before the doctor-creation plan that uses it. Plan-phase to size and decide.

## Sources

### Primary (HIGH confidence — code in this repo)
- `src/lib/content/articles.ts` — DAL pattern with overload + duck-typed DI
- `src/lib/admin/articles-actions.ts` — Server-Action-Trinity (typed + Form variants)
- `src/lib/admin/sources-actions.ts` — Second example of the Trinity for cross-check
- `src/lib/admin/map-actions.ts` — Inline geocoding + mapgen orchestration pattern (`generateMapForArticle`); also the canonical 1.1s Nominatim sleep loop (`backfillMapImages`)
- `src/lib/images/geocode.ts` — Nominatim helper with `GeocodingCache` and `User-Agent: LodenUndLeute/1.0`
- `src/lib/images/mapgen.ts` — Static tile composite pipeline (basemap.at + sharp + Vercel Blob)
- `src/lib/reader/slug.ts` — German-aware slugify (ä→ae, ß→ss)
- `src/lib/reader/metadata.ts` + `src/app/(public)/artikel/[publicId]/[slug]/page.tsx` — JSON-LD + Metadata emit pattern
- `src/lib/admin/auth-node.ts` — `requireAuth()` HMAC cookie check
- `src/app/sitemap.ts` — Sitemap pattern with parallel Promise.all
- `src/app/(public)/artikel/[publicId]/[slug]/page.tsx:27-38` — `permanentRedirect` slug canonicalization
- `src/app/(admin)/admin/articles/page.tsx` + `.../[id]/edit/page.tsx` — Admin list + edit page patterns
- `src/components/reader/LodenAppBar.tsx` — Nav structure to extend
- `src/components/reader/Footer.tsx` — Footer column structure
- `src/components/reader/EditorialStackCard.tsx:8,22` — `variant="row"` exists, ready to reuse
- `src/app/globals.css` — Tailwind v4 `@theme` block to extend with `--dir-*` tokens
- `prisma/schema.prisma` — Existing FK + relation conventions (Bezirk-Article junction; will use direct FK for Doctor)
- `prisma/migrations/20260514_phase44_source_cursor/migration.sql` — Recent additive-migration template
- `src/test/setup-db.ts` — pglite test infra; loads all migrations in directory order
- `src/lib/content/articles.test.ts` — Test structure to mirror
- `AGENTS.md` — Project conventions (DI, Trinity, Auth, Error-Handling, Anti-Bloat, Rate-Limit rules)
- `.planning/phases/46-aerzteverzeichnis/46-CONTEXT.md` — User decisions, open questions
- `.planning/phases/46-aerzteverzeichnis/DESIGN.md` — Phase-local token spec + reconciliation
- `.planning/STATE.md` — Current project position + parked work
- `DESIGN.md` (root) — Master design system; intentionally untouched by Phase 46

### Secondary (MEDIUM confidence — official spec docs)
- [Schema.org `MedicalBusiness`](https://schema.org/MedicalBusiness) — JSON-LD parent type
- [Schema.org `Physician`](https://schema.org/Physician) — sub-type for ALLGEMEINMEDIZIN + FACHARZT
- [Schema.org `Dentist`](https://schema.org/Dentist) — sub-type for ZAHNARZT
- [Schema.org `medicalSpecialty`](https://schema.org/medicalSpecialty) — accepts free-text for FACHARZT free-text fachrichtung
- [Schema.org `PostalAddress`](https://schema.org/PostalAddress) — address shape
- [Schema.org `GeoCoordinates`](https://schema.org/GeoCoordinates) — lat/lon shape
- [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/) — 1 req/s rate limit (already coded in repo at `geocode.ts:62` + `map-actions.ts:139`)

### Tertiary (LOW confidence — web search; cross-checked but only ballpark)
- [leaflet on npm](https://www.npmjs.com/package/leaflet) — Leaflet 1.9.4 bundle size ~39 KB gz JS + 4 KB gz CSS. Used to argue against adding the dep for MVP.
- [react-leaflet on npm](https://www.npmjs.com/package/react-leaflet) — Wrapper that would also be needed if going Leaflet route (extra dep + extra bundle weight). Reinforces "static for MVP."

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — every library is already in the repo and battle-tested in v3.x.
- Architecture: **HIGH** — patterns are literally copy-able from `articles.ts` / `articles-actions.ts`.
- Geocoding/Mapgen: **HIGH** — implementations exist and are quoted with line numbers.
- JSON-LD: **MEDIUM-HIGH** — schema.org types confirmed; exact `medicalSpecialty` free-text-vs-enum behavior is per spec but not visually validated in a Google Rich Results test (recommend manual validation post-deploy).
- Leaflet bundle size: **MEDIUM** — npm/bundlephobia consistent; not load-bearing since recommendation is "static, no Leaflet."
- Open Questions Answered: **HIGH** for Q1-Q3, Q5-Q9 (architectural); **MEDIUM** for Q4 (depends on Google's interpretation of Schema.org sub-typing).

**Research date:** 2026-05-14
**Valid until:** 2026-06-14 (30 days — patterns referenced are stable; only Leaflet bundle-size figure would drift)
