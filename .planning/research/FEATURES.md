# Feature Research

**Domain:** High-end editorial regional news — "The Modern Archivist" design system overhaul (v3.0)
**Researched:** 2026-03-30
**Confidence:** MEDIUM — patterns verified against editorial/news design literature, Open-Meteo official docs, MDN/caniuse for CSS features, and direct competitor observation. "Das Grüne der Woche" is a custom Wurzelwelt concept with no direct published analogues.

---

## Scope Note

This research covers ONLY new features for v3.0 "The Modern Archivist." The following already exist and are explicitly out of scope: homepage hero/Topmeldung base component, bottom nav base component, WurzelAppBar, MascotGreeting, Mein Bezirk section, article detail base layout, search/discovery page base, CMS admin base, Bezirk list, localStorage preference system.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features the "Modern Archivist" redesign must deliver to feel complete. Missing any of these makes the overhaul feel unfinished relative to high-end editorial peers.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Drop cap on first article paragraph | Editorial/magazine standard; absence signals "blog not publication." Der Standard and Kleine Zeitung both omit this — immediate differentiator AND table stakes for "Archivist" brand claim | LOW | `::first-letter` pseudo-element with float fallback. Do NOT use `initial-letter` CSS property — Firefox unsupported as of 2026. Apply only when article body exceeds 300 chars. |
| Blockquote / pull quote styling | Every premium editorial layout uses pull quotes to break long-form text. Reader expectation from any print-heritage publication | LOW | Pure CSS. Left border accent in Aged Wood token + oversized quotation glyph in Newsreader Italic. No JS needed. |
| Article sidebar metadata (desktop) | Sidebar metadata placement is universal in print-heritage digital sites: date, author/source, Bezirk tag, read time. Inline placement feels web-1.0 | MEDIUM | Desktop: sticky right-column 240px. Mobile: collapses to horizontal metadata strip above article body. CSS Grid restructure of existing article detail layout. Data already exists — layout restructure only. |
| Dark editorial footer with navigation columns | All premium news sites use dark footers as visual terminus. Multi-column nav links at bottom of page are a user wayfinding expectation | LOW | 4-column grid: Bezirke / Themen / Über uns / Rechtliches. Dark Ink background, Parchment text. Sub-footer: AI disclosure + copyright. |
| Glassmorphic bottom nav | Frosted/translucent nav bar is now mainstream on mobile (iOS, Android, major news apps). Opaque nav against editorial imagery feels dated | LOW | `backdrop-filter: blur(10px)` + `-webkit-` prefix. Single blur element per viewport (performance constraint). Active state: 2px top-border in Ink color, not pill. |
| Topmeldung with CTA button | Hero sections without an explicit call to action are display items, not editorial statements. Users expect a "read more" affordance on the lead story | LOW | Button variant added to existing Topmeldung component. Archivist typography treatment. |
| "Frag den Wurzelmann" region selector card | Mein Bezirk is a core platform feature. Users who haven't selected a Bezirk need an inviting, prominent on-ramp. This card IS that on-ramp | MEDIUM | Shows current Bezirk if set; otherwise displays selectable Bezirk list. Reads/writes existing localStorage key. Dependency: existing Bezirk list from bundesland.config.ts. |

### Differentiators (Competitive Advantage)

