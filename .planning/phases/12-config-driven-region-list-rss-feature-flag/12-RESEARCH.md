# Phase 12: Config-Driven Region List + RSS Feature Flag - Research

**Researched:** 2026-03-25
**Domain:** Next.js Server Component prop passing, TypeScript interface extension, Prisma seed refactor, Next.js Route Handler feature flags
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Add `regions: { slug: string; name: string }[]` to `BundeslandConfig` interface — array order is display order, no sort field
- `prisma/seed.ts` reads from `config.regions` instead of its current hardcoded list
- `(public)/layout.tsx` Server Component makes ONE `listBezirke()` call and passes result to both `Header` and `BezirkModal` as props
- No extra API route — server component prop passing only
- Header's hardcoded `BEZIRK_NAMES` Record is fully removed; slug→name resolved dynamically from the prop
- BezirkModal's hardcoded `BEZIRKE` array is fully removed; `toggleAll` checks against `bezirke.length` from prop
- `config.features.rss: false` → ALL `/rss/*` routes return 404 (both per-Bezirk and state-wide steiermark feed)
- Silent 404 — no server-side logging when the flag is false
- Feature flag check is at the top of the GET handler before any DB calls

### Claude's Discretion

- Exact prop type name (inline or imported type alias)
- Whether to co-locate the `BundeslandConfig` `regions` type or keep in existing `src/types/bundesland.ts`
- Migration: existing seeded bezirke don't need a re-seed if DB already has correct data — seed update is additive

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONF-01 | Platform is deployable for any Bundesland by changing a single config file (regions, branding, sources) | Config `regions` field drives seed; seed drives DB; DB drives UI via `listBezirke()` prop — full chain confirmed as achievable with existing infrastructure |
</phase_requirements>

---

## Summary

Phase 12 is a wiring phase: no new infrastructure is needed. Every building block already exists and has been verified in the codebase. The work is four precisely scoped changes: (1) extend the `BundeslandConfig` interface with a `regions` field, (2) update `prisma/seed.ts` to read from that field instead of `steiermarkBezirke`, (3) convert `(public)/layout.tsx` from a zero-dependency shell to a Server Component that calls `listBezirke()` and forwards the result as props to `Header` and `BezirkModal`, and (4) add a feature-flag guard at the top of `src/app/rss/[slug]/route.ts`.

The critical architectural insight is that `Header` and `BezirkModal` are both `"use client"` components but receive their data from a Server Component parent via props — a pattern that is already used throughout the app (e.g. article pages). The Server Component does the DB call once; the Client Components receive it as a serialized prop. No hydration mismatch risk because the prop is a plain serializable array.

The only non-trivial design choice is prop type naming (inline vs. named alias). Either works; the named alias approach (`BezirkItem`) is recommended for legibility and co-location with the existing `BundeslandConfig` interface.

**Primary recommendation:** Extend `BundeslandConfig` in `src/types/bundesland.ts`, update seed to read `config.regions`, make `(public)/layout.tsx` async and inject `bezirke` as a prop to both Header and BezirkModal, add the feature flag guard at the top of the RSS route handler.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | ^15.5.14 | Server Component async data fetching + Route Handler | Already in use; `async` layout is standard App Router pattern |
| Prisma Client | (project version) | `listBezirke()` DB call | Already the DAL for all bezirk queries in the app |
| TypeScript | (project version) | Interface extension with `satisfies` operator | Already enforces `BundeslandConfig` shape at compile time |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | (project version) | Unit tests for seed and route handler flag | All existing tests use vitest |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Server Component prop passing | API route `/api/bezirke` | Extra HTTP round-trip, more surface area — unnecessary when layout is already server-rendered |
| Inline prop type | Named `BezirkItem` alias in `bundesland.ts` | Named alias is more discoverable; inline works but clutters JSX props |

**Installation:** No new packages needed for this phase.

---

## Architecture Patterns

### Recommended Project Structure

