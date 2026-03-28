# Phase 26: Design System & Brand Foundation - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the entire v1.1 visual language (colors, fonts, icons, spacing, radius) with the Wurzelwelt design system. Rename all "Ennstal Aktuell" references to "Wurzelwelt" including legal/publisher details. Add Wurzelmann mascot asset. Reader components get the full treatment; admin/CMS pages stay untouched until Phase 30.

</domain>

<decisions>
## Implementation Decisions

### Color token architecture
- Semantic naming only: primary, secondary, accent, background, surface, text
- No named colors (no "forest-green", "moss") — components reference roles not colors
- Clean break from v1.1 tokens — remove styrian-green, cream, sage, alpine-red entirely
- Exact hex values: primary #1B2D18, secondary #4A5D23, accent #9F411E, background #FCF9EF, text #071806
- Surface levels: Claude's discretion (minimum two for homepage section alternation)

### CTA buttons
- Gradient from primary (#1B2D18) to primary-container (lighter green, ~#4A5D23 moss range) at 135deg
- Fully rounded pill shape (rounded-full)

### Font swap
- Plus Jakarta Sans replaces both Inter (body) and Work Sans (labels)
- Newsreader stays for headlines (unchanged from v1.1)
- Material Symbols Rounded replaces Outlined variant in CDN link

### Border-to-tonal migration
- Zero visible borders anywhere on reader frontend — all replaced with tonal background shifts
- Includes functional borders on inputs and modals (tonal fills + shadows instead)
- Admin/CMS borders left untouched — deferred to Phase 30
- 49 border occurrences across 15 reader components need updating

### Corner radius
- Minimum 0.75rem baseline for interactive elements (replacing v1.1's 2px)
- Claude's discretion on the exact radius scale per component size
- CTA buttons are pill-shaped (rounded-full), not part of the general scale

### Organic spacing
- 1.7rem mobile gutters, 4rem section gaps (from requirements DS-06)
- Applied to reader frontend only in this phase

### Brand rename
- "Ennstal Aktuell" → "Wurzelwelt" everywhere in reader and admin UI
- Publisher name: "Wurzelwelt Medien GmbH" (was "Ennstal Aktuell Medien GmbH")
- Email: redaktion@wurzelwelt.at (was redaktion@ennstal-aktuell.at)
- Site name: "Wurzelwelt" with tagline (e.g., "Wurzelwelt — Nachrichten aus der Steiermark")
- Update bundesland.config.ts, SEO metadata, RSS feeds, structured data, Impressum

### Mascot asset
- Wurzelmann PNG image at public/images/wurzelmann.png
- User will place the file before Phase 26 execution
- Plan references the path but does not generate the image

### Claude's Discretion
- Exact number of surface hierarchy levels (minimum two)
- Corner radius scale per component size (0.75rem baseline)
- Plus Jakarta Sans weight selection (likely 400/500/600/700)
- Font subset optimization
- Spacing token naming and exact scale values
- How to handle tonal replacement for each border type (fills vs shadows vs both)

</decisions>

<specifics>
## Specific Ideas

- CTA gradient stays in the green family (forest → moss), not cross-hue
- "Modern Mountain Folklore" design language: tonal layering, no borders, soft corners, organic spacing
- Site name should include a descriptive tagline for SEO/browser tab purposes

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `globals.css`: Current @theme block with 6 color tokens + 3 font families + radius — all need replacing in-place
- `layout.tsx`: Font loading via next/font/google — swap Inter/Work_Sans imports for Plus_Jakarta_Sans
- Material Symbols CDN link in layout.tsx — change "Outlined" to "Rounded" in URL
- `bundesland.config.ts`: publisherName, email, siteName fields for brand rename

### Established Patterns
- Tailwind v4 @theme tokens in globals.css as single source of truth (proven in v1.1)
- next/font/google with CSS variable approach (--font-newsreader, --font-inter, etc.)
- (admin) route group isolates CMS pages — natural boundary for reader-only changes
- Per-Bezirk color maps in ArticleCard.tsx may need semantic token remapping

### Integration Points
- `src/app/globals.css`: All token definitions (colors, fonts, radius, spacing)
- `src/app/layout.tsx`: Font imports, CDN link, body classes
- `bundesland.config.ts`: siteName, publisherName, email
- 6 source files with "Ennstal Aktuell" string references (sitemap, robots, artikel page, RSS)
- 15 reader components with border classes needing tonal replacement
- 8 files using Material Symbols (CDN swap handles icon variant globally)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 26-design-system-brand-foundation*
*Context gathered: 2026-03-28*
