# Phase 17: Header & Identity - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Every page opens with a recognizable Styrian identity bar and a dark green editorial header that communicates platform and location. Covers HDR-01 through HDR-04: identity stripe, header redesign with serif branding, location badge, and search icon placeholder. No new pages or data models — purely visual header transformation.

</domain>

<decisions>
## Implementation Decisions

### Identity stripe (HDR-01)
- Thin 4px total height: 2px white (#fff) + 2px green (#2D5A27), equal halves matching the Styrian flag
- Full viewport width, edge to edge, no padding
- Fixed at top of viewport together with the header (stripe + header both sticky)
- Seamless join — green stripe band flows directly into the dark green header below, no gap or border
- Same 4px on all screen sizes, no responsive scaling
- Reader frontend only (public route group)

### Header layout & branding (HDR-02)
- Dark green background using styrian-green (#2D5A27) token
- White (#fff) text and icons for all header elements
- Layout: brand name left, actions (badge + search) right
- Brand text: config-driven `config.siteName` (not hardcoded "RegionalNews") in italic Newsreader serif (font-headline italic)
- Header height stays at current h-14 (56px)

### Location badge & Bezirk selector (HDR-03)
- Merged into a single tappable element — the location badge IS the Bezirk selector
- `location_on` Material Symbol icon + text label + `arrow_drop_down` icon
- Default label: "Steiermark" (when no Bezirk selected)
- Selected: shows first Bezirk name (e.g., "Graz"), with "+N" suffix for multiple selections
- Tapping opens BezirkModal via existing `openBezirkModal` custom event
- Plain text + icon treatment, no chip/pill background — just white on dark green
- Same logic as current Header.tsx but restyled

### Search icon (HDR-04)
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

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/reader/Header.tsx`: Current header component — client component with Bezirk selection logic via localStorage + BezirkModal custom event. Will be refactored in place.
- `src/components/reader/BezirkModal.tsx`: Modal for Bezirk selection — no changes needed, just triggered from redesigned header.
- `bundesland.config.ts`: Provides `config.siteName` for branding text.
- Design tokens from Phase 16: `font-headline` (Newsreader), `font-label` (Work Sans), `styrian-green`, `cream`, Material Symbols loaded.

### Established Patterns
- Tailwind v4 @theme tokens in globals.css — all colors/fonts referenced via utility classes
- Material Symbols via inline `<span class="material-symbols-outlined">` — no wrapper component
- Client component for header (needs localStorage access for Bezirk state)
- `(admin)` route group isolation — reader changes don't affect admin

### Integration Points
- `src/app/(public)/layout.tsx`: Renders `<Header bezirke={bezirke} />` — stripe may be added here or inside Header component
- `src/components/reader/Header.tsx`: Main file to refactor — new styling, new layout, stripe element
- `src/app/globals.css`: Design tokens already defined from Phase 16

</code_context>

<specifics>
## Specific Ideas

No specific references — decisions above are precise enough for implementation.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-header-identity*
*Context gathered: 2026-03-25*
