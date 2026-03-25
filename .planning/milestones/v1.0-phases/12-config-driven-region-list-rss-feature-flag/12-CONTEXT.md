# Phase 12: Config-Driven Region List + RSS Feature Flag - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire BezirkModal and Header to DB-sourced bezirke (replacing hardcoded arrays), and enforce the `features.rss` config flag in the RSS route handler. The config file becomes the single source of truth: `config.regions` drives the seed, the DB drives the UI.

</domain>

<decisions>
## Implementation Decisions

### Config type: add `regions` field
- Add `regions: { slug: string; name: string }[]` to `BundeslandConfig` interface
- Shape is slug + name only (no sort field — array order is display order)
- The seed script (`prisma/seed.ts`) is updated to read from `config.regions` instead of its current hardcoded list
- This fully closes CONF-01: deploying for a new Bundesland requires only `bundesland.config.ts` + re-seed

### BezirkModal and Header data flow
- Both components receive bezirke as a prop (`bezirke: { slug: string; name: string }[]`)
- The `(public)/layout.tsx` Server Component makes ONE `listBezirke()` call and passes the result to both Header and BezirkModal as props
- No extra API route needed — server component prop passing
- Header's hardcoded `BEZIRK_NAMES` Record is fully removed; slug→name resolved dynamically from the prop
- BezirkModal's hardcoded `BEZIRKE` array is fully removed; `toggleAll` checks against `bezirke.length` from prop

### RSS flag enforcement
- `config.features.rss: false` → ALL `/rss/*` routes return 404 (both per-Bezirk and the state-wide steiermark feed)
- Silent 404 — no server-side logging when the flag is false
- Check is at the top of the GET handler before any DB calls

### Claude's Discretion
- Exact prop type name (inline or imported type alias)
- Whether to co-locate the BundeslandConfig `regions` type or keep in existing `src/types/bundesland.ts`
- Migration: existing seeded bezirke don't need a re-seed if DB already has correct data — seed update is additive

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `listBezirke()` (`src/lib/content/bezirke.ts`): DAL function with DI overload — ready to call in Server Component
- `(public)/layout.tsx`: existing Server Component wrapping Header + BezirkModal — natural place for the DB call
- `BezirkModal.tsx` and `Header.tsx`: both already accept no props; will gain a `bezirke` prop

### Established Patterns
- Server Component → Client Component prop passing: used throughout the app (e.g. article pages passing article data)
- `satisfies BundeslandConfig`: config uses `satisfies` operator — adding `regions` to the interface will be caught at compile time
- DAL DI pattern: `listBezirke()` uses zero-arg = production singleton, injected client = tests

### Integration Points
- `(public)/layout.tsx` wraps Header and BezirkModal — one DB call here serves both
- `bundesland.config.ts` + `src/types/bundesland.ts` — interface change + new field in the config object
- `prisma/seed.ts` — reads bezirke list; currently hardcoded, will read from `config.regions`
- `src/app/rss/[slug]/route.ts` — RSS GET handler; feature flag check added at top

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-config-driven-region-list-rss-feature-flag*
*Context gathered: 2026-03-25*
