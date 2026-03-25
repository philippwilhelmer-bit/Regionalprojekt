# Phase 9: Ad Config Wiring + Auth Hardening - Research

**Researched:** 2026-03-24
**Domain:** Next.js 15 Server Components, Server Actions, next/headers cookies API
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**AdUnit architecture**
- Server Component wrapper — new wrapper at `@/components/reader/AdUnit.tsx` (replaces the current client export at the same path); imports `bundesland.config` directly (`import config from '@/../bundesland.config'`) and resolves the slot ID via `config.adZones.find(z => z.id === zone)?.envVar` → `process.env[envVar]`
- Same import path — the Server wrapper is exported as `AdUnit`; the client implementation is renamed `AdUnitClient` (internal, not exported). All 3 call sites (`page.tsx`, `ArticleFeed.tsx`, article detail page) change nothing.
- `features.ads` gate in the Server wrapper — wrapper returns `null` if `config.features.ads` is `false`; `AdUnitClient` never renders. One gate controls all zones.
- Per-zone `enabled` flag respected — wrapper also returns `null` if the matched zone has `enabled: false`, even when `features.ads` is `true`. Allows disabling individual zones without touching the global flag.
- Dev placeholder preserved — Server wrapper passes `pubId` and `slot` as props; `AdUnitClient` shows the gray placeholder box if either is `undefined`. Local dev keeps working without AdSense credentials.

**Auth scope**
- All exported Server Actions in the admin layer get `requireAuth()` — not just the 7 explicitly commented-out ones, but also the unprotected exports in `ai-config-actions.ts`, `pipeline-config-actions.ts`, and `sources-actions.ts`
- FormData wrappers included — `togglePinForm`, `softDeleteForm`, `approveArticleForm`, `createSourceForm`, `updateSourceForm`, etc. are Server Actions callable from `<form action={}>` and must be auth-gated
- `requireAuth()` added to `auth-node.ts` — alongside existing `signSessionCookie` and `verifySessionCookie` exports; single import for all auth utilities
- Failure behavior: `redirect('/admin/login')` — consistent with middleware behavior; form submissions follow the redirect rather than surfacing an error page
- `loginAction` and middleware are exempt — auth infrastructure, not admin mutations
- No separate test for `requireAuth()` wrapper — it's a trivial wrapper around `verifySessionCookie` + `redirect()`; coverage comes from existing auth tests and the login flow integration

**Impressum + JSON-LD wiring**
- Wire only what's already in config — replace `[MEDIENINHABER_NAME]`, the address block, and `[EMAIL]` with values from `config.branding.impressum.{publisherName, address, email}`; remaining placeholders (`[TELEFON]`, `[UNTERNEHMENSGEGENSTAND]`, `[BLATTLINIE]`, `[DATENSCHUTZ_EMAIL]`) stay as static text for the operator to fill before launch
- Address rendered as a single string — `config.branding.impressum.address` is a full address string; render it directly with no parsing or splitting
- Direct config import in `impressum/page.tsx` — `import config from '@/../bundesland.config'` at the top of the Server Component; no prop drilling from layout
- JSON-LD publisher name also wired — article detail page's JSON-LD NewsArticle schema publisher name reads from `config.branding.impressum.publisherName` (same import, same pattern)
- "Österreich" stays hardcoded — platform is Austria-only; no country field needed in config

### Claude's Discretion
- Exact TypeScript interface for the props passed from Server wrapper to `AdUnitClient` (slot, pubId, zone, enabled or resolved)
- Whether `AdUnitClient` is co-located in the same file as the Server wrapper or extracted to a separate file
- Exact file timestamp/naming for any migration artifacts (none expected for this phase — no schema changes)
- Order of `requireAuth()` call within each Server Action (first line before any logic)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AD-02 | Ad placements are configurable per deployment via the Bundesland config file | AdUnit Server wrapper resolves slot from `config.adZones[].envVar`; `features.ads` gates all rendering; per-zone `enabled` flag respected |
</phase_requirements>

---

