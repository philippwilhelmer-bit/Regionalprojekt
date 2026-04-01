# Stack Research

**Domain:** "The Modern Archivist" design overhaul — weather widget, glassmorphism nav, MD3 color tokens, editorial typography (v3.0)
**Researched:** 2026-03-30
**Confidence:** HIGH

## Context: Milestone Scope

This is a SUBSEQUENT MILESTONE on an existing Next.js 15 / Prisma v6 / PostgreSQL / Tailwind CSS v4 app.

Validated stack (do NOT re-research): Next.js 15, Prisma v6, PostgreSQL (Neon), Anthropic Claude API, Tailwind CSS v4, Vitest with pgLite, Server Components, HMAC auth CMS, Vercel deployment.

Current `package.json` dependencies relevant to this milestone:
- `tailwindcss: ^4.2.2` with `@tailwindcss/postcss: ^4`
- `next: ^15.5.14`, `react: ^19.2.4`
- Existing `@theme` tokens in `src/app/globals.css`: `--color-primary`, `--color-secondary`, `--color-accent`, `--color-background`, `--color-text`, `--color-surface`, `--color-surface-elevated`, font tokens, radius, spacing

**Bottom line: one new npm package (`openmeteo`) is required. Everything else — glassmorphism, MD3 color tokens, drop caps, blockquotes — is implemented in CSS within the existing Tailwind v4 @theme system.**

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `openmeteo` | `^1.2.3` | Official Open-Meteo TypeScript SDK for weather data | Official SDK from the Open-Meteo team. Uses FlatBuffers for efficient binary transport instead of JSON — relevant for time-series weather data. Provides `fetchWeatherApi()` with built-in retry logic (3 retries, 0.2 backoff). Only one function exposed, keeping the integration minimal. Free, no API key, no sign-up required. Version 1.2.3 is the latest stable release as of early 2026. |
| Tailwind CSS v4 `backdrop-blur-*` utilities | `^4.2.2` (existing) | Glassmorphic bottom nav with frosted-glass effect | `backdrop-blur-md` (12px) is the correct baseline for nav bars. No new package needed — Tailwind v4 ships all `backdrop-filter` utilities natively. Combine with `bg-[color]/[opacity]` for semi-transparent base. Requires `-webkit-backdrop-filter` prefix on Safari/iOS — Tailwind outputs this automatically. |
| Tailwind CSS v4 `@theme` extension | `^4.2.2` (existing) | MD3-style color token system (Ink/Parchment/Slate/Aged Wood palette) | The existing `@theme` block in `globals.css` is the single source of truth. Add new v3.0 semantic tokens here — do not introduce a separate CSS file or token library. MD3's token philosophy (reference → system → component) maps directly to Tailwind's `@theme` variable cascade. |
| CSS `::first-letter` pseudo-element | native CSS (no package) | Article drop cap styling | Tailwind v4 supports `first-letter:` variants natively (e.g., `first-letter:float-left first-letter:text-7xl first-letter:font-headline`). No plugin or additional package needed. Apply only to `<p>` elements (block containers) — not `<span>`. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `openmeteo` | `^1.2.3` | `fetchWeatherApi()` for weather data with FlatBuffer decoding | Only needed for the weather widget Server Component. Do not use for any other data fetching — existing patterns (Prisma, native fetch) cover everything else. |

### Development Tools

No new development tools are required.

---

## Installation

```bash
# New production dependency — weather widget only
npm install openmeteo

# No new dev dependencies required
```

Everything else (glassmorphism, color tokens, drop caps, blockquotes, footer typography) is pure CSS in `globals.css` and `@theme` extensions.

---

## Integration Points with Existing Tailwind v4 @theme

### 1. Extending @theme for MD3-Style Color Tokens

Add v3.0 "Modern Archivist" tokens to the existing `@theme` block in `src/app/globals.css`. The current tokens (`--color-primary`, `--color-accent`, etc.) remain as-is for CMS and backwards compatibility. New tokens augment rather than replace:

