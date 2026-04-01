# Project Research Summary

**Project:** Wurzelwelt v3.0 "The Modern Archivist"
**Domain:** Editorial design system overhaul — visual identity, feature additions, and CSS architecture on an existing Next.js 15 / Tailwind v4 regional news platform
**Researched:** 2026-03-30
**Confidence:** HIGH

## Executive Summary

Wurzelwelt v3.0 "The Modern Archivist" is a design system overhaul milestone on an existing, production Next.js 15 / Tailwind v4 / Prisma v6 / Neon PostgreSQL platform. The scope is primarily visual: a new Ink/Parchment/Slate/Aged Wood color palette, glassmorphic bottom nav, editorial typography (drop caps, pull quotes, article sidebar), and three new homepage features (weather widget, Bezirk region selector, "Das Grüne der Woche" themed section). The recommended implementation strategy is minimal new dependencies — only one new npm package (`openmeteo` or equivalently a plain `fetch` call) is required. All design changes land in the existing Tailwind v4 `@theme` block in `globals.css`.

The critical architectural constraint is that token expansion must happen first and must be additive, never replacing existing tokens. Every other feature in this milestone depends on the new color tokens being available. Two components are replaced wholesale (`WurzelNavBar` → `ArchivistNavBar`, `Footer` → `EditorialFooter`); all others are modified in place. The weather widget feeds data from a server-side fetch in `page.tsx` to a presentation-only Client Component — this avoids the Next.js 15 App Router constraint that prevents Server Components from being imported inside Client Components. One schema migration is required: a `theme` field on the Article model to support "Das Grüne der Woche" tagging.

The primary risks are CSS-level and well-understood: Safari requires `-webkit-backdrop-filter` for glassmorphism and will not render blur without a semi-transparent background; token renaming without a two-phase migration strategy silently breaks all components using old utility classes; `initial-letter` CSS drop caps are unsupported in Firefox and require a float fallback; and the weather widget must use Next.js server-side fetch caching (`revalidate: 1800`) or it will exhaust Open-Meteo's free tier rate limit in production. All risks have known mitigations and no novel technical territory is involved.

---

## Key Findings

### Recommended Stack

The existing stack requires no architectural changes. One new production dependency — the `openmeteo` SDK (`^1.2.3`) or equivalently a plain native `fetch` to the Open-Meteo JSON endpoint — handles the weather widget. All other milestone features (glassmorphism, MD3 color tokens, drop caps, blockquotes, footer typography) are pure CSS within the existing Tailwind v4 `@theme` system.

**Core technologies:**
- `openmeteo ^1.2.3` (or plain `fetch`): weather data via Open-Meteo API — free, no API key, Austria covered by ECMWF 1-2km model; `{ next: { revalidate: 1800 } }` provides Vercel Data Cache persistence across serverless invocations
- Tailwind v4 `backdrop-blur-md` (existing): glassmorphic bottom nav — 12px blur is the mobile-safe maximum; Tailwind v4 outputs `-webkit-backdrop-filter` automatically (verify against project PostCSS config)
- Tailwind v4 `@theme` additive expansion (existing): MD3-style Ink/Parchment/Slate/Aged Wood token system — add new tokens alongside existing ones, never replace; both namespaces coexist until a full migration pass is complete
- CSS `::first-letter` (native, no package): drop cap — use float-based fallback, not `initial-letter` (Firefox unsupported as of 2026); wrap `initial-letter` in `@supports` for progressive enhancement later
- `@tailwindcss/typography` plugin: explicitly excluded — not compatible with Tailwind v4 CSS-first config as of early 2026; use `@layer utilities` in `globals.css` instead

### Expected Features

**Must have — table stakes for the "Modern Archivist" brand claim:**
- Complete color token overhaul (Ink/Parchment/Slate/Aged Wood) — foundation for all other features; must land first
- Glassmorphic bottom nav with top-border active state — replaces terracotta pill; single blur element in viewport
- Drop cap on first article paragraph + blockquote/pull quote styling — signals "publication not blog"
- Article sidebar metadata (desktop sticky / mobile strip) — print-heritage layout standard
- Topmeldung CTA button — hero without explicit call to action is a display item only
- "Frag den Wurzelmann" region selector card — branded on-ramp for Mein Bezirk selection
- Weather widget (Bezirk-aware, Open-Meteo, 30-min cache, current conditions) — hyperlocal; no competitor delivers per-district weather
- "Das Grüne der Woche" themed section (homepage widget + CMS tag support) — original editorial identity differentiator
- Dark editorial footer with 4-column navigation — visual terminus standard for premium news
- Search/discovery page visual redesign — Archivist treatment on result cards and filter chips
- CMS admin visual refresh including theme tag field — consistent brand for editors

