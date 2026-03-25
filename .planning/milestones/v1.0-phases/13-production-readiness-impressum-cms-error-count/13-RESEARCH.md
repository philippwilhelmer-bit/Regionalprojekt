# Phase 13: Production Readiness — Impressum + CMS Error Count - Research

**Researched:** 2026-03-25
**Domain:** TypeScript type extension, Next.js Server Component config wiring, Prisma query correction
**Confidence:** HIGH

## Summary

This phase closes two isolated tech debts. The scope is tightly bounded by decisions already made in CONTEXT.md: no schema changes, no new dependencies, no rearchitecting. The work is entirely within three files for the impressum fix and one query line for the error count fix.

The impressum fix extends the `BundeslandBranding.impressum` interface with four required fields and one optional field, adds those fields to `bundesland.config.ts` with `TODO:` placeholder values, and replaces four literal `[BRACKET]` strings in `impressum/page.tsx` with config reads. TypeScript's `satisfies BundeslandConfig` operator on the config file will cause a compile error if any required field is missing — this is the natural type-safety gate.

The error count fix changes a single Prisma `where` clause in `listSourcesAdmin()` from `source: source.type` (enum match) to `sourceId: source.id` (FK match). The `Article.sourceId` column and `@@index([sourceId])` already exist from Phase 8 — the fix is one line with zero schema work. The existing test in `sources-actions.test.ts` needs to be updated to set `sourceId` on created articles (instead of relying on the type match) to keep coverage accurate.

**Primary recommendation:** Execute the two fixes independently in sequence — type extension first (tsc validates it), then query fix with test update. Both are confined to their respective files and require no coordination.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Config type structure**
- Add 4 new required flat fields to `BundeslandBranding.impressum`: `telefon`, `unternehmensgegenstand`, `blattlinie`, `datenschutzEmail`
- Add 1 optional field: `uid?: string` — rendered on the Impressum page only if present (ECG §5 for VAT-registered businesses)
- `blattlinie` is a single `string`, not an array — rendered as one `<p>` tag
- `datenschutzEmail` is explicitly separate from existing `email` — no fallback logic
- Existing `email` field keeps its name (no rename to `kontaktEmail`)
- Page title stays hardcoded "Impressum & Datenschutz" — legal standard label, not configurable

**Placeholder values for config**
- Ship with `TODO:` prefixed realistic placeholder values:
  - `telefon: 'TODO: +43 XXX XXXXXXX'`
  - `unternehmensgegenstand: 'TODO: Betrieb eines regionalen Nachrichtenportals'`
  - `blattlinie: 'TODO: TODO: Blattlinie hier eintragen'`
  - `datenschutzEmail: 'TODO: datenschutz@example.at'`
- `uid` field omitted from config file until real value is available (optional type allows this)

**Error count fix**
- `listSourcesAdmin()` switches from `where: { source: source.type }` to `where: { sourceId: source.id }` — uses the `Article.sourceId` FK added in Phase 8
- No schema changes needed — FK and index already exist

### Claude's Discretion
- Whether to add a dev-mode visual warning or console.warn when Impressum fields contain `TODO:` prefixed values — keep it proportionate
- Exact rendering of the optional `uid` field on the Impressum page (e.g. placement, label text)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| READ-05 | Site includes a legally compliant Impressum page (Austrian Mediengesetz / ECG) | Four `[BRACKET]` placeholders in `impressum/page.tsx` map directly to four new config fields. The `uid` optional field covers ECG §5 VAT requirement. TypeScript `satisfies` on the config file enforces completeness at build time. |
| CMS-04 | Editor can add, configure, and disable content sources from the admin interface | `listSourcesAdmin()` error count currently uses `source.type` (approximate). Switching to `sourceId: source.id` makes counts exact per source row, which is what the admin UI displays to editors. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ^5 | Type interface extension | Already in project; `satisfies` operator enforces required fields |
| Prisma Client | ^6.19.2 | DB query correction | Already in project; `sourceId` FK already exists on Article model |
| Next.js | ^15.5.14 | Server Component rendering | `impressum/page.tsx` is already a Server Component reading config at import time |
| Vitest | ^2.1.9 | Test execution | Already in project; existing `sources-actions.test.ts` covers `listSourcesAdmin` |

