---
phase: 17-header-identity
plan: "01"
subsystem: ui
tags: [header, tailwind, material-symbols, bezirk, styrian-identity]

# Dependency graph
requires:
  - phase: 16-design-system-foundation
    provides: Tailwind v4 @theme tokens (styrian-green, cream, font-headline), Material Symbols loaded via CDN
provides:
  - Styrian identity stripe (4px white/green gradient) at top of every reader page
  - Dark green editorial header with italic serif brand name from config
  - Location badge with bezirk label (Steiermark / single / +N) opening BezirkModal
  - Disabled search icon placeholder at far right (Phase 20 activates it)
  - computeBezirkLabel pure function for bezirk label computation
affects: [18-eilmeldung-banner, 20-search]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pure function extracted for label logic — enables isolated unit testing without DOM
    - Sticky wrapper div pattern: both stripe and header share one sticky container for scroll unity

key-files:
  created:
    - src/lib/bezirk-label.ts
    - src/lib/bezirk-label.test.ts
  modified:
    - src/components/reader/Header.tsx

key-decisions:
  - "Stripe implemented as inline linear-gradient (hex acceptable only here — two-color gradient cannot use Tailwind tokens)"
  - "Sticky applied to wrapper div, not <header> — ensures stripe and header scroll as one unit"
  - "computeBezirkLabel extracted to pure function — no DOM dependency, fully unit testable"
  - "Search icon uses plain <span> not <button disabled> — purely visual placeholder, no interaction semantics"

patterns-established:
  - "Header wrapper pattern: sticky top-0 div wraps stripe + header for scroll unity"
  - "bezirk label computed via pure function from slugs array + bezirke lookup"

requirements-completed: [HDR-01, HDR-02, HDR-03, HDR-04]

# Metrics
duration: 2min
completed: 2026-03-25
---

# Phase 17 Plan 01: Header & Identity Summary

**Styrian identity stripe (4px white/green gradient) + dark green editorial header with serif branding, bezirk location badge, and disabled search icon — backed by extracted and tested computeBezirkLabel pure function**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-25T20:53:44Z
- **Completed:** 2026-03-25T20:56:58Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Extracted bezirk label computation to a pure function (`computeBezirkLabel`) with 7 Vitest tests covering all edge cases including null/undefined/empty, single, multiple, and unknown-slug fallback
- Refactored `Header.tsx` with sticky wrapper pattern: 4px Styrian identity stripe (CSS gradient, 2px white / 2px green) seamlessly flowing into dark green header
- Location badge with `location_on` icon, dynamic bezirk label, and `arrow_drop_down` opens BezirkModal; disabled `search` icon placeholder at 40% opacity at far right

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract bezirk label logic to pure function with tests** - `57f7198` (feat, TDD)
2. **Task 2: Refactor Header.tsx with stripe, dark green styling, location badge, search icon** - `dbb93be` (feat)

## Files Created/Modified

- `src/lib/bezirk-label.ts` - Pure function `computeBezirkLabel` for computing bezirk display label from slug array
- `src/lib/bezirk-label.test.ts` - 7 Vitest test cases covering all specified behaviors
- `src/components/reader/Header.tsx` - Refactored with sticky wrapper, identity stripe, dark green styling, serif brand name, location badge, search icon placeholder

## Decisions Made

- Stripe uses inline `style={{ background: 'linear-gradient(...)' }}` with hex values — the only acceptable use of hex in the component, as two-color CSS gradients cannot be expressed via Tailwind utility tokens
- `sticky top-0 z-40` moved from `<header>` to an outer `<div>` wrapper so stripe and header form one indivisible scroll unit
- Search icon rendered as `<span>` (not `<button disabled>`) — it's a visual placeholder with no interaction semantics until Phase 20

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- 2 pre-existing test failures in `src/lib/content/bezirke.test.ts` (unrelated to this plan) confirmed pre-existing via stash verification. Not introduced by this plan.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Header fully branded and ready; Phase 18 (Eilmeldung banner) can render inside/below this header
- Phase 20 can activate the search icon by wrapping it in a link to `/suche` and removing `opacity-40 cursor-default`
- `computeBezirkLabel` is available for any future component needing bezirk label logic

---
*Phase: 17-header-identity*
*Completed: 2026-03-25*
