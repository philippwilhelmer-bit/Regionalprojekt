# Phase 46 — Phase-Local Design Spec

**Scope:** This design token system applies **only** to the doctor directory pages (`/aerzte`, `/aerzte/[publicId]/[slug]`, `/admin/aerzte`). The master `DESIGN.md` at the project root remains the authoritative source for the rest of the site.

**Implementation rule:** All tokens declared here that are NOT already in `globals.css` will be added under a namespace prefix (decided in plan-phase, leading candidate: `--dir-*`) so they coexist with live tokens. Directory pages reference the new tokens; other pages continue to use live tokens.

**Status of this spec:** Captured from the user-supplied design.md on 2026-05-14. Open inconsistencies (YAML vs. prose values for `background` and `surface`) are flagged in the reconciliation section below; **YAML values are treated as authoritative**.

---

## Reconciliation Table (Live ↔ Phase 46)

Compares the new spec to the live token system shipped via Phase 45 Bright & Modern iteration. Action column drives what needs to happen at plan-phase / implementation:

| Token (new) | Live equivalent | New value | Action |
|---|---|---|---|
| `surface` | `--color-background` | `#faf9f5` | identical — reuse live var |
| `background` (YAML) | `--color-background` | `#faf9f5` | identical — reuse |
| `background` (prose) | — | `#FCFBF7` | **conflict** → ignore prose, YAML wins |
| `surface-container-low` | `--color-surface` | `#f4f4f0` | identical — reuse |
| `surface` (prose) | — | `#F4F2EB` | **conflict** → ignore prose, YAML wins |
| `surface-container-lowest` | — | `#ffffff` | NEW |
| `surface-container` | — | `#efeeea` | NEW |
| `surface-container-high` | — | `#e9e8e4` | NEW |
| `surface-container-highest` | — | `#e3e2df` | NEW |
| `surface-dim` | — | `#dbdad6` | NEW |
| `surface-bright` | `--color-background` | `#faf9f5` | identical — reuse |
| `on-surface` | `--color-text` (`#154212`)? | `#1b1c1a` | **divergent** — value differs from live text color; introduce as new `--dir-on-surface` |
| `on-surface-variant` | `--color-ink-muted`? | `#434840` | divergent — introduce as new |
| `inverse-surface` | — | `#2f312e` | NEW |
| `inverse-on-surface` | — | `#f2f1ed` | NEW |
| `outline` | `--color-outline-variant`? | `#737970` | divergent — introduce as new |
| `outline-variant` | `--color-outline-variant` | `#c3c8be` | divergent — introduce as new (lighter) |
| `surface-tint` | — | `#4a6546` | NEW |
| `primary` | `--color-primary` (`#1B2D18`) | `#0f270d` | **divergent — darker** → introduce as new `--dir-primary` (do NOT change live `--color-primary`) |
| `on-primary` | `--color-on-primary` | `#ffffff` | identical |
| `primary-container` | — | `#243d21` | NEW (this is the live Forest Green for `--color-primary` from prose) |
| `on-primary-container` | — | `#8ba884` | NEW |
| `inverse-primary` | — | `#b1cfa8` | NEW |
| `secondary` (new) | `--color-accent` (`#9F411E`) | `#9f411e` | identical value — naming shift only (Alpine Clay is `secondary` here, `accent` in live). Reuse live `--color-accent` value, alias as `--dir-secondary` if naming-consistency desired |
| `on-secondary` | `--color-on-primary`? | `#ffffff` | identical white |
| `secondary-container` | — | `#fd885f` | NEW |
| `on-secondary-container` | — | `#732100` | NEW |
| `tertiary` | — | `#381624` | NEW (dunkles Burgund) |
| `on-tertiary` | — | `#ffffff` | identical white |
| `tertiary-container` | — | `#512b3a` | NEW |
| `on-tertiary-container` | — | `#c592a3` | NEW |
| `error` | — | `#ba1a1a` | NEW |
| `on-error` | — | `#ffffff` | identical |
| `error-container` | — | `#ffdad6` | NEW |
| `on-error-container` | — | `#93000a` | NEW |
| `primary-fixed`, `primary-fixed-dim`, `on-primary-fixed`, `on-primary-fixed-variant` | — | various greens | NEW (Material 3 fixed-tone tokens) |
| `secondary-fixed`, ... | — | various oranges | NEW |
| `tertiary-fixed`, ... | — | various pinks | NEW |
| `on-background` | `--color-text` | `#1b1c1a` | divergent — introduce as new |
| `surface-variant` | — | `#e3e2df` | NEW |

