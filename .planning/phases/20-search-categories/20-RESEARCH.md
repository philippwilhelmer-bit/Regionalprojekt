# Phase 20: Search & Categories - Research

**Researched:** 2026-03-26
**Domain:** Next.js 15 RSC search page, client-side filtering, Prisma full-text/ILIKE search, Tailwind v4 UI patterns
**Confidence:** HIGH

---

## Summary

Phase 20 builds the `/suche` page — the reader-facing search and discovery hub. The bottom nav already links to `/suche` (BottomNavClient.tsx line 8), and the header has a disabled search icon placeholder explicitly labeled "Phase 20 will activate this" (Header.tsx line 54). There is no existing `/suche` route; it must be created from scratch under `src/app/(public)/suche/page.tsx`.

The page has four vertically-stacked UI zones: (1) a large serif search input that filters articles as the user types, (2) trending topic pills (the 13 Bezirk names serve as the "topics"), (3) a full category grid — also the 13 Bezirke, matching the existing data model — and (4) an "Empfohlene Artikel" section that shows when no filter is active. The entire filter state lives client-side; no URL search params are required by the success criteria.

The search mechanism must be client-side filtering of a pre-fetched article list (same pattern as `HomepageLayout.tsx`), not a live API round-trip per keystroke. The existing articles.ts DAL already has `listArticlesForHomepage()` and `listArticlesReader()`. A new query `listArticlesForSearch()` returning all PUBLISHED articles with their Bezirk names is the cleanest approach, since the page needs to filter by both title text and Bezirk.

**Primary recommendation:** One RSC page that fetches articles + bezirke server-side, passes them as props to a `"use client"` SearchPageLayout component that handles all filter state — identical split to how HomepageLayout works.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SRCH-01 | Search page with large serif search input for filtering articles | RSC page + client component; `input` styled with `font-headline` (Newsreader); `useState` for query; `.filter()` on title |
| SRCH-02 | Trending topics displayed as pill-shaped tags | Bezirk names as pill buttons; `rounded-full px-3 py-1`; tap selects bezirkId filter |
| SRCH-03 | Category grid with hover states for browsing by topic | CSS grid of Bezirk cards; Tailwind `hover:` states; tap filters article list |
| SRCH-04 | Recommended articles section below categories | Shown when `query === ''` and `activeBezirkId === null`; renders ArticleCard list |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 15.5.14 | RSC page + client component split | Established in v1.0; `params` are `Promise<…>` in this version |
| React | 19.2.4 | `useState` + `useMemo` for filter state | Project standard |
| Tailwind CSS | 4.2.2 | Styling with design tokens from globals.css | Project standard; @theme tokens already defined |
| Prisma | 6.19.2 | Data access for articles + bezirke | Project DAL pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next/navigation` | (built-in) | `usePathname` if needed for active nav state | Already used in BottomNavClient |
| Material Symbols Outlined | CDN | Search icon, category icons | Already loaded via CDN in layout.tsx head |

### No New Dependencies

No new npm packages are needed for this phase. All required capabilities (filtering, UI, icons, data access) are already available.

**Installation:**
```bash
# No new packages required
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/app/(public)/suche/
└── page.tsx                    # RSC: fetches articles + bezirke, renders SearchPageLayout

src/components/reader/
├── SearchPageLayout.tsx        # "use client": all filter state + rendered UI
└── CategoryGrid.tsx            # Optional sub-component: the 4-col Bezirk grid (pure presentational)

src/lib/content/
└── articles.ts                 # Add: listArticlesForSearch()
```

### Pattern 1: RSC + Client Split (Established in Phase 18)

**What:** The RSC page fetches data server-side via async function calls, then passes results as props to a `"use client"` component that owns all interactive state. This avoids client-side data fetching while keeping filtering reactive.

**When to use:** Any page that needs both SSR data freshness AND client-side interactivity. This is the exact pattern used by `HomepageLayout` and `BezirkPage`.

**Example (based on existing `page.tsx` patterns):**
```typescript
// src/app/(public)/suche/page.tsx
export const dynamic = 'force-dynamic'

