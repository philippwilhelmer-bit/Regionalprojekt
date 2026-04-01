# Architecture Research

**Domain:** Design system overhaul + feature integration for existing Next.js 15 regional news platform
**Researched:** 2026-03-30
**Confidence:** HIGH — based on direct codebase inspection + official Tailwind v4 docs + Open-Meteo API verification

---

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│              src/app/globals.css  (@theme — single source)        │
│  ~8 tokens now → ~30 MD3-style tokens after v3.0                  │
│  Additive expansion: existing tokens retained, new ones appended  │
└──────────────────────────────┬───────────────────────────────────┘
                               │ CSS custom properties cascade down
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│ (public)/      │  │ src/components/  │  │ (admin)/             │
│ layout.tsx     │  │ reader/          │  │ layout.tsx           │
│ (shell layer)  │  │ (component layer)│  │ (separate concern)   │
└───────┬────────┘  └────────┬─────────┘  └──────────────────────┘
        │                    │
        │  shared layout     │  modified vs new components
        ▼                    ▼
┌───────────────────────────────────────────────────────────────┐
│  WurzelAppBar    WurzelNavBar       Footer       BezirkModal   │
│  (modified)    → (replaced by      (replaced by  (unchanged)  │
│               ArchivistNavBar)   EditorialFooter)             │
└───────────────────────────────────────────────────────────────┘
        │
        ▼  new components in v3.0
┌────────────────────────────────────────────────────────────────┐
│  WeatherWidget   RegionSelectorCard   GrueneWocheSection       │
│  EditorialFooter ArchivistNavBar      ArticleSidebar DropCap   │
└────────────────────────────────────────────────────────────────┘
        │
        ▼  data layer
┌────────────────────────────────────────────────────────────────┐
│  Prisma/Neon (articles, bezirke)  │  Open-Meteo (weather)      │
│  Server Components (DB reads)     │  Server-side fetch +        │
│  localStorage (bezirk selection)  │  { next: { revalidate } }  │
└────────────────────────────────────────────────────────────────┘
```

---

## Integration Analysis by Question

### 1. Tailwind v4 @theme Token Expansion

**Current state:** 8 tokens in `src/app/globals.css`:
`--color-primary`, `--color-secondary`, `--color-accent`, `--color-background`, `--color-text`, `--color-surface`, `--color-surface-elevated`, `--color-primary-container`.

**How expansion works (HIGH confidence — verified with official Tailwind v4 docs):**

Tailwind v4 `@theme` is purely additive by default. Adding new tokens alongside existing ones generates new utility classes while leaving all existing classes intact. The `--color-*: initial` nuclear option (which wipes a namespace) is explicitly opt-in and is never needed here.

**Migration strategy — zero breakage:**

```css
@theme {
  /* EXISTING — do not touch, all current components depend on these */
  --color-primary: #1B2D18;
  --color-secondary: #4A5D23;
  --color-accent: #9F411E;
  --color-background: #FCF9EF;
  --color-text: #071806;
  --color-surface: #F6F4EA;
  --color-surface-elevated: #FFFFFF;
  --color-primary-container: #4A5D23;

  /* NEW MD3-style tokens — Ink/Parchment/Slate/Aged Wood system */

  /* Ink family (dark tones) */
  --color-ink-900: #0D1A0C;
  --color-ink-800: #1B2D18;       /* maps to current primary */
  --color-ink-600: #2F4A2B;
  --color-ink-400: #4A5D23;       /* maps to current secondary */

  /* Parchment family (light tones) */
  --color-parchment-50: #FDFBF4;
  --color-parchment-100: #FCF9EF;  /* maps to current background */
  --color-parchment-200: #F6F4EA;  /* maps to current surface */
  --color-parchment-300: #EDE9DC;

  /* Slate family (neutral mid-tones) */
  --color-slate-700: #3D3D3A;
  --color-slate-500: #6B6B66;
  --color-slate-300: #B0AFA8;
  --color-slate-100: #E8E7E2;

  /* Aged Wood / accent family */
  --color-wood-700: #7A2F10;
  --color-wood-500: #9F411E;       /* maps to current accent */
  --color-wood-300: #C4744F;
  --color-wood-100: #F0D4C4;

  /* Functional tokens for new components */
  --color-surface-glass: rgba(252, 249, 239, 0.85);
  --color-on-primary: #FFFFFF;
  --color-on-surface: #071806;

  /* Existing font, radius, spacing tokens — unchanged */
}
```

**Rule:** Existing components continue using `bg-primary`, `text-secondary`, `bg-surface` etc. — unchanged. New v3.0 components use the new token names. This avoids a mass-refactor as a prerequisite for any other work.

**Confidence:** HIGH — Tailwind v4 official docs confirm additive `@theme` expansion leaves existing utilities intact.

---

### 2. Open-Meteo API Integration

**Recommendation: Server-side fetch in `page.tsx`, passed as prop to HomepageLayout.**

**Rationale:**

The homepage `page.tsx` is already `force-dynamic` and performs a `Promise.all` fetching articles, pinned articles, bezirke, and featured article. Weather data fits naturally into this same fetch group.

`HomepageLayout.tsx` is a `"use client"` component (it reads localStorage). In Next.js 15 App Router, a Server Component (async WeatherWidget) **cannot** be imported and rendered directly inside a Client Component — this throws a build error. The solution is to fetch weather data at the server level in `page.tsx` and pass it as a typed prop to `HomepageLayout`.

**Data flow:**

```
page.tsx  (async Server Component, force-dynamic)
  ├── getFeaturedArticle()       → hero
  ├── getPinnedArticles()        → pinned
  ├── listArticlesForHomepage()  → allArticles
  ├── listBezirke()              → bezirke
  └── fetchCurrentWeather(47.0707, 15.4395)  → weather  ← NEW

