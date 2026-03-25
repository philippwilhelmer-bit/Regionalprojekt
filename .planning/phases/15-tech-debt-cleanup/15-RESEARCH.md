# Phase 15: Tech Debt Cleanup — PUBLISHED Filter + Auth UX - Research

**Researched:** 2026-03-25
**Domain:** Next.js 15 Server Actions, Prisma DAL, RSS route cleanup, auth UX
**Confidence:** HIGH

## Summary

Phase 15 closes five precisely scoped tech debt items identified by the v1.0 milestone audit. Every item is a surgical in-place edit to existing files — no new dependencies, no new pages, no migrations. The scope is entirely understood from reading current source code.

The most consequential fix is adding `status: 'PUBLISHED'` to the `getArticlesByBezirk()` WHERE clause in `articles.ts:229`. Once that lands, the RSS route workaround `raw.filter(a => a.status === 'PUBLISHED')` at `route.ts:40` becomes redundant and is deleted — both changes travel together as a single atomic unit. The `loginAction` split is equally mechanical: one combined conditional becomes two sequential guards with different error paths. The logout button is already wired (`/api/admin/logout` route exists, admin layout already renders an `<a href="/api/admin/logout">` link at line 37) — the CONTEXT.md "wire it in" criterion is already met; the planner must verify whether this constitutes closure or requires further work. The `updateSourceHealth` deletion and stale comment removal are pure deletions with no side-effects.

**Primary recommendation:** Execute all five items in a single wave — they are independent, low-risk, and can be tested in isolation. No new dependencies. No schema changes.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Split `!adminPassword || password !== adminPassword` into two separate branches:
  - Missing ADMIN_PASSWORD: `console.error` server-side with clear config warning, return "Login derzeit nicht möglich." to user
  - Wrong password: keep existing "Falsches Passwort. Bitte erneut versuchen."
  - Never leak to the user that the env var is missing
- Add logout button to admin interface — "Abmelden" link/button in top-right of admin header
  - Server action clears session cookie and redirects to `/admin/login`
- Delete `updateSourceHealth()` export from `sources.ts` entirely
- Delete the corresponding test block from `sources.test.ts`
- After DAL fix: remove RSS route JS post-filter workaround
- Add test: `getArticlesByBezirk()` only returns PUBLISHED articles
- Add test: missing ADMIN_PASSWORD returns config error, not wrong-password message

### Claude's Discretion

- Exact logout button styling (consistent with existing admin header)
- RSS route cleanup approach after PUBLISHED filter fix
- Stale comment removal (straightforward deletion)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| READ-06 | Each Bezirk has its own subscribable RSS feed for readers | The RSS feed currently leaks non-PUBLISHED articles (DRAFT, ERROR, FETCHED) to subscribers because `getArticlesByBezirk()` has no status filter. Adding `status: 'PUBLISHED'` to the DAL WHERE clause closes this gap cleanly. The RSS route workaround (`raw.filter(a => a.status === 'PUBLISHED')`) is then deleted. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | (existing) | DAL WHERE clause update | Already used throughout the codebase; `status: 'PUBLISHED'` is a native Prisma filter |
| Next.js | ^15.5.14 | Server Actions, cookies API | Already used; `cookies()` must be awaited per existing project pattern |
| Vitest | (existing) | Unit tests | Already configured in `vitest.config.ts` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:crypto | (Node built-in) | auth-node.ts already uses it | Session cookie operations |

**Installation:** No new packages required. All changes are in existing files.

## Architecture Patterns

### Established Project Patterns

**DI overload pattern** (all DAL functions follow this):
```typescript
// Source: src/lib/content/articles.ts (existing pattern)
export async function getArticlesByBezirk(bezirkSlug: string, options?: {...}): Promise<ArticleWithBezirke[]>
export async function getArticlesByBezirk(client: PrismaClient, bezirkSlug: string, options?: {...}): Promise<ArticleWithBezirke[]>
```
Zero-arg = production singleton, injected client = tests.

**Server Action auth pattern** (existing, articles-actions.ts):
```typescript
// Source: src/lib/admin/articles-actions.ts:220
await requireAuth()  // throws NEXT_REDIRECT if not authenticated — must be OUTSIDE try/catch
return createManualArticleDb(defaultPrisma, input)
```

**Cookie operations in Next.js 15** (existing pattern in login-action.ts and layout.tsx):
```typescript
// Source: src/lib/admin/login-action.ts:18
const cookieStore = await cookies()  // MUST await in Next.js 15
```