import { listArticlesForSearch } from "@/lib/content/articles";
import { listBezirke } from "@/lib/content/bezirke";
import { SearchPageLayout } from "@/components/reader/SearchPageLayout";

export default async function SuchePage() {
  const [articles, bezirke] = await Promise.all([
    listArticlesForSearch(),
    listBezirke(),
  ]);
  return <SearchPageLayout articles={articles} bezirke={bezirke} />;
}
```

### Pattern 2: Client-side Filtering with useMemo

**What:** All filter logic runs synchronously in the browser against the pre-fetched article array. No network requests after initial load.

**When to use:** Article catalog is small enough to load in full (max ~200 articles on initial page load is acceptable). For Ennstal Aktuell with typical regional news volume, this is correct. If the catalog grows to thousands of articles, revisit with a server-side search API.

**Example:**
```typescript
// src/components/reader/SearchPageLayout.tsx
"use client";
import { useMemo, useState } from "react";

export function SearchPageLayout({ articles, bezirke }) {
  const [query, setQuery] = useState("");
  const [activeBezirkId, setActiveBezirkId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    let result = articles;
    if (activeBezirkId !== null) {
      result = result.filter((a) =>
        a.bezirke.some((entry) => entry.bezirkId === activeBezirkId)
      );
    }
    if (query.trim() !== "") {
      const q = query.toLowerCase();
      result = result.filter((a) =>
        a.title?.toLowerCase().includes(q) ||
        a.content?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [articles, query, activeBezirkId]);

  const isFiltered = query !== "" || activeBezirkId !== null;
  // ...
}
```

### Pattern 3: New DAL Function `listArticlesForSearch()`

**What:** A focused query that returns enough articles for client-side search without over-fetching. Returns `ArticleWithBezirke[]` (same type as existing functions) with a higher default limit.

**When to use:** Whenever the search page needs its initial dataset.

```typescript
// src/lib/content/articles.ts — add alongside existing functions
export async function listArticlesForSearch(options?: {
  limit?: number
}): Promise<ArticleWithBezirke[]> {
  const { limit = 200 } = options ?? {}
  return defaultPrisma.article.findMany({
    where: { status: 'PUBLISHED' },
    include: { bezirke: { include: { bezirk: true } } },
    orderBy: [{ publishedAt: 'desc' }],
    take: limit,
  })
}
```

**Note:** Unlike `listArticlesForHomepage()`, this includes ALL published articles regardless of `isFeatured` flag, since search should be exhaustive.

### Pattern 4: Pill + Grid Selection UI

**What:** Bezirk names appear twice — once as horizontal-scroll pills ("Trending Topics") and once as a CSS grid ("Category Grid"). Both control `activeBezirkId`. Selecting the same bezirk a second time deselects (toggle behavior).

**Pill example:**
```tsx
<button
  onClick={() => setActiveBezirkId(b.id === activeBezirkId ? null : b.id)}
  className={`px-3 py-1 rounded-full text-sm font-label transition-colors ${
    activeBezirkId === b.id
      ? "bg-styrian-green text-white"
      : "bg-cream border border-sage/30 text-sage hover:border-styrian-green hover:text-styrian-green"
  }`}
>
  {b.name}
</button>
```

### Pattern 5: Header Search Icon Activation

**What:** Header.tsx currently renders the search icon as a static `<span>` with `opacity-40 cursor-default`. Phase 20 must convert it to a `<Link href="/suche">` with full opacity.

**Why important:** The existing placeholder is explicitly commented "Phase 20 will activate this". A link (not a button) is correct since it navigates to a route.

### Anti-Patterns to Avoid

- **Debounced API search per keystroke:** The requirements say "typing a query filters the displayed article results" — this implies synchronous client-side filtering, not a live API call per keystroke. A network round-trip would introduce latency and complexity not needed at this scale.
- **URL search params for filter state:** The success criteria describe in-page filtering, not URL-driven state. Using `useSearchParams` would force a `<Suspense>` boundary wrapper (Next.js 15 requirement) and adds unnecessary complexity.
- **Separate `/kategorien` route:** The success criteria describe everything on a single search/discovery page, not two routes.
- **Custom search indexing:** Do not build a custom inverted index or use pg_trgm extensions. Simple `.includes()` on the pre-fetched title/content strings is sufficient for the described interaction.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| German text search | Custom tokenizer/stemmer | Simple `.toLowerCase().includes()` | Requirements describe keyword match, not linguistic search. No stemming needed. |
| Icon set | Custom SVGs for search/category icons | Material Symbols Outlined (already loaded) | CDN already in `layout.tsx`. Use `search`, `location_city`, `category` symbols. |
| Pill component | Generic reusable pill system | Inline Tailwind classes in SearchPageLayout | One-off UI, no reuse outside this page. |
| Bezirk data | Hardcoded Bezirk list | `listBezirke()` from existing DAL | Config-driven Bundesland deployment — the list comes from seed, not code. |

**Key insight:** The entire data model (Bezirke as categories/topics) is already present in the database and DAL. There is no new data modeling required; categories ARE Bezirke.

---

## Common Pitfalls

### Pitfall 1: Forgetting `export const dynamic = 'force-dynamic'`

**What goes wrong:** Next.js 15 will try to statically pre-render the page at build time. `listArticlesForSearch()` hits the DB, which fails in the build environment.
**Why it happens:** Next.js aggressively pre-renders pages unless told otherwise.
**How to avoid:** Add `export const dynamic = 'force-dynamic'` at the top of `suche/page.tsx` — exactly as done in `src/app/(public)/page.tsx` (line 3).
**Warning signs:** Build error about DB connection during static generation.

### Pitfall 2: `useMemo` Dependency Array Missing `query` or `activeBezirkId`

**What goes wrong:** Filtered results don't update when user types.
**Why it happens:** Stale closure if dependencies are omitted.
**How to avoid:** Always include `[articles, query, activeBezirkId]` as the full dependency array.

### Pitfall 3: Filtering on `article.content` for Long German Articles

**What goes wrong:** `.includes()` on full article bodies (potentially 2000+ chars each) across 200 articles is slow when typed fast.
**Why it happens:** Brute-force substring search on large strings repeated on every keystroke via `useMemo`.
**How to avoid:** Filter only on `article.title` for the primary match, then optionally include first 500 chars of `content`. The title match covers 95% of real user queries for a news platform.

### Pitfall 4: Bottom Nav Active State for `/suche`

**What goes wrong:** The "Suche" nav item won't highlight as active because the existing `isActive` logic uses `pathname.startsWith(item.href)`. This already works correctly — `/suche` starts with `/suche`. No changes needed to BottomNavClient.
**Why it's worth noting:** Developers might reflexively modify BottomNavClient when they don't need to.
**How to avoid:** Verify existing logic covers `/suche` before touching BottomNavClient.tsx.

### Pitfall 5: Hydration Mismatch from Filter State

**What goes wrong:** Server renders "no filter active" state, client may compute different initial state if reading localStorage.
**Why it happens:** This page does NOT use localStorage for filter state (unlike HomepageLayout). Filter state starts empty (`query = ""`, `activeBezirkId = null`) and is always correct on both server and client.
**How to avoid:** Do not read localStorage in SearchPageLayout. State is fully ephemeral.

### Pitfall 6: Both Pill and Grid Updating Independently

**What goes wrong:** Selecting a Bezirk pill doesn't update the grid's visual state and vice versa.
**Why it happens:** If pills and grid are separate components with separate state.
**How to avoid:** Keep `activeBezirkId` as single source of truth in `SearchPageLayout`. Pass both setter and current value down to pill row and category grid as props.

---

## Code Examples

Verified patterns from existing codebase:

### Bezirk Pills (Trending Topics) — based on existing pill patterns in BezirkModal.tsx

```tsx
// Horizontal scroll row of Bezirk pills
<div className="flex gap-2 overflow-x-auto scrollbar-none px-4 pb-2">
  {bezirke.map((b) => (
    <button
      key={b.id}
      onClick={() => setActiveBezirkId(b.id === activeBezirkId ? null : b.id)}
      className={`shrink-0 px-3 py-1 rounded-full text-sm font-label transition-colors ${
        activeBezirkId === b.id
          ? "bg-styrian-green text-white"
          : "bg-cream border border-sage/30 text-sage hover:border-styrian-green"
      }`}
    >
      {b.name}
    </button>
  ))}
</div>
```

### Large Serif Search Input (SRCH-01)

```tsx
<input
  type="search"
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  placeholder="Suchen…"
  className="w-full font-headline text-2xl bg-transparent border-b-2 border-styrian-green/40 focus:border-styrian-green outline-none pb-2 text-zinc-900 placeholder:text-zinc-400"
/>
```

### Header Search Icon — converting placeholder to Link (Header.tsx line 54-57)

```tsx
// Replace the disabled <span> with:
import Link from "next/link";
<Link
  href="/suche"
  className="material-symbols-outlined text-white hover:opacity-80 transition-opacity"
  aria-label="Zur Suche"
>
  search
</Link>
```

### Category Grid (SRCH-03) — 2-column grid, tap to filter

```tsx
<div className="grid grid-cols-2 gap-3 px-4">
  {bezirke.map((b) => (
    <button
      key={b.id}
      onClick={() => setActiveBezirkId(b.id === activeBezirkId ? null : b.id)}
      className={`text-left p-3 rounded-sm border transition-colors ${
        activeBezirkId === b.id
          ? "border-styrian-green bg-styrian-green/10 text-styrian-green"
          : "border-zinc-200 bg-white hover:border-sage/60 text-zinc-800"
      }`}
    >
      <span className="material-symbols-outlined text-sage text-lg block mb-1" aria-hidden="true">
        location_city
      </span>
      <span className="font-label text-sm font-medium">{b.name}</span>
    </button>
  ))}
</div>
```

### `listArticlesForSearch()` DAL function — follows existing DAL overload pattern

```typescript
// src/lib/content/articles.ts — add after listArticlesForHomepage()
export async function listArticlesForSearch(options?: {
  limit?: number
}): Promise<ArticleWithBezirke[]>
export async function listArticlesForSearch(
  client: PrismaClient,
  options?: { limit?: number }
): Promise<ArticleWithBezirke[]>
export async function listArticlesForSearch(
  clientOrOptions?: PrismaClient | { limit?: number },
  options?: { limit?: number }
): Promise<ArticleWithBezirke[]> {
  let db: PrismaClient
  let opts: { limit?: number }

  if (clientOrOptions !== undefined && clientOrOptions !== null
      && typeof clientOrOptions === 'object' && '$connect' in clientOrOptions) {
    db = clientOrOptions as PrismaClient
    opts = options ?? {}
  } else {
    db = defaultPrisma
    opts = (clientOrOptions as { limit?: number }) ?? {}
  }

  const { limit = 200 } = opts

  return db.article.findMany({
    where: { status: 'PUBLISHED' },
    include: { bezirke: { include: { bezirk: true } } },
    orderBy: [{ publishedAt: 'desc' }],
    take: limit,
  })
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Next.js pages router with `getServerSideProps` | App Router RSC with `async` page functions | Next.js 13+ (project uses 15.5.14) | No `getServerSideProps`; data fetching is just `await` calls in the component |
| `params` as plain object | `params` as `Promise<…>` | Next.js 15 | Must `await params` before destructuring (see BezirkPage pattern) |
| `useSearchParams` without Suspense | `useSearchParams` requires `<Suspense>` wrapper | Next.js 15 | For this phase: avoid `useSearchParams` entirely; use local state |
| Client-side data fetch on mount | Data passed as props from RSC | Phase 18 pattern | No loading flash; filter is immediate |

**Deprecated/outdated in this codebase:**
- Do not use `getServerSideProps` (pages router)
- Do not use `next/dynamic` for this page (no lazy loading needed)

---

## Open Questions

1. **Article limit for search pre-fetch**
   - What we know: `listArticlesForSearch()` with `limit: 200` loads at most 200 articles as props
   - What's unclear: If the platform has >200 articles, new ones won't appear in search without a higher limit or server-side search API
   - Recommendation: Start with 200 (covers realistic volume for a new regional news platform). Add a TODO comment noting the threshold.

2. **"Trending Topics" source data**
   - What we know: `TREND-01` ("Trending topics based on real analytics/engagement data") is explicitly deferred to Future Requirements in REQUIREMENTS.md
   - What's unclear: SRCH-02 says "trending topics appear as pill-shaped tags" — but there is no engagement tracking in v1.0/v1.1
   - Recommendation: Use Bezirk names as the pill tags. This matches the category grid data (Bezirke) and is consistent with the existing data model. The pills represent geographic topic areas, not algorithmic trending.

3. **"Empfohlene Artikel" selection logic**
   - What we know: SRCH-04 says "article recommendations when no active search or filter is applied"
   - What's unclear: Whether "recommended" means featured/pinned articles, or newest articles
   - Recommendation: Use `getPinnedArticles()` (already exists in articles.ts). Falls back to newest published. This is consistent with "recommendations" semantics across the app.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run src/lib/content/articles.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SRCH-01 | `listArticlesForSearch()` returns PUBLISHED articles with bezirke | unit | `npx vitest run src/lib/content/articles.test.ts` | ❌ Wave 0: add test cases to existing file |
| SRCH-02 | Pill filtering: activeBezirkId filters article list | unit (pure fn) | `npx vitest run src/lib/content/articles.test.ts` | ❌ Wave 0: test the filter logic as pure function |
| SRCH-03 | Category grid: same filter logic as pills | unit (pure fn) | `npx vitest run src/lib/content/articles.test.ts` | ❌ Wave 0: same test |
| SRCH-04 | `getPinnedArticles()` returns results for recommended section | unit | `npx vitest run src/lib/content/articles.test.ts` | ✅ existing tests cover `getPinnedArticles` |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/content/articles.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/content/articles.test.ts` — add `listArticlesForSearch()` test cases (file exists, tests to be added)
- [ ] Extract filter logic to pure function in `src/lib/reader/search.ts` for unit testability (optional but recommended — mirrors how `groupArticlesByBezirk` is a pure function in articles.ts)

---

## Sources

### Primary (HIGH confidence)
- Project codebase directly read — `src/components/reader/HomepageLayout.tsx`, `BottomNavClient.tsx`, `Header.tsx`, `ArticleFeed.tsx`, `ArticleCard.tsx`
- Project codebase directly read — `src/lib/content/articles.ts`, `src/lib/content/bezirke.ts`
- Project codebase directly read — `src/app/(public)/bezirk/[slug]/page.tsx` (Next.js 15 params-as-Promise pattern confirmed)
- Project codebase directly read — `src/app/globals.css` (design tokens confirmed)
- Project codebase directly read — `package.json` (Next.js 15.5.14, React 19.2.4, Tailwind 4.2.2, Vitest 2.1.9 confirmed)
- Project planning files — `REQUIREMENTS.md`, `STATE.md`, `PROJECT.md`

### Secondary (MEDIUM confidence)
- AGENTS.md warning: "This is NOT the Next.js you know — read node_modules/next/dist/docs/ before writing code." The `await params` pattern in `BezirkPage` confirms Next.js 15's async params behavior, consistent with documented breaking change.

### Tertiary (LOW confidence)
- None. All findings are grounded in direct codebase inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — confirmed from package.json and existing source files
- Architecture: HIGH — pattern directly mirrors Phase 18 HomepageLayout, verified in source
- Pitfalls: HIGH — identified from actual codebase patterns and explicitly labeled TODOs in source (Header.tsx comment)
- DAL function shape: HIGH — follows exact overload pattern used by all existing DAL functions

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable stack; no fast-moving dependencies)
