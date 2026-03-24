# Phase 10: Wire Config Site Name into UI — Research

**Researched:** 2026-03-24
**Domain:** Next.js 15 config wiring — TypeScript module import in Server Components, Client Components, and RSS utility
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Header.tsx (client component)
- Import config directly in `Header.tsx` — `import config from '@/../bundesland.config'` at the top of the file
- `bundesland.config.ts` has no server-only secrets (adZone values are env var *names*, not values) — safe to bundle client-side
- No prop drilling from the Server Component parent layout; no Server wrapper needed
- Replace `<span className="font-bold text-zinc-900">Ennstal Aktuell</span>` with `<span className="font-bold text-zinc-900">{config.siteName}</span>`

#### app/layout.tsx metadata
- Keep `export const metadata` (static export, not `generateMetadata()`)
- Add `import config from '@/../bundesland.config'` at top of file
- `config.siteName` resolves at build time — no dynamic function needed
- Replace `title: "Ennstal Aktuell"` with `title: config.siteName`

#### rss.ts
- Wire feed **title only**: `` `${config.siteName} – ${slug}` ``
- Description (`Aktuelle Nachrichten für ${slug} aus der Steiermark`) stays as-is — no site name in it, out of scope

#### admin/login/page.tsx
- Replace `Ennstal Aktuell Admin` with `{config.siteName} Admin` (or the string equivalent in Server Component context)
- Import pattern: `import config from '@/../bundesland.config'` — same as impressum/page.tsx in Phase 9

### Claude's Discretion
- Whether login page heading uses template literal or JSX expression (`{config.siteName + ' Admin'}` vs `{config.siteName} Admin`)
- Exact placement of config import relative to other imports in each file

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONF-01 | Platform is deployable for any Bundesland by changing a single config file (regions, branding, sources) | Replacing all four hardcoded strings with `config.siteName` means branding propagates from `bundesland.config.ts` with zero code changes |
| CONF-02 | Steiermark deployment ships with all 13 regions pre-configured (12 Bezirke + Graz) | Indirectly: branding wiring ensures `siteName` used consistently, so Steiermark deployment is coherent end-to-end |
| READ-06 | Each Bezirk has its own subscribable RSS feed for readers | RSS feed title must use `config.siteName` for per-Bezirk feeds to carry correct branding |
</phase_requirements>

---

## Summary

Phase 10 is a pure wiring refactor — no new UI, no new infrastructure, no migrations. The `bundesland.config.ts` file at the project root already has `siteName: 'Ennstal Aktuell'` typed as `BundeslandConfig`. The only work is adding `import config from '@/../bundesland.config'` to four files and replacing four hardcoded string literals with `config.siteName`.

The import path `@/../bundesland.config` is already proven in this project. It was introduced in Phase 9 (AdUnit.tsx, impressum/page.tsx) for both Server Components and a component without `"use client"`. Phase 10 extends it to one Client Component (`Header.tsx`) for the first time. This is safe because `bundesland.config.ts` has no server-only imports — it is a plain TypeScript data file containing only string literals and booleans.

The `export const metadata` pattern in `app/layout.tsx` can reference an imported module-level constant. Next.js 15 resolves `metadata` values at build time, so `config.siteName` resolves without needing `generateMetadata()`. The rss.ts and admin/login/page.tsx files are both standard Server-side modules where top-level imports work without restriction.

**Primary recommendation:** Add the single import to each file and swap the four string literals. No new files, no refactors, no schema changes.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.14 | App Router framework | Already in use throughout the project |
| TypeScript | ^5 | Type system | `BundeslandConfig` type enforces `siteName: string` — no runtime surprises |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `bundesland.config.ts` (project root) | n/a | Single config source | Only config file to change for new Bundesland deployment |
| `src/types/bundesland.ts` | n/a | `BundeslandConfig` type definition | No changes needed — `siteName: string` already declared |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct import | `generateMetadata()` | `generateMetadata()` is async/dynamic; unnecessary here since `config.siteName` is a build-time constant |
| Direct import | Prop-drilling from Server layout | More code, harder to maintain for multiple files |

**Installation:** None required — no new packages needed.

---

## Architecture Patterns

### Pattern 1: Config Import in Server Components (established pattern)
**What:** Top-level TypeScript import of `bundesland.config.ts` into Server Component files
**When to use:** Any Server Component or server-side module that needs site configuration
**Example (from Phase 9 — impressum/page.tsx):**
```typescript
// Already in production: src/app/(public)/impressum/page.tsx line 3
import config from '@/../bundesland.config'

export const metadata: Metadata = {
  title: 'Impressum & Datenschutz',
}

export default function ImpressumPage() {
  return <address>{config.branding.impressum.publisherName}</address>
}
```

### Pattern 2: Config Import in Non-Secret Server Components (established pattern)
**What:** Top-level import in a component file that has no `"use client"` directive
**When to use:** Server Components (RSC) that read config at render time
**Example (from Phase 9 — AdUnit.tsx):**
```typescript
// Already in production: src/components/reader/AdUnit.tsx lines 1-2
import React from 'react'
import config from '@/../bundesland.config'
```