### Pattern 1: PUBLISHED Filter in Prisma WHERE Clause

**What:** Add `status: 'PUBLISHED'` alongside the existing OR clause in `getArticlesByBezirk()`
**When to use:** Any DAL function that feeds public-facing reader/RSS endpoints
**Example — current (broken):**
```typescript
// Source: src/lib/content/articles.ts:229-237
return db.article.findMany({
  where: {
    OR: [
      { bezirke: { some: { bezirkId: bezirk.id } } },
      { isStateWide: true },
    ],
  },
  // ... missing status filter — leaks DRAFT/ERROR/FETCHED articles
})
```
**Example — fixed:**
```typescript
return db.article.findMany({
  where: {
    status: 'PUBLISHED',
    OR: [
      { bezirke: { some: { bezirkId: bezirk.id } } },
      { isStateWide: true },
    ],
  },
  // ... rest unchanged
})
```

### Pattern 2: Split Auth Conditional

**What:** Separate the missing-env-var case from the wrong-password case in `loginAction`
**Current (combined, misleading):**
```typescript
// Source: src/lib/admin/login-action.ts:14
if (!adminPassword || password !== adminPassword) {
  return { error: 'Falsches Passwort. Bitte erneut versuchen.' }
}
```
**Fixed (two separate branches):**
```typescript
if (!adminPassword) {
  console.error('[login-action] ADMIN_PASSWORD env var is not set — check server configuration')
  return { error: 'Login derzeit nicht möglich.' }
}
if (password !== adminPassword) {
  return { error: 'Falsches Passwort. Bitte erneut versuchen.' }
}
```

### Pattern 3: Logout — Current State vs. Expected State

**Current state (already partially implemented):**
- `src/app/api/admin/logout/route.ts` exists — a GET route handler that deletes the session cookie and redirects to `/admin/login`
- `src/app/(admin)/layout.tsx:37` already renders `<a href="/api/admin/logout">Abmelden</a>` in the sidebar footer

**Implication for planning:** The logout "wire-in" per success criterion 3 is already functionally present. The planner must decide whether:
1. The existing `<a href="/api/admin/logout">` link in the admin layout satisfies "wired into admin layout," OR
2. The CONTEXT.md decision specifying "Server action clears the session cookie" means the implementation should be converted from a Route Handler to a Server Action

The CONTEXT.md says "Server action clears the session cookie and redirects to `/admin/login`" — this implies converting the current Route Handler approach to a proper Server Action. The admin layout link would then call a Server Action via a form/button instead of a plain `<a>` tag. The `LogoutButton.tsx` file does not currently exist; it would be created as a client-side component wrapping the Server Action call.

**LogoutButton.tsx pattern (to be created):**
```typescript
// 'use client' component with a form whose action= is a Server Action
'use client'
import { logoutAction } from '@/lib/admin/logout-action'

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button type="submit" className="...">Abmelden</button>
    </form>
  )
}
```
**logout-action.ts pattern:**
```typescript
'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE_NAME } from './auth-edge'

export async function logoutAction() {
  const cookieStore = await cookies()  // MUST await in Next.js 15
  cookieStore.delete(SESSION_COOKIE_NAME)
  redirect('/admin/login')  // outside try/catch — throws NEXT_REDIRECT intentionally
}
```

### Anti-Patterns to Avoid

- **Placing `redirect()` inside try/catch:** `redirect()` throws `NEXT_REDIRECT` internally — see existing auth-node.ts:42 comment and login-action.ts:26 comment. logout-action must follow the same pattern.
- **Wrapping `cookies()` without await:** Next.js 15 requires `await cookies()` — see login-action.ts:18 and layout.tsx:14.
- **Using `instanceof PrismaClient` for DI checks:** Project uses duck-typing (`'$connect' in client`) — see STATE.md decision [Phase 01-foundation].
- **Updating tests before deleting the function:** Remove `updateSourceHealth` import from `sources.test.ts` first, then delete the function from `sources.ts`, to avoid TypeScript compile errors mid-task.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session cookie deletion | Custom cookie clearing logic | `cookieStore.delete(SESSION_COOKIE_NAME)` using the existing `SESSION_COOKIE_NAME` constant from `auth-edge.ts` | Constant is already shared between auth-node.ts and the logout route — must stay consistent |
| PUBLISHED filter | Manual JS `.filter()` after DB query | Prisma `where: { status: 'PUBLISHED' }` | Pushes filtering to DB, eliminates the RSS route workaround entirely |

