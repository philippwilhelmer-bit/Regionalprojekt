# Phase 35: Homepage Feature Components - Research

**Researched:** 2026-04-01
**Domain:** Next.js 15 Server Components, Open-Meteo API, Prisma schema migration, Tailwind v4 tonal styling
**Confidence:** HIGH

## Summary

Phase 35 adds five distinct homepage features to an existing Next.js 15 / React 19 / Tailwind v4 codebase. The project uses a well-established Archivist design token system (Phase 33) and shell components (Phase 34). All six requirements touch the existing `HomepageLayout.tsx` (client component) and `HeroArticle.tsx`, with two requiring database migration (HOME-05: `theme` field on `Article`) and one requiring an external API integration (HOME-03: Open-Meteo weather).

The most complex requirements are HOME-03 (weather widget with server-side caching) and HOME-05 (Prisma migration + `listArticlesGrüneWoche` query + CMS field). HOME-01, HOME-02, HOME-04, and HOME-06 are primarily UI-only refactors of existing components.

**Primary recommendation:** Sequence work as database migration first (HOME-05), then weather API route (HOME-03), then all UI changes in HomepageLayout and its child components.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HOME-01 | Topmeldung hero includes "VOLLSTÄNDIGEN ARTIKEL LESEN" CTA button overlaid on gradient | HeroArticle.tsx already has gradient overlay div — add a `<Link>` button child in the content zone |
| HOME-02 | MascotGreeting restyled as "Wurzel sagt..." tonal box (not speech bubble) | MascotGreeting.tsx speech bubble + avatar layout replaced with tonal box using Archivist tokens |
| HOME-03 | Weather widget: current temp + conditions for selected Bezirk via Open-Meteo, 30-min server-side cache | Requires: coordinate map in bundesland.config.ts, new API route `/api/reader/weather`, `unstable_cache` with revalidate:1800, client WeatherWidget that reads localStorage for bezirk slug |
| HOME-04 | "Frag den Wurzelmann" dark green card linking to region selector | New static card component using `bg-ink` or `bg-aged-wood` dark green; links to existing BezirkModal trigger or a `/mein-bezirk` route |
| HOME-05 | "Das Grüne der Woche" section for nature/environment-tagged articles; Article.theme field + CMS assignment | Requires Prisma migration (add nullable `theme String?` to Article), new DAL function `listGrueneWocheArticles`, new homepage section component |
| HOME-06 | Homepage sections use tonal background alternation per Archivist palette | Audit HomepageLayout.tsx — replace any `bg-surface`/`bg-parchment` pairs that deviate from the Archivist palette token set |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.14 | App Router, Server Components, API Routes | Project baseline — `force-dynamic` already used on homepage |
| React | 19.2.4 | UI components | Project baseline |
| Tailwind v4 | (via `@import "tailwindcss"`) | Utility classes, @theme tokens | Project baseline — all tokens in `globals.css` |
| Prisma | 6.19.2 | Database ORM + migrations | Project baseline — all schema changes via migrations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Open-Meteo | free API (no key) | Current weather data | HOME-03 weather widget |
| `unstable_cache` (next/cache) | built-in | Server-side result caching with revalidate | HOME-03: cache weather fetch for 1800s |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `unstable_cache` | Route Segment `revalidate` export | Route segment revalidate affects entire route — `unstable_cache` gives function-level control, preferred for weather-only caching |
| `unstable_cache` | `'use cache'` directive (experimental) | `dynamicIO` is not enabled in `next.config.ts` — don't use experimental feature |