## Summary

Phase 9 is a pure wiring phase — three self-contained tasks that close known gaps without introducing new features, new schema migrations, or new UI. All patterns are established in prior phases; this phase applies them consistently.

The AdUnit refactor converts the existing Client Component (`"use client"`) into a Server Component wrapper that reads `bundesland.config.ts` at render time, resolves the correct AdSense slot from `config.adZones`, and gates rendering via `config.features.ads`. The existing client-side `<ins>` push logic moves into a renamed internal `AdUnitClient` component. The three existing call sites (`(public)/page.tsx`, `ArticleFeed.tsx`, article detail page) remain unchanged because the exported name stays `AdUnit`.

The auth hardening task adds `requireAuth()` to `auth-node.ts` and adds a call to it at the top of every admin Server Action wrapper. The `// await requireAuth()` comments already in `articles-actions.ts` and `exceptions-actions.ts` mark the exact lines to activate; `ai-config-actions.ts`, `pipeline-config-actions.ts`, and `sources-actions.ts` have no such comments but the same pattern applies.

The Impressum wiring replaces three placeholder strings with `config.branding.impressum` fields, and the article detail page JSON-LD wires `publisher.name` to the same field.

**Primary recommendation:** Execute in three clean, independently verifiable tasks: (1) AdUnit Server wrapper, (2) requireAuth() everywhere, (3) Impressum + JSON-LD wiring.

---

## Standard Stack

### Core (already in project — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | ^15.5.14 | Server Components, Server Actions, `next/headers` | Project baseline |
| `next/headers` | (bundled) | `cookies()` API for server-side session access | Only way to read cookies in Server Actions |
| `next/navigation` | (bundled) | `redirect()` for auth failure response | Established pattern in project |
| TypeScript | (project) | Type-safe config access | All config types in `src/types/bundesland.ts` |

**Installation:** No new packages required.

---

## Architecture Patterns

### Pattern 1: Server Component wrapping a Client Component

This is the canonical Next.js 15 pattern for components that need both server-side data resolution and client-side interactivity.

```
AdUnit.tsx (Server Component, no "use client")
  ├── reads config at module scope (allowed in Server Components)
  ├── resolves pubId and slot from config
  ├── gates on config.features.ads and zone.enabled
  └── renders <AdUnitClient pubId={pubId} slot={slot} zone={zone} />
        (AdUnitClient is "use client", contains useEffect + adsbygoogle push)
```

**Key constraint:** `import config from '@/../bundesland.config'` must appear at the top of a file that does NOT have `"use client"`. Server Components can import static config files directly.

**Why this works:** `bundesland.config.ts` is a static TypeScript module — no async, no DB, no cookies. It resolves at build time / import time in the Server Component.

### Pattern 2: requireAuth() in Server Actions

The pattern is established in auth-node.ts — read the session cookie from `next/headers`, verify with `verifySessionCookie()`, and `redirect()` on failure.

```typescript
// In auth-node.ts (Node runtime only — uses node:crypto)
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function requireAuth(): Promise<void> {
  const cookieStore = await cookies()
  const session = cookieStore.get(SESSION_COOKIE_NAME)
  if (!session || !verifySessionCookie(session.value)) {
    redirect('/admin/login')
  }
}
```

**Next.js 15 note:** `cookies()` returns a Promise in Next.js 15 — it must be `await`ed. This differs from Next.js 14 where it was synchronous. The project already uses Next.js ^15.5.14.

**Usage in Server Action:**
```typescript
export async function someAction(input: InputType): Promise<ReturnType> {
  await requireAuth()
  return someDb(defaultPrisma, input)
}
```

**`redirect()` behavior in Server Actions:** In Next.js 15, calling `redirect()` inside a Server Action throws a special NEXT_REDIRECT error that Next.js catches and handles as a redirect response. It must NOT be wrapped in try/catch (the existing `loginAction` pattern already demonstrates this correctly). Place `requireAuth()` first, before any try/catch blocks.

### Pattern 3: Config import in Server Components

