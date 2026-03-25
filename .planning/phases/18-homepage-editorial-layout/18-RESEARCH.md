# Phase 18: Homepage Editorial Layout - Research

**Researched:** 2026-03-25
**Domain:** Next.js 15 RSC layout restructure, Prisma migration, Tailwind v4 CSS, client-side sessionStorage
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Hero article (HOME-01)
- Add `imageUrl` (optional String) field to Article model — AI pipeline or editor provides a URL
- Hero selection: use `isFeatured` flag — editor marks one article as featured, that becomes the hero
- Fallback when no article has isFeatured=true: use newest article with a styrian-green gradient background instead of an image
- Hero displays: Bezirk badge at top, large Newsreader serif headline, 1-2 line excerpt, all over gradient overlay on the image
- Full-bleed width, visible without scrolling on mobile

#### Top-Meldungen row (HOME-02)
- Selection: pinned articles (`isPinned=true`). Fallback: newest articles so the row is always visible
- Respects user's "Mein Bezirk" filter — only shows articles from selected Bezirke
- Each card shows: small thumbnail (gradient if no imageUrl), headline text, Bezirk badge
- ~3 cards visible at once on mobile, more on desktop
- Uniform styrian-green (#2D5A27) bottom-border accent on every card
- "Top-Meldungen" label in Work Sans label font with thin divider line above the row
- Subtle gradient fade on right edge to hint at more scrollable content
- Horizontal scroll via native CSS overflow-x (touch swipe on mobile)

#### Topic sections / Bezirk grouping (HOME-03)
- Reinterpret "topic sections" as Bezirk sections — articles grouped by their tagged Bezirk
- With Mein Bezirk filter active: one section per selected Bezirk, each with its own heading
- Without Mein Bezirk (unfiltered): one big editorial grid of all articles, no section divisions
- Editorial grid within each section: 1 large article (2/3 width with image) + 2 smaller text-only cards beside it — classic newspaper layout
- Subtle wood-textured horizontal divider between sections — thin line in warm brown (#8B7355) evoking traditional Styrian style
- Styrian flag accents (white/green micro-stripe or green highlight) near section headings

#### Eilmeldung banner (HOME-04)
- Add `isEilmeldung` (Boolean, default false) field to Article model via Prisma migration
- Banner: sticky below the header/stripe, stays visible while scrolling
- Red background (#8b0000 alpine-red), white "EILMELDUNG" label text only — no article title
- Appears when at least one published article has isEilmeldung=true; absent when none flagged
- Dismissible per session: user can tap X to hide. Reappears on next page load or if a new Eilmeldung is flagged
- Dismiss state stored in sessionStorage
- DB migration and reader-side banner only — admin UI checkbox for Eilmeldung is NOT in this phase's scope

### Claude's Discretion
- Exact hero gradient overlay intensity and direction
- Card sizing and spacing within Top-Meldungen row
- Number of articles shown per Bezirk section
- Wood-divider CSS implementation (background-image, border-image, or pseudo-element)
- Styrian flag accent exact placement and style
- Responsive breakpoints for editorial grid columns
- Scroll snap behavior for Top-Meldungen (if any)
- Loading/skeleton states for the new layout sections

### Deferred Ideas (OUT OF SCOPE)
- Admin UI checkbox for Eilmeldung flag — separate phase or minor follow-up
- Category/topic system for articles (beyond Bezirk grouping) — future milestone
- AI-generated article images or image sourcing pipeline — future enhancement
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HOME-01 | Full-bleed hero featured article with image, gradient overlay, category badge, and large serif headline | Hero component pattern; `isFeatured` query; `imageUrl` migration; `next/image` for optimized rendering |
| HOME-02 | Horizontally scrollable "Top-Meldungen" cards with bottom border accent | CSS `overflow-x: auto` pattern; `isPinned` query with fallback; client-side Bezirk filter reads localStorage |
| HOME-03 | Topic sections with editorial grid layout, wood dividers, and Styrian flag accents | Bezirk-grouped queries; Tailwind v4 arbitrary values for wood color; CSS Grid 2/3 + 1/3 split |
| HOME-04 | Breaking news "Eilmeldung" red banner when an article is flagged | Prisma migration for `isEilmeldung`; server-side flag query; client dismiss with sessionStorage |
</phase_requirements>

---

## Summary

Phase 18 restructures the homepage from a single infinite-scroll feed (`ArticleFeed`) into four distinct editorial zones. The change is primarily architectural: `page.tsx` and `ArticleFeed.tsx` are replaced by a new component tree, and two new fields are added to the Prisma `Article` model via migration.

The data layer needs three new query functions in `articles.ts`: one to fetch the featured hero article, one to fetch pinned top-stories (with Bezirk filter), and one to group published articles by Bezirk. The first query runs server-side in `page.tsx`. The latter two must remain client-addressable because the "Mein Bezirk" filter reads from `localStorage` on mount — meaning the Bezirk-aware queries will be triggered from a client component, either via a new API route or by passing server-fetched data down and filtering client-side.

The Eilmeldung banner is the one genuinely new architectural element: it must be server-queried (is any article flagged?), rendered above `{children}` in the public layout, and made dismissible client-side via sessionStorage. This fits the Next.js 15 Server Component + Client Component boundary well — the layout fetches the boolean server-side and passes it as a prop to a small `"use client"` `EilmeldungBanner` component.

**Primary recommendation:** Use a Server Component `page.tsx` as the data orchestrator — fetch hero, pinned articles, and all published articles server-side, then pass them to a thin `"use client"` `HomepageLayout` component that reads localStorage on mount and derives the Bezirk-filtered views client-side from the pre-fetched data (no additional API round-trips needed for initial render).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.14 (installed) | RSC + page routing | Project foundation |
| Prisma | 6.19.2 (installed) | ORM + migration | Project database layer |
| Tailwind CSS v4 | 4.2.2 (installed) | Utility styling | Phase 16 design system established |
| React | 19.2.4 (installed) | UI components | Project foundation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/image | (bundled with Next.js 15) | Optimized image rendering | Hero image and thumbnail rendering |
| sessionStorage (Web API) | Native browser API | Eilmeldung dismiss state | No library needed |

### No New Dependencies
All required functionality is available in the currently installed stack. No `npm install` needed.

---

## Architecture Patterns

### Recommended Project Structure

New and modified files for Phase 18:

```
prisma/
├── migrations/
│   └── 20260325_phase18_eilmeldung_imageurl/
│       └── migration.sql        # ADD COLUMN isEilmeldung, imageUrl

src/
├── app/(public)/
│   ├── layout.tsx               # ADD: EilmeldungBanner above {children}
│   └── page.tsx                 # REPLACE: new multi-zone server component
├── components/reader/
│   ├── ArticleFeed.tsx          # REPLACE: becomes HomepageLayout (client)
│   ├── ArticleCard.tsx          # EXTEND: add imageUrl support
│   ├── HeroArticle.tsx          # NEW: full-bleed hero component
│   ├── TopMeldungenRow.tsx      # NEW: horizontal scroll row
│   ├── BezirkSection.tsx        # NEW: editorial grid section
│   └── EilmeldungBanner.tsx     # NEW: sticky dismissible banner
└── lib/content/
    └── articles.ts              # EXTEND: 3 new query functions
```

### Pattern 1: Server Component as Data Orchestrator

The homepage `page.tsx` fetches all data server-side and passes it to the client layout component. The client component filters by Bezirk using localStorage — but since it already has all articles, no additional network request is needed.

```typescript
// src/app/(public)/page.tsx
export const dynamic = 'force-dynamic'

import { getFeaturedArticle, getPinnedArticles, listArticlesGroupedByBezirk } from "@/lib/content/articles";
import { HomepageLayout } from "@/components/reader/HomepageLayout";

export default async function HomePage() {
  const [hero, pinned, allPublished] = await Promise.all([
    getFeaturedArticle(),
    getPinnedArticles({ limit: 10 }),
    listArticlesForHomepage({ limit: 60 }),
  ]);

  return (
    <HomepageLayout
      hero={hero}
      pinnedArticles={pinned}
      allArticles={allPublished}
    />
  );
}
```

**Why this pattern:** Avoids multiple waterfall requests. The client component receives all data on first render and derives filtered views from it purely in memory — matching the existing Bezirk-filter pattern in `ArticleFeed.tsx`.

### Pattern 2: Eilmeldung Banner in Layout with Client Dismiss

```typescript
// src/app/(public)/layout.tsx  (server component)
import { hasEilmeldung } from "@/lib/content/articles";
import { EilmeldungBanner } from "@/components/reader/EilmeldungBanner";

export default async function PublicLayout({ children }) {
  const bezirke = await listBezirke();
  const eilmeldungActive = await hasEilmeldung();

  return (
    <>
      <Header bezirke={bezirke} />
      {eilmeldungActive && <EilmeldungBanner />}
      <main className="flex-1 pb-20">{children}</main>
      ...
    </>
  );
}
```

```typescript
// src/components/reader/EilmeldungBanner.tsx
"use client";
import { useState, useEffect } from "react";

const SESSION_KEY = "eilmeldung_dismissed";

export function EilmeldungBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(SESSION_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="sticky top-[60px] z-30 bg-alpine-red flex items-center justify-between px-4 py-2">
      <span className="font-label font-bold text-white uppercase tracking-widest text-sm">
        Eilmeldung
      </span>
      <button onClick={dismiss} aria-label="Schließen" className="text-white">
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>
  );
}
```

**Key point:** The parent layout passes `eilmeldungActive` as a render condition — it only mounts `EilmeldungBanner` when the flag is true. The component itself handles the sessionStorage dismiss state. This avoids any hydration mismatch since the initial `visible` state starts false and is corrected in `useEffect`.

### Pattern 3: Horizontal Scroll Row (CSS-only, no library)

```tsx
// Top-Meldungen row — native CSS overflow-x
<div className="relative">
  {/* Fade hint on right edge */}
  <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-cream to-transparent z-10" />

  <div className="flex gap-3 overflow-x-auto px-4 pb-3 scrollbar-none"
       style={{ WebkitOverflowScrolling: 'touch' }}>
    {articles.map(article => (
      <TopMeldungCard key={article.id} article={article} />
    ))}
  </div>
</div>
```

Each card gets `flex-shrink-0 w-40` (or similar fixed width) and `border-b-2 border-styrian-green` for the bottom-border accent.

**Scrollbar hiding:** Use `scrollbar-none` — Tailwind v4 does not include this utility by default. Use `[&::-webkit-scrollbar]:hidden` or add a CSS class: `.scrollbar-none { scrollbar-width: none; }` in globals.css.

### Pattern 4: Editorial Grid (2/3 + 1/3)

```tsx
// BezirkSection editorial grid
<div className="grid grid-cols-3 gap-3">
  {/* Large article — 2/3 width */}
  <div className="col-span-2">
    <ArticleCard article={articles[0]} featured />
  </div>
  {/* Two smaller cards — 1/3 width each, stacked */}
  <div className="flex flex-col gap-3">
    {articles.slice(1, 3).map(a => (
      <ArticleCard key={a.id} article={a} />
    ))}
  </div>
</div>
```

On mobile (`< md`): collapse to single column (`grid-cols-1`), large article first.

### Pattern 5: Wood Divider (CSS pseudo-element)

```css
/* globals.css or as Tailwind arbitrary value */
.wood-divider {
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    #8B7355 20%,
    #8B7355 80%,
    transparent
  );
}
```

As a Tailwind class inline: `<hr class="border-0 h-px bg-gradient-to-r from-transparent via-[#8B7355] to-transparent my-4" />`

### Styrian Flag Accent (section headings)

A 4px stripe matching HDR-01 (same two-color gradient) before the section heading:

```tsx
<div>
  <div className="h-[4px] w-8 mb-2"
       style={{ background: 'linear-gradient(to bottom, #fff 50%, #2D5A27 50%)' }} />
  <h2 className="font-label font-semibold text-styrian-green uppercase tracking-wide text-xs">
    {bezirkName}
  </h2>
</div>
```

### Anti-Patterns to Avoid

- **Fetching per-Bezirk in the client component:** Pass all articles server-side and filter client-side. Avoids N+1 API calls when the user has multiple Bezirke selected.
- **Putting data fetching in the EilmeldungBanner client component:** The server layout component checks the DB; the banner just handles dismiss UI.
- **Using `overflow-hidden` on the scroll row's parent container:** This will clip the cards. The fade overlay uses `pointer-events-none absolute` instead.
- **Hydration mismatch from sessionStorage:** Initialize `visible = false` in useState, then set to true in `useEffect` if not dismissed. Never read sessionStorage during SSR.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image optimization | Custom `<img>` with manual sizing | `next/image` | Automatic WebP, lazy loading, CLS prevention |
| Horizontal scroll | Custom touch handler / JS scrolling | CSS `overflow-x: auto` | Touch devices handle natively, no JS needed |
| Bezirk grouping on server | Complex SQL GROUP BY | Fetch all, group in JS | Simpler, already fetched, small dataset (60 articles max) |
| Session persistence | Custom cookie handling | `sessionStorage` | Perfect fit: dismiss persists for session only |

**Key insight:** This phase is UI restructuring with minimal new logic. Every problem has a CSS or standard browser API solution. Resist adding npm packages.

---

## Common Pitfalls

### Pitfall 1: Hydration Mismatch on sessionStorage-Driven Visibility

**What goes wrong:** Component renders `visible=true` on server (sessionStorage not available), then hydrates `visible=false` client-side → React hydration error.

**Why it happens:** sessionStorage only exists in browser. Any initial state derived from it causes server/client divergence.

**How to avoid:** Always initialize `useState(false)` and set the true value inside `useEffect`. This ensures server renders nothing / hidden, and client corrects after hydration.

**Warning signs:** React hydration errors in console, banner flickering on load.

### Pitfall 2: Prisma Client Not Regenerated After Migration

**What goes wrong:** After adding `isEilmeldung` and `imageUrl` to schema.prisma and running migration, TypeScript types are stale — `article.isEilmeldung` shows as `never`.

**Why it happens:** Prisma generates TypeScript types from the schema. `prisma migrate dev` regenerates the client automatically, but if the migration was applied manually or the generate step was skipped, types are stale.

**How to avoid:** Run `npx prisma migrate dev --name phase18_eilmeldung_imageurl` which both applies the migration AND regenerates the client in one step.

**Warning signs:** TypeScript errors on `article.isEilmeldung` or `article.imageUrl`.

### Pitfall 3: Test Setup DB Missing New Fields

**What goes wrong:** After Prisma migration, `createTestDb()` in `setup-db.ts` loads migration SQL from disk — it will automatically include the new migration. But `cleanDb()` in `setup-db.ts` references specific models by name and will still work. The `seedBulkArticles` helper does NOT set the new fields — tests querying `isEilmeldung` need to seed articles with the flag explicitly.

**Why it happens:** `seedBulkArticles` creates articles with minimal fields for performance testing.

**How to avoid:** When writing `hasEilmeldung` tests, don't use `seedBulkArticles` — create articles directly in `beforeEach` with explicit `isEilmeldung: true/false`.

**Warning signs:** `hasEilmeldung()` always returning false in tests even after seeding flagged articles.

### Pitfall 4: `next/image` Requires Known Domains for External URLs

**What goes wrong:** `imageUrl` on an article is an external URL. `next/image` with `src={article.imageUrl}` throws a configuration error: "hostname not configured."

**Why it happens:** Next.js 15 requires explicit domain allowlisting in `next.config.js` for external image URLs.

**How to avoid:** Either (a) add an `images.remotePatterns` allowlist in `next.config.js` for known domains, or (b) use a standard `<img>` tag for hero images with manual `loading="lazy"` when the domain is unknown/variable. Since `imageUrl` is editor-supplied and the domain is unpredictable, use `<img>` with `object-cover` CSS styling for Phase 18.

**Warning signs:** Runtime error "Invalid src prop" when a `next/image` receives an unconfigured hostname.

### Pitfall 5: Eilmeldung Banner z-index Conflict with Sticky Header

**What goes wrong:** The existing Header uses `sticky top-0 z-40`. The Eilmeldung banner placed below it must use `sticky top-[60px]` (the header height) and `z-30` to sit below the header in stacking order.

**Why it happens:** Both elements are sticky in the same scroll container. The header must always remain on top.

**How to avoid:** Set `top-[60px]` (matching the header's `h-14` = 56px + 4px stripe = 60px) and `z-30` on the banner element.

**Warning signs:** Banner overlapping the header, or header disappearing behind the banner when scrolling.

### Pitfall 6: localStorage Read Timing in HomepageLayout

**What goes wrong:** If `HomepageLayout` reads `localStorage` synchronously in render, the SSR/SSG pass throws `localStorage is not defined`.

**Why it happens:** Server-side rendering runs in Node.js, which has no `localStorage`.

**How to avoid:** Same pattern as existing `ArticleFeed.tsx` — read `localStorage` only inside `useEffect`. Pre-show the unfiltered view on first render, then update to filtered view after mount.

**Warning signs:** `ReferenceError: localStorage is not defined` during build or in server logs.

---

## Code Examples

### New Prisma Migration SQL

```sql
-- prisma/migrations/20260325_phase18_eilmeldung_imageurl/migration.sql
ALTER TABLE "Article" ADD COLUMN "isEilmeldung" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Article" ADD COLUMN "imageUrl" TEXT;
CREATE INDEX "Article_isEilmeldung_idx" ON "Article"("isEilmeldung");
```

### New Query Functions in articles.ts

All new functions follow the existing dual-overload pattern (accepts optional PrismaClient as first arg for testability):

```typescript
// Get the single featured article (hero)
export async function getFeaturedArticle(
  client?: PrismaClient
): Promise<ArticleWithBezirke | null> {
  const db = client ?? defaultPrisma;
  // First try: editor-flagged isFeatured article
  const featured = await db.article.findFirst({
    where: { status: 'PUBLISHED', isFeatured: true },
    include: { bezirke: { include: { bezirk: true } } },
    orderBy: { publishedAt: 'desc' },
  });
  if (featured) return featured;
  // Fallback: newest published article
  return db.article.findFirst({
    where: { status: 'PUBLISHED' },
    include: { bezirke: { include: { bezirk: true } } },
    orderBy: { publishedAt: 'desc' },
  });
}

// Get pinned articles for Top-Meldungen row
export async function getPinnedArticles(options?: {
  bezirkIds?: number[];
  limit?: number;
}): Promise<ArticleWithBezirke[]> {
  const { bezirkIds, limit = 10 } = options ?? {};
  const pinned = await defaultPrisma.article.findMany({
    where: {
      status: 'PUBLISHED',
      isPinned: true,
      ...(bezirkIds?.length ? {
        OR: [
          { bezirke: { some: { bezirkId: { in: bezirkIds } } } },
          { isStateWide: true },
        ],
      } : {}),
    },
    include: { bezirke: { include: { bezirk: true } } },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  });
  // Fallback: if no pinned articles, return newest
  if (pinned.length === 0) {
    return defaultPrisma.article.findMany({
      where: { status: 'PUBLISHED' },
      include: { bezirke: { include: { bezirk: true } } },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
  }
  return pinned;
}

// Check if any published article has isEilmeldung=true
export async function hasEilmeldung(client?: PrismaClient): Promise<boolean> {
  const db = client ?? defaultPrisma;
  const count = await db.article.count({
    where: { status: 'PUBLISHED', isEilmeldung: true },
  });
  return count > 0;
}

// Fetch articles for homepage (hero excluded)
export async function listArticlesForHomepage(options?: {
  limit?: number;
}): Promise<ArticleWithBezirke[]> {
  const { limit = 60 } = options ?? {};
  return defaultPrisma.article.findMany({
    where: { status: 'PUBLISHED', isFeatured: false },
    include: { bezirke: { include: { bezirk: true } } },
    orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
    take: limit,
  });
}
```

### Updated ArticleWithBezirke Type

After migration, the Prisma-generated type will automatically include `isEilmeldung: boolean` and `imageUrl: string | null` on the `Article` model. No manual type changes needed — `ArticleWithBezirke` extends `Article`, so it inherits the new fields automatically.

### Hero Component Structure

```tsx
// src/components/reader/HeroArticle.tsx
import Link from "next/link";
import type { ArticleWithBezirke } from "@/lib/content/articles";
import { slugify } from "@/lib/reader/slug";

export function HeroArticle({ article }: { article: ArticleWithBezirke }) {
  const href = `/artikel/${article.publicId}/${slugify(article.title ?? "artikel")}`;
  const firstBezirk = article.bezirke[0]?.bezirk;
  const hasImage = Boolean(article.imageUrl);

  return (
    <Link href={href} className="block relative w-full overflow-hidden"
          style={{ minHeight: '60vh' }}>
      {/* Background: real image or gradient fallback */}
      {hasImage ? (
        <img
          src={article.imageUrl!}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-styrian-green to-sage" />
      )}

      {/* Gradient overlay for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end h-full p-4 pb-6"
           style={{ minHeight: '60vh' }}>
        {firstBezirk && (
          <span className="inline-block text-xs font-label font-semibold
                           bg-cream text-styrian-green px-2 py-0.5 rounded-sm mb-3 self-start">
            {firstBezirk.name}
          </span>
        )}
        <h1 className="font-headline text-white text-2xl leading-tight font-semibold">
          {article.title}
        </h1>
        {article.content && (
          <p className="text-white/80 text-sm mt-2 line-clamp-2">
            {article.content.slice(0, 120)}…
          </p>
        )}
      </div>
    </Link>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single `ArticleFeed` component with infinite scroll | Four-zone editorial layout (hero + row + sections + banner) | Phase 18 | ArticleFeed.tsx is superseded; infinite scroll removed |
| `listArticlesReader()` single query | Three specialized queries: featured, pinned, homepage list | Phase 18 | Better query intent clarity |
| No `imageUrl` on Article | `imageUrl String?` on Article model | Phase 18 migration | Hero and cards can show real images |
| No `isEilmeldung` on Article | `isEilmeldung Boolean @default(false)` on Article | Phase 18 migration | Breaking news banner data model |

**Deprecated/outdated in this phase:**
- `ArticleFeed.tsx`: Will be entirely replaced by `HomepageLayout.tsx` + `HeroArticle`, `TopMeldungenRow`, `BezirkSection` components. The file can be deleted once the new layout is working.
- The `AdUnit zone="hero"` in the current `page.tsx`: Decide whether to keep it. The hero zone is now a real article hero — the ad slot may move or be removed. (Claude's discretion on ad slot placement in new layout.)

---

## Open Questions

1. **AdUnit placement in new layout**
   - What we know: Current `page.tsx` has `<AdUnit zone="hero" />` above the feed; current feed inserts ads every 5 articles.
   - What's unclear: Should ads be preserved in the new layout? Where do they sit? (Between sections? After top-stories row?)
   - Recommendation: Preserve ad slots but reposition — one after the hero section, one between Bezirk sections. Keep existing `AdUnit` component.

2. **HomepageLayout client filtering strategy**
   - What we know: Bezirk filter is stored in localStorage, read on mount.
   - What's unclear: Should `HomepageLayout` re-filter both the pinned row AND the sections from `allArticles`, or should the sections come from a separate API call after Bezirk selection is known?
   - Recommendation: Filter both from the pre-fetched `allArticles` prop client-side. The 60-article initial fetch is sufficient. No API call needed for the sections filter.

3. **`next/image` vs `<img>` for hero**
   - What we know: `imageUrl` is editor-supplied and the domain is unpredictable.
   - What's unclear: Is it worth setting up `images.remotePatterns` with a wildcard?
   - Recommendation: Use `<img>` with `object-cover` for Phase 18. Next.js docs warn against wildcard `remotePatterns` in production; since image sourcing is deferred, a plain `<img>` is safer.

---

## Validation Architecture

> `nyquist_validation: true` in config.json — section included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/test/articles-phase18.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HOME-01 | `getFeaturedArticle()` returns `isFeatured` article; fallback returns newest when none flagged | unit | `npx vitest run src/test/articles-phase18.test.ts` | ❌ Wave 0 |
| HOME-02 | `getPinnedArticles()` returns `isPinned` articles; fallback returns newest when none pinned | unit | `npx vitest run src/test/articles-phase18.test.ts` | ❌ Wave 0 |
| HOME-03 | Client-side Bezirk grouping filters correctly from pre-fetched articles | unit (pure function) | `npx vitest run src/test/articles-phase18.test.ts` | ❌ Wave 0 |
| HOME-04 | `hasEilmeldung()` returns true when any published article has `isEilmeldung=true`; false otherwise | unit | `npx vitest run src/test/articles-phase18.test.ts` | ❌ Wave 0 |
| HOME-04 | Banner absent when `hasEilmeldung` returns false | manual | N/A | manual-only |
| HOME-01 | Hero visible without scrolling on mobile | manual (visual) | N/A | manual-only |

**Manual-only justification:** Full-bleed visual layout and sticky banner positioning require browser rendering — not automatable with Vitest's Node environment.

### Sampling Rate
- **Per task commit:** `npx vitest run src/test/articles-phase18.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/test/articles-phase18.test.ts` — covers HOME-01 (getFeaturedArticle), HOME-02 (getPinnedArticles), HOME-03 (groupByBezirk util), HOME-04 (hasEilmeldung)
- [ ] Prisma migration must be applied before tests run — `createTestDb()` in `setup-db.ts` auto-loads all migration SQL from disk, so the new migration file must exist before `vitest run`

*(Existing `setup-db.ts` and `validation.test.ts` infrastructure is fully compatible — no changes to shared test utilities needed.)*

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `src/components/reader/ArticleFeed.tsx`, `ArticleCard.tsx`, `page.tsx`, `layout.tsx`, `Header.tsx`
- Direct schema inspection: `prisma/schema.prisma` — confirmed existing fields (`isFeatured`, `isPinned`, `isStateWide`), confirmed absence of `isEilmeldung` and `imageUrl`
- Direct dependency inspection: `package.json`, `vitest.config.ts`, `src/test/setup-db.ts`
- `globals.css` — confirmed Tailwind v4 @theme tokens: `--color-alpine-red: #8b0000`, `--color-styrian-green: #2D5A27`, `--color-cream: #fbfaee`, `--color-sage: #4a5d4e`
- Next.js version confirmed: 15.5.14

### Secondary (MEDIUM confidence)
- Next.js 15 Server Components + Client Components boundary pattern — consistent with existing codebase usage patterns
- Prisma dual-overload pattern for testability — confirmed via existing `articles.ts` implementation

### Tertiary (LOW confidence)
- `top-[60px]` for Eilmeldung banner sticky offset — calculated from `h-[4px]` stripe + `h-14` header = 56px + 4px = 60px. Verify against actual rendered header height.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies verified via package.json and installed node_modules
- Architecture: HIGH — patterns derived from direct codebase inspection, not assumptions
- Pitfalls: HIGH — hydration, image domain, and sessionStorage pitfalls are well-known Next.js 15 patterns; Prisma migration pitfall verified against project structure
- Test patterns: HIGH — vitest setup confirmed, existing test infrastructure fully understood

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable stack, no fast-moving dependencies)
