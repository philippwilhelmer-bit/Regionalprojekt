# Phase 13: Production Readiness — Impressum + CMS Error Count - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Close two specific tech debts: (1) replace 4 literal Impressum placeholders (`[TELEFON]`, `[UNTERNEHMENSGEGENSTAND]`, `[BLATTLINIE]`, `[DATENSCHUTZ_EMAIL]`) with config-driven values from `bundesland.config.ts`, and (2) fix `listSourcesAdmin()` to count article errors by `source.id` (via `Article.sourceId` FK) instead of `source.type` enum.

</domain>

<decisions>
## Implementation Decisions

### Config type structure
- Add 4 new **required** flat fields to `BundeslandBranding.impressum`: `telefon`, `unternehmensgegenstand`, `blattlinie`, `datenschutzEmail`
- Add 1 **optional** field: `uid?: string` — rendered on the Impressum page only if present (ECG §5 for VAT-registered businesses)
- `blattlinie` is a single `string`, not an array — rendered as one `<p>` tag
- `datenschutzEmail` is explicitly separate from existing `email` — no fallback logic
- Existing `email` field keeps its name (no rename to `kontaktEmail`)
- Page title stays hardcoded "Impressum & Datenschutz" — legal standard label, not configurable

### Placeholder values for config
- Ship with `TODO:` prefixed realistic placeholder values:
  - `telefon: 'TODO: +43 XXX XXXXXXX'`
  - `unternehmensgegenstand: 'TODO: Betrieb eines regionalen Nachrichtenportals'`
  - `blattlinie: 'TODO: Blattlinie hier eintragen'`
  - `datenschutzEmail: 'TODO: datenschutz@example.at'`
- `uid` field omitted from config file until real value is available (optional type allows this)

### Error count fix
- `listSourcesAdmin()` switches from `where: { source: source.type }` to `where: { sourceId: source.id }` — uses the `Article.sourceId` FK added in Phase 8
- No schema changes needed — FK and index already exist

### Claude's Discretion
- Whether to add a dev-mode visual warning or console.warn when Impressum fields contain `TODO:` prefixed values — keep it proportionate
- Exact rendering of the optional `uid` field on the Impressum page (e.g. placement, label text)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bundesland.config.ts`: Already imports `BundeslandConfig` type, has `branding.impressum` object with 3 fields — extend in place
- `src/types/bundesland.ts`: `BundeslandBranding` interface defines `impressum` shape — add new fields here
- `src/app/(public)/impressum/page.tsx`: Already imports config, uses `config.branding.impressum.*` — replace `[PLACEHOLDER]` strings with config field reads

### Established Patterns
- Config uses `satisfies BundeslandConfig` for type safety — new required fields will cause tsc error if missing
- Impressum page is a Server Component with no client JS — reads config at import time
- `listSourcesAdmin()` uses duck-typed DI overload pattern (`$connect` check) — same pattern continues

### Integration Points
- `src/lib/admin/sources-actions.ts:138-143`: Error count query — change `source: source.type` to `sourceId: source.id`
- `src/app/(public)/impressum/page.tsx:37-45`: Four `[PLACEHOLDER]` strings to replace with `config.branding.impressum.*` reads
- `src/types/bundesland.ts:11-15`: `impressum` type definition to extend

</code_context>

<specifics>
## Specific Ideas

No specific requirements — straightforward config wiring and query fix.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 13-production-readiness-impressum-cms-error-count*
*Context gathered: 2026-03-25*