Established in the project — used in multiple public-facing Server Components:
```typescript
import config from '@/../bundesland.config'
```

The `@/../` path resolves to the project root from inside `src/`. This is correct for both `impressum/page.tsx` (in `src/app/(public)/impressum/`) and the article detail page (in `src/app/(public)/artikel/[publicId]/[slug]/`).

### Recommended File Structure (Phase 9 changes only)

```
src/
├── lib/admin/
│   └── auth-node.ts           # Add requireAuth() export here
├── components/reader/
│   └── AdUnit.tsx             # Convert: add Server wrapper, rename impl to AdUnitClient
├── app/(public)/
│   └── impressum/page.tsx     # Wire 3 config fields, add config import
│   └── artikel/[publicId]/[slug]/page.tsx  # Wire JSON-LD publisher.name
```

### Anti-Patterns to Avoid

- **`"use client"` in the new Server wrapper:** The wrapper file must NOT have `"use client"` at the top — doing so would prevent direct config import and make `process.env` server-only vars unavailable.
- **Exporting `AdUnitClient`:** It must remain internal (not exported) to preserve the single-export contract expected by the three call sites.
- **Wrapping `redirect()` in try/catch in Server Actions:** `redirect()` throws internally; a surrounding try/catch would swallow it. Place `await requireAuth()` before any try/catch.
- **Using `verifySessionCookieEdge` in auth-node.ts:** `auth-edge.ts` uses Web Crypto and is for the Edge runtime (middleware). `auth-node.ts` uses `node:crypto` and is for Node Server Actions. Do not cross the streams.
- **`cookies()` without await in Next.js 15:** The `cookies()` function returns a Promise in Next.js 15; omitting `await` results in a Promise object, not the cookie store.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session cookie reading in Server Actions | Custom cookie parsing | `next/headers` `cookies()` | Already abstracts request context; compatible with streaming/PPR |
| Auth redirect | Custom HTTP 401 response | `redirect('/admin/login')` from `next/navigation` | Triggers proper Next.js redirect chain; works in Server Actions |
| Config type safety | Runtime validation of config shape | `satisfies BundeslandConfig` (already in bundesland.config.ts) | TypeScript catches config shape errors at build time |

---

## Common Pitfalls

### Pitfall 1: `cookies()` is async in Next.js 15
**What goes wrong:** `const cookieStore = cookies()` (without await) compiles but returns a Promise instead of the cookie store. `cookieStore.get()` is undefined.
**Why it happens:** Next.js 15 made `cookies()` (and `headers()`) async to support Partial Prerendering.
**How to avoid:** Always `const cookieStore = await cookies()`.
**Warning signs:** TypeScript may warn if strict enough; runtime behavior is `undefined` session.

### Pitfall 2: `redirect()` inside try/catch silences it
**What goes wrong:** Placing `await requireAuth()` inside a try/catch causes the NEXT_REDIRECT throw to be caught and swallowed — the redirect never fires.
**Why it happens:** `redirect()` is implemented as a thrown error internally in Next.js.
**How to avoid:** Call `await requireAuth()` as the very first line, before any try/catch blocks.
**Warning signs:** Auth appears to succeed (no redirect) but session was invalid.

### Pitfall 3: AdUnitClient still has `"use client"` — co-location requires care
**What goes wrong:** If `AdUnitClient` is co-located in the same file as the Server wrapper, TypeScript/Next.js will refuse to compile — a file cannot mix Server and Client component exports without explicit boundary.
**Why it happens:** `"use client"` marks a module boundary; it cannot be in the same file as a Server Component.
**How to avoid:** Either (a) extract `AdUnitClient` to a separate file (e.g. `AdUnitClient.tsx`) and import it into `AdUnit.tsx`, or (b) keep `"use client"` only in `AdUnitClient.tsx`. The Server wrapper file (`AdUnit.tsx`) has no `"use client"` directive.
**Warning signs:** Build error: "Cannot import a Server Component into a Client Component."

