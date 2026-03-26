# Phase 20: Search & Categories - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

A `/suche` discovery page where readers search articles by keyword and browse the full topic taxonomy. Four vertically stacked zones: serif search input, trending Bezirk pills, category grid, and recommended articles. The header search icon (currently disabled) gets activated as a link to this page. No new data models — categories ARE the existing 13 Bezirke.

</domain>

<decisions>
## Implementation Decisions

### Search results display
- 2-column card grid reusing ArticleCard pattern from homepage — thumbnail + headline + Bezirk badge
- Show all matching articles at once (no pagination or "load more")
- Display result count above grid: "12 Artikel gefunden"
- Search filters on article title only (not body text)

### Trending topic pills
- Content: the 13 Bezirk names as pill-shaped tags
- "Beliebte Themen" heading in Work Sans above the pill row
- Horizontal scroll row, ~5-6 pills visible on mobile, rest discoverable by swiping
- Single-select toggle: tap to filter, tap again to deselect

### Filter state & page flow
- Default state: search input + pills + category grid + "Empfohlene Artikel" section
- Filtered state (query or Bezirk active): category grid and Empfohlene disappear, replaced by result card grid with count
- Search text and Bezirk pill combine as AND filter (e.g., Graz + "Verkehr" = Graz articles matching "Verkehr")
- Clear: X button inside search input clears text; tapping active pill deselects Bezirk. Each resets independently
- Category grid tap behaves identically to pill tap — sets activeBezirkId, grid disappears, results show

### Empty & no-results state
- "Keine Artikel gefunden" message with suggestion: "Versuchen Sie einen anderen Suchbegriff oder wählen Sie einen Bezirk."
- Text only, no illustration
- No fallback content below the message

### Empfohlene Artikel section
- Heading: "Empfohlene Artikel" (matches success criteria wording)
- Shows pinned articles via existing `getPinnedArticles()` — falls back to newest published
- 6 articles displayed as 2-column card grid (3 rows)
- Only visible when no filter is active (no query, no Bezirk selected)

### Header search icon activation
- Convert disabled `<span>` at 40% opacity to `<Link href="/suche">` at full opacity
- Existing placeholder comment in Header.tsx marks the exact location

### Claude's Discretion
- Exact spacing and padding between page zones
- Category grid card styling details (icon choice, hover effects)
- Search input border/focus styling details
- Pill scroll fade hint implementation
- Responsive behavior on wider screens

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ArticleCard.tsx`: Card component with thumbnail, headline, Bezirk badge — reuse directly for search results and Empfohlene
- `TopMeldungenRow.tsx`: Horizontal scroll pattern with overflow-x — reference for pill row scroll behavior
- `HomepageLayout.tsx`: RSC + client component split pattern — SearchPageLayout follows identical architecture
- `getPinnedArticles()` in `articles.ts`: Returns pinned articles with newest fallback — powers Empfohlene section
- `listBezirke()` in `bezirke.ts`: Returns all Bezirke — powers both pills and category grid
- Design tokens: `font-headline` (Newsreader), `font-body` (Inter), `font-label` (Work Sans), `styrian-green`, `cream`, `sage`

### Established Patterns
- RSC page fetches data, passes as props to `"use client"` layout component (Phase 18 pattern)
- `useMemo` for client-side filtering with `[articles, query, activeBezirkId]` dependencies
- Material Symbols via inline `<span class="material-symbols-outlined">` — no wrapper
- `export const dynamic = 'force-dynamic'` on all reader pages
- Plain `<img>` for external images (not next/image)

### Integration Points
- `src/app/(public)/suche/page.tsx`: New RSC page (does not exist yet)
- `src/components/reader/SearchPageLayout.tsx`: New client component for all filter state
- `src/lib/content/articles.ts`: Add `listArticlesForSearch()` returning all PUBLISHED articles with Bezirke
- `src/components/reader/Header.tsx` line 54-58: Convert disabled search span to Link
- `src/components/reader/BottomNavClient.tsx`: `/suche` link already exists, active state logic already handles it

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

*Phase: 20-search-categories*
*Context gathered: 2026-03-26*