HomepageLayout (Client Component)
  receives weather as prop, renders WeatherWidget as a
  presentation-only Client Component (no async needed)
```

**Weather fetch function:**

```typescript
// src/lib/content/weather.ts
export interface WeatherData {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  time: string;
}

export async function fetchCurrentWeather(
  lat: number,
  lon: number
): Promise<WeatherData | null> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("current", "temperature_2m,weather_code,wind_speed_10m");

    const res = await fetch(url.toString(), {
      next: { revalidate: 1800 },  // 30-minute cache
    });
    if (!res.ok) return null;

    const json = await res.json();
    return {
      temperature: json.current.temperature_2m,
      weatherCode: json.current.weather_code,
      windSpeed: json.current.wind_speed_10m,
      time: json.current.time,
    };
  } catch {
    return null;  // widget degrades gracefully if API unavailable
  }
}
```

**Coordinates:** Hard-code Graz (47.0707, 15.4395) as default. Optionally add a `weather` key to `bundesland.config.ts` for Bundesland portability.

**Open-Meteo API facts (HIGH confidence):**
- Base URL: `https://api.open-meteo.com/v1/forecast`
- No API key required, no signup
- Free for non-commercial use
- Fair-use limit: 10,000 req/day (irrelevant — 30 min revalidate = ~48 req/day)
- Returns `current.temperature_2m` (°C), `current.weather_code` (WMO), `current.wind_speed_10m` (km/h)

**What NOT to do:**
- Do not use `useEffect` for client-side weather fetch — adds hydration delay and flash of empty state
- Do not create an `/api/weather` proxy route — Open-Meteo is public, no CORS issue, a proxy adds unnecessary complexity
- Do not install the `openmeteo` npm SDK — it uses FlatBuffers (overkill for current conditions only)

**Confidence:** HIGH.

---

### 3. "No-Line Rule" Migration

**Current border inventory (from direct codebase inspection):**