No new dependencies required for this phase.

**Installation:** None.

## Architecture Patterns

### Recommended Project Structure

No new files or directories needed. All changes are in-place edits:

```
src/types/bundesland.ts           # extend BundeslandBranding.impressum interface
bundesland.config.ts              # add 4 required + 1 optional fields to branding.impressum
src/app/(public)/impressum/page.tsx  # replace 4 [BRACKET] strings with config reads
src/lib/admin/sources-actions.ts  # change 1 where clause in listSourcesAdmin()
src/lib/admin/sources-actions.test.ts  # update existing test to use sourceId FK
```

### Pattern 1: TypeScript `satisfies` as Type Gate

**What:** The config file uses `satisfies BundeslandConfig` — adding required fields to the type interface automatically makes `tsc --noEmit` fail if the config file omits those fields.

**When to use:** Always — this is the existing project pattern. Do not use `as BundeslandConfig`.

**Example:**
```typescript
// src/types/bundesland.ts
export interface BundeslandBranding {
  primaryColor: string
  secondaryColor: string
  logoPath: string
  impressum: {
    publisherName: string
    address: string
    email: string
    // Phase 13 additions:
    telefon: string
    unternehmensgegenstand: string
    blattlinie: string
    datenschutzEmail: string
    uid?: string   // optional — ECG §5 VAT ID, only rendered if present
  }
}
```

```typescript
// bundesland.config.ts (after update)
branding: {
  ...
  impressum: {
    publisherName: 'Ennstal Aktuell Medien GmbH',
    address: 'Mustergasse 1, 8940 Liezen, Steiermark',
    email: 'redaktion@ennstal-aktuell.at',
    telefon: 'TODO: +43 XXX XXXXXXX',
    unternehmensgegenstand: 'TODO: Betrieb eines regionalen Nachrichtenportals',
    blattlinie: 'TODO: Blattlinie hier eintragen',
    datenschutzEmail: 'TODO: datenschutz@example.at',
    // uid omitted — optional, operator adds when available
  },
```

### Pattern 2: Config Read in Server Component (import-time)

**What:** `impressum/page.tsx` imports config at module level — it is a Server Component with no client JS. Config values are read synchronously as object property accesses.

**When to use:** No change to this pattern needed. Replace literal `[BRACKET]` strings with `{config.branding.impressum.fieldName}` JSX expressions.

**Example (current broken state):**
```tsx
<strong>Telefon:</strong> [TELEFON]
```

**Example (corrected):**
```tsx
<strong>Telefon:</strong> {config.branding.impressum.telefon}
```

### Pattern 3: Duck-Typed DI Overload in DB Layer

**What:** `listSourcesAdmin()` uses the established `$connect in db` duck-typing pattern for test injection. This pattern does NOT change for the error count fix — only the `where` clause changes inside the existing function body.

**When to use:** The DI pattern is unchanged. The fix is purely:
```typescript
// BEFORE (approximate — matches all articles of this source type):
const failedErrorCount = await client.article.count({
  where: {
    source: source.type,
    status: { in: ['FAILED', 'ERROR'] },
  },
})

// AFTER (exact — matches only articles linked to this specific source row):
const failedErrorCount = await client.article.count({
  where: {
    sourceId: source.id,
    status: { in: ['FAILED', 'ERROR'] },
  },
})
```

### Pattern 4: Optional Field Conditional Rendering

**What:** The `uid` field is `string | undefined`. In JSX, render it conditionally using `&&` short-circuit, not a ternary.

**Example:**
```tsx
{config.branding.impressum.uid && (
  <p>
    <strong>UID-Nummer:</strong> {config.branding.impressum.uid}
  </p>
)}
```

