# Phase 34: Shell Components - Research

**Researched:** 2026-04-01
**Domain:** CSS glassmorphism, Material Symbols variable font axes, bottom nav redesign, editorial footer, responsive header, Tailwind v4 backdrop-blur
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SHEL-01 | Bottom nav uses glassmorphism (85% opacity + backdrop-blur) with top-border active indicator | `--color-glass-nav` token already defined in globals.css; need to swap `bg-parchment` → `bg-glass-nav` + `backdrop-blur-md` on nav container; top-border replaces the current pill indicator |
| SHEL-02 | Bottom nav icons updated (auto_stories, forest, face_5, book_2) with filled active state | Material Symbols Rounded variable font loaded at FILL=0; filled state requires `font-variation-settings: 'FILL' 1` on the active icon span (or a per-icon inline style) |
| SHEL-03 | Dark editorial footer with Wurzelwelt branding, navigation columns, and Impressum/Kontakt links | Existing Footer.tsx is a minimal RSS-link list on bg-surface; needs full rebuild as dark (`bg-ink`) section with column layout, serif "Wurzelwelt" brand mark, and nav/legal links |
| SHEL-04 | Header shows hamburger menu + left-aligned serif "Wurzelwelt" on mobile | Current WurzelAppBar has centered logo; needs split layout: left-aligned `font-headline italic text-parchment` + right hamburger icon; requires `useState` for open/closed drawer |
| SHEL-05 | Header shows desktop navigation links (Archive, Forest, Guide, Library) on wider screens | Mobile hamburger hidden at `md:hidden`; desktop nav links shown at `md:flex`; "wider screens" threshold = Tailwind `md:` (768px) |
</phase_requirements>

---

## Summary

Phase 34 redesigns the four structural shell components that wrap all reader pages: the bottom navigation bar, the header/app bar, and the footer. Phase 33 completed the token migration — these components now use Archivist tokens correctly but still have v2.0 structural layouts. Phase 34 is a structural redesign within the existing token system, not another token migration.

The primary technical risk is the glassmorphic bottom nav on iOS Safari (SHEL-01 + SHEL-03 success criterion 3). Tailwind v4 auto-adds `-webkit-backdrop-filter` but this must be verified empirically at implementation time per the note in STATE.md. The `--color-glass-nav` token (`color-mix(in srgb, #FCF9EF 85%, transparent)`) is already defined in globals.css from Phase 33 — the nav implementation just needs to use it with `backdrop-blur-*`.

The filled icon state for Material Symbols (SHEL-02) requires understanding the variable font FILL axis. The current font URL loads at FILL=0 (outlined). Switching to FILL=1 per icon requires `font-variation-settings: 'FILL' 1` as an inline style on the icon span — there is no Tailwind utility for variable font axes without custom plugin.

The header redesign (SHEL-04, SHEL-05) merges `WurzelAppBar.tsx` behavior into the `Header.tsx` pattern — but the current layout has `WurzelAppBar` (centered logo, bezirk button) rather than a traditional hamburger header. The new design breaks from this to a standard mobile hamburger + desktop nav pattern.

**Primary recommendation:** Implement in three focused tasks: (1) glassmorphic nav + icon update, (2) dark editorial footer, (3) header hamburger/desktop nav redesign. The nav is the riskiest piece and should be committed first with iOS Safari verification.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tailwindcss | 4.2.2 (installed) | Utility classes including backdrop-blur, flex, responsive prefixes | Already the project standard |
| Material Symbols Rounded | Variable font via Google Fonts | Icon rendering with FILL axis | Already loaded in layout.tsx |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `usePathname` (next/navigation) | Next.js 15 | Detect active nav tab | Already used in WurzelNavBar/BottomNavClient |
| `useState` (react) | React 19 | Mobile menu open/close toggle | For hamburger drawer state in Header |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `font-variation-settings` inline style for filled icons | Load a second Material Symbols stylesheet at FILL=1 | Inline style is zero-overhead; second font load costs network + render |
| `backdrop-blur-md` (Tailwind utility) | Custom `backdrop-filter: blur(12px)` inline | Tailwind utility auto-prefixes `-webkit-backdrop-filter`; inline does not |