### Pattern 3: Config Import in Client Component (NEW — this phase)
**What:** Top-level import of `bundesland.config.ts` in a `"use client"` file
**When to use:** Client Components that need config values safe to bundle client-side
**Safety condition:** `bundesland.config.ts` has no server-only secrets — adZone envVar strings are env var *names* only, not values. No `server-only` or Node.js-only imports in the config file.
**Example for this phase:**
```typescript
// src/components/reader/Header.tsx — add after existing useEffect/useState imports
"use client";

import { useEffect, useState } from "react";
import config from '@/../bundesland.config';

// ... replace line 47:
// Before: <span className="font-bold text-zinc-900">Ennstal Aktuell</span>
// After:  <span className="font-bold text-zinc-900">{config.siteName}</span>
```

### Pattern 4: Static Metadata from Config
**What:** `export const metadata` object reads from an imported config constant
**When to use:** Root layout or any page where the title is a build-time constant from config
**Example for this phase:**
```typescript
// src/app/layout.tsx
import type { Metadata } from "next";
import config from '@/../bundesland.config';

export const metadata: Metadata = {
  title: config.siteName,
  description: "Aktuelle Nachrichten aus der Steiermark",
};
```

### Pattern 5: Config in RSS Utility
**What:** Regular Node module (no framework directives) imports config for feed title
**When to use:** Library/utility functions that compose site-branded strings
**Example for this phase:**
```typescript
// src/lib/reader/rss.ts — add import, update line 19
import config from '@/../bundesland.config'

// Before: title: `Ennstal Aktuell \u2013 ${slug}`,
// After:  title: `${config.siteName} \u2013 ${slug}`,
```

### Anti-Patterns to Avoid
- **`generateMetadata()` for a static string:** Unnecessary async overhead; `export const metadata` supports module-scope imports resolved at build time.
- **Prop drilling `siteName` from layout:** Three of the four files already import config in established patterns — inconsistency without benefit.
- **Hardcoding the string "Ennstal Aktuell" anywhere:** The whole point of this phase is to remove all such hardcodes.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Branding propagation | Custom React context or environment variable | Direct TypeScript import of `bundesland.config.ts` | Config is a typed, build-time constant; context adds unnecessary re-render surface area |
| Multi-environment switching | Runtime config loading | `bundesland.config.ts` imported at module level | Deployment is per-Bundesland (separate deploys); build-time resolution is correct |

**Key insight:** A plain TypeScript import of a constant file is zero-overhead and build-time verified. There is no runtime configuration problem to solve here.

---

## Common Pitfalls

### Pitfall 1: Importing config in a file that actually has `server-only` dependencies
**What goes wrong:** If `bundesland.config.ts` ever gains a `server-only` or Node.js import, importing it from a Client Component would cause a build error.
**Why it happens:** Client Component bundles cannot include server-only code.
**How to avoid:** `bundesland.config.ts` currently has zero non-TypeScript dependencies and no `import 'server-only'`. Review confirmed: it only imports `BundeslandConfig` type from `src/types/bundesland.ts`, which is also a pure type file.
**Warning signs:** Build error mentioning "You're importing a component that needs server-only" or "crypto" / "fs" in client bundle.

### Pitfall 2: Using `generateMetadata()` unnecessarily
**What goes wrong:** Switching `export const metadata` to `async function generateMetadata()` to accommodate a config import would trigger dynamic rendering for the root layout unnecessarily.
**Why it happens:** Developers assume async is needed for non-literal values in metadata.
**How to avoid:** `export const metadata` resolves module-level imports at build time. Keep the static export as locked in CONTEXT.md.

### Pitfall 3: RSS test asserting exact hardcoded title string
**What goes wrong:** Existing `rss.test.ts` has a test `'channel title contains the slug name'` that checks `xml.toLowerCase().toContain('liezen')`. That test passes regardless of site name. However if any test hard-asserts `Ennstal Aktuell` in the title, it would break.
**Why it happens:** Tests written before config wiring assumed a static string.
**How to avoid:** Review `rss.test.ts` before and after the change. Current tests do NOT assert `Ennstal Aktuell` directly in the title — they only check for the slug. Safe to proceed. After the change, the feed title becomes `${config.siteName} – liezen` where `config.siteName` is the real value from `bundesland.config.ts` (no mock in rss.test.ts).

### Pitfall 4: Vitest module caching with config mocks
**What goes wrong:** If a new test for rss.ts tries to mock `bundesland.config`, the existing rss.test.ts does NOT mock config — it imports the real config. After Phase 10, the real config will return `'Ennstal Aktuell'` as `siteName`. Tests checking the feed title string will see the real value.
**Why it happens:** vitest does not auto-mock modules.
**How to avoid:** The existing rss.test.ts checks that the slug (`liezen`) appears in the XML — it does not assert the full title string. This is correct and does not need to change. No new mocks are needed for this refactor.

---

## Code Examples

Verified patterns from project source code:

### Exact file states before this phase (confirmed by read)

`src/components/reader/Header.tsx` line 47:
```tsx
<span className="font-bold text-zinc-900">Ennstal Aktuell</span>
```