| File | Border class | Treatment |
|------|-------------|-----------|
| `ListItem.tsx:19` | `border-b border-surface last:border-b-0` | **Remove** — replace with spacing |
| `ArticleFeed.tsx:140` | `border-2 border-zinc-300 border-t-primary rounded-full animate-spin` | **Keep** — loading spinner; structural not decorative |
| `MascotGreeting.tsx:55-57` | Inline `borderLeft/Right/Top` CSS triangle | **Keep** — CSS triangle technique; not a visible horizontal/vertical line |
| Admin forms (multiple files) | `border border-surface` on inputs | **Defer** — functional form borders; admin CMS refresh phase |
| `ArticleRow.tsx` (admin) | `border-b border-surface` on table rows | **Defer** — admin CMS refresh phase |

**Reader-side migration is minimal — exactly one change:**

`ListItem.tsx` is the only reader component with a visible separator border. It renders inside a `bg-surface-elevated rounded-sm shadow-sm` card wrapper in `HomepageLayout.tsx` — the card's shadow already provides visual grouping. Remove `border-b border-surface last:border-b-0` from `ListItem.tsx` and rely on `py-3` vertical padding for separation.

**Sequence:**
1. Expand `@theme` tokens (must come first — new surface tokens may be referenced)
2. Remove `border-b border-surface last:border-b-0` from `ListItem.tsx`
3. Verify visual separation still reads correctly in context of the card wrapper
4. Defer all admin border changes to the CMS refresh phase

**Confidence:** HIGH — derived from direct inspection of all reader component files.

---

### 4. Component Refactoring Strategy: Update vs New

**Guiding principle:** Modify components that have the same role and props interface. Create new components when the visual structure or behavior changes significantly enough that the old implementation is replaced, not extended.

| Component | Strategy | Rationale |
|-----------|----------|-----------|
| `WurzelAppBar.tsx` | **Modify in place** | Same structure, same props (`bezirke`), same location — token updates and minor visual tweaks only |
| `WurzelNavBar.tsx` | **Replace with `ArchivistNavBar.tsx`** | Active state changes from filled pill to top-border; background changes from opaque to glass; keeping the old file would leave an ambiguous dead component |
| `Footer.tsx` | **Replace with `EditorialFooter.tsx`** | Dark background multi-column layout is structurally different from the current minimal light footer |
| `HeroArticle.tsx` | **Modify in place** | Same slot, same props — add CTA button, update tokens |
| `MascotGreeting.tsx` | **Modify in place** | Same slot; visual refresh only |
| `RegionalEditorialCard.tsx` | **Modify in place** | Token updates, no structural change |
| `ListItem.tsx` | **Modify in place** | Remove border, minor token updates |
| `HomepageLayout.tsx` | **Modify in place** | Add new section slots; overall layout orchestration unchanged |
| `SearchPageLayout.tsx` | **Modify in place** | Redesign within same component boundary |
| `BezirkModal.tsx` | **Unchanged** | Not in v3.0 scope |
| `EilmeldungBanner.tsx` | **Unchanged** | Not in v3.0 scope |
| `CookieBanner.tsx` | **Unchanged** | Not in v3.0 scope |

**New components to create:**

| Component | Location | Type | Notes |
|-----------|----------|------|-------|
| `ArchivistNavBar.tsx` | `src/components/reader/` | Client Component | Glassmorphic, top-border active state |
| `EditorialFooter.tsx` | `src/components/reader/` | Server Component | Dark, multi-column, navigation links |
| `WeatherWidget.tsx` | `src/components/reader/` | Client Component (receives prop) | Presentation only; data fetched in page.tsx |
| `RegionSelectorCard.tsx` | `src/components/reader/` | Client Component | "Frag den Wurzelmann" interactive card |
| `GrueneWocheSection.tsx` | `src/components/reader/` | Server Component | Themed editorial section |
| `DropCap.tsx` | `src/components/reader/` | Server Component | First-letter drop cap for article detail |
| `ArticleSidebar.tsx` | `src/components/reader/` | Server Component | Metadata sidebar for article detail |

**Layout wiring:** `src/app/(public)/layout.tsx` has two import updates:
- `Footer` → `EditorialFooter`
- `WurzelNavBar` → `ArchivistNavBar`

All other shell components remain as-is or are modified at their source files.

**Confidence:** HIGH — based on direct inspection of component files and import graph in `(public)/layout.tsx`.