**No new packages required.**

---

## Architecture Patterns

### Recommended Component Structure

The existing `WurzelNavBar.tsx` is the nav component used in the public layout. `BottomNavClient.tsx` / `RegionalNavBar.tsx` appear to be legacy components that also exist but `WurzelNavBar` is the one actually imported in `(public)/layout.tsx`.

```
Components to modify:
src/components/reader/WurzelNavBar.tsx    ← SHEL-01, SHEL-02 (glassmorphic nav)
src/components/reader/Footer.tsx          ← SHEL-03 (dark editorial footer)
src/components/reader/WurzelAppBar.tsx    ← SHEL-04, SHEL-05 (header redesign)
```

The public layout does NOT use `Header.tsx` directly — it uses `WurzelAppBar.tsx`. `Header.tsx` is used by a different layout (RegionalAppBar pattern). **Only `WurzelAppBar.tsx` needs to change** for SHEL-04/05.

### Pattern 1: Glassmorphic Bottom Nav (SHEL-01)

**What:** Replace `bg-parchment` with `bg-glass-nav backdrop-blur-md` on the nav container. The glass token is `color-mix(in srgb, #FCF9EF 85%, transparent)` — already in globals.css.

**Active indicator change:** Remove the pill (`bg-aged-wood` filled rectangle). Replace with a top border on the active tab container. The requirement says "top-border active state indicator — the terracotta pill is gone."

```tsx
// WurzelNavBar.tsx container — before:
<nav className="fixed bottom-0 inset-x-0 z-40 bg-parchment shadow-[var(--shadow-nav)] h-16 flex items-center justify-around px-2 rounded-none">

// After:
<nav className="fixed bottom-0 inset-x-0 z-40 bg-glass-nav backdrop-blur-md shadow-[var(--shadow-nav)] h-16 flex items-center justify-around px-2">
```

```tsx
// Active tab — before: bg-aged-wood pill around icon
// After: top border on the tab wrapper
<Link
  className={`flex flex-col items-center gap-0.5 min-w-[56px] pt-1 ${
    isActive ? "border-t-2 border-ink" : "border-t-2 border-transparent"
  }`}
>
```

**Note:** Using `border-t-2 border-transparent` on inactive tabs maintains layout stability (no height jump when active border appears). The border-t rule appears to conflict with TOKN-02 (no visible borders), but TOKN-02 applies to section separation — a top-border active indicator on a nav tab is a UI affordance, not section separation. This is the design-specified pattern per SHEL-01.

### Pattern 2: Material Symbols Filled State (SHEL-02)

**What:** Material Symbols is a variable font with a FILL axis (0=outlined, 1=filled). The current font URL loads at default FILL=0. Per-icon filled state is achieved with `font-variation-settings`.

**Current font URL in layout.tsx:**
```
https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0
```
This loads the full variable font — all axes are available. FILL=0 is the default rendering but `font-variation-settings` can override per element.

**Icon data for SHEL-02:**
| Tab | Icon name | Maps to route |
|-----|-----------|---------------|
| Archive | `auto_stories` | `/` (Nachrichten → Archive) |
| Forest | `forest` | New route or `/bezirk` |
| Guide | `face_5` | New route |
| Library | `book_2` | `/suche` or new route |

**Note:** The current nav has 4 tabs (Nachrichten, Suche, Gemerkt, Profil) but SHEL-02 specifies different labels/icons. The tab labels and routes also need updating, not just the icons.

**Filled icon rendering:**
```tsx
// Active icon — filled:
<span
  className="material-symbols-rounded text-xl"
  style={{ fontVariationSettings: "'FILL' 1" }}
  aria-hidden="true"
>
  auto_stories
</span>

// Inactive icon — outlined:
<span
  className="material-symbols-rounded text-xl"
  aria-hidden="true"
>
  auto_stories
</span>
```

**Alternative approach — CSS class:**
```css
/* In globals.css */
.icon-filled {
  font-variation-settings: 'FILL' 1;
}
```
Then use `className={isActive ? "icon-filled" : ""}` on the span. This avoids inline styles.