Placement recommendation (Claude's discretion): After the `datenschutzEmail` contact paragraph in the Impressum section, before the Haftungsausschluss heading — groups all ECG §5 contact/registration data together.

### Anti-Patterns to Avoid

- **Fallback to `email` when `datenschutzEmail` missing:** Locked decision says no fallback logic. `datenschutzEmail` is a separate required field.
- **Removing the `[TODO: ...]` prefix check:** The `TODO:` prefix is intentional. If a dev-mode warning is added, check for the prefix `'TODO:'` (not an empty string).
- **Changing the `source: source.type` query without updating the test:** The existing test creates articles with `source: 'RSS'` but does NOT set `sourceId`. After the fix, articles must have `sourceId: source.id` to be counted. The test must be updated.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Required field enforcement | Runtime validation / Zod schema | TypeScript `satisfies BundeslandConfig` at compile time | Zero runtime cost; build fails if field missing; already the project pattern |
| TODO value detection | Custom scanner script | `console.warn` in dev mode if `process.env.NODE_ENV === 'development'` and field starts with `'TODO:'` | Proportionate; no test infrastructure needed |

## Common Pitfalls

### Pitfall 1: Test Uses `source.type` Match, Not `sourceId` Match

**What goes wrong:** After fixing `listSourcesAdmin()` to filter by `sourceId: source.id`, the existing test still passes because it creates articles with `source: 'RSS'` but `sourceId: null`. The old query counted them (type match). The new query returns 0 (no sourceId set). The test expects 2 — it fails.

**Why it happens:** The existing test was written when Articles had no FK to Source. The `sourceId` FK was added in Phase 8 but the test was not updated to use it.

**How to avoid:** When updating `listSourcesAdmin()`, also update `sources-actions.test.ts` to set `sourceId: source.id` on each test article. The articles seeded with `source: 'RSS', status: 'FAILED'` must also have `sourceId: source.id`.

**Warning signs:** `failedErrorCount` returns 0 in the updated test even though articles were created.

### Pitfall 2: Missing Required Fields Silently at Runtime

**What goes wrong:** If `bundesland.config.ts` is updated without adding the new fields, the Impressum page renders `undefined` (blank) where the fields should appear — no runtime error, no build error if `tsc` is not run.

**Why it happens:** JavaScript object property access on `undefined` produces `undefined` silently in JSX (renders nothing).

**How to avoid:** Run `tsc --noEmit` (`npm run typecheck`) after updating the type. The `satisfies BundeslandConfig` operator will report a type error immediately. This should be a task verification step.

**Warning signs:** Impressum page renders with blank fields instead of `TODO:` placeholder text.

### Pitfall 3: Conditional JSX for `uid` Triggers Server Component Re-render Warnings

**What goes wrong:** Using `uid && <p>...</p>` where `uid` is `undefined` renders nothing but is safe. However, using `uid ? <p>...</p> : null` where `uid` starts as undefined and config is imported statically is also safe — this is a Server Component.

**Why it happens:** Not actually a risk here — no client state, no hydration. Both patterns work. No warning expected.

**How to avoid:** Non-issue. Use `uid && (...)` for idiomatic optional rendering.

### Pitfall 4: Impressum Page Not Covered by Automated Tests

**What goes wrong:** There are no tests for `impressum/page.tsx` — it is a Server Component that reads a static import. If a config field access typo is introduced (e.g., `impressum.datenschutzMail` instead of `datenschutzEmail`), TypeScript catches it but no test fails.

**Why it happens:** Config-driven static Server Components have no test coverage in this project (by design — the type system is the test).

**How to avoid:** Run `tsc --noEmit` after changes. The TypeScript compiler is the test for this file. No new test file needed.

## Code Examples

Verified patterns from project codebase:

### Existing `listSourcesAdmin` Query (lines 138-143 of sources-actions.ts)
```typescript
// Current (approximate):
const failedErrorCount = await client.article.count({
  where: {
    source: source.type,
    status: { in: ['FAILED', 'ERROR'] },
  },
})
```

### Fixed `listSourcesAdmin` Query
```typescript
// Fixed (exact — uses Article.sourceId FK from Phase 8):
const failedErrorCount = await client.article.count({
  where: {
    sourceId: source.id,
    status: { in: ['FAILED', 'ERROR'] },
  },
})
```

### Updated Test Fixture (sources-actions.test.ts)
The existing test at line 99-106 creates articles like:
```typescript
await db.article.create({
  data: { source: 'RSS', status: 'FAILED', title: 'Failed article' },
})
```

After the fix, must become:
```typescript
await db.article.create({
  data: { source: 'RSS', sourceId: source.id, status: 'FAILED', title: 'Failed article' },
})
```

### Existing Impressum Page Pattern (no-JS Server Component)
```tsx
// Already works — this pattern continues unchanged:
import config from '@/../bundesland.config'

export default function ImpressumPage() {
  return (
    // config.branding.impressum.* accessed as synchronous object properties
    <p>{config.branding.impressum.telefon}</p>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `source: source.type` (enum match) | `sourceId: source.id` (FK match) | Phase 8 added FK, Phase 13 uses it | Error counts become per-source-row, not per-source-type |
| `[TELEFON]` literal strings | `config.branding.impressum.telefon` | Phase 13 | Operator configures via config file; no code change needed at launch |

**Deprecated/outdated:**
- The comment in `sources-actions.ts` lines 136-137 ("Articles reference source TYPE not source ID... count is approximate") — remove after fix, it documents the old behavior.

## Open Questions

1. **Dev-mode TODO warning: visual or console?**
   - What we know: CONTEXT.md says "keep it proportionate" — this is Claude's discretion
   - What's unclear: Whether a `console.warn` in the Server Component (runs at request time in dev) vs a visible yellow banner in the rendered page is more useful
   - Recommendation: `console.warn` in the Server Component body when `process.env.NODE_ENV === 'development'` and any impressum field starts with `'TODO:'`. A rendered warning would require conditional JSX across multiple fields and adds noise to legal page screenshotting. Console warn is visible in `next dev` output without cluttering the page.

2. **`uid` label text**
   - What we know: CONTEXT.md leaves label/placement to discretion
   - What's unclear: Austrian standard label (UID-Nummer vs. Umsatzsteuer-Identifikationsnummer)
   - Recommendation: Use `UID-Nummer:` as the label — it is the colloquial Austrian abbreviation recognized in ECG §5 context, shorter than the full `Umsatzsteuer-Identifikationsnummer`.

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run src/lib/admin/sources-actions.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CMS-04 | `listSourcesAdmin()` counts FAILED+ERROR articles by `sourceId` (not `source.type`) — accurate when two sources of same type exist | unit | `npx vitest run src/lib/admin/sources-actions.test.ts` | ✅ (exists, needs update) |
| READ-05 | Impressum fields render from config (no `[BRACKET]` placeholders remain) | manual-only | `npm run typecheck` (tsc) | N/A — Server Component, no runtime test |

READ-05 note: `impressum/page.tsx` is a static Server Component with no test. TypeScript `satisfies BundeslandConfig` is the automated gate. Manual verification is a browser load of `/impressum` after `next build` or `next dev`.

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/admin/sources-actions.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green + `npm run typecheck` passes before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. `sources-actions.test.ts` exists and covers `listSourcesAdmin`. It requires a content update (not creation) to reflect the new `sourceId`-based behavior.

## Sources

### Primary (HIGH confidence)
- Project codebase — direct file reads of all three files to be modified and their test counterparts
- `prisma/schema.prisma` — confirmed `Article.sourceId Int?` FK and `@@index([sourceId])` exist (Phase 8)
- `src/types/bundesland.ts` — confirmed current `impressum` shape (3 fields, no `telefon` etc.)
- `src/app/(public)/impressum/page.tsx` — confirmed 4 literal `[BRACKET]` strings at lines 37, 41, 45, 102-103
- `src/lib/admin/sources-actions.ts` lines 138-143 — confirmed current `source: source.type` query
- `src/lib/admin/sources-actions.test.ts` — confirmed existing test structure and what needs updating
- `bundesland.config.ts` — confirmed current impressum object has 3 fields (publisherName, address, email)
- `.planning/config.json` — confirmed `nyquist_validation: true`

### Secondary (MEDIUM confidence)
- `src/test/setup-db.ts` — confirmed pgLite test infrastructure, `cleanDb()` order, no changes needed here
- `.planning/STATE.md` accumulated decisions — confirms Phase 8 added `sourceId` FK, Phase 9 left `[BRACKET]` placeholders as operator responsibility

### Tertiary (LOW confidence)
None applicable — all claims verified directly from project source files.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all existing project dependencies
- Architecture: HIGH — patterns read directly from live source files, no inference needed
- Pitfalls: HIGH — pitfall 1 (test update) verified by reading both the implementation and its test; pitfall 2 verified by reading `bundesland.config.ts` and `satisfies` usage

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable domain — no external library churn involved)
