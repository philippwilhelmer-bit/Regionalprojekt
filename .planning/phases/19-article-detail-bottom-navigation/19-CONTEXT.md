# Phase 19: Article Detail & Bottom Navigation - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Restyle the article detail page with editorial typography (Newsreader headlines, Inter body) on a warm cream canvas, add hero image support, and restyle the bottom navigation bar with a green active-state pill. Covers ART-01, ART-02, NAV-01, NAV-02. No new data models or pages — purely visual transformation of existing components.

</domain>

<decisions>
## Implementation Decisions

### Bottom nav items
- Four items: Nachrichten, Suche, Gemerkt, Profil
- Icons (Material Symbols Outlined): `newspaper`, `search`, `bookmark`, `person`
- Nachrichten links to `/` — fully functional
- Suche links to `/suche` — functional (Phase 20 creates the page, but link can exist now)
- Gemerkt and Profil are placeholder tabs — visible but greyed out at ~40% opacity, not tappable (features deferred per REQUIREMENTS.md)

### Active pill state (NAV-02)
- Green pill wrapping only the icon (Material Design 3 nav bar pattern)
- Pill background: styrian-green (#2D5A27), icon inside pill: white
- Active label below pill in green text
- Inactive items: sage-colored icon and label, no background

### Bottom nav styling (NAV-01)
- Warm cream (#fbfaee) background replacing current white
- Remove zinc border-top, replace with subtle sage or no border
- Material Symbols icons for all items (replacing any remaining Unicode)

### Article hero image
- Full-width hero image when `imageUrl` exists — full-bleed edge-to-edge, breaking out of max-w-2xl content column
- Image above headline, headline below on cream — clean separation, classic newspaper layout
- When no imageUrl: nothing — skip straight to headline on cream. No placeholder gradient or accent bar
- Use plain `<img>` tag (same as HeroArticle in Phase 18 — unpredictable external image domains)

### Article typography & colors (ART-01, ART-02)
- Headline: font-headline (Newsreader) — already in place, keep
- Body: font-body (Inter) via prose styling — replace prose-zinc with cream/sage palette
- Timestamp: font-label (Work Sans) in sage
- Background: warm cream (#fbfaee) — replace any zinc-50 backgrounds
- Text colors: swap all zinc-900/500/400 to appropriate sage/dark tones

### Breadcrumb
- Keep current Startseite > Bezirk > Artikel structure
- Restyle to muted sage (#4a5d4e) text on cream background
- Subtle, doesn't compete with headline

### AI disclosure banner
- Restyle from amber warning to subtle sage note
- Sage border, cream background, sage text — blends with editorial palette
- Same content text, just palette change

### Share button placement
- Move from bottom (after body) to below headline area, before article body
- Users can share without reading the full article

### Source attribution
- Keep subtle, restyle to sage color instead of zinc-400
- Position below article body as currently

### Related articles
- Horizontal scroll cards reusing Top-Meldungen card pattern from Phase 18
- Small thumbnail cards with headline and Bezirk badge
- Section heading: "Weitere Artikel" in font-label (Work Sans) with thin warm-brown divider line matching homepage section headings
- Up to 5 related articles (current count, unchanged)

### Claude's Discretion
- Exact pill dimensions and border-radius for active nav state
- Spacing between nav items
- Hero image aspect ratio / max-height constraints
- Prose typography fine-tuning (line-height, paragraph spacing)
- Ad unit placement adjustments if needed
- Responsive behavior of hero image on very wide screens

</decisions>

<specifics>
## Specific Ideas

No specific references — decisions above are precise enough for implementation.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/reader/TopMeldungenRow.tsx`: Horizontal scroll card pattern — reuse for related articles section
- `src/components/reader/BottomNav.tsx`: Current single-item nav — will be restructured to four items with pill state
- `src/components/reader/HeroArticle.tsx`: Full-bleed hero image with plain `<img>` tag — same pattern for article detail hero
- `src/components/reader/ShareButton.tsx`: Existing share component — just needs repositioning
- Design tokens from Phase 16: `font-headline`, `font-body`, `font-label`, `styrian-green`, `cream`, `sage`, `alpine-red`

### Established Patterns
- Tailwind v4 @theme tokens in globals.css — all colors/fonts via utility classes
- Material Symbols via inline `<span class="material-symbols-outlined">` — no wrapper component
- Server component for article page (data fetching) — no client-side interactivity needed for the restyling
- Plain `<img>` for external images (not next/image) — established in Phase 18 HeroArticle
- Horizontal scroll via native CSS overflow-x — established in Phase 18 TopMeldungenRow

### Integration Points
- `src/app/(public)/artikel/[publicId]/[slug]/page.tsx`: Main article page — hero image, layout restructure, share button move, color updates
- `src/components/reader/BottomNav.tsx`: Full rewrite — four items, active pill, placeholders
- `src/app/(public)/layout.tsx`: May need to pass current path to BottomNav for active state detection

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 19-article-detail-bottom-navigation*
*Context gathered: 2026-03-25*