### Pattern 3: Dark Editorial Footer (SHEL-03)

**What:** Replace the minimal `bg-surface` RSS-link footer with a dark `bg-ink` editorial footer with Wurzelwelt branding, navigation columns, and legal links.

**Current Footer.tsx** is a simple flat list with `bg-surface px-4 pt-6 pb-24`. The new footer must be a substantially richer component.

**Structure:**
```tsx
<footer className="bg-ink text-parchment px-[var(--spacing-gutter)] pt-12 pb-28">
  {/* Top: Branding */}
  <div className="max-w-3xl mx-auto">
    <span className="font-headline italic text-parchment text-2xl block mb-6">Wurzelwelt</span>

    {/* Navigation columns — flex/grid on wider screens */}
    <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-8">
      <div>
        <h3 className="font-label text-xs uppercase tracking-widest text-parchment/60 mb-3">Rubriken</h3>
        <ul className="space-y-2 text-sm text-parchment/80">
          <li><Link href="/">Archiv</Link></li>
          <li><Link href="/forest">Wald & Natur</Link></li>
          ...
        </ul>
      </div>
      {/* Legal column */}
      <div>
        <h3 ...>Rechtliches</h3>
        <ul>
          <li><Link href="/impressum">Impressum</Link></li>
          <li><Link href="/kontakt">Kontakt</Link></li>
        </ul>
      </div>
    </div>

    {/* Bottom: Copyright */}
    <div className="border-t border-parchment/10 pt-4 text-xs text-parchment/40">
      © {new Date().getFullYear()} Wurzelwelt
    </div>
  </div>
</footer>
```

**Note on `pb-28`:** The footer needs enough bottom padding so the glassmorphic nav (h-16) doesn't obscure footer content. `pb-28` (7rem) provides 112px clearance — more than the nav's 64px height with room for nav shadow.

**Note on border in footer:** The `border-t border-parchment/10` divider within the dark footer is acceptable — TOKN-02 "no visible borders" applies to section separation in the reader content area, not UI chrome separators within a dark footer container where tonal shifts would not provide enough contrast.

### Pattern 4: Responsive Header (SHEL-04, SHEL-05)

**What:** `WurzelAppBar.tsx` currently has a centered logo + bezirk location badge. SHEL-04/05 specify a different pattern: hamburger menu + left-aligned serif "Wurzelwelt" on mobile; Archive/Forest/Guide/Library nav links on wider screens.

**Key insight:** The WurzelAppBar currently manages Bezirk selection (bezirkLabel state + handleBezirkClick). The new design doesn't mention the Bezirk selector in the header. Research cannot determine if it should be removed or relocated without asking — this is a decision point.

**Responsive layout approach:**
```tsx
"use client";
import { useState } from "react";

export function WurzelAppBar({ bezirke }: WurzelAppBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40">
      {/* Styrian flag stripe — keep per Phase 33 decision */}
      <div
        className="w-full h-[4px]"
        style={{ background: 'linear-gradient(to bottom, #fff 50%, #2D5A27 50%)' }}
        aria-hidden="true"
      />

      <div className="bg-ink px-4 h-14 flex items-center justify-between">
        {/* Left: serif brand name */}
        <Link href="/" className="font-headline italic text-parchment text-xl">
          Wurzelwelt
        </Link>

        {/* Mobile: hamburger button — hidden on md+ */}
        <button
          className="md:hidden text-parchment"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menü öffnen"
        >
          <span className="material-symbols-rounded">
            {menuOpen ? "close" : "menu"}
          </span>
        </button>

        {/* Desktop: nav links — hidden below md */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-parchment">
          <Link href="/">Archiv</Link>
          <Link href="/forest">Wald</Link>
          <Link href="/guide">Ratgeber</Link>
          <Link href="/library">Bibliothek</Link>
        </nav>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <nav className="md:hidden bg-ink-soft px-4 py-4 flex flex-col gap-3 text-parchment">
          <Link href="/" onClick={() => setMenuOpen(false)}>Archiv</Link>
          <Link href="/forest" onClick={() => setMenuOpen(false)}>Wald</Link>
          <Link href="/guide" onClick={() => setMenuOpen(false)}>Ratgeber</Link>
          <Link href="/library" onClick={() => setMenuOpen(false)}>Bibliothek</Link>
        </nav>
      )}
    </header>
  );
}
```