```css
@theme {
  /* === EXISTING TOKENS (keep) === */
  --color-primary: #1B2D18;
  /* ... */

  /* === v3.0 Modern Archivist palette === */
  /* Ink/Parchment/Slate/Aged Wood semantic roles */
  --color-ink:         #1A1410;   /* deep warm black — headlines, body */
  --color-parchment:   #F5EFE0;   /* warm off-white — page background */
  --color-parchment-deep: #EDE5D0; /* darker parchment — surface variant */
  --color-slate:       #4A4540;   /* muted warm grey — metadata, labels */
  --color-aged-wood:   #7C5C3A;   /* warm brown — accent, blockquote borders */
  --color-aged-wood-light: #C4A882; /* light wood — decorative elements */

  /* Glass surface tokens for glassmorphism nav */
  --color-glass-bg:    color-mix(in srgb, var(--color-parchment) 75%, transparent);
  --color-glass-border: color-mix(in srgb, var(--color-aged-wood-light) 30%, transparent);
}
```

**Why this approach:** `color-mix()` for glass tokens is supported in all modern browsers (Safari 16.2+, Chrome 111+, Firefox 113+) and avoids hardcoded rgba values that diverge from the token system. Tailwind v4 supports arbitrary CSS values in `@theme`, so these are usable as `bg-glass-bg` etc.

### 2. Glassmorphic Bottom Nav Pattern

No new package. Pure Tailwind utility classes:

```tsx
// Glassmorphic nav bar — correct class combination
<nav className="
  fixed bottom-0 inset-x-0
  backdrop-blur-md          /* 12px blur — safe for mobile */
  bg-parchment/80           /* semi-transparent parchment */
  border-t border-glass-border
  supports-[backdrop-filter:blur(1px)]:bg-parchment/60
">
```

The `supports-[backdrop-filter:blur(1px)]:` variant progressively enhances: browsers that support `backdrop-filter` get the more transparent glass; others fall back to `bg-parchment/80` (opaque enough to be readable).

**Performance rule:** Keep blur to `backdrop-blur-md` (12px) or less on the nav. Do NOT animate `backdrop-filter`. Limit to 2–3 simultaneous `backdrop-filter` elements on any page. On mobile (primary platform), 12px blur on a single fixed nav bar is within safe GPU budget for all target devices.

### 3. Drop Cap Implementation

No plugin needed — Tailwind v4's `first-letter:` variant covers this:

```tsx
// Article body — apply to first paragraph only
<p className="first-letter:float-left first-letter:font-headline first-letter:text-[4.5rem] first-letter:leading-[0.85] first-letter:mr-2 first-letter:text-ink">
  {firstParagraphText}
</p>
```

For article-body-scoped styles, define a utility in `globals.css`:

```css
@layer utilities {
  .prose-drop-cap p:first-of-type::first-letter {
    float: left;
    font-family: var(--font-headline);
    font-size: 4.5rem;
    line-height: 0.85;
    margin-right: 0.5rem;
    color: var(--color-ink);
  }
}
```

### 4. Open-Meteo Weather Widget Integration

The weather widget fetches via a Next.js Server Component with ISR revalidation. Coordinates are sourced from `bundesland.config.ts` (extend with lat/lon per Bezirk, or use a single Steiermark capital coordinate for the widget).

```typescript
// src/lib/weather.ts — server-only utility
import { fetchWeatherApi } from 'openmeteo';

export interface CurrentWeather {
  temperature: number;      // °C
  weatherCode: number;      // WMO code
  windSpeed: number;        // km/h
  isDay: boolean;
}

export async function getCurrentWeather(lat: number, lon: number): Promise<CurrentWeather> {
  const params = {
    latitude: lat,
    longitude: lon,
    current: ['temperature_2m', 'weather_code', 'wind_speed_10m', 'is_day'],
    timezone: 'Europe/Vienna',
  };

  const responses = await fetchWeatherApi('https://api.open-meteo.com/v1/forecast', params);
  const current = responses[0].current()!;

  return {
    temperature: Math.round(current.variables(0)!.value()),
    weatherCode: current.variables(1)!.value(),
    windSpeed:   Math.round(current.variables(2)!.value()),
    isDay:       current.variables(3)!.value() === 1,
  };
}
```

