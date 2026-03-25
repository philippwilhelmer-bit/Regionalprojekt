# Phase 18: Homepage Editorial Layout - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform the current flat infinite-scroll homepage into an editorial newspaper layout with four distinct zones: a dominant hero featured article, a horizontally scrollable top-stories row, Bezirk-based topic sections with editorial grids, and a conditional breaking news banner. Covers HOME-01 through HOME-04. Requires a Prisma migration for `isEilmeldung` and `imageUrl` fields on Article.

</domain>

<decisions>
## Implementation Decisions

### Hero article (HOME-01)
- Add `imageUrl` (optional String) field to Article model — AI pipeline or editor provides a URL
- Hero selection: use `isFeatured` flag — editor marks one article as featured, that becomes the hero
- Fallback when no article has isFeatured=true: use newest article with a styrian-green gradient background instead of an image
- Hero displays: Bezirk badge at top, large Newsreader serif headline, 1-2 line excerpt, all over gradient overlay on the image
- Full-bleed width, visible without scrolling on mobile

### Top-Meldungen row (HOME-02)
- Selection: pinned articles (`isPinned=true`). Fallback: newest articles so the row is always visible
- Respects user's "Mein Bezirk" filter — only shows articles from selected Bezirke
- Each card shows: small thumbnail (gradient if no imageUrl), headline text, Bezirk badge
- ~3 cards visible at once on mobile, more on desktop
- Uniform styrian-green (#2D5A27) bottom-border accent on every card
- "Top-Meldungen" label in Work Sans label font with thin divider line above the row
- Subtle gradient fade on right edge to hint at more scrollable content
- Horizontal scroll via native CSS overflow-x (touch swipe on mobile)

### Topic sections / Bezirk grouping (HOME-03)
- Reinterpret "topic sections" as Bezirk sections — articles grouped by their tagged Bezirk
- With Mein Bezirk filter active: one section per selected Bezirk, each with its own heading
- Without Mein Bezirk (unfiltered): one big editorial grid of all articles, no section divisions
- Editorial grid within each section: 1 large article (2/3 width with image) + 2 smaller text-only cards beside it — classic newspaper layout
- Subtle wood-textured horizontal divider between sections — thin line in warm brown (#8B7355) evoking traditional Styrian style
- Styrian flag accents (white/green micro-stripe or green highlight) near section headings

### Eilmeldung banner (HOME-04)
- Add `isEilmeldung` (Boolean, default false) field to Article model via Prisma migration
- Banner: sticky below the header/stripe, stays visible while scrolling
- Red background (#8b0000 alpine-red), white "EILMELDUNG" label text only — no article title
- Appears when at least one published article has isEilmeldung=true; absent when none flagged
- Dismissible per session: user can tap X to hide. Reappears on next page load or if a new Eilmeldung is flagged
- Dismiss state stored in sessionStorage
- DB migration and reader-side banner only — admin UI checkbox for Eilmeldung is NOT in this phase's scope

### Claude's Discretion
- Exact hero gradient overlay intensity and direction
- Card sizing and spacing within Top-Meldungen row
- Number of articles shown per Bezirk section
- Wood-divider CSS implementation (background-image, border-image, or pseudo-element)
- Styrian flag accent exact placement and style
- Responsive breakpoints for editorial grid columns
- Scroll snap behavior for Top-Meldungen (if any)
- Loading/skeleton states for the new layout sections

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/reader/ArticleCard.tsx`: Has `featured` prop for larger rendering — can be extended or used as basis for hero and grid cards
- `src/components/reader/ArticleFeed.tsx`: Client component with infinite scroll, Bezirk filtering via localStorage, IntersectionObserver — will be significantly restructured
- `src/app/(public)/page.tsx`: Current homepage server component — queries `listArticlesReader({ limit: 20 })`
- `src/lib/content/articles.ts`: `listArticlesReader()` with orderBy: isPinned desc, isFeatured desc, publishedAt desc — needs extension for new queries

### Established Patterns
- Tailwind v4 @theme tokens in globals.css — all design system colors/fonts available
- Material Symbols via inline `<span class="material-symbols-outlined">` — for icons in cards/sections
- Client components for anything needing localStorage (Bezirk filter) — server components for data fetching
- `(admin)` route group isolation — reader changes don't touch admin

### Integration Points
- `prisma/schema.prisma`: Add `isEilmeldung Boolean @default(false)` and `imageUrl String?` to Article model
- `src/app/(public)/page.tsx`: Restructure from single feed to hero + top-stories + sections layout
- `src/lib/content/articles.ts`: New query functions for featured article, pinned articles, and Bezirk-grouped articles
- `src/components/reader/ArticleFeed.tsx`: Major restructure — current infinite scroll becomes the Bezirk sections + editorial grid
- `src/app/(public)/layout.tsx`: Eilmeldung banner may need to be placed here (sticky, below header)

</code_context>

<specifics>
## Specific Ideas

No specific references — decisions above are precise enough for implementation.

</specifics>

<deferred>
## Deferred Ideas

- Admin UI checkbox for Eilmeldung flag — separate phase or minor follow-up
- Category/topic system for articles (beyond Bezirk grouping) — future milestone
- AI-generated article images or image sourcing pipeline — future enhancement

</deferred>

---

*Phase: 18-homepage-editorial-layout*
*Context gathered: 2026-03-25*