### Pitfall 4: `process.env[envVar]` returns undefined for server-only vars without `NEXT_PUBLIC_` prefix
**What goes wrong:** `process.env['ADSENSE_UNIT_HERO']` (no NEXT_PUBLIC_ prefix) is available on the server at runtime but not bundled into client JS. This is correct behavior — the Server wrapper reads it and passes the resolved value down as a prop to `AdUnitClient`.
**Why it happens:** Next.js only inlines `NEXT_PUBLIC_*` vars into the client bundle.
**How to avoid:** The Server wrapper reads `process.env[envVar]` and passes `slot={resolvedSlot}` to `AdUnitClient`. `AdUnitClient` receives the resolved string (or undefined for dev placeholder), never reads env directly.
**Warning signs:** `undefined` slot value reaching `AdUnitClient` in production where the env var IS set.

### Pitfall 5: `NEXT_PUBLIC_ADSENSE_PUB_ID` rename vs current code
**What goes wrong:** The current `AdUnitClient` reads `process.env.NEXT_PUBLIC_ADSENSE_PUB_ID` for the publisher ID. This must remain client-accessible (NEXT_PUBLIC_ prefix) since `AdUnitClient` is a Client Component.
**Why it happens:** AdSense publisher ID (data-ad-client) is public; it's safe as NEXT_PUBLIC_. The slot IDs are being moved to server-only env vars via the config's `envVar` field.
**How to avoid:** Keep `pubId = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID` in `AdUnitClient` (or pass it as prop from the Server wrapper — both work). The CONTEXT.md decision says the wrapper passes `pubId` and `slot` as props; so the Server wrapper reads `process.env.NEXT_PUBLIC_ADSENSE_PUB_ID` and passes it down.

---

## Code Examples

### requireAuth() implementation

```typescript
// src/lib/admin/auth-node.ts — add after verifySessionCookie
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function requireAuth(): Promise<void> {
  const cookieStore = await cookies()
  const session = cookieStore.get(SESSION_COOKIE_NAME)
  if (!session || !verifySessionCookie(session.value)) {
    redirect('/admin/login')
  }
}
```

### AdUnit Server wrapper skeleton

```typescript
// src/components/reader/AdUnit.tsx — NO "use client" at top
import config from '@/../bundesland.config'

type AdZone = 'hero' | 'between-articles' | 'article-detail'

interface AdUnitProps {
  zone: AdZone
}

export function AdUnit({ zone }: AdUnitProps) {
  if (!config.features.ads) return null

  const zoneConfig = config.adZones.find(z => z.id === zone)
  if (!zoneConfig || !zoneConfig.enabled) return null

  const pubId = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID
  const slot = process.env[zoneConfig.envVar]

  return <AdUnitClient pubId={pubId} slot={slot} zone={zone} />
}
```

### Using requireAuth() in Server Action wrapper

```typescript
// articles-actions.ts — Server Action wrapper (before any try/catch)
import { requireAuth } from '../admin/auth-node'

export async function createManualArticle(
  input: CreateManualArticleInput
): Promise<Article> {
  await requireAuth()
  return createManualArticleDb(defaultPrisma, input)
}
```

### Impressum config import

```typescript
// src/app/(public)/impressum/page.tsx
import config from '@/../bundesland.config'

// In JSX:
// <strong>{config.branding.impressum.publisherName}</strong>
// {config.branding.impressum.address}, Österreich
// <a href={`mailto:${config.branding.impressum.email}`}>...</a>
```

### JSON-LD publisher name