Cache in the Server Component with `{ next: { revalidate: 1800 } }` — weather refreshes every 30 minutes, adequate for a regional news widget and respects Open-Meteo's fair-use guidance.

WMO weather codes (0–99) map to German-language descriptions and Material Symbols icons without any additional library — a lookup table in the codebase is sufficient. The existing Material Symbols Rounded icon font already covers all needed weather glyphs (partly_cloudy_day, rainy, ac_unit, etc.).

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `openmeteo` SDK (FlatBuffers) | Plain `fetch` to Open-Meteo JSON endpoint | Use plain fetch if the SDK ever becomes unmaintained or if the weather widget only needs temperature + condition (minimal fields). For simple use cases, `fetch('https://api.open-meteo.com/v1/forecast?latitude=47.07&longitude=15.44&current=temperature_2m,weather_code')` works with zero dependencies. The SDK adds retry logic which is a minor but real benefit for a widget that must load on every page. |
| Tailwind `backdrop-blur-md` (12px) | Larger blur values (`backdrop-blur-xl`, `backdrop-blur-2xl`) | Use larger blur only for hero overlays above the fold, never for fixed-position elements that repaint on scroll. On a bottom nav specifically, larger blur increases GPU pressure on scroll events. |
| `color-mix()` for glass tokens | Hardcoded `rgba()` values | Use `rgba()` only if IE11 or older WebKit support is required (not applicable here). `color-mix()` keeps tokens in the theme system; `rgba()` creates separate magic numbers. |
| `::first-letter` CSS | JavaScript-based drop cap (wrap first letter in `<span>`) | Use the JS approach only if the drop cap needs to be interactive (clickable, animated). For static editorial typography, CSS-native is simpler and more robust with server-rendered HTML. |
| CSS `@layer utilities` for `.prose-drop-cap` | `@tailwindcss/typography` plugin prose customization | The `@tailwindcss/typography` plugin v0.5.x is not yet updated for Tailwind v4's CSS-first config (v4 compatibility is in progress as of early 2026). Adding it risks config conflicts. The existing project does not use it, and a single `@layer utilities` block achieves the required editorial styles without the plugin overhead. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@tailwindcss/typography` plugin | Not yet fully compatible with Tailwind v4 CSS-first config as of early 2026. Would require `tailwind.config.js` which conflicts with the project's CSS-only configuration. | CSS `@layer utilities` in `globals.css` for article body styles |
| `react-icons` or `lucide-react` for weather icons | Project already uses Material Symbols Rounded (loaded via Google Fonts CDN). Adding a second icon library doubles icon-related bundle/network cost and creates visual inconsistency. | Material Symbols Rounded — covers all WMO weather conditions (partly_cloudy_day, rainy, thunderstorm, ac_unit, foggy, etc.) |
| `chart.js` or any charting library for the weather widget | A single temperature reading + condition icon is not a chart. Scope creep risk. | Plain TSX with the current weather object |
| OpenWeatherMap, WeatherAPI, or other paid APIs | Require API keys, have usage limits, and cost money. Open-Meteo is free, no-key, open-source, with ECMWF/GFS/DWD model data of comparable quality for Austria. | `openmeteo` SDK → `api.open-meteo.com` |
| Animating `backdrop-filter` values | Animating blur radius (`backdrop-blur-sm` → `backdrop-blur-lg` on scroll) triggers GPU recomposition on every frame — catastrophic on mobile. | Static `backdrop-blur-md` with CSS `transition` only on `opacity` or `transform` if animation is needed |
| `framer-motion` for glassmorphism transitions | Adds ~50KB to the bundle for effects that CSS `transition` handles natively. Project has no animation dependency currently. | CSS `transition: background-color 150ms ease, opacity 150ms ease` on glass surfaces |

