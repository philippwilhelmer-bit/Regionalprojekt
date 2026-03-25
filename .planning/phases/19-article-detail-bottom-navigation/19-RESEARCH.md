# Phase 19: Article Detail & Bottom Navigation - Research

**Researched:** 2026-03-25
**Domain:** Next.js 15 RSC styling — Tailwind v4 token-based restyling, active-route detection in Server Components, plain CSS layout
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Bottom nav items:**
- Four items: Nachrichten, Suche, Gemerkt, Profil
- Icons (Material Symbols Outlined): `newspaper`, `search`, `bookmark`, `person`
- Nachrichten links to `/` — fully functional
- Suche links to `/suche` — functional (Phase 20 creates the page, but link can exist now)
- Gemerkt and Profil are placeholder tabs — visible but greyed out at ~40% opacity, not tappable (features deferred)

**Active pill state (NAV-02):**
- Green pill wrapping only the icon (Material Design 3 nav bar pattern)
- Pill background: styrian-green (#2D5A27), icon inside pill: white
- Active label below pill in green text
- Inactive items: sage-colored icon and label, no background

**Bottom nav styling (NAV-01):**
- Warm cream (#fbfaee) background replacing current white
- Remove zinc border-top, replace with subtle sage or no border
- Material Symbols icons for all items (replacing any remaining Unicode)

**Article hero image:**
- Full-width hero image when `imageUrl` exists — full-bleed edge-to-edge, breaking out of max-w-2xl content column
- Image above headline, headline below on cream — classic newspaper layout
- When no imageUrl: nothing — skip straight to headline on cream. No placeholder gradient or accent bar
- Use plain `<img>` tag (same as HeroArticle in Phase 18 — unpredictable external image domains)

**Article typography & colors (ART-01, ART-02):**
- Headline: font-headline (Newsreader) — already in place, keep
- Body: font-body (Inter) via prose styling — replace prose-zinc with cream/sage palette
- Timestamp: font-label (Work Sans) in sage
- Background: warm cream (#fbfaee) — replace any zinc-50 backgrounds
- Text colors: swap all zinc-900/500/400 to appropriate sage/dark tones

**Breadcrumb:** Keep current structure, restyle to muted sage (#4a5d4e) on cream. Subtle.

**AI disclosure banner:** Restyle from amber warning to subtle sage note (sage border, cream background, sage text).

**Share button placement:** Move from bottom (after body) to below headline area, before article body.

**Source attribution:** Keep subtle, restyle to sage color instead of zinc-400. Position below article body.

**Related articles:**
- Horizontal scroll cards reusing Top-Meldungen card pattern from Phase 18
- Small thumbnail cards with headline and Bezirk badge
- Section heading: "Weitere Artikel" in font-label (Work Sans) with thin warm-brown divider line matching homepage section headings
- Up to 5 related articles

### Claude's Discretion
- Exact pill dimensions and border-radius for active nav state
- Spacing between nav items
- Hero image aspect ratio / max-height constraints
- Prose typography fine-tuning (line-height, paragraph spacing)
- Ad unit placement adjustments if needed
- Responsive behavior of hero image on very wide screens

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ART-01 | Article page uses editorial typography (Newsreader headlines, Inter body) | Tailwind v4 `font-headline`/`font-body` tokens are already in globals.css; swap `prose-zinc` to custom prose palette |
| ART-02 | Article page uses warm cream background with consistent design system styling | Replace `zinc-*` colors with `cream`/`sage`/`styrian-green` design tokens; hero image full-bleed layout pattern |
| NAV-01 | Bottom nav restyled with warm cream background, updated Material Symbols icons | Full rewrite of BottomNav.tsx — four items, cream background, Material Symbols already available via CDN |
| NAV-02 | Active nav item displays as filled pill with primary green background | Active route detection via `usePathname()` in a `"use client"` wrapper; pill with `bg-styrian-green` wrapping icon only |
</phase_requirements>

---

## Summary

Phase 19 is a pure visual transformation of two existing components: the article detail page (`src/app/(public)/artikel/[publicId]/[slug]/page.tsx`) and the bottom navigation bar (`src/components/reader/BottomNav.tsx`). No new data models, no new pages, no new backend logic.

The article page already uses `font-headline` (Newsreader) for the H1. The main work is: restructuring the page layout to support a full-bleed hero image that breaks out of `max-w-2xl`, converting prose colors from zinc to the cream/sage palette, repositioning the share button above the body, and replacing the related-articles list with horizontal-scroll cards matching the Phase 18 TopMeldungenRow pattern.

The BottomNav is currently a single-link stub. It needs a full rewrite to four items. The critical technical constraint is that `BottomNav` lives inside the server-rendered `(public)/layout.tsx`, but active-state detection requires knowing the current path — which is only available via the client-side `usePathname()` hook. The solution is to extract a thin `"use client"` wrapper for the nav, keeping the outer layout as a Server Component.

**Primary recommendation:** Keep `layout.tsx` as a Server Component. Create a new `BottomNavClient.tsx` (`"use client"`) that calls `usePathname()` to drive pill state. The server layout renders `<BottomNavClient />` directly — no props needed.

---

## Standard Stack

### Core
| Library/Feature | Version | Purpose | Why Standard |
|-----------------|---------|---------|--------------|
| Tailwind CSS v4 | ^4.2.2 | All styling via design token utilities | Project-established; @theme in globals.css |
| Next.js 15 | 15.5.14 | RSC page component, `usePathname` hook | Project framework |
| React 19 | ^19.2.4 | `"use client"` directive for pathname hook | Project runtime |
| Material Symbols Outlined | CDN (loaded in layout.tsx) | Icons for nav items | Project-established (Phase 16) |
| @tailwindcss/typography (`prose`) | bundled with Tailwind | Article body prose styling | Already used in article page |

### Design Tokens (already in `src/app/globals.css`)
| Token | Value | Use in Phase 19 |
|-------|-------|-----------------|
| `cream` | #fbfaee | Article page background, nav background |
| `styrian-green` | #2D5A27 | Active pill background, active label color |
| `sage` | #4a5d4e | Inactive icons, labels, breadcrumb, timestamps |
| `alpine-red` | #8b0000 | Not used in this phase |
| `font-headline` | Newsreader | H1, section headings |
| `font-body` | Inter | Article prose |
| `font-label` | Work Sans | Timestamps, nav labels, section headings |

No new tokens or packages needed.

---

## Architecture Patterns

### Recommended File Structure (changes only)
```
src/
├── app/(public)/artikel/[publicId]/[slug]/
│   └── page.tsx              # Restructure: hero image, layout, palette
├── components/reader/
│   ├── BottomNav.tsx         # Thin server wrapper (or delete and replace)
│   └── BottomNavClient.tsx   # NEW "use client" — usePathname, pill logic
```

### Pattern 1: Full-Bleed Hero Breaking Out of Constrained Column

The article page uses `max-w-2xl mx-auto px-4` as its outer wrapper. A full-bleed hero must escape this.

**What:** Remove the max-width wrapper from the outer `<div>`, then wrap only the text content in the constrained column. Hero image sits above, full viewport width.

**When to use:** Any time an image must be edge-to-edge while body text remains readable-width.

**Example:**
```tsx
// Outer container — no max-width, no padding
<div className="bg-cream min-h-screen">
  {/* Hero: full-bleed, no padding */}
  {article.imageUrl && (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={article.imageUrl}
      alt={article.title ?? ""}
      className="w-full object-cover max-h-[50vh]"
      loading="eager"
    />
  )}

  {/* Content column: constrained */}
  <div className="max-w-2xl mx-auto px-4 py-6">
    {/* breadcrumb, header, body ... */}
  </div>
</div>
```

Source: Established pattern — HeroArticle.tsx uses same `absolute inset-0 w-full h-full` approach for the homepage hero.

### Pattern 2: Active Route Pill in Client Component

**What:** `usePathname()` is a React hook — it can only be called inside a `"use client"` component. The public layout is a Server Component. The solution is a small client island.

**When to use:** Any time a fixed nav needs active-state styling inside a server layout.

**Example:**
```tsx
// src/components/reader/BottomNavClient.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", icon: "newspaper", label: "Nachrichten", active: true },
  { href: "/suche", icon: "search", label: "Suche", active: true },
  { href: "#", icon: "bookmark", label: "Gemerkt", active: false, disabled: true },
  { href: "#", icon: "person", label: "Profil", active: false, disabled: true },
] as const;

export function BottomNavClient() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-cream h-16 flex items-center justify-around px-2">
      {NAV_ITEMS.map((item) => {
        const isActive = item.active && (
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
        );
        // ...
      })}
    </nav>
  );
}
```

**Key:** `usePathname()` returns the current URL path as a string. For `/` root, use exact match (`pathname === "/"`); for all others use `pathname.startsWith(item.href)` to handle sub-routes.

Source: Next.js 15 docs — `next/navigation` exports `usePathname`, available in App Router client components.

### Pattern 3: Prose Palette Override for Tailwind Typography

**What:** The current article body uses `prose prose-zinc`. To apply cream/sage palette, override prose color variables using Tailwind v4 custom CSS or use prose modifier classes.

**When to use:** When Tailwind Typography's built-in color scheme doesn't match the design system.

**Example approach (Tailwind v4):**
```tsx
// Replace prose-zinc with explicit prose color overrides
<article className="prose prose-stone max-w-none mb-6
  prose-p:text-[#2a2a2a] prose-p:font-body
  prose-headings:font-headline
  prose-a:text-styrian-green">
```

Or alternatively, since Inter is already the body font (via `font-family` on `body` in globals.css), the prose block will inherit Inter automatically. Focus the override on color only.

### Pattern 4: Disabled/Greyed Nav Tabs

**What:** Gemerkt and Profil tabs are visible but not interactive — 40% opacity, no click handler.

**Example:**
```tsx
{item.disabled ? (
  <div className="flex flex-col items-center gap-0.5 opacity-40 cursor-default">
    <span className="material-symbols-outlined text-xl text-sage" aria-hidden="true">
      {item.icon}
    </span>
    <span className="font-label text-xs text-sage">{item.label}</span>
  </div>
) : (
  <Link href={item.href} ...>...</Link>
)}
```

Using `<div>` (not `<Link>` or `<button>`) for disabled items ensures no keyboard focus or click event is possible.

### Anti-Patterns to Avoid

- **Passing `pathname` as a prop from Server Component to BottomNav:** Server Components cannot read the current URL in the same way — `headers()` can get it but it's async and cumbersome. Use `usePathname()` in a client component instead.
- **Using `next/image` for article hero:** External image domains are unpredictable. Plain `<img>` with `// eslint-disable-next-line @next/next/no-img-element` is the established project pattern (see HeroArticle.tsx).
- **Wrapping the entire public layout in `"use client"`:** This defeats SSR benefits for all pages. Only the BottomNav needs to be a client island.
- **Keeping `prose-zinc`:** zinc-* colors conflict with the cream/sage palette and will make text appear on the wrong background tint.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Active route detection | Custom cookie/context for pathname | `usePathname()` from `next/navigation` | Built into Next.js App Router; accurate, SSR-safe |
| Full-bleed image layout | Negative margins or JS viewport measurement | CSS `w-full` outside constrained column | Pure CSS, no layout shift |
| Horizontal scroll for related articles | Custom scroll component | Reuse `TopMeldungenRow.tsx` exactly | Already built and tested in Phase 18 |
| Share button | New component | Reuse `ShareButton.tsx` as-is | Works, just needs repositioning |
| Icon set | SVG sprites or custom icons | Material Symbols CDN already loaded | Phase 16 established this |

---

## Common Pitfalls

### Pitfall 1: `usePathname()` in a Server Component
**What goes wrong:** Calling `usePathname()` (or any hook) inside a Server Component throws `Error: Hooks can only be called inside of the body of a function component` at build time.
**Why it happens:** `(public)/layout.tsx` is a Server Component. The current `BottomNav.tsx` is a Server Component. Adding `usePathname()` there without `"use client"` will fail.
**How to avoid:** Create `BottomNavClient.tsx` with `"use client"` as the first line. Import it in `layout.tsx`. Server layout passes no props; the client component calls the hook itself.
**Warning signs:** Build error mentioning hooks or "use client".

### Pitfall 2: Active Match for Root Route `/`
**What goes wrong:** Using `pathname.startsWith("/")` for the Nachrichten (root) item will match every route, making every tab appear active.
**Why it happens:** Every path starts with `/`.
**How to avoid:** Use exact match for root: `pathname === "/"`. For all other items use `pathname.startsWith(item.href)`.

### Pitfall 3: `max-w-2xl` Wrapper Blocking Full-Bleed Hero
**What goes wrong:** Placing the hero `<img>` inside the `max-w-2xl mx-auto px-4` wrapper constrains it to the content column width — not full-bleed.
**Why it happens:** The current page wraps everything in one outer div with those constraints.
**How to avoid:** Restructure so the outer container has no max-width, and only the text content block uses `max-w-2xl mx-auto px-4`.

### Pitfall 4: Tailwind v4 Prose Color Overrides
**What goes wrong:** In Tailwind v4, prose color utilities (like `prose-zinc`) are applied differently than v3. Mixing v3 prose modifier documentation with v4 may give unexpected results.
**Why it happens:** Tailwind v4 changed the CSS variable architecture. Prose modifiers still exist but the underlying variable names changed.
**How to avoid:** If `prose-zinc` needs replacing, use explicit `prose-p:text-[color]` utility modifiers or set `--tw-prose-body` CSS variable. Test visually after each change.

### Pitfall 5: ESLint `@next/next/no-img-element` Warning
**What goes wrong:** Using plain `<img>` triggers ESLint warning, which may fail CI.
**Why it happens:** Next.js ESLint rule prefers `next/image`.
**How to avoid:** Add `{/* eslint-disable-next-line @next/next/no-img-element */}` comment above the `<img>` tag. This is the established project pattern (see HeroArticle.tsx line 22).

### Pitfall 6: Related Articles Already Queries Up to 5 Articles
**What goes wrong:** The current related articles block queries `listArticlesReader({ bezirkIds, limit: 5 })` and then does `.slice(0, 5)` in the JSX. The JSX slice is redundant but harmless.
**Why it happens:** Defensive coding.
**How to avoid:** Keep query limit: 5 as-is. Replace the JSX rendering (currently a vertical `flex-col` list) with `<TopMeldungenRow articles={relatedArticles} />`. The TopMeldungenRow handles its own rendering.

---

## Code Examples

### Active Pill — Material Design 3 Pattern
```tsx
// Active state: pill wraps icon only, label below in green
<Link href={item.href} className="flex flex-col items-center gap-0.5 min-w-[56px]">
  <span className={`
    flex items-center justify-center
    w-16 h-8 rounded-full
    ${isActive ? "bg-styrian-green" : ""}
  `}>
    <span
      className={`material-symbols-outlined text-xl ${isActive ? "text-white" : "text-sage"}`}
      aria-hidden="true"
    >
      {item.icon}
    </span>
  </span>
  <span className={`font-label text-xs ${isActive ? "text-styrian-green" : "text-sage"}`}>
    {item.label}
  </span>
</Link>
```

Pill dimensions (Claude's discretion): `w-16 h-8 rounded-full` gives a ~64px × 32px capsule pill — consistent with Material Design 3 nav bar spec where pill width ~= 64dp.

### Article Page Background
```tsx
// Outer div — full page cream background, no max-width
<div className="bg-cream">
  {/* Hero image — full bleed */}
  {/* Content area — constrained */}
  <div className="max-w-2xl mx-auto px-4 py-6">
    {/* ... */}
  </div>
</div>
```

### Breadcrumb Restyle
```tsx
// From: text-zinc-500
// To:   text-sage
<nav className="text-sm text-sage mb-4 font-label" aria-label="Breadcrumb">
  <Link href="/" className="hover:underline">Startseite</Link>
  {/* ... */}
</nav>
```

### Timestamp Restyle
```tsx
// From: font-label text-sm text-zinc-500
// To:   font-label text-sm text-sage
<p className="font-label text-sm text-sage">{publishedAt} Uhr</p>
```

### AI Disclosure — Sage Palette
```tsx
// From: amber-50 border-amber-200 text-amber-800
// To:   cream border-sage/30 text-sage
<div className="rounded-sm bg-cream border border-sage/30 px-4 py-3 text-sm text-sage mb-6">
  Dieser Artikel wurde automatisch von KI generiert und redaktionell geprueft.
</div>
```

### Source Attribution Restyle
```tsx
// From: text-xs text-zinc-400
// To:   text-xs text-sage/70  (slightly muted sage)
<p className="text-xs text-sage/70 mb-4">{sourceLabel}</p>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-item stub BottomNav | Four-item nav with pill active state | Phase 19 | Full nav implementation |
| zinc-based article colors | cream/sage design system palette | Phase 19 | Consistent with Phase 16–18 |
| Vertical related-articles list | Horizontal scroll card row | Phase 19 | Matches Phase 18 homepage pattern |
| Share button at bottom of article | Share button below headline | Phase 19 | Earlier access point for users |

---

## Open Questions

1. **Prose font inheritance vs explicit `font-body` class**
   - What we know: `body { font-family: var(--font-body) }` in globals.css means all prose text inherits Inter automatically.
   - What's unclear: Whether the `prose` plugin applies its own `font-family` override that would need to be cancelled.
   - Recommendation: Test visually. If prose overrides the font, add `prose-p:font-body` or remove Tailwind Typography's `fontFamily` reset via `@tailwindcss/typography` config.

2. **TopMeldungenRow reuse for related articles — section heading style**
   - What we know: TopMeldungenRow has a hardcoded "Top-Meldungen" section heading with a zinc-200 divider. Related articles need "Weitere Artikel" heading with a warm-brown divider.
   - What's unclear: Whether to modify TopMeldungenRow to accept a `heading` prop or extract a generic `HorizontalScrollRow` component.
   - Recommendation: Pass an optional `heading` prop to TopMeldungenRow. Default stays "Top-Meldungen". This is minimal and avoids duplication.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

Phase 19 is a **pure visual/structural restyling** of existing React components. There is no new data layer logic, no pure functions, and no business logic to unit test. The existing test suite covers the data layer (articles, ingestion, queries) and is unaffected by these changes.

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ART-01 | Newsreader headline, Inter body rendered | manual-only | N/A — visual, no DOM testing framework | N/A |
| ART-02 | Cream background, sage text palette | manual-only | N/A — visual | N/A |
| NAV-01 | Cream nav background, four Material Symbols icons | manual-only | N/A — visual | N/A |
| NAV-02 | Active pill on correct item per route | manual-only | N/A — `usePathname` requires browser routing | N/A |

**Justification for manual-only:** All four requirements are CSS/visual requirements on React Server/Client components. The project has no DOM testing framework (no @testing-library/react, no jsdom configured in vitest). Adding a full DOM test framework exceeds the scope of a visual restyling phase. Validation is via `npm run build` (TypeScript/RSC correctness) and browser visual inspection.

### Sampling Rate
- **Per task commit:** `npm run typecheck` — catches TypeScript errors in new/modified components
- **Per wave merge:** `npm test && npm run typecheck` — full suite + type check
- **Phase gate:** `npm run build` green before `/gsd:verify-work` — catches RSC/client boundary errors and unused imports

### Wave 0 Gaps
- None — no new test files needed for this phase. Existing infrastructure covers all data-layer tests unchanged.

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `src/app/(public)/artikel/[publicId]/[slug]/page.tsx` — current article page structure
- Direct code inspection: `src/components/reader/BottomNav.tsx` — current nav (single-item stub)
- Direct code inspection: `src/app/globals.css` — all design tokens confirmed present
- Direct code inspection: `src/components/reader/HeroArticle.tsx` — full-bleed image + plain `<img>` pattern
- Direct code inspection: `src/components/reader/TopMeldungenRow.tsx` — horizontal scroll card pattern
- Direct code inspection: `src/app/(public)/layout.tsx` — Server Component, BottomNav rendered here
- Direct code inspection: `package.json` — Next.js 15.5.14, Vitest 2.1.9, Tailwind v4

### Secondary (MEDIUM confidence)
- Next.js App Router docs: `usePathname()` available from `next/navigation` in `"use client"` components — standard App Router pattern, confirmed by project usage elsewhere
- Material Design 3 Navigation Bar spec: active indicator is a pill wrapping only the icon (~64dp wide, ~32dp tall) — matches user decision in CONTEXT.md

### Tertiary (LOW confidence)
- Tailwind v4 `@tailwindcss/typography` prose modifier behavior for color overrides — behavior confirmed by pattern reasoning, not verified against Tailwind v4 Typography changelog

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, tokens already defined
- Architecture: HIGH — patterns derived directly from existing codebase code
- Pitfalls: HIGH — derived from Next.js RSC constraints and existing code structure
- Validation: HIGH — test framework confirmed, visual-only requirements need no new tests

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable stack — Next.js 15, Tailwind v4 tokens don't change between patch versions)