No new directories. Changes touch:
```
bundesland.config.ts             # add regions[] array
src/types/bundesland.ts          # add BezirkItem + regions field to BundeslandConfig
src/app/(public)/layout.tsx      # make async, call listBezirke(), pass as props
src/components/reader/Header.tsx # receive bezirke prop, remove BEZIRK_NAMES
src/components/reader/BezirkModal.tsx # receive bezirke prop, remove BEZIRKE array
src/app/rss/[slug]/route.ts      # add feature flag guard at top
prisma/seed.ts                   # replace steiermarkBezirke import with config.regions
prisma/seed.test.ts              # update tests to reflect config-driven mechanic
```

### Pattern 1: Async Server Component Layout Passing Props to Client Components

**What:** The `(public)/layout.tsx` is a React Server Component. Adding `async` and calling `await listBezirke()` is valid in App Router layouts. The result (a plain serializable array) is passed as a prop to Client Components rendered in the same tree.

**When to use:** Whenever a layout needs to supply data from the server to child components that are `"use client"`.

**Example:**
```typescript
// src/app/(public)/layout.tsx
import { listBezirke } from "@/lib/content/bezirke";
import { Header } from "@/components/reader/Header";
import { BezirkModal } from "@/components/reader/BezirkModal";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const bezirke = await listBezirke();
  return (
    <>
      <Header bezirke={bezirke} />
      <main className="flex-1 pb-20">{children}</main>
      {/* ... */}
      <BezirkModal bezirke={bezirke} />
    </>
  );
}
```

**Key constraint:** Props passed from Server Components to Client Components must be serializable. A `{ slug: string; name: string }[]` array is fully serializable. The full `Bezirk` model from Prisma includes `id`, `gemeindeSynonyms`, `createdAt` — those fields are serializable too, but passing the full model is unnecessary; a mapped subset is cleaner (see Pattern 2).

### Pattern 2: Prop Type as Named Alias in `bundesland.ts`

**What:** Define `BezirkItem` in `src/types/bundesland.ts` alongside `BundeslandConfig`. Both `Header` and `BezirkModal` import this type. The Server Component maps `Bezirk[]` → `BezirkItem[]` or passes the DB result directly (both are valid since `Bezirk` has `slug` and `name`).

**When to use:** Recommended. Avoids duplicate inline types across two component files.

**Example:**
```typescript
// src/types/bundesland.ts (addition)
export interface BezirkItem {
  slug: string
  name: string
}

// BundeslandConfig addition:
export interface BundeslandConfig {
  // ... existing fields
  regions: BezirkItem[]
}
```

### Pattern 3: Feature Flag Guard at Route Handler Top

**What:** Import the config and check `features.rss` before any async work.

**When to use:** Any feature-gated route handler.

**Example:**
```typescript
// src/app/rss/[slug]/route.ts (addition at top of GET)
import config from '@/../bundesland.config'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!config.features.rss) {
    return new Response(null, { status: 404 })
  }
  // ... existing logic
}
```

Note: `return new Response(null, { status: 404 })` is correct for a silent 404. Using `new Response('Not found', { status: 404 })` also works; `null` body matches the silent requirement from CONTEXT.md.

### Pattern 4: Seed Reads from `config.regions`

**What:** Replace the `bundesland === 'steiermark' ? steiermarkBezirke : []` branch with `config.regions` directly. The `steiermarkBezirke` import from `seed-data/bezirke.ts` is no longer needed in `seed.ts`.

**When to use:** Whenever seed data is now config-driven.

**Example:**
```typescript
// prisma/seed.ts — seedBezirke updated body
export async function seedBezirke(
  prisma: PrismaClient,
  bundesland: string
): Promise<void> {
  // bundesland param retained for backwards compat with tests (confirms config.bundesland matches)
  if (bundesland !== config.bundesland) {
    console.log(`Skipping seedBezirke: bundesland mismatch (${bundesland} vs ${config.bundesland})`)
    return
  }
  for (const region of config.regions) {
    await prisma.bezirk.upsert({
      where: { slug: region.slug },
      update: { name: region.name },
      create: { slug: region.slug, name: region.name, gemeindeSynonyms: [] },
    })
  }
  console.log(`Seeded ${config.regions.length} Bezirke for ${bundesland}`)
}
```

