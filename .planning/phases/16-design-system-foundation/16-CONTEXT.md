# Phase 16: Design System Foundation - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Install fonts, define color tokens, load icon library, and set border radius defaults. Every subsequent phase (17-20) references these consistent tokens. No new features — only the design foundation layer.

</domain>

<decisions>
## Implementation Decisions

### Font loading strategy
- Load Newsreader, Inter, and Work Sans via `next/font/google` (self-hosted at build time, no external requests)
- Minimal weights: Newsreader 400 + 400 italic, Inter 400/500/600, Work Sans 500/600
- Map to Tailwind v4 via CSS variables + `@theme`: `font-headline` (Newsreader), `font-body` (Inter), `font-label` (Work Sans)
- Display strategy: `swap` — show system font immediately, swap when custom font loads
- Apply globally to reader frontend in Phase 16 (headlines get font-headline, body gets font-body)

### Color token scope
- Define named color tokens in Tailwind v4 `@theme`: `styrian-green` (#2D5A27), `cream` (#fbfaee), `alpine-red` (#8b0000), `sage` (#4a5d4e)
- Named colors only — no semantic aliases (no "primary"/"surface" layer)
- `bundesland.config.ts` branding colors (#154212, #2d7a1f) stay unchanged — design tokens are separate from config
- Warm cream (#fbfaee) replaces `bg-zinc-50` as the global body background for reader frontend
- Per-Bezirk gradient and badge colors in ArticleCard get remapped to the design system palette (variations of green/sage/cream instead of rainbow)

### Icon integration
- Load Material Symbols Outlined via Google Fonts CDN `<link>` tag (external request accepted — GDPR concern acknowledged and accepted)
- Inline class usage: `<span class="material-symbols-outlined">icon_name</span>` — no wrapper component
- Replace existing Unicode icons in Phase 16: BottomNav (◎ → material icon) and Header (▾ → material icon)

### Border radius
- Override Tailwind default so `rounded-sm` maps to 2px
- Apply 2px radius everywhere including Bezirk badges (strict editorial, no pill shapes)
- Replace all `rounded-xl` and `rounded-full` in reader components with the new 2px default

### Migration approach
- Full global swap in Phase 16 — site looks noticeably different after this phase
- Reader frontend only — admin/CMS pages keep current styling (out of v1.1 scope per REQUIREMENTS.md)
- Admin layout already isolated via `(admin)` route group

### Claude's Discretion
- Exact Tailwind v4 @theme syntax and CSS variable naming details
- Specific Bezirk color remapping choices (which shades of green/sage per region)
- Font subset optimization (latin vs latin-ext)
- Any additional CSS reset/normalization adjustments

</decisions>

<specifics>
## Specific Ideas

No specific references — decisions above are precise enough for implementation.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bundesland.config.ts`: Branding colors exist but will NOT be updated — design tokens are separate
- `src/app/globals.css`: Currently just `@import "tailwindcss"` + body font-family — will become the design token hub
- `src/app/layout.tsx`: Root layout with `bg-zinc-50` body class — needs update to cream background

### Established Patterns
- Tailwind CSS v4 with CSS-based config (no JS config file) — tokens go in `globals.css` via `@theme`
- Per-Bezirk color maps hardcoded in `ArticleCard.tsx` (BEZIRK_COLORS, BEZIRK_BADGE_COLORS) — need remapping
- `(admin)` route group has its own layout — natural isolation point for reader-only changes

### Integration Points
- `src/app/layout.tsx`: Font loading (next/font/google declarations), body classes, icon CDN link
- `src/app/globals.css`: Tailwind @theme tokens for colors, fonts, radius
- `src/components/reader/ArticleCard.tsx`: Bezirk color remapping, border-radius updates
- `src/components/reader/BottomNav.tsx`: Unicode icon replacement (◎ → Material Symbol)
- `src/components/reader/Header.tsx`: Unicode icon replacement (▾ → Material Symbol)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-design-system-foundation*
*Context gathered: 2026-03-25*