**Installation:** No new packages required. Open-Meteo is a free REST API with no SDK needed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (public)/page.tsx          # existing — add weather data fetch
│   └── api/reader/weather/route.ts # NEW — weather API route with unstable_cache
├── components/reader/
│   ├── HeroArticle.tsx             # modify — add CTA button (HOME-01)
│   ├── MascotGreeting.tsx          # modify — restyle as tonal box (HOME-02)
│   ├── WeatherWidget.tsx           # NEW client component (HOME-03)
│   ├── FragDenWurzelmannCard.tsx   # NEW static card (HOME-04)
│   ├── GrueneWocheSection.tsx      # NEW themed section (HOME-05)
│   └── HomepageLayout.tsx          # modify — integrate new sections, fix bg alternation (HOME-06)
├── lib/content/
│   └── articles.ts                 # add listGrueneWocheArticles() (HOME-05)
└── prisma/
    ├── schema.prisma               # add theme field to Article (HOME-05)
    └── migrations/                 # new migration (HOME-05)
```

### Pattern 1: CTA Button Overlay in HeroArticle (HOME-01)
**What:** Add a styled `<Link>` button inside the existing content zone, sitting above the gradient overlay.
**When to use:** The HeroArticle is already a `<Link>` wrapper — the CTA button needs `e.stopPropagation()` is NOT needed since the outer wrapper and the inner button navigate to the same href. The simplest approach is a styled `<span>` (not `<button>`) inside the Link to avoid nested interactive elements.

```tsx
// Inside HeroArticle.tsx content zone — after the excerpt paragraph
<span className="mt-4 inline-block self-start px-4 py-2 font-label font-semibold uppercase text-xs tracking-wider text-parchment bg-ink/70 border border-parchment/30 rounded-xs">
  VOLLSTÄNDIGEN ARTIKEL LESEN
</span>
```

**Accessibility note:** The outer `<Link>` already makes the whole card clickable and has accessible text from the h1 headline. The CTA span is decorative — it does not need its own role.

### Pattern 2: MascotGreeting Tonal Box (HOME-02)
**What:** Remove the speech-bubble triangle, remove the avatar image, replace with a flat tonal box using Archivist surface tokens.
**When to use:** "Tonal box" means a contained surface using `bg-surface` or `bg-parchment-dim` with `font-headline` text and an editorial label header, no rounded speech-bubble tail, no decorative triangle.

```tsx
// MascotGreeting.tsx — new structure
<div className="px-[var(--spacing-gutter)] py-[var(--spacing-section)]">
  <div className="bg-surface rounded-xs px-4 py-3">
    <p className="font-label uppercase text-xs font-semibold text-ink-muted mb-1 tracking-wider">
      Wurzel sagt …
    </p>
    <p className="font-headline text-base font-semibold text-ink leading-snug">
      {greeting}!
    </p>
    <p className="font-label text-sm text-ink/60 mt-0.5">{quote}</p>
  </div>
</div>
```

### Pattern 3: Weather Widget with Server-Side Cache (HOME-03)
**What:** A client WeatherWidget reads `bezirk_selection` from localStorage, derives the selected Bezirk slug, calls `/api/reader/weather?bezirk=<slug>`, and displays temperature + condition icon. The API route calls Open-Meteo and caches with `unstable_cache(fn, key, { revalidate: 1800 })`.

**Open-Meteo endpoint:**
```
GET https://api.open-meteo.com/v1/forecast
  ?latitude=<lat>&longitude=<lon>
  &current=temperature_2m,weather_code
  &timezone=Europe%2FVienna
```

**Response shape:**
```json
{
  "current": {
    "temperature_2m": 12.4,
    "weather_code": 3
  }
}
```

**WMO weather codes (key subset):**
| Code | Condition |
|------|-----------|
| 0 | Klarer Himmel |
| 1-3 | Teilweise bewölkt / Bedeckt |
| 45, 48 | Nebel |
| 51-55 | Nieselregen |
| 61-65 | Regen |
| 71-75 | Schneefall |
| 80-82 | Regenschauer |
| 95, 96, 99 | Gewitter |

**API Route pattern (Next.js 15, unstable_cache):**
```typescript
// src/app/api/reader/weather/route.ts
import { unstable_cache } from 'next/cache'
import { NextRequest } from 'next/server'
import bundeslandConfig from '@/../bundesland.config'

