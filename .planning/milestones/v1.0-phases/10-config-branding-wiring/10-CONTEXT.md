# Phase 10: Wire Config Site Name into UI - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the four hardcoded `"Ennstal Aktuell"` string occurrences with `config.siteName` from `bundesland.config.ts`. No new UI, no new features — pure wiring refactor. The four locations are:
1. `src/components/reader/Header.tsx` — site name in the header `<span>`
2. `src/app/layout.tsx` — `metadata.title`
3. `src/lib/reader/rss.ts` — RSS feed title
4. `src/app/admin/login/page.tsx` — page heading (`config.siteName + " Admin"`)

</domain>

<decisions>
## Implementation Decisions

### Header.tsx (client component)
- **Import config directly** in `Header.tsx` — `import config from '@/../bundesland.config'` at the top of the file
- `bundesland.config.ts` has no server-only secrets (adZone values are env var *names*, not values) — safe to bundle client-side
- No prop drilling from the Server Component parent layout; no Server wrapper needed
- Replace `<span className="font-bold text-zinc-900">Ennstal Aktuell</span>` with `<span className="font-bold text-zinc-900">{config.siteName}</span>`

### app/layout.tsx metadata
- **Keep `export const metadata`** (static export, not `generateMetadata()`)
- Add `import config from '@/../bundesland.config'` at top of file
- `config.siteName` resolves at build time — no dynamic function needed
- Replace `title: "Ennstal Aktuell"` with `title: config.siteName`

### rss.ts
- Wire feed **title only**: `` `${config.siteName} \u2013 ${slug}` ``
- Description (`Aktuelle Nachrichten für ${slug} aus der Steiermark`) stays as-is — no site name in it, out of scope

### admin/login/page.tsx
- Replace `Ennstal Aktuell Admin` with `{config.siteName} Admin` (or the string equivalent in Server Component context)
- Import pattern: `import config from '@/../bundesland.config'` — same as impressum/page.tsx in Phase 9

### Claude's Discretion
- Whether login page heading uses template literal or JSX expression (`{config.siteName + ' Admin'}` vs `{config.siteName} Admin`)
- Exact placement of config import relative to other imports in each file

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bundesland.config.ts` (project root) — `siteName: 'Ennstal Aktuell'`, already typed as `BundeslandConfig`
- `src/types/bundesland.ts` — `BundeslandConfig` type — no changes needed

### Established Patterns
- `import config from '@/../bundesland.config'` is the established import path for Server Components (Phase 9: impressum/page.tsx, AdUnit.tsx)
- This phase extends the pattern to a client component (`Header.tsx`) for the first time — acceptable since config has no server-only imports

### Integration Points
- `src/components/reader/Header.tsx` line 47 — `Ennstal Aktuell` hardcoded in JSX
- `src/app/layout.tsx` line 6 — `title: "Ennstal Aktuell"` in static metadata
- `src/lib/reader/rss.ts` line 19 — `` `Ennstal Aktuell \u2013 ${slug}` `` in feed title
- `src/app/admin/login/page.tsx` line 7 — `Ennstal Aktuell Admin` in `<h1>`

</code_context>

<specifics>
## Specific Ideas

- All four changes are mechanical string replacements + one import addition per file
- No schema changes, no migrations, no new files required
- The RSS description (`aus der Steiermark`) is intentionally left as a hardcoded string — it has no site name and is out of scope

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-config-branding-wiring*
*Context gathered: 2026-03-24*