**Important:** The existing `gemeindeSynonyms` field on the `Bezirk` model is `String[]` and non-nullable. The `config.regions` array only carries `slug` and `name`. The upsert `create` must supply `gemeindeSynonyms: []` (empty array) for new rows. Existing DB rows already have `gemeindeSynonyms` populated; the `update` path in the upsert only touches `name`, so existing synonym data is preserved. This is the additive migration behavior described in CONTEXT.md.

### Anti-Patterns to Avoid

- **Calling `listBezirke()` inside `Header` or `BezirkModal`:** Both are `"use client"` components and cannot call async server functions. Data must come from the parent Server Component.
- **Using `useEffect` to fetch bezirke client-side:** Introduces a loading flash and an unnecessary `/api/` round trip. The layout is server-rendered; there is no reason to defer this data.
- **Placing the RSS feature flag check inside the bezirk-slug branch only:** The flag must be checked before the `if (slug === 'steiermark')` branch so the state-wide feed is also blocked.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DB query for bezirk list | Custom query in layout | `listBezirke()` from `src/lib/content/bezirke.ts` | Already exists, already uses DI overload, already tested |
| Serialization of Prisma result to props | Manual mapping | Pass `Bezirk[]` directly (all fields are serializable) or map to `BezirkItem[]` | Next.js handles React Server Component serialization automatically for plain objects |
| Feature flag enforcement | Custom middleware or wrapper | Inline `if (!config.features.rss)` at top of handler | Config is a static import; no middleware needed for a single route group |

**Key insight:** Every building block is already in place. This phase is pure wiring, not construction.

---

## Common Pitfalls

### Pitfall 1: `gemeindeSynonyms` Required Field in Upsert Create

**What goes wrong:** `prisma.bezirk.upsert({ create: { slug, name } })` fails at runtime because `gemeindeSynonyms` is a required `String[]` field with no default.

**Why it happens:** `config.regions` only carries `{ slug, name }`. The seed previously used `steiermarkBezirke` which included `gemeindeSynonyms`.

**How to avoid:** Always pass `gemeindeSynonyms: []` in the `create` branch of the upsert. For existing seeded rows the `update` branch runs (not `create`), so existing synonyms are preserved.

**Warning signs:** TypeScript will catch this at compile time if the Prisma-generated type is strict — but only if `gemeindeSynonyms` has no default in the schema. Verify with `tsc --noEmit` after the change.

### Pitfall 2: `(public)/layout.tsx` Becoming a Client Component Accidentally

**What goes wrong:** Adding `"use client"` to layout (or importing a module that has it) converts the layout to a Client Component, making the `await listBezirke()` call illegal.

**Why it happens:** The current `layout.tsx` has no directive and no async — it's a silent Server Component. Adding `async` alone is safe.

**How to avoid:** Never add `"use client"` to `(public)/layout.tsx`. The `Header` and `BezirkModal` children can remain Client Components — that is normal and correct in App Router.

**Warning signs:** TypeScript error "cannot use await in non-async function" if `async` is missing; build error about calling server-only functions from client if `"use client"` is wrongly added.

### Pitfall 3: `listBezirke()` Return Type Contains Non-Serializable Fields

**What goes wrong:** Prisma's `Bezirk` model includes `createdAt: DateTime` which serializes to a Date object. React Server Components serialize props using React's serialization protocol — `Date` objects serialize fine to ISO strings in Next.js 15 App Router.

**Why it happens:** Awareness of React Server Component serialization constraints.

**How to avoid:** Either pass the full `Bezirk[]` (all fields are serializable in Next.js App Router) or explicitly map to `{ slug, name }[]` in the layout. Either is correct. The mapped approach is slightly cheaper (smaller prop payload), but the difference is negligible for 13 bezirke.

### Pitfall 4: Seed Test Breaks on `bundesland` Param Change

**What goes wrong:** The existing seed test `seeding with a mock config where bundesland is NOT steiermark produces 0 Bezirk rows` asserts that passing `'tirol'` to `seedBezirke` produces zero rows. If the new implementation reads `config.regions` unconditionally (ignoring the `bundesland` parameter), this test will fail.

**Why it happens:** CONTEXT.md says the seed reads `config.regions`. If the function ignores the `bundesland` argument entirely, the "wrong bundesland → 0 rows" test breaks.

