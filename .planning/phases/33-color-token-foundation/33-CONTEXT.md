# Phase 33: Color Token Foundation - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the existing 8-token color system with ~30 MD3-style semantic tokens using the Ink/Parchment/Slate/Aged Wood palette. Enforce the No-Line Rule (no visible borders), update all border radii to 0.125rem/0.25rem, define glassmorphism tokens, and migrate all reader-facing components to the new token system. Admin/CMS pages are out of scope (Phase 37).

</domain>

<decisions>
## Implementation Decisions

### Token naming convention
- Editorial names as roots: ink, parchment, slate, aged-wood
- Brightness-scale suffixes: -dim, -soft, -bright, -muted (based on lightness relative to root)
- Glassmorphism uses standalone `glass-` prefix: glass-nav, glass-overlay
- Old token names (primary, secondary, accent, background, surface, etc.) removed entirely — clean break, no aliases

### Tonal surface palette
- 3 tonal levels: parchment (#FCF9EF, main bg), parchment-dim (#F6F4EA, section alternation), parchment-bright (#FFFFFF, elevated cards/modals)
- No-Line Rule enforced via tonal background shifts only — no negative space fallback, no borders
- All existing borders in reader components (ListItem.tsx, ArticleFeed.tsx) replaced with tonal shifts
- Shadows use ink-tinted color-mix() — never pure black or gray hex
- Spacing tokens enforced: --spacing-gutter (1rem horizontal), --spacing-vertical (1.7rem, 3:5 ratio), --spacing-section (4rem)

### Bezirk color handling
- All 13 per-Bezirk gradient maps (BEZIRK_COLORS, BEZIRK_BADGE_COLORS) removed entirely from ArticleCard.tsx
- All cards use unified Archivist ink gradient and badge styling from tokens
- TopMeldungenRow.tsx gets same treatment — collapse per-Bezirk hex values to unified tokens
- bundesland.config.ts branding colors (#154212, #2d7a1f) kept separate from design tokens (same as Phase 16 decision)

### Migration scope
- Full sweep of reader components + token definitions in one phase
- globals.css: complete token system (~30 tokens, shadow tokens, spacing tokens, glassmorphism tokens)
- 9 reader files: all raw hex values replaced with token references
- 12 reader files: all rounded-xl/rounded-full/rounded-lg flattened to 0.125rem or 0.25rem
- 3 reader files: border removal, replaced with tonal shifts
- Admin/CMS files untouched — Phase 37 handles those

### Border radius rules
- 0.125rem (2px): buttons, badges, inputs, chips, nav items
- 0.25rem (4px): cards, image containers, modals, overlays
- No rounded-full anywhere in reader components — avatars and pills get sharp treatment too

### Visual expectations
- Site will look partially styled after Phase 33 — colors and radii correct, but shell layout (nav, footer, header) still v2.0 structure
- This is an expected intermediate state; Phases 34-37 handle structural component redesigns

### Claude's Discretion
- Exact hex values for token variants (ink-soft, ink-muted, slate-soft, etc.) — as long as they follow the brightness-scale convention
- Exact shadow size/spread values
- Number of shadow tokens (sm, md, lg) and their specifics
- How to handle edge cases in border removal where tonal shift alone may not provide enough visual separation

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `globals.css`: Current @theme block with 8 tokens — will be completely rewritten with ~30 editorial tokens
- `--spacing-gutter: 1.7rem` and `--spacing-section: 4rem` already exist — update values to match Archivist scale

### Established Patterns
- Tailwind CSS v4 with `@theme` in globals.css — single source of truth for tokens (established in Phase 16)
- `(admin)` route group has isolated layout — natural boundary for reader-only migration
- Per-Bezirk color maps are component-local constants (ArticleCard.tsx, TopMeldungenRow.tsx) — will be deleted

### Integration Points
- `src/app/globals.css`: Complete @theme rewrite (color tokens, radius tokens, shadow tokens, spacing tokens, glassmorphism tokens)
- `src/components/reader/ArticleCard.tsx`: Remove BEZIRK_COLORS + BEZIRK_BADGE_COLORS maps, apply ink tokens
- `src/components/reader/TopMeldungenRow.tsx`: Remove per-Bezirk hex values, apply ink tokens
- `src/components/reader/ListItem.tsx`: Remove border, apply tonal shift
- `src/components/reader/ArticleFeed.tsx`: Remove borders, apply tonal shifts
- 12 reader component files: radius migration (rounded-xl/full/lg → 0.125rem or 0.25rem)

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

*Phase: 33-color-token-foundation*
*Context gathered: 2026-04-01*