Features that elevate Wurzelwelt above Der Standard, Kleine Zeitung, and generic Austrian regional news. These align directly with "Modern Mountain Folklore → Modern Archivist" identity evolution.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Weather widget tied to user's Bezirk | Der Standard shows Vienna weather. Kleine Zeitung shows Graz. Wurzelwelt shows YOUR district — hyperlocal relevance no competitor delivers | MEDIUM | Open-Meteo API (free, no key, Austria covered by ECMWF 1-2km model). Reads Mein Bezirk preference → looks up lat/lon from config. 15-min client-side cache. |
| "Das Grüne der Woche" themed section | Curated weekly sustainability/environment section gives Wurzelwelt an editorial identity beyond "AI aggregator." Creates a branded recurring content slot — reason to return weekly | HIGH | Requires new CMS tagging field (schema migration). Weekly editorial slot concept. Distinct visual: muted green tonal skin, leaf/plant iconography, Newsreader serif headline. No competitor analogue — original differentiator. |
| Color system overhaul: Ink/Parchment/Slate/Aged Wood | The existing forest-green/terracotta palette reads "folklore craft." Ink/Parchment reads "literary heritage." This token swap is the single biggest visual signal of the brand evolution | MEDIUM | MD3-style design tokens. Touches every component. High blast radius but entirely within Tailwind @theme — no logic changes. |
| Search/discovery visual redesign | Existing search is functional but palette-generic. Archivist treatment (ink-on-parchment, tonal card grid, refined filter chips) makes discovery feel curated rather than utilitarian | MEDIUM | Data model and client-side filtering logic unchanged. Visual-only redesign of result cards, filter chips, category grid. |
| CMS admin visual refresh | Editors use the brand daily. An Archivist-aligned admin signals craft and intentionality. Most competing platform CMS tools use generic Bootstrap blue | MEDIUM | Color token swap + typography update in admin. No functional changes. Lowest regression risk (Server Components + FormData). |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Browser Geolocation API for weather | "Auto-detect my location" seems frictionless | Requires permission prompt (EU/GDPR-sensitive). Breaks SSR. IP geolocation is inaccurate to Bezirk level in rural Steiermark. Adds HTTPS complication in dev. | Use Mein Bezirk preference (already exists) as weather location source. Fallback to Graz. Zero permission prompt. |
| Animated glassmorphism (blur transitions, pill morphing) | Visual polish | `backdrop-filter` animation is GPU-expensive; causes jank on mid-range Android. PROJECT.md explicitly defers animation/motion scope past v2.0. | Static blur only. Active state via top-border change, not animated transition. |
| SVG choropleth map for region selector | Rich cartographic visual | Styrian Bezirk boundary polygons require licensed geodata or significant manual authoring. Out of proportion to UX value for a homepage card. | Stylized decorative map image (static PNG/illustration) OR a well-styled searchable Bezirk list. No interactive SVG. |
| Real-time weather polling (sub-5-minute) | "Always current" expectation | Open-Meteo weather models update hourly at source. Polling more frequently returns identical data and wastes API budget even on free tier. | 15-min TTL cache using sessionStorage. Stale-while-revalidate pattern. |
| "Das Grüne der Woche" as separate page/route | Editorial section deserves its own URL | Low article volume (weekly cadence). Orphan page risk if no articles are tagged this week. Routing overhead for a section that shares article data model. | Homepage section widget with "mehr dazu" link to filtered search results by theme tag. No separate route. |
| Article sidebar on mobile | Desktop editorial standard | 375px viewport cannot accommodate two-column layout without unreadable text or uselessly narrow sidebar. | Progressive enhancement only: sidebar on tablet/desktop (≥768px), metadata strip above article body on mobile. |
| Multiple backdrop-filter blur elements per viewport | Premium glass effect everywhere | Each blur element triggers separate GPU compositing layer. 3+ blur elements causes visible frame drops on mid-range phones. | One blur element per viewport at any time. Bottom nav gets blur; AppBar remains solid Ink color. |

---

## Feature Dependencies