**Key insight:** Every problem in this phase already has its solution established in the codebase — the fixes are alignments to existing patterns, not new patterns.

## Common Pitfalls

### Pitfall 1: Partial Cleanup of RSS Route Workaround

**What goes wrong:** The DAL fix lands but the RSS route post-filter (`raw.filter(a => a.status === 'PUBLISHED')`) is left in place as harmless redundancy.
**Why it happens:** Developers treat redundant code as "safe to leave."
**How to avoid:** Success criterion 1 explicitly says "RSS route JS post-filter workaround removed" — it must be deleted together with the DAL fix.
**Warning signs:** If `route.ts:39-40` still contains `const raw = await getArticlesByBezirk(...)` and `articles = raw.filter(...)` after the plan executes.

### Pitfall 2: Logout Route Handler vs. Server Action Ambiguity

**What goes wrong:** The existing `/api/admin/logout` Route Handler approach is left as-is, while a new Server Action is also created — two code paths for the same operation.
**Why it happens:** The existing Route Handler and layout link are functional; it's tempting to leave them. But CONTEXT.md specifies a Server Action approach.
**How to avoid:** If converting to Server Action: delete `/api/admin/logout/route.ts`, replace the `<a href="...">` in layout with `<LogoutButton />`, create `logout-action.ts` and `LogoutButton.tsx`.
**Warning signs:** Both the Route Handler file and a new Server Action exist simultaneously.

### Pitfall 3: Test Isolation for PUBLISHED Filter Test

**What goes wrong:** The new test for `getArticlesByBezirk()` PUBLISHED filtering creates articles but the `beforeEach` doesn't clean them, causing state bleed.
**Why it happens:** Forgetting the existing cleanup pattern.
**How to avoid:** Follow the existing `articles.test.ts` pattern — `beforeEach` deletes `articleBezirk` then `article`. The new test should live in the existing `describe('Article DAL')` block.

### Pitfall 4: TypeScript Error After Partial `updateSourceHealth` Deletion

**What goes wrong:** Function is deleted from `sources.ts` but the import in `sources.test.ts` is not updated, causing a TypeScript/compile error.
**Why it happens:** Forgetting that `sources.test.ts:11` imports `updateSourceHealth` by name.
**How to avoid:** Update `sources.test.ts` import line first (remove `updateSourceHealth` from import), delete the `describe('updateSourceHealth', ...)` block, then delete the function from `sources.ts`.

### Pitfall 5: Stale Comment Points to Wrong Auth State

**What goes wrong:** The comment at `articles-actions.ts:214` says `requireAuth() is a placeholder for the auth module (Phase 6)` — but Phase 5 fully implemented auth (see STATE.md `[Phase 05-editorial-cms]`). The comment is factually wrong, not just stale.
**How to avoid:** Delete lines 214-215 entirely. The `requireAuth()` calls at lines 220+ are real and functional.

## Code Examples

### Verified Current Code at Each Change Point

**Change 1 — `articles.ts:229` (add status filter):**
```typescript
// Source: src/lib/content/articles.ts:229-237 (current — MISSING status filter)
return db.article.findMany({
  where: {
    OR: [
      { bezirke: { some: { bezirkId: bezirk.id } } },
      { isStateWide: true },
    ],
  },
```

**Change 2 — `route.ts:38-40` (remove after DAL fix):**
```typescript
// Source: src/app/rss/[slug]/route.ts:38-40 (to be deleted)
// getArticlesByBezirk does not filter by status — filter to PUBLISHED only
const raw = await getArticlesByBezirk(slug, { limit: 20 })
articles = raw.filter(a => a.status === 'PUBLISHED')
```
Replacement:
```typescript
articles = await getArticlesByBezirk(slug, { limit: 20 })
```

**Change 3 — `login-action.ts:14-17` (split conditional):**
```typescript
// Source: src/lib/admin/login-action.ts:13-17 (current — combined, misleading)
const adminPassword = process.env.ADMIN_PASSWORD
if (!adminPassword || password !== adminPassword) {
  return { error: 'Falsches Passwort. Bitte erneut versuchen.' }
}
```

**Change 4 — `articles-actions.ts:214-215` (delete stale comment):**
```typescript
// Source: src/lib/admin/articles-actions.ts:214-215 (delete these two lines)
// NOTE: requireAuth() is a placeholder for the auth module (Phase 6).
// For now, Server Actions are exported but auth is not enforced.
```

