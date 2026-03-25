# Phase 9: Ad Config Wiring + Auth Hardening - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Three wiring tasks that close known gaps: (1) connect `AdUnit.tsx` to `bundesland.config.ts` so ad slots are driven by the config's `adZones` instead of hardcoded env var names, and gate ad rendering via `features.ads`; (2) restore `requireAuth()` on all exported Server Actions in the admin layer; (3) populate Impressum publisher details and JSON-LD publisher name from the config instead of placeholder text. No new UI, no new features.

</domain>

<decisions>
## Implementation Decisions

### AdUnit architecture
- **Server Component wrapper** — new wrapper at `@/components/reader/AdUnit.tsx` (replaces the current client export at the same path); imports `bundesland.config` directly (`import config from '@/../bundesland.config'`) and resolves the slot ID via `config.adZones.find(z => z.id === zone)?.envVar` → `process.env[envVar]`
- **Same import path** — the Server wrapper is exported as `AdUnit`; the client implementation is renamed `AdUnitClient` (internal, not exported). All 3 call sites (`page.tsx`, `ArticleFeed.tsx`, article detail page) change nothing.
- **`features.ads` gate in the Server wrapper** — wrapper returns `null` if `config.features.ads` is `false`; `AdUnitClient` never renders. One gate controls all zones.
- **Per-zone `enabled` flag respected** — wrapper also returns `null` if the matched zone has `enabled: false`, even when `features.ads` is `true`. Allows disabling individual zones without touching the global flag.
- **Dev placeholder preserved** — Server wrapper passes `pubId` and `slot` as props; `AdUnitClient` shows the gray placeholder box if either is `undefined`. Local dev keeps working without AdSense credentials.

### Auth scope
- **All exported Server Actions in the admin layer get `requireAuth()`** — not just the 7 explicitly commented-out ones, but also the unprotected exports in `ai-config-actions.ts`, `pipeline-config-actions.ts`, and `sources-actions.ts`
- **FormData wrappers included** — `togglePinForm`, `softDeleteForm`, `approveArticleForm`, `createSourceForm`, `updateSourceForm`, etc. are Server Actions callable from `<form action={}>` and must be auth-gated
- **`requireAuth()` added to `auth-node.ts`** — alongside existing `signSessionCookie` and `verifySessionCookie` exports; single import for all auth utilities
- **Failure behavior: `redirect('/admin/login')`** — consistent with middleware behavior; form submissions follow the redirect rather than surfacing an error page
- **loginAction and middleware are exempt** — auth infrastructure, not admin mutations
- **No separate test for `requireAuth()` wrapper** — it's a trivial wrapper around `verifySessionCookie` + `redirect()`; coverage comes from existing auth tests and the login flow integration

### Impressum + JSON-LD wiring
- **Wire only what's already in config** — replace `[MEDIENINHABER_NAME]`, the address block, and `[EMAIL]` with values from `config.branding.impressum.{publisherName, address, email}`; remaining placeholders (`[TELEFON]`, `[UNTERNEHMENSGEGENSTAND]`, `[BLATTLINIE]`, `[DATENSCHUTZ_EMAIL]`) stay as static text for the operator to fill before launch
- **Address rendered as a single string** — `config.branding.impressum.address` is a full address string; render it directly with no parsing or splitting
- **Direct config import in `impressum/page.tsx`** — `import config from '@/../bundesland.config'` at the top of the Server Component; no prop drilling from layout
- **JSON-LD publisher name also wired** — article detail page's JSON-LD NewsArticle schema publisher name reads from `config.branding.impressum.publisherName` (same import, same pattern)
- **"Österreich" stays hardcoded** — platform is Austria-only; no country field needed in config

### Claude's Discretion
- Exact TypeScript interface for the props passed from Server wrapper to `AdUnitClient` (slot, pubId, zone, enabled or resolved)
- Whether `AdUnitClient` is co-located in the same file as the Server wrapper or extracted to a separate file
- Exact file timestamp/naming for any migration artifacts (none expected for this phase — no schema changes)
- Order of `requireAuth()` call within each Server Action (first line before any logic)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/admin/auth-node.ts` — exports `signSessionCookie`, `verifySessionCookie`; `requireAuth()` will be added here as a third export
- `src/lib/admin/auth-edge.ts` — `verifySessionCookieEdge` for middleware; exempt from this phase
- `bundesland.config.ts` (project root) — `adZones: [{ id, envVar, enabled }]`, `features: { ads, rss }`, `branding.impressum: { publisherName, address, email }`
- `src/types/bundesland.ts` — `BundeslandConfig` type with `AdZone { id, envVar, enabled }` — no type changes needed for this phase

### Established Patterns
- Server Components in `(public)` route group import config directly — e.g. `import config from '@/../bundesland.config'` is the established pattern
- `auth-node.ts` uses `next/headers` cookies for server-side session verification — `requireAuth()` follows the same pattern
- `// await requireAuth()` comments in `articles-actions.ts` and `exceptions-actions.ts` mark the exact lines to uncomment and implement

### Integration Points
- `src/components/reader/AdUnit.tsx` — refactor: add Server wrapper at top, rename existing implementation to `AdUnitClient`
- `src/lib/admin/articles-actions.ts` — 5 typed wrappers + FormData wrappers need `requireAuth()`
- `src/lib/admin/exceptions-actions.ts` — 2 typed wrappers + FormData wrappers need `requireAuth()`
- `src/lib/admin/ai-config-actions.ts` — `upsertAiConfigAction`, `upsertAiSourceConfigAction`, `deleteAiSourceConfigAction` need `requireAuth()`
- `src/lib/admin/pipeline-config-actions.ts` — `upsertPipelineConfigAction` needs `requireAuth()`
- `src/lib/admin/sources-actions.ts` — `createSource`, `updateSource`, `createSourceForm`, `updateSourceForm` need `requireAuth()`
- `src/app/(public)/impressum/page.tsx` — wire 3 config fields; add `import config from '@/../bundesland.config'`
- Article detail page JSON-LD — wire `config.branding.impressum.publisherName` to the publisher field

</code_context>

<specifics>
## Specific Ideas

- The 7 explicitly commented-out `requireAuth()` lines in `articles-actions.ts` and `exceptions-actions.ts` just need to be uncommented and the actual function implemented — the call sites are already structured correctly
- `AdUnit.tsx` Server wrapper pattern mirrors Phase 8's `getResolvedAiConfig` approach: server-side resolution → pass resolved value to the execution layer
- `config.branding.impressum.address` is already a clean full string (`'Mustergasse 1, 8940 Liezen, Steiermark'`) — render directly with no transformation

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-ad-config-wiring-auth-hardening*
*Context gathered: 2026-03-24*