---

### 5. Footer as Shared Layout Component

**Current state:** `Footer.tsx` is already a shared layout component, imported only in `src/app/(public)/layout.tsx`. It renders on all reader pages automatically.

**v3.0 approach:** Create `EditorialFooter.tsx` alongside `Footer.tsx`. Update the single import in `(public)/layout.tsx`. No other files need changing.

**Admin layout** (`src/app/(admin)/layout.tsx`) does not import `Footer.tsx` — admin has separate minimal chrome. The footer replacement is scoped entirely to the public reader layout.

**Bottom-padding note:** The current `Footer.tsx` has `pb-24` for bottom-nav clearance. The actual nav clearance is already handled by `<main className="flex-1 pb-20">` in the layout. The new `EditorialFooter.tsx` should have internal bottom padding (`pb-8` or similar for content breathing room) but the nav clearance is layout-level, not footer-level.

**Confidence:** HIGH — derived from direct inspection of `(public)/layout.tsx`.

---

### 6. Glassmorphism in Bottom Nav with Tailwind v4

**Pattern:** Replace the opaque `bg-background` in the current nav with a semi-transparent background plus `backdrop-blur-md`.

**Tailwind v4 classes (HIGH confidence — verified against official docs):**

Custom `@theme` color tokens support opacity modifiers in Tailwind v4, identical to built-in colors:

```tsx
// ArchivistNavBar.tsx — core glass effect
<nav className="fixed bottom-0 inset-x-0 z-40
  bg-parchment-100/85 backdrop-blur-md
  h-16 flex items-center justify-around px-2">
```

`bg-parchment-100/85` = `--color-parchment-100` at 85% opacity. The `backdrop-blur-md` applies the blur to whatever is behind the nav.

**Active state — top-border indicator:**

```tsx
// Active tab uses border-t instead of filled pill
<Link
  href={item.href}
  className={`flex flex-col items-center justify-center gap-0.5
    min-w-[56px] h-full pt-1
    border-t-2 transition-colors
    ${isActive ? "border-primary" : "border-transparent"}`}
>
```

The `border-transparent` on inactive tabs preserves layout stability (same dimensions whether active or not).

**Safari/iOS compatibility:** Tailwind v4 outputs `-webkit-backdrop-filter` automatically alongside `backdrop-filter`. No manual prefix needed.

**Stacking context requirement:** `backdrop-filter` creates a new stacking context. The nav must not have a parent with `overflow: hidden` or `isolation: isolate` that would clip the blur. Current layout: nav is a direct child of `<body>` in `(public)/layout.tsx` — no blocking ancestor exists.

**Shadow replacement:** The current nav uses `shadow-[0_-2px_8px_rgba(0,0,0,0.06)]`. With glassmorphism, remove this — the semi-transparent background already creates visual separation from page content. A subtle `border-t border-parchment-300/50` can reinforce the top edge without a heavy shadow.

**Confidence:** HIGH for Tailwind v4 syntax. HIGH for stacking context safety (verified via layout.tsx inspection). MEDIUM for iOS Safari behavior — relies on Tailwind v4's automatic vendor prefix generation, well-documented but not verified against this project's specific PostCSS config.

---

## Recommended Project Structure Changes (v3.0)

```
src/
├── app/
│   ├── globals.css              MODIFY — @theme expansion, ~30 tokens
│   └── (public)/
│       └── layout.tsx           MODIFY — 2 import swaps only
│
└── components/
    └── reader/
        ├── WurzelAppBar.tsx         MODIFY — token updates, same interface
        ├── WurzelNavBar.tsx         KEEP during migration, delete after
        ├── ArchivistNavBar.tsx      NEW — glassmorphic, top-border active
        ├── HeroArticle.tsx          MODIFY — add CTA, token updates
        ├── MascotGreeting.tsx       MODIFY — token updates
        ├── RegionalEditorialCard.tsx MODIFY — token updates only
        ├── ListItem.tsx             MODIFY — remove border-b
        ├── HomepageLayout.tsx       MODIFY — add new section slots
        ├── Footer.tsx               KEEP during migration, delete after
        ├── EditorialFooter.tsx      NEW — dark, multi-column
        ├── WeatherWidget.tsx        NEW — Client Component (prop-fed)
        ├── RegionSelectorCard.tsx   NEW — Client Component
        ├── GrueneWocheSection.tsx   NEW — Server Component
        ├── DropCap.tsx              NEW — Server Component
        └── ArticleSidebar.tsx       NEW — Server Component

src/lib/
    └── content/
        └── weather.ts               NEW — fetchCurrentWeather()
```