```
[Weather Widget]
    └──reads──> [Mein Bezirk (localStorage)] (existing)
    └──requires──> [Bezirk lat/lon coordinates in bundesland.config.ts] (NEW DATA — simple addition)
    └──calls──> [Open-Meteo API /v1/forecast] (external, no key needed)
    └──caches──> [sessionStorage {data, fetchedAt}] (15-min TTL)

["Frag den Wurzelmann" Region Selector Card]
    └──reads/writes──> [Mein Bezirk (localStorage)] (existing)
    └──reads──> [Bezirk list from bundesland.config.ts] (existing)
    └──enhances──> [Weather Widget] (setting Bezirk updates weather location reactively)
    └──shares-hook──> [useMeinBezirk() or similar] (both components read same localStorage key)

["Das Grüne der Woche" Section]
    └──requires──> [theme tag on Article model] (NEW SCHEMA — migration required)
    └──reads──> [Article data via Prisma] (existing)
    └──enhances──> [Search/Discovery page] (theme tag becomes filterable in search)
    └──requires──> [CMS article creation/edit UI to support theme tag] (part of CMS admin refresh)

[Article Sidebar Metadata]
    └──reads──> [Existing article metadata: date, Bezirk, source, body word count] (existing)
    └──modifies-layout──> [Existing article detail page] (CSS Grid restructure)
    └──conflicts-on-mobile──> [Single-column mobile layout] (resolves to metadata strip)

[Drop Cap + Blockquote Styling]
    └──applies-to──> [Article body renderer] (existing)
    └──no-data-dependencies──> (pure CSS — no schema or API changes)

[Glassmorphic Bottom Nav]
    └──modifies-style──> [Existing WurzelNavBar component] (existing)
    └──conflicts-performance──> [Any other backdrop-filter element] (only one blur per viewport)
    └──requires──> [New Archivist color tokens (Parchment rgba)] (part of color overhaul)

[Color Token Overhaul]
    └──is-foundation-for──> [ALL other v3.0 visual features] (do this first)
    └──modifies──> [Tailwind @theme in globals.css] (existing design system file)

[Dark Editorial Footer]
    └──links-to──> [Impressum/Datenschutz pages] (existing)
    └──links-to──> [Bezirke list] (existing config)
    └──requires──> [Ink/Parchment tokens] (part of color overhaul)

[Topmeldung CTA Button]
    └──modifies──> [Existing Topmeldung component] (existing)
    └──requires──> [Archivist button variant] (part of color overhaul)

[Search Page Redesign]
    └──modifies-only-visual──> [Existing search page] (data + filtering logic unchanged)
    └──requires──> [Archivist tokens] (part of color overhaul)

[CMS Admin Refresh]
    └──modifies-only-visual──> [Existing CMS admin pages] (logic unchanged)
    └──requires──> [Archivist tokens] (part of color overhaul)
    └──should-add──> [Theme tag field to article create/edit] (for "Das Grüne der Woche")
```

### Dependency Notes

- **Color token overhaul must be Phase 1.** Every other v3.0 feature depends on the Ink/Parchment/Slate/Aged Wood token system. Building the weather widget or region selector card before tokens exist means double-work.
- **"Das Grüne der Woche" requires a schema migration.** A `theme` field (or reserved tag value like `gruen-der-woche`) must be added to the Article model before the homepage section can render anything meaningful. The CMS admin refresh should include this tagging UI. Plan the migration before the section component.
- **Weather widget requires Bezirk coordinate data.** Each of the 13 Bezirke needs `weatherCoords: { lat: number; lon: number }` added to their entries in `bundesland.config.ts`. This is a one-time data task, not a schema migration.
- **Region selector card and weather widget share Mein Bezirk state.** Both components read the same localStorage key. Coordinate via a shared `useMeinBezirk()` hook or React context to ensure the weather widget re-renders when the user selects a Bezirk in the card.
- **Glassmorphic nav must be the only blur element.** Do not add `backdrop-filter` to WurzelAppBar or any other persistent element. AppBar: solid Ink color. Nav: frosted Parchment. One blur per viewport.

---

## MVP Definition

### Launch With (v3.0)

All items below constitute the "Modern Archivist" milestone. All are required for the brand evolution to read as intentional.

- [ ] Complete color token overhaul (Ink/Parchment/Slate/Aged Wood) — foundation for everything else
- [ ] Glassmorphic bottom nav with top-border active state
- [ ] Drop cap + blockquote/pull quote styling on article detail
- [ ] Article sidebar metadata (desktop sticky / mobile strip)
- [ ] Topmeldung with explicit CTA button
- [ ] "Frag den Wurzelmann" region selector card (homepage)
- [ ] Weather widget: Bezirk-aware, Open-Meteo, 15-min cache, current conditions
- [ ] "Das Grüne der Woche" themed section (homepage widget + CMS tag support)
- [ ] Dark editorial footer with 4-column navigation
- [ ] Search/discovery page visual redesign
- [ ] CMS admin visual refresh (including theme tag field)

### Add After Validation (v3.x)

- [ ] `initial-letter` CSS drop cap — when Firefox ships support (use `@supports` progressive enhancement wrapper; currently production-safe only in Chrome/Safari)
- [ ] Weather 5-day forecast expansion — currently scoped to current conditions card; forecast strip is a natural extension
- [ ] Bezirk weather coordinates refined by district centroid precision — currently approximate

### Future Consideration (v4+)