```typescript
// src/app/(public)/artikel/[publicId]/[slug]/page.tsx
import config from '@/../bundesland.config'

const jsonLd = {
  // ...
  publisher: {
    "@type": "Organization",
    name: config.branding.impressum.publisherName
  },
  // ...
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `cookies()` synchronous | `cookies()` returns Promise | Next.js 15 | Must `await cookies()` in Server Actions |
| Hardcoded slot map in Client Component | Config-driven slot resolution in Server Component | Phase 9 | Deploying new Bundesland only requires config change |

---

## Open Questions

1. **`AdUnitClient` co-location vs separate file**
   - What we know: Server and Client Components cannot mix `"use client"` in the same file
   - What's unclear: Preference for co-location (single file) vs separate file (two files)
   - Recommendation: Separate file `AdUnitClient.tsx` in the same directory — cleaner boundary, easier to test the wrapper in isolation if needed

2. **`listExceptionQueue` Server Action in `exceptions-actions.ts`**
   - What we know: This is a read-only getter called from an admin page (line 80-82); CONTEXT.md says all exported Server Actions in admin layer get requireAuth()
   - What's unclear: CONTEXT.md mentions "7 typed wrappers + FormData wrappers" — `listExceptionQueue` is a 3rd exception action wrapper that isn't explicitly listed
   - Recommendation: Add `requireAuth()` to be consistent; the decision says "all exported Server Actions in the admin layer"

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (via `vitest run`) |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run src/lib/admin/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AD-02 | `features.ads: false` → no AdUnit renders | unit | `npx vitest run src/components/` | ❌ Wave 0 |
| AD-02 | Zone with `enabled: false` → that zone returns null | unit | `npx vitest run src/components/` | ❌ Wave 0 |
| AD-02 | `adZones.find(z => z.id === zone)?.envVar` resolves slot from config | unit | `npx vitest run src/components/` | ❌ Wave 0 |
| (auth) | `requireAuth()` redirects when no session cookie | unit | `npx vitest run src/lib/admin/auth-node.test.ts` | ❌ Wave 0 |
| (impressum) | Impressum page renders config.branding.impressum fields | manual / visual | build + load page | n/a |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/admin/ src/components/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/reader/AdUnit.test.tsx` — covers AD-02 (features.ads gate, per-zone enabled gate, envVar resolution)
- [ ] `src/lib/admin/auth-node.test.ts` — covers requireAuth() redirect behavior (mock `next/headers` cookies, mock `next/navigation` redirect)

*(Note: Impressum wiring is a visual/manual check — no automated test needed. JSON-LD publisher name is confirmed via `next build` output or manual page inspection.)*

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `src/components/reader/AdUnit.tsx` — current implementation (Client Component with hardcoded slot map)
- Direct code inspection of `src/lib/admin/auth-node.ts` — existing exports, missing `requireAuth()`
- Direct code inspection of `src/lib/admin/articles-actions.ts` — `// await requireAuth()` comments confirming exact lines
- Direct code inspection of `src/lib/admin/exceptions-actions.ts` — same pattern
- Direct code inspection of `src/lib/admin/ai-config-actions.ts`, `pipeline-config-actions.ts`, `sources-actions.ts` — no requireAuth() at all
- Direct code inspection of `bundesland.config.ts` — `adZones[].envVar`, `features.ads`, `branding.impressum`
- Direct code inspection of `src/types/bundesland.ts` — `BundeslandConfig`, `AdZone` interfaces
- Direct code inspection of `src/app/(public)/impressum/page.tsx` — placeholder strings to replace
- Direct code inspection of `src/app/(public)/artikel/[publicId]/[slug]/page.tsx` — hardcoded `"Ennstal Aktuell"` in JSON-LD
- Direct code inspection of `middleware.ts` — established `redirect('/admin/login')` pattern
- Package.json — Next.js ^15.5.14 confirmed

### Secondary (MEDIUM confidence)
- Next.js 15 `cookies()` async change — documented in Next.js migration guide; confirmed by project's Next.js version (15.5.14)
- `redirect()` throws internally in Next.js — well-established Next.js behavior, project's `loginAction` pattern confirms (redirect outside try/catch)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, no new dependencies
- Architecture: HIGH — all patterns already used in prior phases (Server/Client Component split, config import, redirect on auth failure)
- Pitfalls: HIGH — all derived from direct code inspection + established Next.js 15 behavior
- Test gaps: HIGH — test files confirmed missing via glob; framework confirmed via package.json

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable patterns, no fast-moving dependencies)