**How to avoid:** The `seedBezirke` function should compare `bundesland !== config.bundesland` and return early if mismatched. This preserves the existing test contract while reading from config. The test's assertion remains valid: passing `'tirol'` when the config is `'steiermark'` triggers the early return → 0 rows seeded.

### Pitfall 5: RSS Route Handler Imports Config at Module Level

**What goes wrong:** `config` is a static module import. If the handler is tested in a vitest environment where `bundesland.config.ts` is not mocked, `config.features.rss` will always be `true` (the live config value).

**Why it happens:** Tests that want to cover the `rss: false` branch need to stub the config or restructure the check.

**How to avoid:** For route handler tests, `vi.mock('@/../bundesland.config', ...)` or pass the flag as a parameter to a helper function that can be tested in isolation. Given the route handler is very simple (3 lines of guard + existing logic), a focused integration-style test with `vi.mock` is the simplest approach.

---

## Code Examples

### Extend `BundeslandConfig` Interface

```typescript
// src/types/bundesland.ts
export interface BezirkItem {
  slug: string
  name: string
}

export interface BundeslandConfig {
  bundesland: string
  siteName: string
  tagline: string
  branding: BundeslandBranding
  adZones: AdZone[]
  features: {
    ads: boolean
    rss: boolean
  }
  regions: BezirkItem[]
}
```

### Add `regions` to `bundesland.config.ts`

```typescript
// bundesland.config.ts — regions array (append after features block)
regions: [
  { slug: 'graz', name: 'Graz (Stadt)' },
  { slug: 'graz-umgebung', name: 'Graz-Umgebung' },
  { slug: 'deutschlandsberg', name: 'Deutschlandsberg' },
  { slug: 'hartberg-fuerstenfeld', name: 'Hartberg-Fürstenfeld' },
  { slug: 'leibnitz', name: 'Leibnitz' },
  { slug: 'leoben', name: 'Leoben' },
  { slug: 'liezen', name: 'Liezen' },
  { slug: 'murau', name: 'Murau' },
  { slug: 'murtal', name: 'Murtal' },
  { slug: 'bruck-muerzzuschlag', name: 'Bruck-Mürzzuschlag' },
  { slug: 'suedoststeiermark', name: 'Südoststeiermark' },
  { slug: 'voitsberg', name: 'Voitsberg' },
  { slug: 'weiz', name: 'Weiz' },
],
```

The 13 slugs and names must match the existing `steiermarkBezirke` entries in `prisma/seed-data/bezirke.ts` exactly (they are the canonical slugs used throughout the app).

### Header Component — Remove Hardcoded Record

```typescript
// src/components/reader/Header.tsx
// Remove: const BEZIRK_NAMES: Record<string, string> = { ... }
// Add: bezirke prop
import type { BezirkItem } from '@/types/bundesland'

export function Header({ bezirke }: { bezirke: BezirkItem[] }) {
  // slug→name lookup via prop
  const bezirkNames = Object.fromEntries(bezirke.map(b => [b.slug, b.name]))
  // ... rest unchanged, replace BEZIRK_NAMES with bezirkNames
}
```

### BezirkModal Component — Remove Hardcoded Array

