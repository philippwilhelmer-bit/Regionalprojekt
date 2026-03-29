# Phase 28: Homepage Components - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the Wurzelwelt editorial homepage components: MascotGreeting speech-bubble card, restyled Topmeldung hero, RegionalEditorialCard, prioritized Mein Bezirk section, and tonal section alternation. Rewire HomepageLayout to use the new component hierarchy and remove the inline Bezirk selector (AppBar button handles it). Article detail, search/categories, and CMS are separate phases.

</domain>

<decisions>
## Implementation Decisions

### MascotGreeting card
- Speech-bubble card with triangular tail pointing toward Wurzelmann avatar below/beside it
- Tonal surface background (#F6F4EA) — consistent with other homepage sections
- Wurzelmann avatar: 48-64px, raw PNG with transparent background (not circular crop)
- "Wurzelmann sagt:" label with static hardcoded quote
- Time-aware greeting: "Guten Morgen" / "Guten Tag" / "Guten Abend" based on client time
- One hardcoded quote per time-of-day slot (no CMS, no rotation)

### Topmeldung (restyled HeroArticle)
- Restyle existing HeroArticle.tsx — same structure, Wurzelwelt visual treatment
- Full-bleed image with dark gradient overlay (existing pattern)
- Newsreader serif headline, Plus Jakarta Sans for labels
- Wurzelwelt spacing and rounded corners applied

### RegionalEditorialCard (COMP-04)
- New component: full-width aspect-video image, Newsreader serif headline, uppercase Plus Jakarta Sans label
- Used as the featured card in Mein Bezirk sections
- Replaces ArticleCard featured variant in homepage context

### Mein Bezirk section (COMP-05)
- Layout: one RegionalEditorialCard (featured) + 3 compact list items below
- 3 list items max per Bezirk section
- Uses existing ListItem component for compact article rows

### Homepage section order & composition
- Inline RegionalSelector removed from homepage — WurzelAppBar button is the sole Bezirk selector access point
- Tonal section alternation (COMP-07): background (#FCF9EF) / surface (#F6F4EA) shifts between sections

### Claude's Discretion
- Exact placement of MascotGreeting in the homepage flow (before/after hero)
- Whether to keep, restyle, or replace the Top-Meldungen horizontal scroll row
- Topmeldung badge style (accent pill vs primary pill)
- Topmeldung content density (headline + bezirk + excerpt, or headline + bezirk only)
- Topmeldung height (60vh, shorter, or responsive)
- Tonal shift pattern (strict alternation vs intentional placement)
- Multi-bezirk handling (separate sections per Bezirk vs merged)
- "Wurzelmann sagt:" label typography (Newsreader italic vs Jakarta Sans uppercase)
- Exact speech-bubble tail CSS implementation
- Ad unit placement within new section flow

</decisions>

<specifics>
## Specific Ideas

- Wurzelmann avatar uses the raw PNG (transparent background), not a circular crop — the character shape should show fully, possibly peeking from behind the speech bubble
- MascotGreeting should feel warm and personal — time-of-day awareness adds to that
- Mein Bezirk featured card uses the new RegionalEditorialCard style for visual consistency with COMP-04

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `HeroArticle.tsx`: Full-bleed hero with gradient overlay + badge — restyle in place for Topmeldung
- `ArticleCard.tsx`: Featured/regular variants with bezirk gradient maps — reference for RegionalEditorialCard
- `ListItem.tsx`: Compact list row with headline, bezirk, timestamp, chevron — reuse directly in Mein Bezirk sections
- `TopMeldungenRow.tsx`: Horizontal scroll row — may be kept/restyled at Claude's discretion
- `BezirkSection.tsx`: Current bezirk section wrapper — replace with new Mein Bezirk layout
- `formatRelativeTime()` in ArticleCard.tsx — reuse for timestamps
- `groupArticlesByBezirk()` in articles.ts — reuse for Mein Bezirk data grouping
- Wurzelmann mascot PNG at `public/images/wurzelmann.png`

### Established Patterns
- Tailwind v4 @theme tokens in globals.css (colors, fonts, spacing, radius)
- CSS variables: `--spacing-gutter` (1.7rem), `--spacing-section` (4rem)
- Surface levels: background (#FCF9EF), surface (#F6F4EA), surface-elevated (#FFF)
- Image treatment: `.img-matte` class for consistent photo styling
- Bezirk gradient maps in ArticleCard.tsx and TopMeldungenRow.tsx (13 bezirk-specific color pairs)
- `max-w-2xl` content container, `pb-24` for bottom nav clearance

### Integration Points
- `HomepageLayout.tsx`: Client orchestrator — main integration point for all new components
- `src/app/(public)/page.tsx`: Server component data fetching (getFeaturedArticle, getPinnedArticles, listArticlesForHomepage, listBezirke)
- `WurzelAppBar.tsx`: Already has Bezirk selector button dispatching `openBezirkModal` event
- `RegionalSelector.tsx`: Keep component but remove from homepage inline position
- `globals.css`: Design tokens already set from Phase 26

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 28-homepage-components*
*Context gathered: 2026-03-29*