**Routes for desktop nav:** Archive, Forest, Guide, Library. These are the conceptual labels from the success criteria. The actual route paths (`/`, `/bezirk`, `/suche`, etc.) will need to be mapped to the new labels during planning — this is a decision point for the planner.

### Anti-Patterns to Avoid

- **Using `bg-parchment/85` instead of `bg-glass-nav`:** The `glass-nav` token is `color-mix(in srgb, #FCF9EF 85%, transparent)` — using Tailwind's opacity modifier (`bg-parchment/85`) generates `background-color: oklch(... / 0.85)` which works differently from color-mix and may not produce the same glassy appearance. Use the defined token.
- **Adding `backdrop-filter` without `-webkit-backdrop-filter` as inline styles:** Always use the Tailwind `backdrop-blur-*` utility which auto-generates both prefixes. Never add `backdrop-filter: blur(Npx)` as a raw CSS value in a component — it will be invisible on iOS Safari.
- **Removing the Styrian flag stripe:** The `linear-gradient(to bottom, #fff 50%, #2D5A27 50%)` stripe above the header is a branding element — keep it per Phase 33 decisions. This is not part of the Archivist token system.
- **Using `border-b` on nav items for the active state:** The requirement specifically says "top-border active state indicator" — the border goes on the TOP of the tab, not the bottom.
- **Removing the `pb-20` on the main content wrapper in public layout.tsx:** The layout.tsx has `<main className="flex-1 pb-20">`. If the footer is already `pb-28` tall, the main content bottom padding may need adjustment — but this is a layout concern, not a component concern. Do not remove the existing main padding without checking that footer content is fully visible above the nav.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Variable font axis control | CSS class with JS string manipulation | `font-variation-settings: 'FILL' 1` inline style or `.icon-filled` CSS class | Font variation axes are CSS-native; no custom rendering needed |
| Glass background color | Opacity class + background-color combo | `bg-glass-nav` Tailwind utility from `--color-glass-nav` token | Token already defined in globals.css; color-mix is the correct implementation |
| Backdrop blur cross-browser | Inline `-webkit-backdrop-filter` + `backdrop-filter` | Tailwind `backdrop-blur-md` | Tailwind auto-generates both vendor-prefixed properties |
| Mobile nav drawer animation | Custom CSS transition + JS | Simple `{menuOpen && <nav>}` conditional render | Glassmorphic platform — static, no animation per REQUIREMENTS.md out-of-scope (animated backdrop-filter transitions) |

---

## Common Pitfalls

### Pitfall 1: iOS Safari backdrop-blur Invisible

**What goes wrong:** The glassmorphic bottom nav renders as fully opaque (bg-parchment fallback) or fully transparent on iOS Safari. The blur effect is missing.
**Why it happens:** `backdrop-filter: blur()` requires a non-opaque background color and must have `-webkit-backdrop-filter` for WebKit engines. If Tailwind v4 does not emit `-webkit-backdrop-filter` automatically (unverified empirically — noted as blocker in STATE.md), the effect is invisible on iOS Safari.
**How to avoid:** After implementing, test on an actual iOS device or iOS Simulator. If the blur is missing, add a `@layer utilities` override in globals.css:
```css
@layer utilities {
  .backdrop-blur-md {
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
  }
}
```
Or use an explicit inline style:
```tsx
style={{ WebkitBackdropFilter: 'blur(12px)', backdropFilter: 'blur(12px)' }}
```
**Warning signs:** Nav appears fully opaque (no see-through effect) when page is scrolled behind it; or nav container appears completely invisible.

### Pitfall 2: Glass Background Requires Transparent Children