**Should have — competitive differentiators:**
- Per-Bezirk weather coordinates in `bundesland.config.ts` — makes weather widget genuinely hyperlocal rather than showing Graz for all users
- `useMeinBezirk()` shared hook between WeatherWidget and RegionSelectorCard — ensures reactivity when user changes Bezirk selection

**Defer to v3.x / v4+:**
- `initial-letter` progressive drop cap enhancement — when Firefox ships support
- Weather 5-day forecast strip — natural extension of current conditions card
- Animated page transitions — explicitly deferred in PROJECT.md
- SVG choropleth Bezirk map — requires geodata licensing

### Architecture Approach

The architecture is a component-level refactor within the existing Next.js App Router shell. The `@theme` token expansion in `globals.css` is the foundation layer that every other component change depends on. Two shell components are replaced by new files (`WurzelNavBar` → `ArchivistNavBar`, `Footer` → `EditorialFooter`), with a single-file import swap in `(public)/layout.tsx`. Seven new components are created in `src/components/reader/`. The weather data flow is strictly server-side: `page.tsx` (Server Component, `force-dynamic`) fetches weather in its `Promise.all` block and passes typed props to `HomepageLayout` (Client Component), which passes them to `WeatherWidget` (presentation-only Client Component).

**Major components and their responsibilities:**
1. `globals.css @theme` — single source of truth for all design tokens; additive expansion from ~8 to ~30 tokens
2. `ArchivistNavBar.tsx` (new, Client) — glassmorphic fixed bottom nav; top-border active indicator; replaces WurzelNavBar
3. `EditorialFooter.tsx` (new, Server) — dark 4-column nav footer with AI disclosure sub-footer; replaces Footer
4. `WeatherWidget.tsx` (new, Client) — presentation-only; receives `WeatherData | null` prop from page.tsx
5. `RegionSelectorCard.tsx` (new, Client) — "Frag den Wurzelmann" card; reads/writes Mein Bezirk localStorage via shared hook
6. `GrueneWocheSection.tsx` (new, Server) — themed editorial section; requires Article.theme schema migration
7. `ArticleSidebar.tsx` (new, Server) — desktop sticky metadata sidebar; mobile collapses to horizontal strip
8. `DropCap.tsx` (new, Server) — float-based `::first-letter` drop cap; applies only when first paragraph exceeds 300 chars
9. `lib/content/weather.ts` (new) — `fetchCurrentWeather()` server-only utility; plain `fetch` with `revalidate: 1800`

### Critical Pitfalls

1. **Token naming collision (CRITICAL):** Adding MD3 tokens that silently overwrite existing `--color-surface`, `--color-primary` etc. breaks every component using those utilities — no build error, only runtime visual regression discovered in browser. Prevention: two-phase rename — add new tokens alongside old ones in Phase 1; migrate utility class references; remove old tokens only after `grep` confirms zero remaining usages.