- [ ] Animated page transitions — explicitly deferred in PROJECT.md
- [ ] SVG choropleth Bezirk map for region selector — requires geodata licensing
- [ ] Central Wurzelmann FAB in bottom nav — explicitly deferred in PROJECT.md

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Color token overhaul | HIGH (visual foundation) | MEDIUM | P1 — Phase 1 |
| Weather widget (Bezirk-aware) | HIGH | MEDIUM | P1 |
| "Frag den Wurzelmann" region selector | HIGH | MEDIUM | P1 |
| "Das Grüne der Woche" section | HIGH | HIGH | P1 |
| Article sidebar metadata | HIGH | MEDIUM | P1 |
| Drop cap + blockquote | MEDIUM | LOW | P1 |
| Topmeldung CTA | MEDIUM | LOW | P1 |
| Glassmorphic bottom nav | MEDIUM | LOW | P1 |
| Dark editorial footer | MEDIUM | LOW | P1 |
| Search page visual redesign | MEDIUM | MEDIUM | P2 |
| CMS admin visual refresh | LOW | MEDIUM | P2 |

**Priority key:**
- P1: Required for "Modern Archivist" milestone to be coherent
- P2: High quality addition within milestone, schedule permitting
- P3: Nice to have, defer to next milestone

---

## Competitor Feature Analysis

| Feature | Der Standard | Kleine Zeitung (Steiermark) | Our Approach |
|---------|--------------|----------------------------|--------------|
| Weather widget | Inline top-bar, Vienna-centric | Prominent regional weather block (Graz) | Per-Bezirk via Mein Bezirk preference — hyperlocal, no competitor matches this |
| Drop caps | None | None | CSS float drop cap — editorial differentiator, zero competition |
| Region personalization | No (national) | Section nav by Bezirk | Homepage card — interactive, localStorage-persistent, visually branded |
| Themed weekly section | Weekend supplements | "Woche im Bild" photo feature | Branded "Das Grüne der Woche" — sustainability niche, distinct visual treatment |
| Footer | Dark, dense, multi-column | Dark, section links + social | Dark 4-column: Bezirke / Themen / Über uns / Rechtliches |
| Mobile navigation | None (desktop-first) | Fixed bottom nav (basic) | Glassmorphic frosted — premium mobile-native feel |
| Article sidebar | Author card, tags | Author bio, related articles | Full metadata sidebar: date, Bezirk pill, source, read time — desktop sticky |
| Color system | Blue/white corporate | Red/white regional | Ink/Parchment/Aged Wood — literary heritage, unique in Austrian regional news |

---

## Implementation Notes

### Weather Widget

- **Endpoint:** `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,weather_code,wind_speed_10m&timezone=Europe/Vienna`
- **No API key required.** Free tier. Austria covered by ECMWF model at 1-2km resolution.
- **WMO weather codes** map to German labels + icons: 0 = Klar, 1 = Überwiegend klar, 2-3 = Bewölkt, 45/48 = Nebel, 51-67 = Regen, 71-77 = Schnee, 80-82 = Schauer, 95-99 = Gewitter
- **Client Component only** — uses localStorage for Bezirk, cannot SSR
- **Cache strategy:** `sessionStorage.setItem('ww_weather', JSON.stringify({data, fetchedAt}))`. Re-fetch if `Date.now() - fetchedAt > 900000` (15 min)
- **Config addition needed:** `weatherCoords: { lat: number; lon: number }` on each Bezirk entry in `bundesland.config.ts`
- **Fallback:** If no Bezirk set → use Graz coordinates (47.0707, 15.4395)

### Drop Cap

- Use `::first-letter` pseudo-element: `float: left; font-size: 3.75rem; line-height: 0.85; padding-right: 0.1em; font-family: var(--font-newsreader); color: var(--color-ink)`
- Apply via `.prose-drop-cap::first-letter` Tailwind utility or component class
- Do NOT use CSS `initial-letter` — Firefox unsupported as of March 2026
- Conditional rendering: apply class only when `article.body.length > 300`
- Do NOT apply on AI-generated articles summary paragraphs (too short, looks wrong)

### Glassmorphic Bottom Nav

- `backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px)`
- Background: `rgba(252, 249, 239, 0.72)` (Parchment at 72% opacity) — exact value TBD with token system
- Active indicator: `border-top: 2px solid var(--color-ink)` on active tab item (replaces terracotta rounded pill)
- `@supports (backdrop-filter: blur(1px)) { ... }` — fallback: solid Parchment background
- Blur value: 10px. Keep ≤12px. Avoid animating this property.
- Only ONE `backdrop-filter` element in the viewport at any time