### Typography reconciliation

| Token (new) | Live equivalent | Action |
|---|---|---|
| `display-lg` 48px / Newsreader 600 / -0.02em | `--text-display-lg` (live: 56px / 600 / `tracking-tight`) | divergent — introduce as new `--dir-text-display-lg`; do not change live |
| `display-lg-mobile` 36px | — | NEW (mobile-specific variant — live uses media queries on display-lg) |
| `headline-lg` 32px / 500 | `--text-headline-lg` (live: 40px / 500) | divergent — introduce as new |
| `headline-md` 24px / 500 | `--text-headline-md` (live: 28px / 500) | divergent — introduce as new |
| `body-lg` 18px / 400 / 1.6 | `--text-body-lg` | match or divergent → check on impl |
| `body-md` 16px / 400 / 1.6 | `--text-body` | match — likely reuse |
| `label-lg` 14px / 600 / 0.02em | `--text-label-md` | divergent — naming-shift + slightly different size |
| `label-md` 12px / 500 | `--text-label-sm`? | divergent |

### Shape reconciliation

| Token | Live | New | Action |
|---|---|---|---|
| `rounded.sm` | `--radius-sm` 0.25rem | 0.25rem | identical |
| `rounded.DEFAULT` | `--radius` 0.25rem? | 0.5rem | divergent — introduce as new |
| `rounded.md` | `--radius-md` 0.375rem? | 0.75rem | divergent |
| `rounded.lg` | `--radius-lg` | 1rem | check |
| `rounded.xl` | — | 1.5rem | NEW |
| `rounded.full` | `--radius-full` 9999px | 9999px | identical |

### Spacing reconciliation

| Token | Live | New | Action |
|---|---|---|---|
| `spacing.xs` 4px | — | 4px | NEW |
| `spacing.sm` 8px | `--spacing-sm` (live: TBD) | 8px | check |
| `spacing.md` 16px | `--spacing-md` | 16px | likely identical |
| `spacing.lg` 24px | `--spacing-lg` | 24px | likely identical |
| `spacing.xl` 48px | `--spacing-void-md` (live: ~3rem) | 48px | divergent — voiding semantics differ |
| `spacing.gutter` 24px | `--spacing-gutter` | 24px | likely identical |
| `spacing.margin-mobile` 16px | — | 16px | NEW |
| `spacing.margin-desktop` 64px | — | 64px | NEW |

---

## The Spec (verbatim from supplied design.md, YAML-authoritative)

```yaml
name: Loden & Leute
colors:
  surface: '#faf9f5'
  surface-dim: '#dbdad6'
  surface-bright: '#faf9f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4f0'
  surface-container: '#efeeea'
  surface-container-high: '#e9e8e4'
  surface-container-highest: '#e3e2df'
  on-surface: '#1b1c1a'
  on-surface-variant: '#434840'
  inverse-surface: '#2f312e'
  inverse-on-surface: '#f2f1ed'
  outline: '#737970'
  outline-variant: '#c3c8be'
  surface-tint: '#4a6546'
  primary: '#0f270d'
  on-primary: '#ffffff'
  primary-container: '#243d21'
  on-primary-container: '#8ba884'
  inverse-primary: '#b1cfa8'
  secondary: '#9f411e'
  on-secondary: '#ffffff'
  secondary-container: '#fd885f'
  on-secondary-container: '#732100'
  tertiary: '#381624'
  on-tertiary: '#ffffff'
  tertiary-container: '#512b3a'
  on-tertiary-container: '#c592a3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ccebc3'
  primary-fixed-dim: '#b1cfa8'
  on-primary-fixed: '#082008'
  on-primary-fixed-variant: '#334d2f'
  secondary-fixed: '#ffdbcf'
  secondary-fixed-dim: '#ffb59c'
  on-secondary-fixed: '#390c00'
  on-secondary-fixed-variant: '#7f2a07'
  tertiary-fixed: '#ffd9e4'
  tertiary-fixed-dim: '#efb7ca'
  on-tertiary-fixed: '#31101e'
  on-tertiary-fixed-variant: '#633b4a'
  background: '#faf9f5'
  on-background: '#1b1c1a'
  surface-variant: '#e3e2df'
typography:
  display-lg: { fontFamily: Newsreader, fontSize: 48px, fontWeight: '600', lineHeight: '1.1', letterSpacing: -0.02em }
  display-lg-mobile: { fontFamily: Newsreader, fontSize: 36px, fontWeight: '600', lineHeight: '1.1', letterSpacing: -0.01em }
  headline-lg: { fontFamily: Newsreader, fontSize: 32px, fontWeight: '500', lineHeight: '1.2', letterSpacing: -0.01em }
  headline-md: { fontFamily: Newsreader, fontSize: 24px, fontWeight: '500', lineHeight: '1.3' }
  body-lg: { fontFamily: Plus Jakarta Sans, fontSize: 18px, fontWeight: '400', lineHeight: '1.6' }
  body-md: { fontFamily: Plus Jakarta Sans, fontSize: 16px, fontWeight: '400', lineHeight: '1.6' }
  label-lg: { fontFamily: Plus Jakarta Sans, fontSize: 14px, fontWeight: '600', lineHeight: '1.2', letterSpacing: 0.02em }
  label-md: { fontFamily: Plus Jakarta Sans, fontSize: 12px, fontWeight: '500', lineHeight: '1.2' }
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
```