**What goes wrong:** The glassmorphic nav is fully opaque even though `bg-glass-nav` is applied.
**Why it happens:** `backdrop-filter: blur()` only creates a visible frosted-glass effect when the element's background color has transparency (alpha < 1). If the background is `color-mix(in srgb, #FCF9EF 85%, transparent)` this is 85% opaque — transparent enough for the blur to show through.
**How to avoid:** Ensure nothing overrides the background to an opaque color. No `bg-parchment` or similar opaque class should be on the nav container after the change. The `shadow-[var(--shadow-nav)]` class does not affect background — it's fine to keep.

### Pitfall 3: Active Border Height Jump

**What goes wrong:** When a tab becomes active, the top border adds 2px and causes a height shift in the nav, making all icons jump up/down.
**Why it happens:** Adding `border-t-2` to the active element increases its rendered height by 2px if no corresponding space exists on inactive elements.
**How to avoid:** Apply `border-t-2 border-transparent` to ALL tabs (both active and inactive). The transparent border takes up space but is invisible, so the layout is stable:
```tsx
className={`flex flex-col items-center pt-1 border-t-2 ${isActive ? "border-ink" : "border-transparent"}`}
```

### Pitfall 4: Wrong Component Modified for Header

**What goes wrong:** `Header.tsx` is modified for SHEL-04/05 but the public layout actually uses `WurzelAppBar.tsx`.
**Why it happens:** The project has two header components: `Header.tsx` (used in regional layout patterns) and `WurzelAppBar.tsx` (used in `(public)/layout.tsx`). The success criteria describe the public reader header.
**How to avoid:** Modify `WurzelAppBar.tsx`. Confirm in `src/app/(public)/layout.tsx` which component is imported.
**Warning signs:** Changes to Header.tsx have no visible effect on the reader-facing pages.

### Pitfall 5: Nav Icon/Tab Mismatch — Icons vs. Routes

**What goes wrong:** The new icon names (`auto_stories`, `forest`, `face_5`, `book_2`) are specified in SHEL-02 but the corresponding routes (Archive, Forest, Guide, Library from SHEL-05) don't have existing pages yet.
**Why it happens:** The nav is being redesigned before all destination pages exist.
**How to avoid:** Map tabs to existing routes initially. `/` = Archive, `/suche` = or TBD, etc. Disabled tabs (like in current implementation) are acceptable for routes that don't exist yet. The success criteria require the ICONS and their filled state — they don't require the destination pages to exist.

### Pitfall 6: Footer Bottom Padding and Nav Overlap

**What goes wrong:** The bottom nav (fixed position, h-16) overlaps the footer content since the footer is the last element before the nav.
**Why it happens:** The nav is `position: fixed` at the bottom — it sits on top of the footer visually.
**How to avoid:** The footer's `pb-*` value must be at least `pb-20` (80px) to clear the 64px nav height + some breathing room. The current main content has `pb-20` — the footer needs similar treatment. Use `pb-28` (112px) on the footer.

---

## Code Examples

### Glassmorphic Nav Container

```tsx
// Source: globals.css --color-glass-nav token + Tailwind backdrop-blur
<nav className="fixed bottom-0 inset-x-0 z-40 bg-glass-nav backdrop-blur-md shadow-[var(--shadow-nav)] h-16 flex items-center justify-around px-2">
```

### Filled Icon with font-variation-settings

```tsx
// Source: Material Symbols variable font documentation — FILL axis
<span
  className={`material-symbols-rounded text-xl transition-colors ${isActive ? "text-ink" : "text-slate"}`}
  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
  aria-hidden="true"
>
  auto_stories
</span>
```

### Top-border Active Indicator (layout-stable)

```tsx
// border-t-2 on all tabs; transparent on inactive prevents height jump
<Link
  href={item.href}
  className={`flex flex-col items-center gap-0.5 min-w-[56px] pt-1 border-t-2 ${
    isActive ? "border-ink" : "border-transparent"
  }`}
>
```

### CSS class approach for filled icons (preferred over inline style)

```css
/* In globals.css — below @theme block */
.icon-filled {
  font-variation-settings: 'FILL' 1;
}
```

```tsx
<span
  className={`material-symbols-rounded text-xl ${isActive ? "icon-filled text-ink" : "text-slate"}`}
  aria-hidden="true"
>
  auto_stories
</span>
```

### Footer with nav clearance