```typescript
// src/components/reader/BezirkModal.tsx
// Remove: const BEZIRKE = [...]
// Add: bezirke prop
import type { BezirkItem } from '@/types/bundesland'

export function BezirkModal({ bezirke }: { bezirke: BezirkItem[] }) {
  // Replace all BEZIRKE references with bezirke
  // toggleAll: BEZIRKE.length → bezirke.length
  // allSelected: selected.size === BEZIRKE.length → selected.size === bezirke.length
  // map over bezirke in JSX
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded arrays in UI components | DB-sourced via Server Component prop | Phase 12 (this phase) | Adding new Bundesland requires only config + seed change |
| Seed reads from `seed-data/bezirke.ts` static file | Seed reads from `config.regions` | Phase 12 (this phase) | Single source of truth for region list |
| RSS route handler has no feature flag | Guard at handler top | Phase 12 (this phase) | `features.rss: false` fully disables all RSS routes |

**Deprecated/outdated after this phase:**
- `steiermarkBezirke` import in `prisma/seed.ts`: replaced by `config.regions`
- `BEZIRKE` module-level const in `BezirkModal.tsx`: removed, replaced by prop
- `BEZIRK_NAMES` module-level const in `Header.tsx`: removed, replaced by prop lookup

---

## Open Questions

1. **Should `gemeindeSynonyms` be added to `config.regions`?**
   - What we know: `config.regions` is locked as `{ slug, name }[]` only (CONTEXT.md). `gemeindeSynonyms` is a separate concern used by the AI tagging pipeline, not the UI.
   - What's unclear: When deploying for a new Bundesland, how do synonyms get populated? They are currently hardcoded in `seed-data/bezirke.ts`.
   - Recommendation: Out of scope for Phase 12. The seed `create` path uses `gemeindeSynonyms: []` for new rows. Operators add synonyms manually or via a future config extension. This is explicitly a Claude's Discretion / deferred matter.

2. **Does removing the `steiermarkBezirke` import break any other test?**
   - What we know: `prisma/seed.test.ts` calls `seedBezirke(prisma, 'steiermark')` and expects 13 rows. If `config.regions` has 13 entries, the test still passes. The test file imports `steiermarkSources` from `seed-data/sources` (not `steiermarkBezirke`) so that import is unaffected.
   - What's unclear: Whether `steiermarkBezirke` is imported anywhere else.
   - Recommendation: Grep for `steiermarkBezirke` imports before removing the export. Preliminary review shows it is only used in `seed.ts`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest (project standard) |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run prisma/seed.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONF-01 | `seedBezirke` reads from `config.regions` | unit | `npx vitest run prisma/seed.test.ts` | ✅ (update existing) |
| CONF-01 | Wrong bundesland → 0 rows seeded | unit | `npx vitest run prisma/seed.test.ts` | ✅ (update existing) |
| CONF-01 | `BezirkModal` renders bezirke from prop, not hardcoded array | unit | `npx vitest run` (new test or smoke via build) | ❌ Wave 0 |
| CONF-01 | RSS route returns 404 when `config.features.rss: false` | unit | `npx vitest run src/app/rss` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run prisma/seed.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/app/rss/[slug]/route.test.ts` — covers RSS feature flag: `rss: false` → 404; `rss: true` → existing behavior. Uses `vi.mock('@/../bundesland.config')` to exercise both branches.
- [ ] `prisma/seed.test.ts` — existing file needs update: replace `steiermarkBezirke`-based assertion with `config.regions`-based assertion (no new file, but a test update)

*(No new test infrastructure needed — `vitest.config.ts` and `setup-db.ts` are already in place)*

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection — all files read from repo
  - `bundesland.config.ts` — current config shape (no `regions` field yet)
  - `src/types/bundesland.ts` — `BundeslandConfig` interface (no `regions` field yet)
  - `src/app/(public)/layout.tsx` — currently synchronous, no async/no data fetch
  - `src/components/reader/BezirkModal.tsx` — hardcoded `BEZIRKE` array confirmed
  - `src/components/reader/Header.tsx` — hardcoded `BEZIRK_NAMES` Record confirmed
  - `src/app/rss/[slug]/route.ts` — no feature flag check currently
  - `prisma/seed.ts` — reads from `steiermarkBezirke` not config
  - `prisma/seed-data/bezirke.ts` — 13 canonical Bezirke with slugs/names
  - `src/lib/content/bezirke.ts` — `listBezirke()` DAL with DI overload confirmed ready
  - `prisma/seed.test.ts` — existing test contract confirmed

### Secondary (MEDIUM confidence)

- Next.js App Router: async layouts and Server Component → Client Component prop passing is a documented and stable pattern in Next.js 15 App Router. Confirmed by installed version `^15.5.14` and CLAUDE.md/AGENTS.md guidance to read `node_modules/next/dist/docs/`. The `(public)/layout.tsx` having no `"use client"` directive means it is already a Server Component — adding `async` is the only required change.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all tools already in use
- Architecture: HIGH — patterns confirmed directly from codebase; server component prop passing is established in this app
- Pitfalls: HIGH — derived from direct code inspection (actual hardcoded arrays confirmed, `gemeindeSynonyms` non-nullable field confirmed in schema)

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable — no fast-moving dependencies)
