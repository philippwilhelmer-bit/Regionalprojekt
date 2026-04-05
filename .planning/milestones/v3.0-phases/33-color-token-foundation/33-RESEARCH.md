# Phase 33: Color Token Foundation - Research

**Researched:** 2026-04-01
**Domain:** Tailwind CSS v4 @theme tokens, color-mix(), semantic design tokens, component migration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Token naming convention**
- Editorial names as roots: ink, parchment, slate, aged-wood
- Brightness-scale suffixes: -dim, -soft, -bright, -muted (based on lightness relative to root)
- Glassmorphism uses standalone `glass-` prefix: glass-nav, glass-overlay
- Old token names (primary, secondary, accent, background, surface, etc.) removed entirely — clean break, no aliases

**Tonal surface palette**
- 3 tonal levels: parchment (#FCF9EF, main bg), parchment-dim (#F6F4EA, section alternation), parchment-bright (#FFFFFF, elevated cards/modals)
- No-Line Rule enforced via tonal background shifts only — no negative space fallback, no borders
- All existing borders in reader components (ListItem.tsx, ArticleFeed.tsx) replaced with tonal shifts
- Shadows use ink-tinted color-mix() — never pure black or gray hex
- Spacing tokens enforced: --spacing-gutter (1rem horizontal), --spacing-vertical (1.7rem, 3:5 ratio), --spacing-section (4rem)

**Bezirk color handling**
- All 13 per-Bezirk gradient maps (BEZIRK_COLORS, BEZIRK_BADGE_COLORS) removed entirely from ArticleCard.tsx
- All cards use unified Archivist ink gradient and badge styling from tokens
- TopMeldungenRow.tsx gets same treatment — collapse per-Bezirk hex values to unified tokens
- bundesland.config.ts branding colors (#154212, #2d7a1f) kept separate from design tokens (same as Phase 16 decision)

**Migration scope**
- Full sweep of reader components + token definitions in one phase
- globals.css: complete token system (~30 tokens, shadow tokens, spacing tokens, glassmorphism tokens)
- 9 reader files: all raw hex values replaced with token references
- 12 reader files: all rounded-xl/rounded-full/rounded-lg flattened to 0.125rem or 0.25rem
- 3 reader files: border removal, replaced with tonal shifts
- Admin/CMS files untouched — Phase 37 handles those

**Border radius rules**
- 0.125rem (2px): buttons, badges, inputs, chips, nav items
- 0.25rem (4px): cards, image containers, modals, overlays
- No rounded-full anywhere in reader components — avatars and pills get sharp treatment too

**Visual expectations**
- Site will look partially styled after Phase 33 — colors and radii correct, but shell layout still v2.0 structure
- This is an expected intermediate state; Phases 34-37 handle structural component redesigns

### Claude's Discretion
- Exact hex values for token variants (ink-soft, ink-muted, slate-soft, etc.) — as long as they follow the brightness-scale convention
- Exact shadow size/spread values
- Number of shadow tokens (sm, md, lg) and their specifics
- How to handle edge cases in border removal where tonal shift alone may not provide enough visual separation

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TOKN-01 | Site uses MD3-style color token system (Ink #071806, Parchment #FCF9EF, Slate #50606F, Aged Wood #230E08) with ~30 semantic surface/container variants | Tailwind v4 @theme block supports arbitrary CSS custom properties; confirmed ~30 tokens fit within standard @theme syntax |
| TOKN-02 | No visible borders on any reader-facing component — sections separated by tonal background shifts and negative space only | Identified 3 border locations: ListItem.tsx (border-b border-surface), ArticleFeed.tsx (spinner only — functional), WurzelNavBar/BottomNavClient/RegionalNavBar (top border on nav — Phase 34 scope) |
| TOKN-03 | Border radii use 0.125rem (default) and 0.25rem (lg) throughout — no rounded corners | Tailwind v4 @theme allows overriding --radius-xs/--radius-sm; found 9 reader files with rounded-full/xl violations |
| TOKN-04 | Vertical spacing follows 3:5 ratio rhythm (1rem horizontal → 1.7rem vertical) | --spacing-gutter currently set to 1.7rem (wrong — should be 1rem); --spacing-vertical: 1.7rem needs adding; confirmed @theme spacing tokens work |
| TOKN-05 | Glassmorphism surface tokens defined via color-mix() for nav and overlays | Tailwind v4 @theme supports static CSS values; color-mix() works as token VALUES but cannot reference other CSS vars directly inside @theme (see Pitfalls); safe approach documented |
| TOKN-06 | All shadows use tinted on-surface color, never pure black | Tailwind v4 default --shadow-sm uses rgb(0 0 0) — must override all shadow tokens in @theme; 3 nav components use shadow-[0_-2px_8px_rgba(0,0,0,0.06)] inline — needs inline style with color-mix() |
</phase_requirements>

---

## Summary

Phase 33 replaces the existing 8-token color system with a ~30-token MD3-style semantic palette in a single pass. The work is primarily CSS variable definition in globals.css plus a component sweep removing old token names, bezirk-specific hex maps, oversized border radii, and visible borders from reader-facing components. Admin/CMS files are explicitly out of scope.

The technology is stable Tailwind CSS v4.2.2 with the `@theme` block pattern already established in the project. The key technical constraint is that `color-mix()` expressions in `@theme` cannot reference other CSS custom properties (`var()`) — they must use literal color values. This means glassmorphism tokens are defined with literal hex colors inside `color-mix()`, not as compositions of other tokens.

The migration scope is larger than the 3 files named in CONTEXT.md. A full codebase audit reveals 9 reader component files with `rounded-full` violations, 3 nav components with raw `rgba(0,0,0)` inline shadow syntax, and widespread `zinc-*` color classes that need replacing with token references.

**Primary recommendation:** Define the complete @theme block first (Wave 1), then migrate components file-by-file in a deterministic order (border/hex removal first, then radius normalization).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tailwindcss | 4.2.2 (installed) | CSS utility framework + @theme token system | Already the project standard; @theme is the single source of truth per Phase 16 decision |
| @tailwindcss/postcss | (bundled) | PostCSS integration | Already configured in postcss.config.mjs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS color-mix() | native (CSS Color 5) | Glassmorphism transparency tokens | For glass-nav and glass-overlay definitions inside @theme |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline color-mix() in @theme with literals | CSS vars composing other CSS vars | CSS vars in @theme values ARE supported for font/spacing but color-mix() with var() references has compatibility risk — use literals for safety |
| `style={{ boxShadow: ... }}` for nav shadow | shadow-[...] arbitrary value | Both work; prefer custom @theme shadow token to avoid three separate inline shadow strings |

**No new installation required.** All tooling is already present.

---

## Architecture Patterns

### Recommended @theme Token Structure

```css
/* Source: globals.css @theme block */
@theme {
  /* === BASE PALETTE === */
  --color-ink:           #071806;   /* darkest — body text */
  --color-ink-soft:      #2a3a28;   /* slightly lighter ink */
  --color-ink-muted:     #4a5a48;   /* muted ink — secondary text */
  --color-ink-dim:       #6a7a68;   /* dim ink — meta/timestamp */

  --color-parchment:        #FCF9EF; /* main background */
  --color-parchment-dim:    #F6F4EA; /* section alternation */
  --color-parchment-bright: #FFFFFF; /* elevated cards/modals */

  --color-slate:        #50606F;  /* cool mid-tone — UI chrome */
  --color-slate-soft:   #6e7e8d;
  --color-slate-muted:  #8c9caa;
  --color-slate-dim:    #aabbc8;

  --color-aged-wood:       #230E08; /* dark warm — accent surfaces */
  --color-aged-wood-soft:  #4a2a1e;
  --color-aged-wood-muted: #7a5a4e;
  --color-aged-wood-dim:   #a8887c;

  /* === SEMANTIC SURFACES === */
  --color-surface:          var(--color-parchment-dim);
  --color-surface-elevated: var(--color-parchment-bright);
  --color-surface-overlay:  var(--color-parchment);

  /* === GLASSMORPHISM (color-mix with literals) === */
  --color-glass-nav:     color-mix(in srgb, #FCF9EF 85%, transparent);
  --color-glass-overlay: color-mix(in srgb, #FCF9EF 70%, transparent);

  /* === SHADOWS (ink-tinted, not black) === */
  --shadow-sm: 0 1px 3px 0 color-mix(in srgb, #071806 10%, transparent);
  --shadow-md: 0 4px 6px -1px color-mix(in srgb, #071806 12%, transparent),
               0 2px 4px -2px color-mix(in srgb, #071806 8%, transparent);
  --shadow-lg: 0 10px 15px -3px color-mix(in srgb, #071806 12%, transparent),
               0 4px 6px -4px color-mix(in srgb, #071806 8%, transparent);
  --shadow-nav: 0 -2px 8px color-mix(in srgb, #071806 8%, transparent);

  /* === BORDER RADIUS (flat Archivist scale) === */
  --radius-xs: 0.125rem;  /* buttons, badges, chips, nav items */
  --radius-sm: 0.25rem;   /* cards, image containers, modals */

  /* === SPACING === */
  --spacing-gutter:   1rem;   /* horizontal gutters (was 1.7rem — fix) */
  --spacing-vertical: 1.7rem; /* vertical rhythm (new token) */
  --spacing-section:  4rem;   /* section separation */

  /* === TYPOGRAPHY === */
  --font-headline: var(--font-newsreader), serif;
  --font-body:     var(--font-jakarta), sans-serif;
  --font-label:    var(--font-jakarta), sans-serif;
}
```

### Pattern 1: Tonal Background Shift (No-Line Rule)

**What:** Replace `border-b` dividers with background color differences between parent and sibling containers.
**When to use:** Anywhere a border currently separates list items or sections.

**Before (ListItem.tsx):**
```tsx
className="flex items-start gap-3 py-3 border-b border-surface last:border-b-0 hover:bg-surface/50 transition-colors"
```

**After:**
```tsx
className="flex items-start gap-3 py-3 bg-parchment hover:bg-parchment-dim transition-colors"
```
The enclosing list container gets `bg-parchment-dim`, each item gets `bg-parchment`, creating tonal separation without a line.

### Pattern 2: Unified Ink Gradient (replaces BEZIRK_COLORS)

**What:** Delete `BEZIRK_COLORS` and `BEZIRK_BADGE_COLORS` maps. Replace with single token-based gradient.
**When to use:** ArticleCard.tsx and TopMeldungenRow.tsx gradient fallback div.

```tsx
// Before — per-bezirk map lookup:
const gradientColor = firstBezirk
  ? (BEZIRK_COLORS[firstBezirk.slug] ?? "from-secondary to-[#5a7d54]")
  : "from-secondary to-[#5a7d54]";
// ...
<div className={`bg-gradient-to-br ${gradientColor} ...`} />

// After — unified Archivist gradient:
<div className="bg-gradient-to-br from-ink to-ink-soft ..." />
```

Badge styling likewise:
```tsx
// Before: BEZIRK_BADGE_COLORS[bezirk.slug] ?? "text-secondary bg-background"
// After:
<Link className="inline-block text-xs px-2 py-0.5 rounded-xs font-medium text-parchment bg-ink-soft">
```

### Pattern 3: Shadow Token Override

**What:** Tailwind v4 default shadow tokens use `rgb(0 0 0)`. Override them in @theme.
**When to use:** The `--shadow-sm`, `--shadow-md`, `--shadow-lg` tokens in @theme must be redefined with `color-mix(in srgb, #071806 ...)`. Tailwind v4 uses these CSS variables for `shadow-sm`, `shadow-md`, etc. utilities automatically.

**Critical:** Three nav components use `shadow-[0_-2px_8px_rgba(0,0,0,0.06)]` as an arbitrary value class — replace with custom `shadow-nav` token (add `--shadow-nav` to @theme, use `shadow-[var(--shadow-nav)]`).

### Pattern 4: Border Radius via @theme Override

**What:** Override `--radius-xs` and `--radius-sm` in @theme to set the flat Archivist scale globally.
**When to use:** Setting `--radius-xs: 0.125rem` and `--radius-sm: 0.25rem` in @theme means `rounded-xs` → 2px and `rounded-sm` → 4px everywhere. Component-level rounded-full/xl/lg must be changed to `rounded-xs` or `rounded-sm` manually.

Tailwind v4 default scale has `--radius-xs: 0.125rem` and `--radius-sm: 0.25rem` already — these match our target values exactly. No override needed for xs/sm. The issue is components using `rounded-full`, `rounded-lg`, `rounded-xl`, `rounded-2xl` which map to larger defaults.

### Anti-Patterns to Avoid

- **var() inside color-mix() in @theme:** `color-mix(in srgb, var(--color-ink) 10%, transparent)` — DO NOT use; Tailwind v4 processes @theme statically and `var()` inside functional notations in @theme values may not resolve at parse time. Use literal hex values.
- **Keeping old token names as aliases:** The decision is a clean break. Do not add `--color-background: var(--color-parchment)` bridge aliases — they will leak into Phase 37 admin migration scope.
- **Migrating admin files:** Any file under `src/app/(admin)/` or `src/app/admin/` is out of scope. Do not touch them.
- **Changing the `#154212`/`#2d7a1f` in bundesland.config.ts:** These are branding colors separate from the design token system.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Color-mixing for transparency | Custom opacity utilities | CSS `color-mix(in srgb, #hex N%, transparent)` | Native CSS Color 5, supported in all modern browsers, no JS needed |
| Shadow color derivation | JS-computed shadow strings | `--shadow-*` tokens in @theme with color-mix literals | Tailwind resolves these to `shadow-sm` etc. automatically |
| Token inventory spreadsheet | Manual tracking | The @theme block itself IS the inventory | Single source of truth |
| Radius utility remapping | Custom plugin | @theme `--radius-xs`/`--radius-sm` override | Tailwind v4 reads these natively |

---

## Common Pitfalls

### Pitfall 1: --spacing-gutter Has Wrong Current Value

**What goes wrong:** globals.css currently sets `--spacing-gutter: 1.7rem`. The CONTEXT.md decision requires `--spacing-gutter: 1rem` (horizontal) and a NEW `--spacing-vertical: 1.7rem`. If the planner doesn't catch this, the gutter token stays wrong.
**Why it happens:** The existing token was misnamed — its value (1.7rem) is vertical rhythm, not horizontal gutter.
**How to avoid:** When rewriting the @theme block, explicitly set `--spacing-gutter: 1rem` and add `--spacing-vertical: 1.7rem`.
**Warning signs:** If after the phase TopMeldungenRow still uses `px-[var(--spacing-gutter)]` and content feels too wide, the old value was carried over.

### Pitfall 2: color-mix() with var() References in @theme

**What goes wrong:** Writing `color-mix(in srgb, var(--color-ink) 10%, transparent)` in @theme for shadow tokens causes the value to be interpreted literally as a CSS string — Tailwind's @theme processor does not resolve var() references when building utility classes.
**Why it happens:** Tailwind v4 reads @theme statically to generate utility classes; CSS custom properties only resolve at runtime in the browser.
**How to avoid:** Use literal hex values: `color-mix(in srgb, #071806 10%, transparent)`.
**Warning signs:** Shadow utilities produce no visual output (the shadow is technically applied but the browser can't compute the color).

### Pitfall 3: shadow-[arbitrary] Syntax Bypasses Token Overrides

**What goes wrong:** WurzelNavBar.tsx, BottomNavClient.tsx, and RegionalNavBar.tsx all use `shadow-[0_-2px_8px_rgba(0,0,0,0.06)]`. Overriding `--shadow-*` in @theme has NO effect on these because they use arbitrary value syntax that hardcodes the shadow string.
**Why it happens:** Tailwind arbitrary values bypass the theme variable system entirely.
**How to avoid:** Replace the three inline arbitrary shadows with a `shadow-[var(--shadow-nav)]` reference — define `--shadow-nav` in @theme with an ink-tinted color-mix().
**Warning signs:** TOKN-06 audit passes for shadow utilities but still fails for these three nav components.

### Pitfall 4: Old Token Names Still Referenced After Clean Break

**What goes wrong:** After rewriting @theme, component references to `text-primary`, `bg-background`, `bg-surface`, `bg-surface-elevated`, `text-secondary` will produce no styling (Tailwind generates utilities from @theme — if the token doesn't exist, the utility doesn't exist).
**Why it happens:** The clean-break decision removes all old names. If any reader component is missed in the sweep, it silently loses its color.
**How to avoid:** After writing @theme, do a full-codebase grep for `text-primary|bg-background|bg-surface-elevated|text-secondary|text-accent|bg-primary|bg-secondary` restricted to reader components. Treat any hit as a migration gap.
**Warning signs:** Visual regression — components appear in default browser color (black text on white) instead of parchment palette.

### Pitfall 5: Spinner rounded-full is Functional, Not Decorative

**What goes wrong:** ArticleFeed.tsx has `rounded-full` on the loading spinner (`w-6 h-6 ... rounded-full animate-spin`). Removing rounded-full from this element makes it a square spinner — it will look broken.
**Why it happens:** This is a circular spinner that requires rounded-full to look correct.
**How to avoid:** The CONTEXT.md decision says "no rounded-full anywhere in reader components" but the spinner is a special case. Either accept a square spinner (consistent with the flat Archivist aesthetic) or use an inline `style={{ borderRadius: '50%' }}` that isn't a Tailwind utility class — the No-Rounded-Full rule targets decorative elements.
**Recommendation (Claude's discretion):** Use `style={{ borderRadius: '50%' }}` on the spinner — it's a functional circular indicator, not a decorative pill or avatar.

### Pitfall 6: BezirkSection.tsx / Header.tsx / RegionalAppBar.tsx Have Branding Hex

**What goes wrong:** `Header.tsx`, `RegionalAppBar.tsx`, `BezirkSection.tsx`, and `RegionalSelector.tsx` all contain `style={{ background: 'linear-gradient(to bottom, #fff 50%, #2D5A27 50%)' }}`. This is the Steiermark flag color — it falls under bundesland.config.ts branding, not the design token system.
**Why it happens:** These are Bundesland visual identity elements, not Archivist palette.
**How to avoid:** Leave these inline styles untouched. The CONTEXT.md decision explicitly keeps `#154212`/`#2d7a1f` branding colors separate.
**Warning signs:** If a task plan proposes replacing these with aged-wood tokens, that's wrong.

---

## Code Examples

### Verified: Tailwind v4 @theme shadow override syntax

```css
/* Source: tailwindcss@4.2.2 theme.css line 406-411 — default values we override */
/* Overrides go in src/app/globals.css @theme block */
@theme {
  /* Override defaults — Tailwind picks these up for shadow-sm, shadow-md, shadow-lg */
  --shadow-2xs: 0 1px color-mix(in srgb, #071806 5%, transparent);
  --shadow-xs:  0 1px 2px 0 color-mix(in srgb, #071806 5%, transparent);
  --shadow-sm:  0 1px 3px 0 color-mix(in srgb, #071806 10%, transparent),
                0 1px 2px -1px color-mix(in srgb, #071806 6%, transparent);
  --shadow-md:  0 4px 6px -1px color-mix(in srgb, #071806 12%, transparent),
                0 2px 4px -2px color-mix(in srgb, #071806 8%, transparent);
  --shadow-lg:  0 10px 15px -3px color-mix(in srgb, #071806 12%, transparent),
                0 4px 6px -4px color-mix(in srgb, #071806 8%, transparent);
  --shadow-xl:  0 20px 25px -5px color-mix(in srgb, #071806 12%, transparent),
                0 8px 10px -6px color-mix(in srgb, #071806 8%, transparent);

  /* Custom nav shadow — replaces the three rgba(0,0,0,0.06) instances */
  --shadow-nav: 0 -2px 8px color-mix(in srgb, #071806 8%, transparent);
}
```

### Verified: Tailwind v4 @theme radius scale (default matches target)

```css
/* Source: tailwindcss@4.2.2 theme.css lines 397-398 */
/* Default Tailwind v4 values already match our target: */
--radius-xs: 0.125rem;  /* = rounded-xs in utilities */
--radius-sm: 0.25rem;   /* = rounded-sm in utilities */
/* No override needed for xs/sm — only need to replace rounded-full/lg/xl in components */
```

### Verified: glassmorphism token pattern

```css
/* color-mix() with transparent — CSS Color 5, widely supported */
@theme {
  --color-glass-nav:     color-mix(in srgb, #FCF9EF 85%, transparent);
  --color-glass-overlay: color-mix(in srgb, #FCF9EF 70%, transparent);
}
```
Usage in component: `bg-glass-nav backdrop-blur-md` — Tailwind generates `background-color: var(--color-glass-nav)` and the backdrop-blur utility separately.

### Verified: nav shadow token usage in component

```tsx
/* Replace in WurzelNavBar.tsx, BottomNavClient.tsx, RegionalNavBar.tsx */
/* Before: shadow-[0_-2px_8px_rgba(0,0,0,0.06)] */
/* After: */
className="... shadow-[var(--shadow-nav)] ..."
/* --shadow-nav defined in @theme with ink-tinted color-mix */
```

---

## Complete Migration Inventory

### Files requiring changes

**globals.css** (complete @theme rewrite):
- Remove 8 old tokens (primary, secondary, accent, background, text, surface, surface-elevated, primary-container)
- Add ~30 Archivist tokens (see Architecture Patterns)
- Override shadow tokens (sm, md, lg, xl, 2xs, xs, nav)
- Fix --spacing-gutter to 1rem, add --spacing-vertical: 1.7rem
- Add glassmorphism tokens (glass-nav, glass-overlay)

**Reader components — hex/token migration (9 files):**
1. `ArticleCard.tsx` — delete BEZIRK_COLORS + BEZIRK_BADGE_COLORS, apply ink gradient + token badges; replace zinc-* with ink/slate tokens
2. `TopMeldungenRow.tsx` — same as ArticleCard (duplicate maps)
3. `ArticleFeed.tsx` — replace zinc-* text colors with ink/slate tokens; handle spinner rounded-full
4. `ListItem.tsx` — remove border-b, apply tonal bg shift; replace zinc-*
5. `HeroArticle.tsx` — replace zinc-*/primary-container text refs with ink tokens; fix rounded-full on badge spans
6. `SearchPageLayout.tsx` — replace zinc-*/surface-elevated with new tokens; fix rounded-full instances
7. `BezirkModal.tsx` — replace zinc-*/surface tokens; fix rounded-full on CTA button
8. `CookieBanner.tsx` — replace zinc-*/surface tokens; fix rounded-full on primary button
9. `EditorialCard.tsx` — replace zinc-* with ink/slate tokens

**Reader components — radius only (no hex changes needed):**
10. `BottomNavClient.tsx` — rounded-full → remove (nav pill shape) + shadow fix
11. `RegionalNavBar.tsx` — rounded-full → remove (nav pill) + shadow fix
12. `WurzelNavBar.tsx` — rounded-full → remove (nav pill), rounded-t-2xl → 0 + shadow fix
13. `WurzelAppBar.tsx` — rounded-full on avatar → style={{ borderRadius: '50%' }} or accept square
14. `Footer.tsx` — check zinc-* references

**Files confirmed out of scope (do not touch):**
- All `src/app/(admin)/` files
- `src/app/admin/` files
- `bundesland.config.ts`
- Header.tsx, RegionalAppBar.tsx, BezirkSection.tsx, RegionalSelector.tsx inline gradient styles (`#2D5A27` flag color — branding, not tokens)

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 8 semantic tokens (primary/secondary/accent) | ~30 MD3-style editorial tokens | Phase 33 | All utilities regenerated from new token names |
| Per-Bezirk color maps in components | Unified Archivist ink gradient | Phase 33 | Simpler code, consistent look |
| Tailwind v3 tailwind.config.js | Tailwind v4 @theme in globals.css | Phase 16 | No config file; @theme is authoritative |
| Black/gray rgb() in default shadows | Ink-tinted color-mix() | Phase 33 | Shadows have warm editorial tint |

**Deprecated/outdated:**
- `--color-primary`, `--color-secondary`, `--color-accent`, `--color-background`, `--color-text`, `--color-surface`, `--color-surface-elevated`, `--color-primary-container`: All removed in Phase 33. Components referencing these will have no color applied after the @theme rewrite.
- `--radius-sm: 0.75rem` (current value in globals.css): Wrong — overrides Tailwind v4 default of 0.25rem. The @theme rewrite removes this; Tailwind default (0.25rem) takes effect for rounded-sm.

---

## Open Questions

1. **Spinner rounded-full handling**
   - What we know: ArticleFeed.tsx spinner uses rounded-full functionally; removing it creates a square
   - What's unclear: Whether a square spinner aligns with the Archivist aesthetic or looks broken
   - Recommendation: Use `style={{ borderRadius: '50%' }}` to keep it circular without a Tailwind utility class — this exempts it from the rounded-full sweep without violating the decorative rule

2. **WurzelNavBar rounded-t-2xl**
   - What we know: WurzelNavBar.tsx has `rounded-t-2xl` on the nav container (decorative top-rounded corners)
   - What's unclear: Phase 33 says "flatten to 0.125rem or 0.25rem" — does this mean flat-0 or 0.25rem for the nav top corners?
   - Recommendation: Use 0 (straight top edge) on the nav container for the v3.0 shell — Phase 34 will redesign this component entirely anyway

3. **zinc-* colors in scope**
   - What we know: Many reader components use `text-zinc-900`, `text-zinc-500`, `text-zinc-400` etc. — these are not being replaced by the token system (no zinc equivalents in Archivist palette)
   - What's unclear: Should zinc-* be replaced with ink/slate tokens, or left until later phases?
   - Recommendation: Replace zinc-900 → ink, zinc-500 → ink-muted, zinc-400 → ink-dim, zinc-300 → slate-muted in reader components this phase, since these are the body text/meta text colors the token system is designed to cover

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
| TOKN-01 | @theme block contains ~30 named tokens | manual-only | Visual inspection of globals.css | N/A |
| TOKN-02 | No border-b/border-* on reader components | static grep | `grep -r "border-b\|border-t\|border-l\|border-r" src/components/reader/ --include="*.tsx"` | N/A |
| TOKN-03 | No rounded-xl/full/lg in reader components | static grep | `grep -r "rounded-xl\|rounded-full\|rounded-lg\|rounded-2xl" src/components/reader/ --include="*.tsx"` | N/A |
| TOKN-04 | Spacing tokens have correct values | manual-only | Visual inspection of globals.css --spacing-gutter/vertical | N/A |
| TOKN-05 | Glass tokens defined with color-mix() | static grep | `grep "glass-" src/app/globals.css` | N/A |
| TOKN-06 | No raw rgba/rgb(0,0,0)/black hex in shadows | static grep | `grep -r "rgba(0,0,0\|rgb(0 0 0\|shadow-\[0.*rgba" src/components/reader/ --include="*.tsx"` | N/A |

**Note:** TOKN-01 through TOKN-06 are all CSS/visual requirements — they cannot be unit tested with Vitest (node environment, no DOM rendering). Validation is via static analysis grep commands + visual browser inspection after build.

### Sampling Rate
- **Per task commit:** Run `npx vitest run` to confirm no existing tests regressed (existing AdUnit test + app tests must stay green)
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work` + manual browser inspection confirming TOKN-01 through TOKN-06

### Wave 0 Gaps

None — existing test infrastructure covers all phase requirements.

The phase adds no new testable logic (no new functions, APIs, or data transformations). All requirements are CSS/visual. The existing Vitest suite (AdUnit.test.tsx, app/__tests__/) should remain green throughout. No new test files needed.

---

## Sources

### Primary (HIGH confidence)
- `node_modules/tailwindcss@4.2.2/theme.css` — verified default shadow/radius/color token structure
- `node_modules/tailwindcss@4.2.2/package.json` — confirmed version
- `postcss.config.mjs` — confirmed @tailwindcss/postcss setup
- `src/app/globals.css` — confirmed existing @theme structure (8 tokens)
- `src/components/reader/*.tsx` — full audit of all 26 reader files

### Secondary (MEDIUM confidence)
- CSS Color 5 `color-mix()` specification — widely supported in modern browsers; Tailwind v4 does not process it specially, passes through as CSS value

### Tertiary (LOW confidence)
- Tailwind v4 `var()` in @theme behavior — documented by observation (Tailwind processes @theme statically) but not verified against official Tailwind v4 changelog. Recommendation to use literals is conservative/safe.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — installed packages confirmed from node_modules
- Architecture: HIGH — @theme patterns verified from existing globals.css and Tailwind source
- Migration inventory: HIGH — full grep audit of all 26 reader component files
- Pitfalls: MEDIUM-HIGH — color-mix/var() interaction is observed pattern, not officially documented
- Validation: HIGH — Vitest config confirmed from vitest.config.ts

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable CSS/Tailwind domain)