**Change 5 — `sources.ts:88-142` (delete updateSourceHealth):**
The entire block from line 88 (`// updateSourceHealth`) through line 142 (`}`) is deleted.
The corresponding `describe('updateSourceHealth', ...)` block in `sources.test.ts` (lines 50-end) and the `updateSourceHealth` import at line 11 are also deleted.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JS post-filter in route handler | DB-level status filter in DAL | This phase | Eliminates n+1 filtering, closes READ-06 integration gap |
| Combined auth+config error | Split error messages | This phase | Security improvement — config state not leaked to user |

## Open Questions

1. **Logout: Route Handler vs. Server Action**
   - What we know: A functional Route Handler (`/api/admin/logout/route.ts`) exists. The admin layout already links to it. CONTEXT.md says "Server action clears the session cookie."
   - What's unclear: Whether the planner should convert the existing Route Handler to a Server Action, or whether "wire in" is already satisfied by the existing implementation.
   - Recommendation: Convert to Server Action per CONTEXT.md decision. Delete Route Handler, create `logout-action.ts` + `LogoutButton.tsx`, update layout. The existing Route Handler at `/api/admin/logout/route.ts` can then be deleted.

2. **`SourceHealthPatch` interface orphaned after `updateSourceHealth` deletion**
   - What we know: `SourceHealthPatch` interface at `sources.ts:91-95` is only used by `updateSourceHealth` parameters.
   - What's unclear: Whether any other file imports `SourceHealthPatch` by name.
   - Recommendation: Planner should grep for `SourceHealthPatch` imports before deciding whether to delete the interface alongside the function. If unused elsewhere, delete it.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (existing, `vitest.config.ts`) |
| Config file | `/Users/philipp/Claudebot/Regionalprojekt/vitest.config.ts` |
| Quick run command | `npx vitest run src/lib/content/articles.test.ts src/lib/content/sources.test.ts src/lib/admin/login-action.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| READ-06 | `getArticlesByBezirk()` returns only PUBLISHED articles (not DRAFT, ERROR, FETCHED) | unit | `npx vitest run src/lib/content/articles.test.ts` | ✅ (file exists, new test case needed) |
| READ-06 | RSS route uses DAL filter — no JS post-filter | integration (route.test.ts mock) | `npx vitest run src/app/rss/[slug]/route.test.ts` | ✅ (file exists, existing tests cover feature flag; post-filter removal is verified by code inspection) |
| — | Missing ADMIN_PASSWORD returns "Login derzeit nicht möglich." | unit | `npx vitest run src/lib/admin/login-action.test.ts` | ❌ Wave 0 — file does not exist |
| — | Wrong password still returns "Falsches Passwort." | unit | `npx vitest run src/lib/admin/login-action.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/content/articles.test.ts src/lib/content/sources.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/admin/login-action.test.ts` — covers ADMIN_PASSWORD split (missing env var + wrong password cases); no test file exists for loginAction yet

## Sources

### Primary (HIGH confidence)
- Source code inspection: `src/lib/content/articles.ts` — confirmed `getArticlesByBezirk()` at line 194-247, no status filter present
- Source code inspection: `src/app/rss/[slug]/route.ts` — confirmed post-filter workaround at lines 38-40
- Source code inspection: `src/lib/admin/login-action.ts` — confirmed combined conditional at line 14
- Source code inspection: `src/lib/admin/articles-actions.ts:214` — confirmed stale comment
- Source code inspection: `src/lib/content/sources.ts:88-142` — confirmed updateSourceHealth function
- Source code inspection: `src/lib/content/sources.test.ts` — confirmed updateSourceHealth test block at line 50
- Source code inspection: `src/app/(admin)/layout.tsx` — confirmed existing "Abmelden" link and layout structure
- Source code inspection: `src/app/api/admin/logout/route.ts` — confirmed existing Route Handler
- Source code inspection: `src/lib/admin/auth-node.ts` — confirmed `SESSION_COOKIE_NAME`, `signSessionCookie()`, cookie patterns

### Secondary (MEDIUM confidence)
- `.planning/phases/15-tech-debt-cleanup/15-CONTEXT.md` — implementation decisions locked by user

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all existing libraries
- Architecture: HIGH — all patterns are direct continuations of existing codebase patterns verified by source inspection
- Pitfalls: HIGH — pitfalls derived from actual code state at time of research

**Research date:** 2026-03-25
**Valid until:** Stable — code was read directly; valid until Phase 15 execution begins
