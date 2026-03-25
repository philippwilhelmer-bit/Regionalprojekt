# Phase 1: Foundation - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Lock the data layer every other component depends on: Prisma schema, 13 Steiermark regions seeded with Gemeinde synonyms, Bundesland config structure (TypeScript), and a type-safe content access layer. No ingestion, no AI, no frontend — just the foundation everything else builds on.

</domain>

<decisions>
## Implementation Decisions

### Bundesland config file
- Format: TypeScript (`bundesland.config.ts`) — type-safe, IDE autocomplete, validated at build time
- Config includes: region list, branding, ad placement zones, default content sources, feature flags
- AI generation settings are NOT in the config — they live in the admin UI only
- Secrets (AdSense IDs, API keys) stay in `.env`; config references env var names and can be committed to git safely
- Language is hardcoded as German — no i18n needed, all deployments are German-language
- Feature flags section included — allows enabling/disabling capabilities per deployment (e.g. ads, RSS) for staged rollouts to new Bundesländer

### Bezirk data model
- Granularity: Bezirk-level only for reader-facing features — no Gemeinde-level filtering exposed to readers
- Relationship: many-to-many — one article can be tagged to multiple Bezirke
- Special tag: "Steiermark-weit" (state-wide) — means "show in every Bezirk feed", avoids tagging all 13 individually
- Gemeinde synonyms stored in DB as AI-tagging hints (e.g. "Ennstal" → Liezen) — invisible to readers, used only to improve AI geo-tagging accuracy

### Branding per deployment
- Visual approach: same alpine design, different color theme per Bundesland
- Branding elements in config: site name & tagline, primary color palette (Tailwind token overrides), logo/header icon, footer/legal info (Impressum contact details, publisher name)
- Colors defined as Tailwind CSS token overrides in config (hex values) — full flexibility, not named presets

### Claude's Discretion
- Exact Prisma schema field names and index choices
- Article status pipeline enum values (e.g. fetched → tagged → written → published)
- Folder/file structure of the content data access layer
- Seed file structure for Bezirk + Gemeinde synonym data

</decisions>

<specifics>
## Specific Ideas

- The existing HTML design uses a specific Tailwind color palette (alpine green, `#154212` primary, etc.) — this becomes the Steiermark default theme; other Bundesländer override these tokens in their config
- "Steiermark-weit" articles should appear in every Bezirk feed without the editor having to select all 13 — one tag does the job
- Config file should be the single source of truth for "what is this deployment" — a developer should be able to understand the entire deployment's identity from one file

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None yet — greenfield project

### Established Patterns
- Tailwind CSS v3.4.x — existing design is built on v3; color tokens are already defined in the HTML design file as a tailwind.config object (can be extracted directly as the Steiermark default theme)
- Alpine-themed design HTML exists as the frontend reference — the Tailwind color token names are already established (primary, secondary, tertiary, surface, etc.)

### Integration Points
- The `bundesland.config.ts` will be imported by: Next.js app layout (branding), seed scripts (regions), ingestion layer (sources), ad placement components (zones)
- The content DAL will be called by: AI pipeline (write articles), ingestion layer (store raw items), CMS (CRUD), reader frontend (fetch filtered feeds)

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-21*