`src/app/layout.tsx` line 6:
```typescript
  title: "Ennstal Aktuell",
```

`src/lib/reader/rss.ts` line 19:
```typescript
    title: `Ennstal Aktuell \u2013 ${slug}`,
```

`src/app/admin/login/page.tsx` line 7:
```tsx
<h1 className="text-2xl font-bold mb-6 text-gray-900">Ennstal Aktuell Admin</h1>
```

### After-state patterns

`Header.tsx` — add import after existing imports (file currently has no config import):
```tsx
"use client";

import { useEffect, useState } from "react";
import config from '@/../bundesland.config';
```

`app/layout.tsx` — add config import, update metadata:
```typescript
import type { Metadata } from "next";
import Script from "next/script";
import config from '@/../bundesland.config';
import "./globals.css";

export const metadata: Metadata = {
  title: config.siteName,
  description: "Aktuelle Nachrichten aus der Steiermark",
};
```

`rss.ts` — add config import (currently only imports feedsmith, ArticleWithBezirke, slugify):
```typescript
import { generateRssFeed } from 'feedsmith'
import type { ArticleWithBezirke } from '@/lib/content/articles'
import { slugify } from './slug'
import config from '@/../bundesland.config'

// line 19 becomes:
    title: `${config.siteName} \u2013 ${slug}`,
```

`admin/login/page.tsx` — add config import, update h1:
```tsx
import config from '@/../bundesland.config'
import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">{config.siteName} Admin</h1>
        <LoginForm />
      </div>
    </div>
  )
}
```

Note: JSX expression `{config.siteName} Admin` (not template literal) is the natural form for an `<h1>` heading — matches the existing JSX style of the file. Template literal `{config.siteName + ' Admin'}` is an alternative at Claude's discretion.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded `"Ennstal Aktuell"` in 4 locations | `config.siteName` from `bundesland.config.ts` | Phase 10 | New Bundesland deployment requires only a config change |

**Deprecated/outdated:**
- All four hardcoded `"Ennstal Aktuell"` string literals — replaced by config reference in this phase.

---

## Open Questions

1. **JSX expression vs template literal in `admin/login/page.tsx`**
   - What we know: `LoginPage` is a Server Component — both `{config.siteName} Admin` (JSX) and `` {`${config.siteName} Admin`} `` or `{config.siteName + ' Admin'}` are valid.
   - What's unclear: Personal style preference only — no functional difference.
   - Recommendation: Use JSX expression `{config.siteName} Admin` (plain text node after the expression) — consistent with how text is mixed with expressions in JSX throughout the codebase (e.g. impressum/page.tsx).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 2.1.9 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run src/lib/reader/rss.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONF-01 | `config.siteName` is the single source of truth — changing it in `bundesland.config.ts` propagates everywhere | integration (build verification) | `npx tsc --noEmit` (build-time check) | ✅ tsconfig present |
| CONF-02 | No direct test needed — Steiermark config coherence is structural | n/a (structural) | `npx vitest run` (full suite green) | ✅ existing suite |
| READ-06 | RSS feed title contains `config.siteName` | unit | `npx vitest run src/lib/reader/rss.test.ts` | ✅ `src/lib/reader/rss.test.ts` |

**Additional integration check:** `npx next build` (smoke test) verifies that `config.siteName` in `export const metadata` resolves without error and that the Client Component bundle succeeds.

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/reader/rss.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** `npx vitest run && npx tsc --noEmit` before `/gsd:verify-work`

### Wave 0 Gaps

The existing `rss.test.ts` tests assert that the slug appears in the channel — they do not assert `config.siteName` appears in the title. After this phase the feed title will be `Ennstal Aktuell – liezen` (real value from config). This is implicitly tested but not explicitly asserted.

- [ ] Consider adding a test: `expect(xml).toContain(config.siteName)` in `rss.test.ts` — covers REQ READ-06 feed title branding explicitly. This is a one-line addition to the existing test file, not a new file.

All other existing tests continue to pass without modification.

---

## Sources

### Primary (HIGH confidence)
- Direct file reads: `bundesland.config.ts`, `src/types/bundesland.ts`, `src/components/reader/Header.tsx`, `src/app/layout.tsx`, `src/lib/reader/rss.ts`, `src/app/admin/login/page.tsx` — current file state confirmed
- Direct file read: `src/app/(public)/impressum/page.tsx`, `src/components/reader/AdUnit.tsx` — established import pattern confirmed
- Direct file read: `src/lib/reader/rss.test.ts` — confirmed no assertion on `Ennstal Aktuell` title string
- Direct file read: `src/components/reader/AdUnit.test.tsx` — confirmed vitest mock pattern for config
- Direct grep: four `Ennstal Aktuell` occurrences confirmed at exact line numbers

### Secondary (MEDIUM confidence)
- Next.js 15.5.14 package confirmed — `export const metadata` with module-scope imports is a documented, stable pattern in Next.js App Router

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all files read directly, exact current state confirmed
- Architecture: HIGH — import pattern proven in Phase 9 code currently in production
- Pitfalls: HIGH — derived from direct inspection of existing tests and file structure

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable — no external dependencies, pure refactor)