---

## Data Flow

### Weather Data Flow

```
(public)/page.tsx  (async Server Component, force-dynamic)
  Promise.all([
    getFeaturedArticle(),
    getPinnedArticles(),
    listArticlesForHomepage(),
    listBezirke(),
    fetchCurrentWeather(47.0707, 15.4395),   ← lib/content/weather.ts
  ])
    ↓
    fetch("https://api.open-meteo.com/v1/forecast?...",
          { next: { revalidate: 1800 } })
    ↓  (30-min cached response from Next.js fetch cache)
    Returns: { temperature, weatherCode, windSpeed, time } | null
    ↓
HomepageLayout (Client Component)
  receives weather prop → passes to WeatherWidget
    ↓
WeatherWidget (Client Component, presentation only)
  renders temperature + WMO icon + condition label
```

### Token Cascade Flow

```
globals.css @theme
  → CSS custom properties on :root
    (--color-ink-800, --color-parchment-100, etc.)
    ↓
  → Tailwind generates utility classes
    (bg-ink-800, text-parchment-100, etc.)
    ↓
  → Components use via className
    (existing: bg-primary, bg-surface unchanged)
    (new: bg-ink-800, bg-parchment-100/85, etc.)
```

### Layout Shell Flow (unchanged structure)

```
(public)/layout.tsx  (async Server Component)
  ├── WurzelAppBar      (Client — localStorage for bezirk label)
  ├── EilmeldungBanner  (conditional)
  ├── <main> children   (page content)
  ├── EditorialFooter   (Server — new)
  ├── ArchivistNavBar   (Client — pathname for active state)
  ├── CookieBanner      (Client)
  └── BezirkModal       (Client)
```

---

## Build Order Implications

Token expansion must happen first — every subsequent component change depends on new tokens being available. The No-Line Rule migration is a trivial change that can happen in the same commit as token expansion.

| Phase | Work | Dependency |
|-------|------|------------|
| 1 | `@theme` expansion in `globals.css` | None — additive, zero breakage |
| 1 | Remove `border-b border-surface` from `ListItem.tsx` | New surface tokens |
| 2 | `ArchivistNavBar.tsx` + `(public)/layout.tsx` swap | Tokens |
| 2 | `EditorialFooter.tsx` + `(public)/layout.tsx` swap | Tokens |
| 3 | `lib/content/weather.ts` + `page.tsx` wiring | None |
| 3 | `WeatherWidget.tsx` + `HomepageLayout.tsx` slot | Weather lib |
| 3 | `RegionSelectorCard.tsx`, `GrueneWocheSection.tsx` | Tokens |
| 3 | `HeroArticle.tsx` CTA + token updates | Tokens |
| 4 | Article detail: `DropCap.tsx`, `ArticleSidebar.tsx` | Tokens |
| 4 | Article detail page token updates | Tokens |
| 5 | `SearchPageLayout.tsx` redesign | Tokens |
| 6 | CMS admin border + token updates | Defer — lowest priority |

---

## Anti-Patterns

### Anti-Pattern 1: Using `--color-*: initial` to Wipe Existing Tokens

**What it looks like:** Clearing the color namespace in `@theme` to start fresh with new names.
**Why it breaks things:** All existing components use `bg-primary`, `text-secondary`, etc. Wiping the namespace removes those utilities immediately across ~25 components.
**Do this instead:** Add new tokens alongside existing ones. Tailwind v4 `@theme` is additive by default.

### Anti-Pattern 2: Client-Side Weather Fetch