```tsx
// pb-28 ensures content is visible above the h-16 fixed nav (64px + breathing room)
<footer className="bg-ink text-parchment px-[var(--spacing-gutter)] pt-12 pb-28">
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Solid parchment bottom nav | Glassmorphic bottom nav (bg-glass-nav + backdrop-blur) | Phase 34 | Nav becomes see-through, content scrolls visibly behind it |
| Active state: filled colored pill (bg-aged-wood) | Active state: top border (border-t-2 border-ink) | Phase 34 | More minimal/editorial, less skeuomorphic |
| Active icon: same outlined icon in parchment color | Active icon: filled variant via font-variation-settings | Phase 34 | Clearer visual affordance for active tab |
| Nav icons: newspaper, search, bookmark, person | Nav icons: auto_stories, forest, face_5, book_2 | Phase 34 | Matches Archivist editorial identity |
| Minimal RSS-link footer on bg-surface | Dark editorial footer on bg-ink | Phase 34 | Strong brand close to every page |
| Centered WurzelAppBar with avatar logo | Left-aligned serif + hamburger/desktop nav | Phase 34 | Standard mobile web navigation pattern |

---

## Open Questions

1. **Where does the Bezirk selector go after the header redesign?**
   - What we know: `WurzelAppBar.tsx` currently holds the Bezirk location badge + `openBezirkModal` dispatch. SHEL-04/05 describe hamburger + nav links but don't mention the Bezirk selector.
   - What's unclear: Is the Bezirk selector removed from the header, moved into the hamburger drawer, or placed elsewhere?
   - Recommendation: Move the Bezirk selector into the hamburger drawer on mobile; or add a location icon at the right of the desktop header. Planner should decide — do not remove the Bezirk selector functionality without confirmation.

2. **What are the actual routes for Archive/Forest/Guide/Library tabs?**
   - What we know: SHEL-02 specifies icons `auto_stories, forest, face_5, book_2` and SHEL-05 says "Archive, Forest, Guide, Library". None of these routes currently exist except `/` (homepage/archive).
   - What's unclear: Do these destination routes need to be created in Phase 34 or are the tabs pointing to TBD routes?
   - Recommendation: Implement nav with currently-existing routes where possible (e.g., `/` for Archive, `/suche` for a search/library). Mark non-existent tabs as disabled (opacity-40, no link) like the current pattern. Route creation is out of scope for Phase 34.

3. **Tailwind v4 backdrop-blur auto-prefix verification**
   - What we know: STATE.md explicitly flags: "Tailwind v4 -webkit-backdrop-filter auto-prefix must be verified empirically at Phase 34 start"
   - What's unclear: Whether Tailwind v4.2.2 emits `-webkit-backdrop-filter` in the generated CSS.
   - Recommendation: Wave 0 task should include: run `npx tailwindcss --input src/app/globals.css --output /tmp/tw-out.css` and grep for `-webkit-backdrop-filter`. If absent, add manual override to globals.css.

4. **`font-variation-settings` interaction with the font loading URL**
   - What we know: The Google Fonts URL in layout.tsx requests the variable font axes: `FILL,GRAD@24,400,0,0`. This means FILL=0 is the default instance requested.
   - What's unclear: Whether requesting FILL=0 as a default still allows per-element FILL=1 override via `font-variation-settings`.
   - Recommendation: Variable fonts serve the full axis range regardless of the default instance requested. The per-element `font-variation-settings: 'FILL' 1` override will work. This is standard variable font behavior (MEDIUM confidence — not verified with Google Fonts documentation for this specific URL format).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x (installed, vitest.config.ts present) |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SHEL-01 | Nav container has `bg-glass-nav` and `backdrop-blur-md` classes | static grep | `grep -n "bg-glass-nav\|backdrop-blur" src/components/reader/WurzelNavBar.tsx` | ✅ Wave 0 grep |
| SHEL-01 | Active indicator uses border-t, not bg-aged-wood pill | static grep | `grep -n "border-t\|bg-aged-wood" src/components/reader/WurzelNavBar.tsx` | ✅ Wave 0 grep |
| SHEL-02 | Nav uses correct icon names (auto_stories, forest, face_5, book_2) | static grep | `grep -n "auto_stories\|forest\|face_5\|book_2" src/components/reader/WurzelNavBar.tsx` | ✅ Wave 0 grep |
| SHEL-02 | Active icon uses fontVariationSettings FILL 1 | static grep | `grep -n "FILL\|fontVariation\|icon-filled" src/components/reader/WurzelNavBar.tsx` | ✅ Wave 0 grep |
| SHEL-03 | Footer has bg-ink background | static grep | `grep -n "bg-ink" src/components/reader/Footer.tsx` | ✅ Wave 0 grep |
| SHEL-03 | Footer has Impressum and Kontakt links | static grep | `grep -n "impressum\|kontakt\|Impressum\|Kontakt" src/components/reader/Footer.tsx` | ✅ Wave 0 grep |
| SHEL-04 | WurzelAppBar has hamburger icon on mobile | static grep | `grep -n "menu\|hamburger\|md:hidden" src/components/reader/WurzelAppBar.tsx` | ✅ Wave 0 grep |
| SHEL-04 | WurzelAppBar brand text is left-aligned italic serif | static grep | `grep -n "font-headline italic\|text-left" src/components/reader/WurzelAppBar.tsx` | ✅ Wave 0 grep |
| SHEL-05 | Desktop nav links hidden below md | static grep | `grep -n "hidden md:flex\|md:hidden" src/components/reader/WurzelAppBar.tsx` | ✅ Wave 0 grep |

**Note:** SHEL-01 through SHEL-05 are all visual/structural requirements. They cannot be unit tested in a jsdom environment (no backdrop-filter rendering). Validation is static grep analysis + visual browser inspection. The critical SHEL-01 iOS Safari criterion (#3 in success criteria) requires manual device testing.

### Sampling Rate
- **Per task commit:** `npx vitest run` to confirm no existing tests regressed
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green + manual browser inspection of glassmorphic nav on iOS Safari before `/gsd:verify-work`

### Wave 0 Gaps

None — existing test infrastructure covers all phase requirements. No new test files needed. The phase modifies existing components; no new testable logic is introduced.

---

## Sources

### Primary (HIGH confidence)
- `src/app/globals.css` — confirmed `--color-glass-nav`, `--shadow-nav`, all Archivist tokens present
- `src/components/reader/WurzelNavBar.tsx` — confirmed current structure (bg-parchment, aged-wood pill, rounded-none)
- `src/components/reader/WurzelAppBar.tsx` — confirmed current centered logo structure
- `src/components/reader/Footer.tsx` — confirmed current minimal bg-surface structure
- `src/app/(public)/layout.tsx` — confirmed WurzelAppBar + WurzelNavBar are the components used in public layout
- `src/app/layout.tsx` — confirmed Material Symbols Rounded variable font URL with FILL,GRAD axes
- `.planning/STATE.md` — confirmed Tailwind v4 -webkit-backdrop-filter is flagged as needing empirical verification

### Secondary (MEDIUM confidence)
- Phase 33 RESEARCH.md — confirms `--color-glass-nav` token pattern and `color-mix()` approach
- Phase 33 VERIFICATION.md — confirms token system is fully in place and WurzelNavBar has `rounded-none`
- Material Symbols variable font FILL axis — standard Google Fonts variable font behavior; `font-variation-settings: 'FILL' 1` is the documented override method

### Tertiary (LOW confidence)
- Google Fonts variable instance URL (FILL=0 default) + per-element override behavior — assumed to work based on standard variable font spec; not verified against Google Fonts documentation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all required libraries already installed and in use
- Architecture: HIGH — existing components read and understood; modification scope clear
- Glassmorphism implementation: HIGH — token already defined, Tailwind utility documented
- Material Symbols FILL axis: MEDIUM — standard variable font behavior, not verified against Google Fonts docs for this specific URL format
- iOS Safari verification: LOW — flagged in STATE.md as empirically unverified; must test at implementation time
- Header redesign (SHEL-04/05): MEDIUM — pattern is clear but route mapping and Bezirk selector disposition are open questions

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable CSS/Tailwind domain; Material Symbols variable font behavior stable)