const fetchWeather = unstable_cache(
  async (lat: number, lon: number) => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=Europe%2FVienna`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Open-Meteo fetch failed')
    return res.json() as Promise<OpenMeteoResponse>
  },
  ['weather'],
  { revalidate: 1800 }
)

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('bezirk')
  const coords = BEZIRK_COORDS[slug ?? '']
  if (!coords) return Response.json({ error: 'unknown bezirk' }, { status: 404 })
  const data = await fetchWeather(coords.lat, coords.lon)
  return Response.json(data.current)
}
```

**Coordinate map:** Must be added to `bundesland.config.ts` as a new exported const (NOT to the `BundeslandConfig` type — keeps the type clean). All 13 Steiermark Bezirke need lat/lon. See Anti-Patterns for the key pitfall here.

**Client WeatherWidget:**
```tsx
"use client"
// reads localStorage('bezirk_selection'), picks first slug,
// fetches /api/reader/weather?bezirk=<slug> on mount,
// renders temperature + WMO code label
// Shows nothing (null) when: not mounted, no bezirk selected, fetch fails
```

### Pattern 4: Frag den Wurzelmann Card (HOME-04)
**What:** A static dark-green card that prompts the reader to configure their Bezirk. Links to the BezirkModal (via the `openBezirkModal` custom event) or to a dedicated `/mein-bezirk` route if one exists. Since no `/mein-bezirk` page exists, the card should fire the `window.dispatchEvent(new Event('openBezirkModal'))` pattern already established in the codebase.

**Design:** `bg-ink` (Archivist's darkest surface = #071806) with `text-parchment`. The phrase "Frag den Wurzelmann" uses `font-headline`. The card is a Client Component (needs onClick to dispatch event).

```tsx
"use client"
export function FragDenWurzelmannCard() {
  return (
    <div className="bg-ink px-[var(--spacing-gutter)] py-[var(--spacing-section)]">
      <button
        onClick={() => window.dispatchEvent(new Event('openBezirkModal'))}
        className="w-full text-left"
      >
        <p className="font-label uppercase text-xs font-semibold text-parchment/60 mb-1 tracking-wider">
          Dein Bezirk
        </p>
        <p className="font-headline text-xl font-semibold text-parchment leading-tight mb-2">
          Frag den Wurzelmann
        </p>
        <p className="font-label text-sm text-parchment/70">
          Wähle deinen Bezirk für hyperlokal gefilterte Nachrichten.
        </p>
      </button>
    </div>
  )
}
```

### Pattern 5: Das Grüne der Woche Section (HOME-05)
**What:** A themed section surfacing articles with `theme = 'gruene_woche'`. Requires:
1. Prisma migration to add `theme String?` field to Article
2. New DAL function `listGrueneWocheArticles()`
3. New homepage section component `GrueneWocheSection`
4. CMS field for admin to assign the theme (CMS-02 per requirements — also Phase 35)
5. `HomePage` Server Component passes themed articles to `HomepageLayout`

**Migration:** Single nullable String field. No enum needed — nullable string allows future themes.

```prisma
model Article {
  // ... existing fields ...
  theme  String?   // e.g. 'gruene_woche' — nullable; null means no theme
}
```

**DAL function:**
```typescript
export async function listGrueneWocheArticles(options?: { limit?: number }): Promise<ArticleWithBezirke[]>
// WHERE status = 'PUBLISHED' AND theme = 'gruene_woche'
// ORDER BY publishedAt DESC
// LIMIT 10 (default)
```

**Section visibility:** Only rendered when `grueneWocheArticles.length > 0`. The page.tsx Server Component passes it as a prop.

### Pattern 6: Tonal Background Alternation (HOME-06)
**What:** Audit the HomepageLayout section wrappers. The Archivist palette for alternation is `bg-parchment` / `bg-surface` (`bg-parchment-dim`). Current code already uses this pattern in some places but has inconsistencies (some sections use hardcoded values or old tokens).

**Correct alternation sequence:**
1. Hero zone — no bg (image fills)
2. MascotGreeting — `bg-surface`
3. TopMeldungenRow — `bg-parchment`
4. WeatherWidget / FragDenWurzelmann — `bg-ink` (accent dark)
5. Editorial sections — alternating `bg-parchment` / `bg-surface`
6. GrueneWoche — `bg-surface` (or `bg-parchment-dim`)

### Anti-Patterns to Avoid
- **Nested `<Link>` / `<button>` in HeroArticle:** Don't wrap the CTA in a `<Link>` — the entire card is already a link. Use `<span>` styled as a button for visual affordance only.
- **Geolocation API for weather:** Explicitly out of scope per REQUIREMENTS.md — use localStorage `bezirk_selection` only.
- **Separate weather page route:** Weather is homepage-only; no standalone `/wetter` page needed.
- **BezirkItem coordinates in type definition:** Do not add `lat`/`lon` to the `BezirkItem` type — it's a shared UI type used everywhere. Keep coordinates in a separate `BEZIRK_COORDS` const in `bundesland.config.ts`.
- **Fetching weather in HomepageLayout (client component):** HomepageLayout is a client component. All data fetching happens server-side in the API route. The WeatherWidget client component calls the API route, not Open-Meteo directly.
- **Blocking homepage SSR on weather:** The homepage `page.tsx` must NOT await weather data — weather is fetched client-side after mount using the user's localStorage bezirk selection. Server doesn't know the user's bezirk.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Weather API caching | Custom in-memory cache, Redis | `unstable_cache` from `next/cache` with `revalidate: 1800` | Built-in Next.js ISR-style caching; no infrastructure needed |
| WMO weather code labels | Custom lookup logic | Static `const WMO_LABELS: Record<number, string>` map | Already fully documented; 30 codes needed |
| Prisma migration | Hand-editing migration SQL | `npx prisma migrate dev --name add_article_theme` | Prisma generates safe ALTER TABLE; handles type generation |

**Key insight:** The weather widget is intentionally simple — temperature + condition label. Don't build an animated weather dashboard; this is an editorial news site.

---

## Common Pitfalls

### Pitfall 1: unstable_cache key collision
**What goes wrong:** Two different Bezirke get the same cache key, returning wrong weather data.
**Why it happens:** `unstable_cache(fn, keyParts, options)` — `keyParts` is a fixed string array set at call site, NOT at invocation time. The cache key must include the invocation arguments.
**How to avoid:** Pass `[slug]` as `keyParts` when constructing the cached function — OR better, wrap in a per-call key: `unstable_cache(async () => fetchWeather(lat, lon), ['weather', slug], { revalidate: 1800 })`.
**Warning signs:** All Bezirke showing the same temperature.

### Pitfall 2: Prisma client out of sync after migration
**What goes wrong:** TypeScript still doesn't know about `article.theme` after running migration.
**Why it happens:** `prisma migrate dev` runs migration but doesn't auto-regenerate the client in all environments.
**How to avoid:** Run `npx prisma generate` after migration. Verify `@prisma/client` includes `theme` in generated types before writing DAL code.

### Pitfall 3: HomepageLayout hydraton mismatch with weather
**What goes wrong:** Server renders one state; client renders different state when localStorage is read.
**Why it happens:** The bezirk selection lives in localStorage — unavailable during SSR.
**How to avoid:** WeatherWidget must gate all localStorage reads behind a `mounted` state (same pattern as HomepageLayout already uses for `selectedSlugs`). Render `null` until mounted.

### Pitfall 4: BezirkModal openBezirkModal event not reaching new component
**What goes wrong:** FragDenWurzelmannCard fires the event but BezirkModal doesn't open.
**Why it happens:** BezirkModal listens on `window` via a useEffect listener — it must be mounted in the component tree. Verify BezirkModal is rendered in the layout, not conditionally.
**How to avoid:** Check Header/layout renders BezirkModal unconditionally. The event pattern is already established and works — don't change it.

### Pitfall 5: `unstable_cache` with revalidate:0
**What goes wrong:** Build fails with invariant error.
**Why it happens:** Next.js 15 explicitly throws if `revalidate: 0` is passed to `unstable_cache`.
**How to avoid:** Use `revalidate: 1800` (30 minutes). Never pass 0 to `unstable_cache`.

### Pitfall 6: theme field name conflicts
**What goes wrong:** Prisma enum or field named `theme` conflicts with existing Tailwind `@theme` or other conventions.
**Why it happens:** `theme` is a common keyword.
**How to avoid:** The Prisma `Article.theme` field is a String? (not an enum); it sits in the database schema not in CSS. No conflict. The value `'gruene_woche'` uses an underscore to avoid German special characters.

---

## Code Examples

### Open-Meteo fetch (verified from official docs)
```typescript
// Source: https://open-meteo.com/en/docs
const url = 'https://api.open-meteo.com/v1/forecast'
  + '?latitude=47.07&longitude=15.44'
  + '&current=temperature_2m,weather_code'
  + '&timezone=Europe%2FVienna'

// Response:
// { "current": { "temperature_2m": 12.4, "weather_code": 3 } }
```

### unstable_cache pattern (Next.js 15)
```typescript
// Source: next/cache (verified from node_modules/next/dist/server/web/spec-extension/unstable-cache.js)
import { unstable_cache } from 'next/cache'

const getCachedWeather = unstable_cache(
  async (lat: number, lon: number) => {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=Europe%2FVienna`)
    return res.json()
  },
  ['open-meteo-weather'],   // base key parts — invocation args are appended automatically
  { revalidate: 1800 }      // 30 minutes
)
```

### Prisma migration for theme field
```prisma
// prisma/schema.prisma — add to Article model
theme  String?  // 'gruene_woche' or null
```
```bash
npx prisma migrate dev --name add_article_theme
npx prisma generate
```

### Archivist tonal alternation tokens
```
bg-parchment      = #FCF9EF  (warm paper — primary background)
bg-surface        = parchment-dim = #F6F4EA  (slightly darker — tonal shift)
bg-surface-elevated = parchment-bright = #FFFFFF  (cards on surface)
bg-ink            = #071806  (darkest — accent surfaces like FragDenWurzelmann)
```

### WMO code label map (subset)
```typescript
const WMO_LABELS: Record<number, string> = {
  0: 'Klarer Himmel', 1: 'Überwiegend klar', 2: 'Teilweise bewölkt', 3: 'Bedeckt',
  45: 'Nebel', 48: 'Reifnebel',
  51: 'Leichter Nieselregen', 53: 'Nieselregen', 55: 'Starker Nieselregen',
  61: 'Leichter Regen', 63: 'Regen', 65: 'Starker Regen',
  71: 'Leichter Schneefall', 73: 'Schneefall', 75: 'Starker Schneefall',
  80: 'Regenschauer', 81: 'Starke Regenschauer', 82: 'Heftige Regenschauer',
  95: 'Gewitter', 96: 'Gewitter mit Hagel', 99: 'Gewitter mit starkem Hagel',
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Speech bubble + avatar image | Tonal editorial box | Phase 35 | Simpler markup, no image asset dependency |
| Warm cream / slightly darker cream bg alternation | `bg-parchment` / `bg-surface` Archivist tokens | Phase 33 token foundation | Consistent token use |
| fetch() with `{ next: { revalidate: N } }` | `unstable_cache` wrapper | Next.js 13.4+ | More predictable caching for non-fetch async functions |

**Deprecated/outdated:**
- Speech bubble tail (triangular border trick in MascotGreeting): replaced by flat tonal surface
- Direct `localStorage` weather reads: weather must go through server-side API route with caching

---

## Open Questions

1. **Bezirk coordinate data**
   - What we know: `bundesland.config.ts` has 13 Bezirke with slugs and names but NO lat/lon
   - What's unclear: Exact representative coordinates for each Bezirk (city center or centroid?)
   - Recommendation: Use capital city / main town coordinates for each Bezirk. Hardcode as a const `BEZIRK_COORDS` in `bundesland.config.ts`. Liezen: 47.58/14.13, Graz: 47.07/15.44, etc. The planner should include a subtask to compile all 13 coordinate pairs.

2. **FragDenWurzelmann card placement when bezirk already selected**
   - What we know: The card links to the Bezirk selector. If user already has a Bezirk, the card is less useful.
   - What's unclear: Should the card hide when `bezirk_selection` is set?
   - Recommendation: Always show it (KISS). User can ignore it. Adds visual variety.

3. **CMS-02 scope in this phase**
   - What we know: REQUIREMENTS.md lists CMS-02 ("Admin can assign 'Grüne der Woche' theme tag") under Phase 37 CMS work, but HOME-05 requires the `theme` field and CMS assignment in Phase 35.
   - What's unclear: Is the CMS admin field for `theme` in Phase 35 or 37?
   - Recommendation: Phase 35 MUST include the Prisma migration and at minimum a CMS field for `theme` on the article edit page — otherwise "Das Grüne der Woche" can never be populated. The planner should include a CMS edit-page task in Phase 35 for this field, noting CMS-02 requirement.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (config: `vitest.config.ts`) |
| Config file | `vitest.config.ts` at project root |
| Quick run command | `npx vitest run src/lib/content/articles.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HOME-01 | HeroArticle renders CTA button | unit (component smoke) | manual-only — no component test infra | N/A |
| HOME-02 | MascotGreeting renders tonal box without speech bubble tail | unit (component smoke) | manual-only — no component test infra | N/A |
| HOME-03 | `/api/reader/weather` returns temperature + weather_code for valid bezirk slug | integration | manual-only (requires network + Next.js server) | N/A |
| HOME-04 | FragDenWurzelmannCard renders and dispatches openBezirkModal | unit (component smoke) | manual-only — no component test infra | N/A |
| HOME-05 | `listGrueneWocheArticles()` returns only theme='gruene_woche' published articles | unit | `npx vitest run src/lib/content/articles.test.ts` | ❌ Wave 0 |
| HOME-06 | HomepageLayout section backgrounds use Archivist tokens | visual/manual | manual inspection | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/content/articles.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/content/articles.test.ts` — add test for `listGrueneWocheArticles()` covering: returns only PUBLISHED+theme='gruene_woche', returns empty array when none exist, ordering by publishedAt DESC

*(All other HOME requirements are UI-only and covered by manual visual inspection — no unit test infrastructure for component rendering exists in this project.)*

---

## Sources

### Primary (HIGH confidence)
- `node_modules/next/dist/server/web/spec-extension/unstable-cache.js` — `unstable_cache` API and revalidate constraints
- `node_modules/next/dist/server/lib/patch-fetch.js` — Next.js fetch caching mechanics
- `prisma/schema.prisma` — existing Article model structure
- `bundesland.config.ts` — existing Bezirk list (13 slugs, no coordinates)
- `src/app/globals.css` — confirmed Archivist palette token names and values
- `src/components/reader/HomepageLayout.tsx` — existing layout structure and background patterns
- `src/components/reader/HeroArticle.tsx` — existing hero markup
- `src/components/reader/MascotGreeting.tsx` — existing speech bubble markup
- `src/components/reader/BezirkModal.tsx` — openBezirkModal event pattern
- `src/lib/content/articles.ts` — existing DAL function patterns

### Secondary (MEDIUM confidence)
- Open-Meteo official docs (https://open-meteo.com/en/docs) — endpoint structure, current weather variables, WMO code descriptions

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — confirmed from node_modules and project files
- Architecture: HIGH — based on existing codebase patterns
- Open-Meteo API: MEDIUM — verified from official docs, but exact response field names should be confirmed with a live test call during Wave 0
- Pitfalls: HIGH — derived from existing code patterns and Next.js source

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (Open-Meteo API is stable; Next.js 15.x unlikely to change `unstable_cache` interface)