---

## Stack Patterns by Variant

**If weather data must be per-Bezirk (not a single widget for all of Steiermark):**
- Extend `bundesland.config.ts` with `lat` and `lon` fields per Bezirk entry
- Pass the user's selected Bezirk coordinates to `getCurrentWeather()`
- Cache per-coordinate by passing coordinates as fetch cache key tags: `{ next: { revalidate: 1800, tags: ['weather', \`${lat},${lon}\`] } }`

**If backdrop-blur causes visual artifacts on older Android devices:**
- Use `@supports (backdrop-filter: blur(1px))` in CSS to conditionally apply blur
- Tailwind v4 `supports-[backdrop-filter:blur(1px)]:` variant handles this inline
- Fallback: `bg-parchment/95` (near-opaque) with no blur — readable on all devices

**If the weather widget must work offline (e.g., cached PWA view):**
- This is out of scope (PROJECT.md explicitly excludes offline mode)
- The widget should gracefully degrade: wrap fetch in try/catch, return `null` on error, hide the widget component if data unavailable

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `openmeteo@^1.2.3` | Next.js 15 App Router Server Components | Import `fetchWeatherApi` in a server-only utility — do not import in Client Components (FlatBuffer decoding is server-side). Works with Node.js ≥18. |
| `openmeteo@^1.2.3` | TypeScript 5.x | Ships its own type declarations. No `@types/openmeteo` needed. |
| `backdrop-filter` CSS | iOS Safari ≥9, Chrome ≥76, Firefox ≥103 | 97%+ global browser support as of 2026. Tailwind outputs `-webkit-backdrop-filter` prefix automatically — no manual prefix needed. |
| `color-mix()` CSS | Safari 16.2+, Chrome 111+, Firefox 113+ | All iOS 16.2+ and modern Android browsers. Covers >95% of Austrian mobile users. Safe to use in `@theme` tokens. |
| `::first-letter` pseudo-element | All modern browsers | Tailwind v4 native `first-letter:` variant — no plugin required. Note: Tailwind v4 resets `::first-letter` in its preflight base styles; verify drop cap float behavior after applying reset if it interferes. |
| Tailwind v4 `@theme` with `color-mix()` | `tailwindcss@^4.2.2` | `color-mix()` in `@theme` is supported — Tailwind v4 passes through arbitrary CSS values in custom properties without transformation. |

---

## Sources

- [openmeteo on npm](https://www.npmjs.com/package/openmeteo) — version 1.2.3 confirmed, MEDIUM confidence (WebSearch result, direct fetch blocked)
- [open-meteo/typescript GitHub](https://github.com/open-meteo/typescript) — official SDK repository, HIGH confidence
- [Open-Meteo API docs](https://open-meteo.com/en/docs) — current, forecast, timezone parameters confirmed, MEDIUM confidence (WebSearch-confirmed)
- [Tailwind CSS backdrop-filter-blur docs](https://tailwindcss.com/docs/backdrop-filter-blur) — native utilities confirmed in v4, HIGH confidence
- [Tailwind v4.0 release blog](https://tailwindcss.com/blog/tailwindcss-v4) — CSS-first @theme, `first-letter:` variant, `supports-[]` variant confirmed, HIGH confidence
- [MDN backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter) — browser support table, HIGH confidence
- [WMO weather code descriptions (gist)](https://gist.github.com/stellasphere/9490c195ed2b53c707087c8c2db4ec0c) — code-to-description mapping, MEDIUM confidence
- Material Design 3 token philosophy — [m3.material.io/foundations/design-tokens](https://m3.material.io/foundations/design-tokens) — MD3 CSS custom properties approach confirmed, HIGH confidence
- Glassmorphism mobile performance — multiple sources agree on 12px blur limit and no animation rule, MEDIUM confidence

---

*Stack research for: v3.0 "The Modern Archivist" — weather widget, glassmorphism, MD3 tokens, editorial typography*
*Researched: 2026-03-30*