**What it looks like:** `useEffect` with `fetch` in a `WeatherWidget` client component.
**Why it's wrong:** Adds flash of empty state on every page load, increases client JavaScript bundle, and bypasses Next.js server-side fetch cache.
**Do this instead:** Fetch weather in `page.tsx` as a server-side `Promise.all` entry with `{ next: { revalidate: 1800 } }`.

### Anti-Pattern 3: Importing WeatherWidget Inside HomepageLayout

**What it looks like:** `import WeatherWidget from './WeatherWidget'` at the top of `HomepageLayout.tsx`.
**Why it breaks things:** `HomepageLayout` is `"use client"`. Server Components cannot be imported inside Client Components in Next.js App Router — build error.
**Do this instead:** Fetch weather data in `page.tsx` (Server Component) and pass it as a typed prop to `HomepageLayout`.

### Anti-Pattern 4: Creating an `/api/weather` Proxy Route

**What it looks like:** A Route Handler at `src/app/api/weather/route.ts` that calls Open-Meteo and proxies the response.
**Why it's wrong:** Open-Meteo is a public API, no CORS restriction, no auth needed. A proxy adds a server roundtrip and two fetch calls per request for no benefit.
**Do this instead:** Call Open-Meteo directly from `lib/content/weather.ts` server-side.

### Anti-Pattern 5: Replacing Both Old and New Components in a Single Phase

**What it looks like:** Deleting `Footer.tsx` and `WurzelNavBar.tsx` at the same time as creating replacements.
**Why it's risky:** If the new component has a bug, there is no rollback reference. The layout.tsx import fails to compile if the new file has an error.
**Do this instead:** Keep old files during migration. Create new file, update `layout.tsx` import to point to new file, verify, then delete old file.

---

## Integration Points

### External Services

| Service | Integration | Cache | Notes |
|---------|-------------|-------|-------|
| Open-Meteo API | `fetch` in `lib/content/weather.ts` | `revalidate: 1800` (30 min) | Free, no key, fair-use 10k req/day. URL: `https://api.open-meteo.com/v1/forecast` |
| Vercel Edge Network | Honors `next.revalidate` on fetch | 30 min TTL | Stale-while-revalidate semantics apply |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `page.tsx` → `HomepageLayout` | Props: articles + bezirke + weatherData | page.tsx is Server Component; HomepageLayout is Client Component |
| `globals.css @theme` → all components | CSS custom properties via Tailwind utilities | Additive — no component changes required for token expansion itself |
| `(public)/layout.tsx` → nav/footer | Direct import | Single import site for each shell component — one change wires entire app |
| `bundesland.config.ts` → weather | Lat/lon coordinates | Currently hardcoded; optionally add `weather: { lat, lon }` to config type for portability |

---

## Scaling Considerations

v3.0 is a visual overhaul milestone. No scaling implications introduced.

Open-Meteo API: with `revalidate: 1800`, API call rate is ~48 req/day regardless of reader traffic. Comfortable within the 10,000 req/day fair-use limit even at significant scale.

---

## Sources

- [Tailwind CSS v4 Theme Variables — Official Docs](https://tailwindcss.com/docs/theme) — additive @theme expansion, override behavior (HIGH confidence, verified 2026-03-30)
- [Tailwind CSS backdrop-filter-blur](https://tailwindcss.com/docs/backdrop-filter-blur) — glassmorphism utility classes (HIGH confidence)
- [Next.js fetch function — next.revalidate option](https://nextjs.org/docs/app/api-reference/functions/fetch) — server-side caching (HIGH confidence)
- [Open-Meteo API](https://open-meteo.com/) — endpoint format, parameters, fair-use limits (HIGH confidence via multiple sources)
- Codebase direct inspection — `src/app/globals.css`, `src/app/(public)/layout.tsx`, all `src/components/reader/` files, `bundesland.config.ts`, `src/app/(public)/page.tsx` (HIGH confidence — primary source)

---

*Architecture research for: Wurzelwelt v3.0 "The Modern Archivist" design system integration*
*Researched: 2026-03-30*
