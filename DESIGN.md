# Design System Strategy: The Editorial Monolith

## 1. Overview & Creative North Star: "The Modern Archivist"
This design system rejects the ephemeral nature of the modern web in favor of something permanent, weighted, and prestigious. Our Creative North Star is **The Modern Archivist**. 

We are moving away from "app-like" interfaces toward a high-end editorial experience. This is achieved through **Intentional Asymmetry**—where large blocks of whitespace balance dense, authoritative typography—and **Tonal Depth**, where hierarchy is dictated by the weight of color rather than the clutter of lines. The interface should feel like a physical desk: heavy parchment paper, dark forest inks, and the steady presence of slate and wood.

---

## 2. Color & Atmospheric Theory
The palette is rooted in high-contrast naturalism. We use depth to guide the eye, not decoration.

**Official semantic palette (2026-05-13):**

*   **primary — `#1B2D18` (Deep Forest Green):** Dark surfaces, app-bar, footer, CTAs, dark-zone backgrounds. The "Moody" anchor of the brand.
*   **secondary — `#2D5A27` (Loden Green):** Steiermark-flag stripe and brand accents that need to feel distinct from the deeper primary.
*   **background — `#FCF9EF` (Warm Paper):** Page background — never stark white. Warm, tactile, grounded.
*   **text — `#154212` (Deep Charcoal Green):** Body text and headings on light surfaces.
*   **accent — `#9F411E` (Alpine Clay):** Reserved for **interactive states only** — hover, active, focus on links, buttons, nav. Not for decoration.

Tonal variants (`ink-soft`, `ink-muted`, `parchment-dim`, etc.) exist in `globals.css` for shadow tints and tonal layering, but are not part of the official palette.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections. Content areas must be separated by:
1.  **Background Color Shifts:** Placing a `surface-container-low` (#F6F4EA) section against a `surface` (#FCF9EF) background.
2.  **Structural Negative Space:** Using the `16` (5.5rem) or `20` (7rem) spacing tokens to create a "void" that defines a boundary.

### Signature Textures & Glassmorphism
To avoid a "flat" digital look, apply a subtle linear gradient to main CTAs transitioning from `text` (#154212) to `primary` (#1B2D18). For floating navigation or overlays, use **Glassmorphism**: apply `surface-bright` at 85% opacity with a `20px` backdrop-blur to allow the "parchment" textures underneath to bleed through.

---

## 3. Typography: The Editorial Voice
We use a high-contrast pairing to balance heritage with modern precision.

*   **Display & Headlines (Newsreader):** This is our "Editorial Voice." Newsreader must be used with generous letter-spacing (optical sizing) and tight line-heights for a prestigious, printed-press look.
    *   *Usage:* `display-lg` for hero statements; `headline-md` for section entries.
*   **Body & UI (Plus Jakarta Sans):** This is our "Functional Voice." It provides a clean, technical counterpoint to the serif headers. 
    *   *Usage:* `body-lg` for long-form reading; `label-md` for metadata and micro-copy.

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are often a crutch for poor layout. In this system, depth is biological and environmental.

*   **The Layering Principle:** Treat the UI as stacked sheets of fine paper. 
    *   **Level 0:** `surface` (Base)
    *   **Level 1:** `surface-container-low` (Subtle content blocks)
    *   **Level 2:** `surface-container-highest` (Interactive cards or focused modules)
*   **Ambient Shadows:** If a component must float (e.g., a Modal), use an extra-diffused shadow: `box-shadow: 0 20px 50px rgba(27, 28, 22, 0.06);`. The shadow must use a tint of `on-surface` (#1B1C16), never pure black.
*   **The Ghost Border Fallback:** If a container requires a boundary for accessibility (e.g., an input field), use the `outline-variant` (#C4C8BE) at **15% opacity**. 

---

## 5. Components & Primitive Styling

### Buttons: The Weighted Action
*   **Primary:** Background `primary` (#071806), text `on-primary` (#FFFFFF). Use `DEFAULT` (0.25rem) roundedness. It should feel like a heavy, leaded stamp.
*   **Tertiary:** No background. Text `primary`. Use an underline of `surface-tint` at 2px thickness for a "hand-notated" feel.

### Input Fields: The Ledger Style
*   No full bounding boxes. Use a bottom-border only (the "Ghost Border" at 20% opacity) or a `surface-container-high` background.
*   Labels use `label-md` in `on-surface-variant`.

### Cards & Lists: The Negative Space Rule
*   **Forbidden:** Divider lines between list items.
*   **Requirement:** Use Spacing Scale `4` (1.4rem) between list items. For cards, use `surface-container-lowest` (#FFFFFF) to create a soft "lift" against a `surface-container` (#F0EEE4) background.

### Signature Component: The "Archival Header"
A layout pattern where a `display-sm` Newsreader title overlaps a `primary-container` colored image mask. This breaking of the "grid-box" is essential for the high-end editorial feel.

---

## 6. Do’s and Don’ts

### Do
*   **DO** use extreme vertical margins. Content needs room to breathe to feel prestigious.
*   **DO** use `Newsreader` in italic for emphasis within body text to maintain the academic, grounded feel.
*   **DO** treat typography as the primary visual element. If the layout feels empty, increase the font size rather than adding an icon.

### Don't
*   **DON'T** use 100% opaque borders. It breaks the "parchment" illusion.
*   **DON'T** use vibrant "app" colors. Even errors (`error` #BA1A1A) should be used sparingly and nested within `error-container` to maintain the moody atmosphere.
*   **DON'T** use heavy rounded corners. Stick to `DEFAULT` (0.25rem) or `none` to keep the aesthetic architectural and "wood-blocked."

---

## 7. Spacing & Rhythm
Rhythm is dictated by the **3:5 ratio**. If a horizontal gap is `3` (1rem), the vertical gap should be `5` (1.7rem). This intentional verticality reinforces the "Grounded" feeling of the system, drawing the eye downward through the "document" rather than scattering it across a horizontal "dashboard."