### "Das Grüne der Woche" Section

- **Schema migration required:** Add `theme VARCHAR(64)` to Article table (nullable). OR use existing tag system with reserved slug `gruen-der-woche` (lower migration risk if tags are already implemented)
- **Homepage widget:** Fetches articles where `theme = 'gruen'` (or matching tag), ordered by `publishedAt DESC`, limit 4-5
- **Visual treatment:** Section wrapper with muted green tonal background (distinct from Parchment). Leaf/plant Material Symbol. Newsreader Italic section heading "Das Grüne der Woche"
- **CMS integration:** Article create/edit form needs a "Thema" select field (or tag assignment). Include in CMS admin refresh phase.
- **Empty state:** If no articles tagged this week, section is hidden (CSS `display:none` when result count = 0) — not an error

### Article Sidebar (Desktop)

- CSS Grid on article detail wrapper: `grid-template-columns: 1fr 256px` at `@media (min-width: 768px)`
- Sidebar content: `publishedAt` (formatted DE), Bezirk pill(s) from ArticleBezirk junction, source name + favicon (16px), estimated read time (`Math.ceil(wordCount / 200)` minutes)
- `position: sticky; top: 5rem` so sidebar stays visible during scroll
- Mobile (< 768px): sidebar becomes `display:flex; flex-direction:row; gap:1rem; flex-wrap:wrap` strip above article body
- All data already available from existing article detail page query — layout restructure only

### Dark Editorial Footer

- Background: `var(--color-ink)` (near-black Archivist token)
- Text: `var(--color-parchment)`
- 4 columns at ≥1024px, 2 at ≥640px, 1 on mobile
- Column 1 "Bezirke": all 13 Bezirke as links to filtered search
- Column 2 "Themen": main content categories
- Column 3 "Wurzelwelt": Über uns, Mascot lore, RSS feeds
- Column 4 "Rechtliches": Impressum, Datenschutz, Barrierefreiheit
- Sub-footer bar: "Automatisch erstellt von Wurzelwelt · © 2026" + "KI-generierte Inhalte werden gekennzeichnet"
- Reversed/light logo variant of Wurzelwelt wordmark

---

## Sources

- [Open-Meteo Free Weather API documentation](https://open-meteo.com/en/docs) — MEDIUM confidence (official docs, Austria ECMWF coverage confirmed)
- [Open-Meteo features page](https://open-meteo.com/en/features) — MEDIUM confidence (free tier, no API key confirmed)
- [CSS `initial-letter` — Can I Use](https://caniuse.com/css-initial-letter) — HIGH confidence (browser compatibility table, Firefox unsupported)
- [CSS Drop Caps — CSS-Tricks](https://css-tricks.com/snippets/css/drop-caps/) — HIGH confidence (established reference, float method)
- [Chrome Developers: CSS initial-letter](https://developer.chrome.com/blog/control-your-drop-caps-with-css-initial-letter) — HIGH confidence (official Chrome blog)
- [Glassmorphism best practices 2026 — UX Pilot](https://uxpilot.ai/blogs/glassmorphism-ui) — MEDIUM confidence (industry blog, consistent with MDN performance notes)
- [Glassmorphism implementation guide 2025](https://playground.halfaccessible.com/blog/glassmorphism-design-trend-implementation-guide) — MEDIUM confidence (GPU performance guidance)
- [Mobile navigation patterns 2026 — Phone Simulator](https://phone-simulator.com/blog/mobile-navigation-patterns-in-2026) — LOW confidence (single source)
- [Footer UX patterns 2026 — Eleken](https://www.eleken.co/blog-posts/footer-ux) — MEDIUM confidence
- [Weather widget UX for websites — Medium 2026](https://medium.com/@malenix/what-is-a-weather-widget-for-a-website-and-what-data-should-it-show-2317178a1b14) — LOW confidence (community blog, single source)
- [Region selector UX impact — GeoTargetly](https://geotargetly.com/blog/how-does-a-region-selector-impact-your-website-ux) — LOW confidence (vendor blog)
- Competitor analysis: Der Standard (standard.at), Kleine Zeitung (kleinezeitung.at) — direct observation — HIGH confidence for feature inventory

---

*Feature research for: Wurzelwelt v3.0 "The Modern Archivist" design system overhaul*
*Researched: 2026-03-30*