## Brand & Style
The design system for Loden & Leute embodies a "Modern Alpine Bright" aesthetic. It targets a sophisticated audience seeking a blend of traditional craftsmanship and contemporary lifestyle. The personality is prestigious yet approachable, editorial yet functional.

The style is a hybrid of **Minimalism** and **Modern Corporate**, utilizing a "layered paper" philosophy. It avoids heavy, synthetic shadows in favor of subtle tonal shifts and elegant dividers to create a sense of physical depth. The interface should feel airy, expensive, and breathable, evoking the clarity of a high-altitude morning.

## Colors
The palette is rooted in nature and high-end materials.
- **Background (#FAF9F5):** An airy, light cream that serves as the foundation. (YAML — supersedes prose's #FCFBF7.)
- **Primary - Forest Green (#0F270D / container #243D21):** Used for typography, navigation, and primary brand elements. Conveys stability and heritage. (Phase-local; live `--color-primary` remains #1B2D18.)
- **Accent / Secondary - Alpine Clay (#9F411E):** Reserved for high-intent actions, active states, and editorial highlights. Sharp, energetic contrast to the green. (Same value as live `--color-accent`, semantic name shifts.)
- **Surface (#F4F4F0):** Subtle tonal shift used for cards and containers to create a layered effect without elevation shadows. (YAML — supersedes prose's #F4F2EB.)

## Typography
High-contrast pairing balancing editorial prestige with modern utility.

- **Newsreader** for headlines — tight tracking (negative letter-spacing) to emphasize literary, authoritative character.
- **Plus Jakarta Sans** for all functional UI, body copy, labels — geometric clarity as modern counterpoint to serif headlines.
- Use uppercase for `label-lg` to create clear hierarchy in navigation and section headers.

## Layout & Spacing
Fluid grid model with generous margins for "breathability."

- **Desktop:** 12-column grid, 64px outside margins, 24px gutters. Content often centered with significant whitespace on the flanks for premium magazine feel.
- **Mobile:** 4-column grid, 16px margins, 16px gutters.
- **Spacing Rhythm:** 4px baseline. Components lean toward larger padding (`xl` / 48px) for section vertical spacing.

## Elevation & Depth
Rejects heavy ambient shadows in favor of "layered paper."

- **Tonal Layers:** Depth via `#F4F4F0` (Surface) cards on `#FAF9F5` (Background).
- **Dividers:** 1px solid lines in muted Forest Green (opacity 10–15%) for elegant separation.
- **Interaction Depth:** Hover states use subtle "rim" shadow or slight color shift to darker surface tone, never heavy elevation.

## Shapes
"Rounded" shape language softens professional tone, makes UI welcoming.
- **Base (8px):** Buttons, input fields, standard cards.
- **Large (16px):** Major containers, featured imagery.
- **Pill:** Tags and status indicators only (differentiates from actionable buttons).

## Components
- **Buttons:** Primary — Forest Green bg + white text. Secondary — Forest Green outline + transparent bg. Alpine Clay reserved for "Critical" / "Active" toggle states.
- **Input Fields:** Soft cream bg `#F4F4F0` with 1px border that darkens on focus. Plus Jakarta Sans for input text.
- **Cards:** Flat containers, 8px radius. Surface color bg, thin dividers for header/footer split.
- **Chips/Tags:** Pill-shaped, light tint of Forest Green or Alpine Clay, centered `label-md`.
- **Lists:** Clean horizontal rows separated by 1px dividers. No outer container border.
- **Imagery:** Photos with 8px or 16px corner radius, consistent "Modern Alpine" treatment (high natural light, desaturated greens).
