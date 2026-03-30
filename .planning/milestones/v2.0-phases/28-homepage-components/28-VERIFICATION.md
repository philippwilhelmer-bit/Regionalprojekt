# Phase 28 Homepage Components — Verification Report

**Date:** 2026-03-30
**Verifier:** Claude (independent code inspection)
**Phase:** 28-homepage-components
**Requirements verified:** COMP-02, COMP-03, COMP-04, COMP-05, COMP-07

## Summary

| Requirement | Status | Evidence |
|-------------|--------|----------|
| COMP-02 | PASS | "Wurzelmann sagt:" label present, CSS triangle tail, bg-surface wrapping, imported in HomepageLayout |
| COMP-03 | PASS | Full-bleed img with object-cover, from-black/80 gradient overlay, headline in relative z-10 container |
| COMP-04 | PASS | aspect-video image container, font-headline class on headline, font-label uppercase on category label |
| COMP-05 | PASS | renderBezirkSection uses RegionalEditorialCard as featured article (first); bezirk sections at top of editorial area |
| COMP-07 | PASS | Alternating bg-surface/bg-background per section; index % 2 pattern for bezirk sections; no border dividers |

## Detailed Evidence

### COMP-02: MascotGreeting speech-bubble card

**File:** `src/components/reader/MascotGreeting.tsx`

- **"Wurzelmann sagt:" text literal** — Line 39: `Wurzelmann sagt:` rendered as a `<p>` with `font-label uppercase text-xs font-semibold text-primary` styling.
- **Speech-bubble visual treatment with triangular tail** — Lines 49–58: CSS triangle using inline border trick:
  ```
  borderLeft: "10px solid transparent",
  borderRight: "10px solid transparent",
  borderTop: "10px solid white",
  ```
  positioned `absolute -bottom-[10px] left-6` pointing downward toward avatar.
- **Tonal background** — Rendered in HomepageLayout.tsx inside `<div className="bg-surface py-[var(--spacing-section)]">` (HomepageLayout line 106). The bubble itself uses `bg-surface-elevated rounded-sm shadow-sm`.
- **Imported and rendered in HomepageLayout.tsx** — Line 9: `import { MascotGreeting } from "./MascotGreeting";`; line 107: `<MascotGreeting />` inside bg-surface section.

**Result: PASS** — All four criteria satisfied.

---

### COMP-03: Topmeldung hero with gradient overlay

**File:** `src/components/reader/HeroArticle.tsx`

- **Full-bleed image** — Lines 23–28: `<img src={article.imageUrl} className="absolute inset-0 w-full h-full object-cover img-matte" />` — image fills the entire hero block (min-h-[60vh]).
- **Dark gradient overlay** — Line 34: `<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />` — overlays full hero area, dark at bottom fading to transparent at top.
- **Headline over gradient** — Lines 37–59: `<div className="relative z-10 flex flex-col justify-end min-h-[60vh] ...">` — all text content (Topmeldung badge, bezirk badge, headline, excerpt) is in a z-10 container positioned at the bottom over the gradient.
- **Text legibility against any image** — Gradient provides consistent dark base at bottom; headline text is white (`text-white`).

**Result: PASS** — All four criteria satisfied.

---

### COMP-04: RegionalEditorialCard

**File:** `src/components/reader/RegionalEditorialCard.tsx`

- **Full-width aspect-video image** — Line 19: `<div className="relative w-full aspect-video rounded-sm overflow-hidden bg-gradient-to-br from-primary to-secondary">` — `w-full` + `aspect-video` provides correct 16:9 proportional image container.
- **Newsreader font headlines** — Line 40: `<h2 className="font-headline text-lg font-semibold text-text leading-snug mb-1">` — `font-headline` maps to Newsreader per the design system.
- **Uppercase Jakarta Sans category labels** — Line 34: `<p className="font-label uppercase text-xs tracking-wider text-primary font-semibold mb-1">` — `font-label` maps to Plus Jakarta Sans; `uppercase` applies all-caps treatment.

**Result: PASS** — All three criteria satisfied.

---

### COMP-05: Prioritized "Mein Bezirk" section with larger featured card

**File:** `src/components/reader/HomepageLayout.tsx`

- **Selected bezirk section at top of content area** — Lines 123–163: When `hasBezirkSelection` is true, the `bezirkSections` block renders as the primary editorial content directly after the ad slot (section 5/6 in layout). A "Dein Bezirk" heading appears first (line 127–131), followed by each bezirk section.
- **Uses RegionalEditorialCard for featured article** — `renderBezirkSection` function (lines 68–98): `const [featured, ...rest] = articles;` followed by `<RegionalEditorialCard article={featured} />` in a `<div className="mb-3">` container — the featured card is the full-width aspect-video RegionalEditorialCard, visually larger than the 3 ListItem compact rows below it.

**Result: PASS** — Both criteria satisfied. Selected bezirk articles appear in "Dein Bezirk" section with RegionalEditorialCard as the featured (larger) card.

---

### COMP-07: Tonal background alternation between sections

**File:** `src/components/reader/HomepageLayout.tsx`

- **Alternating background tokens** — Major sections use:
  - Hero (no bg — image fills): line 103
  - MascotGreeting: `bg-surface` (line 106)
  - TopMeldungenRow: `bg-background` (line 112)
  - Ad slot: `bg-surface` (line 118)
  - Bezirk sections: `index % 2 === 0 ? "bg-background" : "bg-surface"` (lines 135–137)
  - Flat view first block: `bg-background` (line 181); remainder: `bg-surface` (line 198)
- **No border lines between sections** — No `border-b`, `border-t`, or `divide-y` classes appear between major homepage sections. Separation is achieved solely via background color alternation.

**Color token mapping** (from Tailwind theme):
- `bg-background` = `#FCF9EF`
- `bg-surface` = `#F6F4EA`

These match the requirement's `#FCF9EF / #F6F4EA alternation` specification.

**Result: PASS** — Tonal alternation implemented via bg-background/bg-surface tokens with no border dividers.

---

## Overall Result

**5/5 requirements PASS**

All five Phase 28 homepage component requirements have been independently verified against source code. The implementation in `src/components/reader/` matches every specified criterion for COMP-02 through COMP-07 (excluding COMP-06, which was Phase 27 scope).