2. **Safari backdrop-blur failure (CRITICAL for glassmorphism):** Without a semi-transparent background color on the same element, Safari renders the blur element as invisible. The `-webkit-backdrop-filter` vendor prefix must be present (verify Tailwind v4 outputs it in this project's PostCSS config — do not assume). Test on a physical iPhone before marking the glassmorphic nav phase complete.

3. **Open-Meteo rate limit without cross-invocation caching (CRITICAL for weather):** In-memory module-level caching does not persist across Vercel serverless function cold starts. Without `{ next: { revalidate: 1800 } }` on the `fetch` call, each cold start fetches independently and 10,000 free-tier calls can be exhausted within hours. Decide on caching strategy before writing the weather component — do not discover this post-deployment.

4. **Weather widget hydration mismatch (HIGH):** Any `Date.now()` or timestamp rendered server-side will differ at client hydration, causing React hydration errors. Either omit timestamps from server-rendered output, or use `dynamic(() => import('./WeatherWidget'), { ssr: false })` to skip SSR for the widget entirely.

5. **Firefox drop cap broken (MEDIUM):** `initial-letter` is unsupported in Firefox. Use float-based `::first-letter` as the default; wrap any `initial-letter` enhancement in `@supports`. Firefox also has an open bug (since 2005) that applies the parent paragraph's `line-height` to the floated `::first-letter` — explicit `line-height: 0.8` on the pseudo-element is required to prevent the first line from pushing down.

6. **WCAG 1.4.11 non-text contrast failure (MEDIUM):** The "No-Line Rule" philosophy removes borders from interactive elements. The Parchment/Surface tonal pair is deliberately subtle and likely below the 3:1 contrast ratio required for UI component boundaries. Validate every interactive element token pair at Phase 1 token definition time — remediation after components are built is expensive.

7. **Newsreader CLS on article pages (MEDIUM):** Adding new font weights or styles (e.g., Newsreader Italic for drop cap or blockquote attribution) without updating the `next/font` configuration causes FOUT with mismatched metrics, producing measurable CLS. Audit `next/font` configuration before article detail work begins.

---

## Implications for Roadmap

### Phase 1: Color System Foundation
**Rationale:** Every other feature in this milestone consumes Ink/Parchment/Slate/Aged Wood tokens. Building anything else first creates double-work when tokens later change. The two-phase rename strategy (add alongside old → migrate utility classes → remove old) must be executed atomically before any new components are built on top of new token names.
**Delivers:** Expanded `@theme` block (~30 tokens), validated contrast ratios on all interactive element token pairs, removal of the single reader-side separator border in `ListItem.tsx`, full CMS admin visual regression check confirming no breakage.
**Addresses:** Color token overhaul (core deliverable), drop cap/blockquote token dependency, glassmorphic nav token dependency
**Avoids:** Token naming collision (Pitfall 1), WCAG 1.4.11 non-text contrast failure (Pitfall 6)

### Phase 2: Shell Components — Glassmorphic Nav and Editorial Footer
**Rationale:** These layout-shell components are imported in `(public)/layout.tsx` and affect every public page. Replacing them early means all subsequent phase work happens against the correct visual shell. Old files are kept until replacements are verified, then deleted.
**Delivers:** `ArchivistNavBar.tsx` (glassmorphic, top-border active state), `EditorialFooter.tsx` (dark, 4-column), single import swap in `(public)/layout.tsx`
**Addresses:** Glassmorphic bottom nav (table stakes), dark editorial footer (table stakes)
**Avoids:** backdrop-blur Safari failure (Pitfall 2) — physical iPhone test required as done condition; backdrop-blur Android scroll jank (Pitfall 3) — GPU throttle test required as done condition
**Note:** Keep `WurzelNavBar.tsx` and `Footer.tsx` in repo until new components pass full verification.

### Phase 3: Homepage Feature Components
**Rationale:** Three new homepage features (weather widget, region selector card, "Das Grüne der Woche" section) plus Topmeldung CTA update all land in `HomepageLayout.tsx`. Batching them avoids repeated `HomepageLayout` edit cycles. Schema migration for the Article `theme` field belongs here, before `GrueneWocheSection` is built.
**Delivers:** `WeatherWidget.tsx` + `lib/content/weather.ts` + `page.tsx` wiring, `RegionSelectorCard.tsx` + `useMeinBezirk()` shared hook, `GrueneWocheSection.tsx` + Article schema migration + CMS theme tag field, `HeroArticle.tsx` CTA button
**Addresses:** Weather widget (differentiator), Frag den Wurzelmann region selector (table stakes), Das Grüne der Woche section (differentiator), Topmeldung CTA (table stakes)
**Avoids:** Weather hydration mismatch (Pitfall 4) — SSR strategy decided upfront; Open-Meteo rate limit (Pitfall 3) — `revalidate: 1800` set before component is written; Bezirk coordinate lookup from config, not hardcoded Graz

### Phase 4: Article Detail Redesign
**Rationale:** Article detail is a self-contained page scope. Drop cap and sidebar work is isolated to the article detail layout and does not affect the homepage or shell. CLS and font auditing belong here, adjacent to the work that introduces new Newsreader usage patterns.
**Delivers:** `DropCap.tsx` (float-based, Firefox-safe), `ArticleSidebar.tsx` (desktop sticky / mobile strip), article detail page token updates
**Addresses:** Drop cap + blockquote styling (table stakes), article sidebar metadata (table stakes)
**Avoids:** Firefox drop cap failure (Pitfall 5) — Firefox acceptance criterion required; Newsreader CLS (Pitfall 7) — `next/font` audit and Lighthouse CLS < 0.1 as done condition; drop cap on HTML-wrapped first paragraphs (integration gotcha)

### Phase 5: Search Page and CMS Admin Visual Refresh
**Rationale:** These are the lowest-risk, lowest-dependency changes in the milestone — visual-only token application on existing functional pages with no logic changes. Deferring them means earlier phases deliver the most visible user-facing impact first. Schedule-safe to compress or defer if earlier phases run long.
**Delivers:** `SearchPageLayout.tsx` Archivist token treatment and card/filter redesign; CMS admin token swap + typography update
**Addresses:** Search/discovery visual redesign (P2 priority), CMS admin refresh (P2 priority)
**Avoids:** No-border philosophy applied to CMS admin form inputs (UX pitfall) — borders must remain on form fields

### Phase Ordering Rationale

- **Token foundation first is non-negotiable:** 9 of 11 v3.0 features depend on Ink/Parchment tokens. Building in any other order creates rework.
- **Shell components second:** Every subsequent development page load renders against the new nav and footer, enabling accurate visual QA from Phase 3 onward.
- **Homepage features third:** The schema migration for "Das Grüne der Woche" needs to land before the section component is built; batching all three homepage features avoids multiple `HomepageLayout` edit cycles.
- **Article detail fourth:** Self-contained scope, highest CSS complexity (CLS, Firefox cross-browser), benefits from tokens and shell being stable before work begins.
- **Search + CMS last:** Lowest user-facing impact, visual-only, safest to compress or defer under schedule pressure.

### Research Flags

Phases with well-documented patterns (skip research-phase):
- **Phase 1 (Color System):** Pure Tailwind v4 `@theme` extension — official docs fully cover the additive pattern. The two-phase rename strategy is established.
- **Phase 2 (Shell Components):** Glassmorphism CSS pattern is thoroughly documented. Safari workaround is known. Tailwind v4 `backdrop-filter` utilities are standard.
- **Phase 4 (Article Detail):** Float-based drop cap is a long-established CSS pattern. Sidebar CSS Grid layout is standard. Firefox bug and `@supports` workaround are documented.
- **Phase 5 (Search + CMS):** Token application to existing components — no novel patterns.

Phases that may benefit from a brief implementation spike before full planning:
- **Phase 3 (Homepage Features):** The interaction between `useMeinBezirk()` shared state, `WeatherWidget` re-render reactivity, and the Next.js 15 App Router Client/Server Component boundary warrants a brief spike before writing full component specs. The Prisma schema migration strategy (nullable `theme VARCHAR(64)` column vs. reserved tag slug) should be decided with the team before phase begins.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Minimal new dependencies. `openmeteo` SDK and plain `fetch` both verified against official Open-Meteo docs. Tailwind v4 `@theme` additive behavior verified against official docs and GitHub issues. |
| Features | MEDIUM | Table-stakes features verified against competitor observation (Der Standard, Kleine Zeitung) and editorial design literature. "Das Grüne der Woche" is an original concept with no direct analogues — user reception is inference. |
| Architecture | HIGH | Based on direct codebase inspection of all reader component files, import graph, `globals.css`, and `page.tsx`. Next.js 15 Server/Client Component boundary constraint is a known and verified platform constraint. |
| Pitfalls | HIGH (CSS/browser) / MEDIUM (Tailwind v4 token specifics) | Safari/Firefox/Android pitfalls sourced from MDN, official Chrome blog, WebKit Bugzilla, WCAG spec. Tailwind v4 `-webkit-backdrop-filter` auto-prefix behavior flagged as "verify empirically" — not assumed. |

**Overall confidence:** HIGH

### Gaps to Address

- **Bezirk coordinate data:** `bundesland.config.ts` needs `weatherCoords: { lat: number; lon: number }` added for all 13 Bezirke before Phase 3 can render non-Graz weather. Data-entry task, not a technical uncertainty, but it must be scoped explicitly.
- **Tailwind v4 `-webkit-backdrop-filter` auto-prefix:** STACK.md states Tailwind v4 outputs the prefix automatically; PITFALLS.md flags this as "verify in this project's PostCSS config." Must be confirmed empirically at Phase 2 start — a manual CSS class fallback is the contingency if auto-prefix is absent.
- **Prisma schema migration strategy for "Das Grüne der Woche":** Two options identified (nullable `theme VARCHAR(64)` column vs. reserved tag slug). Decision requires team input before Phase 3 planning begins.
- **`useMeinBezirk()` hook reactivity scope:** Both `WeatherWidget` and `RegionSelectorCard` read the same localStorage key. Whether a shared React context or a custom hook with storage event listeners is the right coordination mechanism should be decided at Phase 3 planning, not mid-implementation.

---

## Sources

### Primary (HIGH confidence)
- Codebase direct inspection — `src/app/globals.css`, `src/app/(public)/layout.tsx`, all `src/components/reader/` files, `bundesland.config.ts`, `src/app/(public)/page.tsx`
- [Tailwind CSS v4 Theme Variables — Official Docs](https://tailwindcss.com/docs/theme) — additive @theme expansion, override behavior
- [Tailwind CSS backdrop-filter-blur](https://tailwindcss.com/docs/backdrop-filter-blur) — glassmorphism utility classes
- [Next.js fetch — next.revalidate option](https://nextjs.org/docs/app/api-reference/functions/fetch) — server-side caching
- [Open-Meteo API](https://open-meteo.com/en/docs) — endpoint, parameters, rate limits
- [open-meteo/typescript GitHub](https://github.com/open-meteo/typescript) — official SDK
- [MDN: backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter) — browser support
- [MDN: initial-letter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/initial-letter) — Firefox non-support confirmed
- [MDN: ::first-letter](https://developer.mozilla.org/en-US/docs/Web/CSS/::first-letter) — float fallback behavior
- [WCAG 2.1 SC 1.4.11: Non-text Contrast](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html) — 3:1 requirement for UI component boundaries
- [Chrome Developers: CSS initial-letter](https://developer.chrome.com/blog/control-your-drop-caps-with-css-initial-letter) — Chrome/Safari support
- [Next.js hydration error documentation](https://nextjs.org/docs/messages/react-hydration-error) — SSR mismatch root causes and solutions

### Secondary (MEDIUM confidence)
- [openmeteo on npm](https://www.npmjs.com/package/openmeteo) — version 1.2.3 confirmed
- [Tailwind CSS v4 blog](https://tailwindcss.com/blog/tailwindcss-v4) — CSS-first @theme, first-letter: variant, supports-[] variant
- [Open-Meteo Pricing / Rate Limits](https://open-meteo.com/en/pricing) — 10,000 calls/day free tier
- [Tailwind CSS GitHub Issue #13844](https://github.com/tailwindlabs/tailwindcss/issues/13844) — backdrop-blur WebKit prefix community confirmation
- [WebKit Bug #158807](https://bugs.webkit.org/show_bug.cgi?id=158807) — Safari backdrop-filter artifacts with nested elements
- [Mozilla Bugzilla #290125](https://bugzilla.mozilla.org/show_bug.cgi?id=290125) — Firefox ::first-letter line-height bug (open since 2005)
- Competitor analysis: Der Standard (standard.at), Kleine Zeitung (kleinezeitung.at) — direct observation for feature inventory
- Glassmorphism mobile performance — multiple sources agree on 12px blur limit and no-animation rule

### Tertiary (LOW confidence)
- Mobile navigation patterns 2026 — Phone Simulator blog (single source)
- Weather widget UX for websites — Medium community blog (single source)
- Region selector UX impact — GeoTargetly vendor blog (single source, vendor interest)

---
*Research completed: 2026-03-30*
*Ready for roadmap: yes*
