# Phase 17: Header & Identity - Research

**Researched:** 2026-03-25
**Domain:** Next.js 15 React client component styling — Tailwind v4 utility classes, sticky layout, CSS stripe patterns
**Confidence:** HIGH

## Summary

Phase 17 is a pure visual refactor of a single client component (`Header.tsx`) plus a 4px identity stripe. All design decisions are locked in CONTEXT.md with exact values. The technical implementation is straightforward: replace existing Tailwind utility classes on the `<header>` element, add a stripe element above it, and restyle child elements according to the locked spec. No new data fetching, no new routes, no schema changes.

The only architectural question left to Claude's discretion is where to place the stripe element (inside Header or in the public layout), and the implementation approach for the stripe itself (border-top, pseudo-element, or a sibling `<div>`). The sticky behavior requires the stripe and header to scroll off together — this constrains how they must be grouped.

The existing test suite uses Vitest with `environment: 'node'`, which means React component rendering tests are not currently supported (no jsdom/happy-dom). Validation for this phase must be visual/build-based rather than unit tests of the Header component's rendered output.

**Primary recommendation:** Wrap stripe + header in a single `<div className="sticky top-0 z-40">` containing first the stripe div and then the header element; this guarantees they move as one unit without layout hacks.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Identity stripe (HDR-01)**
- Thin 4px total height: 2px white (#fff) + 2px green (#2D5A27), equal halves matching the Styrian flag
- Full viewport width, edge to edge, no padding
- Fixed at top of viewport together with the header (stripe + header both sticky)
- Seamless join — green stripe band flows directly into the dark green header below, no gap or border
- Same 4px on all screen sizes, no responsive scaling
- Reader frontend only (public route group)

**Header layout & branding (HDR-02)**
- Dark green background using styrian-green (#2D5A27) token
- White (#fff) text and icons for all header elements
- Layout: brand name left, actions (badge + search) right
- Brand text: config-driven `config.siteName` (not hardcoded "RegionalNews") in italic Newsreader serif (font-headline italic)
- Header height stays at current h-14 (56px)

**Location badge & Bezirk selector (HDR-03)**
- Merged into a single tappable element — the location badge IS the Bezirk selector
- `location_on` Material Symbol icon + text label + `arrow_drop_down` icon
- Default label: "Steiermark" (when no Bezirk selected)
- Selected: shows first Bezirk name (e.g., "Graz"), with "+N" suffix for multiple selections
- Tapping opens BezirkModal via existing `openBezirkModal` custom event
- Plain text + icon treatment, no chip/pill background — just white on dark green
- Same logic as current Header.tsx but restyled

**Search icon (HDR-04)**
- `search` Material Symbol icon, positioned at the far right edge of the header
- Disabled/inactive until Phase 20 creates the search page
- Disabled state: 40% opacity, no cursor pointer, not clickable
- Phase 20 will activate it with a link to /suche

### Claude's Discretion
- Exact spacing/gaps between header elements
- Header bottom border treatment (if any)
- Hover/active states for the Bezirk selector button
- Stripe implementation approach (pseudo-element, separate div, or border)
- Any minor responsive adjustments for very wide screens

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HDR-01 | Fixed Styrian identity bar (white/green horizontal stripe) at top of viewport | Stripe-inside-sticky-wrapper pattern; Tailwind `h-[2px]` divisions |
| HDR-02 | Dark green header with italic serif "RegionalNews" branding | `bg-styrian-green`, `font-headline italic`, `config.siteName` already wired |
| HDR-03 | Steiermark location badge in header | Existing localStorage + BezirkModal event logic reused, restyled with Material Symbols |
| HDR-04 | Search icon in header linking to search page | `opacity-40 pointer-events-none` disabled state until Phase 20 |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | ^15.5.14 | App framework — client component hosting | Established project foundation |
| React | ^19.2.4 | Component model | Established project foundation |
| Tailwind CSS | ^4.2.2 | Utility styling via @theme tokens | Project decision: single source of truth in globals.css |
| Newsreader (next/font) | loaded in root layout | Serif brand font | Phase 16 decision — `--font-newsreader` → `font-headline` token |
| Material Symbols Outlined | CDN (loaded in layout head) | Icons (`location_on`, `arrow_drop_down`, `search`) | Phase 16 decision |

### Design Tokens (Already Defined in globals.css)
| Token | Value | Usage |
|-------|-------|-------|
| `bg-styrian-green` | #2D5A27 | Header background, bottom half of stripe |
| `text-white` | #fff | All header text/icons |
| `font-headline` | Newsreader, serif | Brand name italic |
| `h-14` | 56px | Header height — must stay unchanged |

### No New Installations Needed
All required libraries and tokens are already present from Phase 16.

## Architecture Patterns

### Sticky Wrapper Pattern (Recommended for HDR-01 + seamless join)

The stripe and header must scroll off-screen as a single unit and the bottom green stripe must flow seamlessly into the green header background. The cleanest approach is a wrapper div that holds both:

```
sticky-wrapper (sticky top-0 z-40)
├── stripe-div (4px total: 2px white top, 2px green bottom)
└── header (bg-styrian-green, h-14)
```

This way `sticky top-0` is applied once to the wrapper, not to the `<header>` element directly. The header's existing `sticky top-0 z-40` class moves to the wrapper.

**Alternative — stripe as border-top:** Apply `border-t-[2px] border-white` + `border-b-[2px] border-styrian-green` on the header itself using a pseudo-element approach, but this adds complexity for no benefit. The separate `<div>` approach is simpler.

**Alternative — stripe inside Header component:** Add the stripe `<div>` as the first child of the `<header>` element. This keeps it self-contained but means the `<header>` height includes the stripe, which adds layout math. Not recommended.

**Recommended approach:** Add a new wrapper `<div>` just outside the `<header>` element, either in `Header.tsx` (returning a fragment) or in `(public)/layout.tsx`. Since the stripe is purely visual and tied to the public layout, placing wrapper logic in `Header.tsx` via a React fragment return is clean — the component remains the single unit for both.

### Recommended Project Structure (No Changes to File Tree)

```
src/
├── components/reader/Header.tsx    # Refactor in place — only file that changes
├── app/(public)/layout.tsx         # No changes needed
└── app/globals.css                 # No changes needed (tokens already defined)
```

### Pattern: Disabled Icon State

For HDR-04 (search icon, disabled until Phase 20):

```tsx
// Disabled — no interaction, visual only
<span
  className="material-symbols-outlined text-white opacity-40 cursor-default"
  aria-hidden="true"
>
  search
</span>
```

Do NOT use a `<button>` wrapper for a disabled icon. A plain `<span>` with no click handler is semantically correct and prevents any accidental interaction.

### Pattern: Icon + Text Badge Button (HDR-03)

```tsx
<button
  onClick={handleBezirkClick}
  className="flex items-center gap-1 text-white text-sm hover:opacity-80 transition-opacity"
  aria-label="Bezirk auswählen"
>
  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">location_on</span>
  <span>{bezirkLabel}</span>
  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_drop_down</span>
</button>
```

The `text-[18px]` size for icons keeps them proportional to the `text-sm` label text. Exact sizing is Claude's discretion.

### Pattern: 4px Stripe (Two Equal 2px Bands)

```tsx
<div className="w-full h-[4px] flex flex-col">
  <div className="flex-1 bg-white" />
  <div className="flex-1 bg-styrian-green" />
</div>
```

Or equivalently using a single div with a CSS gradient (no extra DOM nodes):

```tsx
<div
  className="w-full h-[4px]"
  style={{ background: 'linear-gradient(to bottom, #fff 50%, #2D5A27 50%)' }}
  aria-hidden="true"
/>
```

The gradient approach is marginally cleaner (1 element, no flex child math). Either works. The `aria-hidden="true"` is correct — this is purely decorative.

### Anti-Patterns to Avoid
- **Applying `sticky top-0` separately to stripe and header:** They will scroll independently — stripe disappears first. Use a single wrapper.
- **Hardcoding "RegionalNews" as brand text:** CONTEXT.md explicitly locks this to `config.siteName`.
- **Hardcoding `#2D5A27` inline:** Use `bg-styrian-green` Tailwind token — it's already defined in globals.css.
- **Wrapping the disabled search icon in a `<button disabled>`:** Adds visual inconsistency across browsers. Use a `<span>` with no handler instead.
- **Adding a visible gap or border between stripe and header:** The locked decision requires seamless join — green stripe flows directly into green header.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sticky multi-element group | Custom JS scroll listener | CSS `sticky` on wrapper div | Native CSS, zero JS, works on all screen sizes |
| Bezirk selection state | New state management | Existing localStorage + BezirkModal event | Already implemented and tested in BezirkModal.tsx |
| Font loading | Manual @font-face | next/font already loading Newsreader | Avoids FOUC, already optimized in root layout |
| Icon font loading | Self-hosting Material Symbols | CDN link already in layout head | Phase 16 decision, GDPR acknowledged |

## Common Pitfalls

### Pitfall 1: Stripe and Header Scrolling Independently
**What goes wrong:** Developer applies `sticky top-0` to `<header>` and the stripe sits above it as a sibling — stripe scrolls away, header stays.
**Why it happens:** Intuitive to make the semantic `<header>` element sticky, forgetting the stripe is a sibling.
**How to avoid:** Wrap both in a single container div with `sticky top-0 z-40`. The `<header>` element itself should NOT have `sticky` — the wrapper owns it.
**Warning signs:** Stripe disappears on scroll but header remains — or vice versa.

### Pitfall 2: Tailwind v4 Token Reference Syntax
**What goes wrong:** Using `text-[#2D5A27]` arbitrary value instead of `text-styrian-green` token class.
**Why it happens:** Habit from hardcoding hex colors, or not knowing the token is defined.
**How to avoid:** All colors are in globals.css `@theme` block — use the token name (`bg-styrian-green`, `text-cream`, etc.). Arbitrary hex values bypass the design system.

### Pitfall 3: Material Symbols Icon Size Not Matching Text
**What goes wrong:** Default Material Symbols render at 24px optical size — too large next to `text-sm` (14px) label text.
**Why it happens:** Default icon size is 24px unless overridden with `text-[18px]` or similar.
**How to avoid:** Set icon font-size explicitly via Tailwind size utility (`text-[18px]` or `text-lg`) on the `<span class="material-symbols-outlined">`.

### Pitfall 4: `font-headline italic` vs `italic font-headline` Class Order
**What goes wrong:** `italic` modifier not applying because Tailwind v4 generates font utilities differently.
**Why it happens:** Non-issue — both orders work. But developer may not realize `font-headline` provides `font-family` while `italic` provides `font-style`. They are independent Tailwind utilities.
**How to avoid:** Use both classes: `className="font-headline italic"`. No special ordering needed.

### Pitfall 5: Header Height Growing to Include Stripe
**What goes wrong:** Adding the stripe as a child of `<header>` causes the header's layout height to exceed 56px (h-14), pushing page content down.
**Why it happens:** Stripe placed inside the `<header>` element which already has `h-14` and `flex items-center`.
**How to avoid:** Stripe must be outside the `<header>` element — either a sibling before it inside a wrapper div, or as the first child of a wrapper that does not use `flex items-center`.

## Code Examples

### Full Revised Header.tsx Structure

```tsx
// src/components/reader/Header.tsx
"use client";

import { useEffect, useState } from "react";
import config from '@/../bundesland.config';
import type { BezirkItem } from '@/types/bundesland';

export function Header({ bezirke }: { bezirke: BezirkItem[] }) {
  const [bezirkLabel, setBezirkLabel] = useState<string>("Steiermark");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("bezirk_selection");
      if (raw) {
        const slugs: string[] = JSON.parse(raw);
        if (Array.isArray(slugs) && slugs.length > 0) {
          const bezirkNames = Object.fromEntries(bezirke.map(b => [b.slug, b.name]));
          const firstName = bezirkNames[slugs[0]] ?? slugs[0];
          setBezirkLabel(
            slugs.length > 1 ? `${firstName} +${slugs.length - 1}` : firstName
          );
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [bezirke]);

  function handleBezirkClick() {
    window.dispatchEvent(new CustomEvent("openBezirkModal"));
  }

  return (
    // Wrapper owns sticky behavior — stripe + header scroll as one unit
    <div className="sticky top-0 z-40">
      {/* HDR-01: Styrian identity stripe — 4px, 2px white + 2px green */}
      <div
        className="w-full h-[4px]"
        style={{ background: 'linear-gradient(to bottom, #fff 50%, #2D5A27 50%)' }}
        aria-hidden="true"
      />
      {/* HDR-02: Dark green editorial header */}
      <header className="bg-styrian-green px-4 h-14 flex items-center justify-between">
        {/* Brand name — italic serif, config-driven */}
        <span className="font-headline italic text-white text-xl">
          {config.siteName}
        </span>
        {/* Right actions: location badge + search */}
        <div className="flex items-center gap-3">
          {/* HDR-03: Location badge / Bezirk selector */}
          <button
            onClick={handleBezirkClick}
            className="flex items-center gap-1 text-white text-sm hover:opacity-80 transition-opacity"
            aria-label="Bezirk auswählen"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">location_on</span>
            <span>{bezirkLabel}</span>
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_drop_down</span>
          </button>
          {/* HDR-04: Search icon — disabled until Phase 20 */}
          <span
            className="material-symbols-outlined text-white opacity-40 cursor-default"
            aria-hidden="true"
          >
            search
          </span>
        </div>
      </header>
    </div>
  );
}
```

Note: exact `text-xl` size for brand name and `gap-3` between actions are Claude's discretion per CONTEXT.md. The above values are reasonable starting points.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `sticky` on `<header>` element | `sticky` on wrapper div containing stripe + header | Phase 17 | Stripe and header scroll as one unit |
| `bg-white border-b border-zinc-200` header | `bg-styrian-green` header | Phase 17 | v1.1 design identity |
| `font-label font-bold text-zinc-900` brand | `font-headline italic text-white` brand | Phase 17 | Serif editorial identity |
| Button-style Bezirk selector | Icon + text inline selector (white on green) | Phase 17 | Matches design spec |
| No search icon | Disabled `search` icon (phase placeholder) | Phase 17 | HDR-04 placeholder until Phase 20 |

## Open Questions

1. **Brand name font size**
   - What we know: Header is h-14 (56px), existing brand uses no explicit size class (inherits body), new font is Newsreader (taller x-height than Work Sans)
   - What's unclear: Exact `text-xl` vs `text-2xl` vs `text-lg` — only visual testing can confirm the right balance
   - Recommendation: Claude's discretion per CONTEXT.md. Start with `text-xl`, adjust if it feels cramped or oversized.

2. **Header bottom border**
   - What we know: Current header has `border-b border-zinc-200`. The new header is dark green — a bottom border would only be visible if it contrasts against page content (cream background).
   - What's unclear: Whether a subtle divider is needed between header and page content
   - Recommendation: Claude's discretion. A `border-b border-[#244d20]` (slightly darker green) would provide subtle depth. Or omit entirely — the color contrast between dark green header and cream page background is sufficient separation.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (^2.x — check package.json) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HDR-01 | Identity stripe renders at 4px height, white+green | manual-only | visual inspection | N/A |
| HDR-02 | Header renders with bg-styrian-green, italic serif brand from config | manual-only | visual inspection | N/A |
| HDR-03 | Bezirk label defaults to "Steiermark"; shows district name + "+N" for multi-selection | unit | `npx vitest run src/components/reader/Header.test.tsx` | ❌ Wave 0 |
| HDR-04 | Search icon renders in disabled state (opacity-40, no click) | manual-only | visual inspection | N/A |

**Note on test environment:** The existing Vitest config uses `environment: 'node'` (not jsdom). Rendering React components with DOM assertions (e.g., `@testing-library/react`) requires jsdom or happy-dom. For HDR-03 logic tests, the label computation logic (localStorage → bezirkLabel) can be extracted into a pure function and tested without DOM. Alternatively, the Wave 0 gap can be skipped in favor of visual validation only — but adding a unit test for the label logic is low-effort and high-value.

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/reader/Header.test.tsx` — covers HDR-03 label logic (requires either: extracting label logic to pure function, or adding `environment: 'jsdom'` override)

*(All other HDR requirements are purely visual — no automated test appropriate)*

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `/src/components/reader/Header.tsx` — full current implementation known
- Direct code inspection of `/src/app/globals.css` — exact token names verified
- Direct code inspection of `/src/app/layout.tsx` — font loading and CDN icon link confirmed
- Direct code inspection of `/bundesland.config.ts` — `config.siteName` = "Ennstal Aktuell" confirmed
- Direct code inspection of `vitest.config.ts` — test runner confirmed as Vitest, `environment: 'node'`
- Direct code inspection of `/src/app/(public)/layout.tsx` — `<Header bezirke={bezirke} />` rendering confirmed

### Secondary (MEDIUM confidence)
- CONTEXT.md decisions — all locked implementation values are taken verbatim from user's discussion session
- REQUIREMENTS.md — HDR-01 through HDR-04 descriptions cross-referenced

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries and tokens already in project, read directly from source files
- Architecture: HIGH — sticky wrapper pattern is well-established CSS; code example derived from existing Header.tsx
- Pitfalls: HIGH — derived from direct code inspection of existing component and Tailwind v4 token system
- Test infrastructure: HIGH — vitest.config.ts read directly

**Research date:** 2026-03-25
**Valid until:** 2026-06-25 (stable stack — Tailwind v4 and Next.js 15 both in active maintenance)
