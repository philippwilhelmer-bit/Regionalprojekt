---
phase: 05-editorial-cms
plan: 02
subsystem: auth
tags: [hmac, cookie, middleware, next.js, edge-runtime, server-action, tailwindcss]

# Dependency graph
requires:
  - phase: 05-01
    provides: Prisma schema with Phase 5 models; cleanDb(); Wave 0 test stubs

provides:
  - HMAC-signed session cookie utilities split into Node (auth-node.ts) and Edge (auth-edge.ts) modules
  - Next.js Edge middleware guarding all /admin/:path* routes via verifySessionCookieEdge (Web Crypto)
  - Server Action loginAction verifying ADMIN_PASSWORD and setting signed httpOnly cookie
  - Login page at /admin/login with client-side useActionState error display
  - Admin shell layout with sidebar nav (Artikel, Ausnahme-Queue, Quellen, KI-Konfiguration)

affects: [05-03, 05-04, 05-05, 05-06, 05-07]

# Tech tracking
tech-stack:
  added:
    - tailwindcss@4 (upgraded from v3 — v4 required for @import "tailwindcss" CSS syntax used in globals.css)
  patterns:
    - Auth split pattern: auth-node.ts (node:crypto) / auth-edge.ts (crypto.subtle) — middleware imports edge-only module
    - Barrel re-export: auth.ts re-exports from both split modules for Server Component convenience
    - Server Action with useActionState: loginAction returns LoginState | null; LoginForm uses useActionState for progressive error display
    - Secondary auth guard in layout: cookies() + verifySessionCookie() as defense-in-depth after middleware

key-files:
  created:
    - src/lib/admin/auth.ts (barrel re-export)
    - src/lib/admin/auth-node.ts (Node runtime — signSessionCookie, verifySessionCookie)
    - src/lib/admin/auth-edge.ts (Edge runtime — verifySessionCookieEdge, SESSION_COOKIE_NAME)
    - middleware.ts (Edge middleware guarding /admin/:path*)
    - src/lib/admin/login-action.ts (Server Action: loginAction)
    - src/app/(admin)/admin/login/page.tsx (login page — Server Component)
    - src/app/(admin)/admin/login/login-form.tsx (login form — Client Component with useActionState)
    - src/app/(admin)/layout.tsx (admin shell with sidebar nav)
  modified:
    - src/lib/admin/articles-actions.ts (statusFilter type fix)
    - src/lib/ingestion/adapters/rss.test.ts (add healthFailureThreshold to Source stubs)
    - src/lib/ingestion/ingest.ts (use source.healthFailureThreshold instead of module constant)
    - src/lib/ingestion/ingest.test.ts (local HEALTH_FAILURE_THRESHOLD constant)
    - src/lib/ai/pipeline.ts (use pipelineConfig.maxRetryCount from DB)
    - package.json (tailwindcss@3 → @4)
    - tsconfig.json (jsx: preserve set by next build)

key-decisions:
  - "Auth split into auth-node.ts (node:crypto) + auth-edge.ts (crypto.subtle) — middleware must import auth-edge.ts directly; barrel auth.ts safe for Server Components"
  - "loginAction uses LoginState = { error: string } | null with useActionState — enables progressive error display without full-page reload"
  - "Admin layout has secondary verifySessionCookie() guard after middleware — defense-in-depth pattern"
  - "tailwindcss upgraded to v4 — @tailwindcss/postcss@4 bundles tailwindcss@4 internally; root v3 conflicted with webpack CSS @import resolution"
  - "pipeline.ts uses pipelineConfig.maxRetryCount from DB (configurable via CMS) instead of hardcoded constant"

patterns-established:
  - "Edge auth pattern: import SESSION_COOKIE_NAME + verifySessionCookieEdge from auth-edge.ts in middleware.ts — never from auth.ts barrel"
  - "Node auth pattern: import signSessionCookie + verifySessionCookie from auth-node.ts in Server Actions and layouts"
  - "Login form as Client Component: Server Component page.tsx wraps LoginForm client component for useActionState support"

requirements-completed: [CMS-01, CMS-02, CMS-03, CMS-04]

# Metrics
duration: 25min
completed: 2026-03-22
---

# Phase 5 Plan 02: Auth Layer Summary

**HMAC-signed session cookie auth with split Node/Edge utilities, Next.js Edge middleware guarding /admin/:path*, login Server Action with error display, and admin shell layout with sidebar navigation**

## Performance

- **Duration:** 25 min
- **Started:** 2026-03-22T09:00:00Z
- **Completed:** 2026-03-22T09:25:00Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments

- Auth utilities split into Edge-safe (crypto.subtle) and Node (node:crypto) modules to prevent Edge bundling failures
- Next.js middleware.ts guards all /admin/:path* routes, redirecting to /admin/login on missing/invalid session
- Login page with Server Action returning error state (no redirect on wrong password), client useActionState for UI feedback
- Admin shell layout with sidebar linking to Artikel, Ausnahme-Queue, Quellen, KI-Konfiguration sections
- Tailwind v3/v4 conflict resolved — upgraded root package to v4, matching @tailwindcss/postcss@4
- 139 tests pass (up from 103 in Phase 5-01 — added by concurrent test stub commits)

## Task Commits

Each task was committed atomically:

1. **Task 1: Auth utilities (Node + Edge)** - `317b786` (feat) — barrel + auth-node.ts + auth-edge.ts split
2. **Task 2: Middleware + login action + login page + admin layout** - `bf2a14f` (feat)

**Auto-fix commits:**
- `f9a13b1` (fix) — TypeScript errors from Phase 5-01 schema additions
- `135a1c1` (fix) — tailwindcss@3→@4 upgrade for build
- `ec007fc` (fix) — pipelineConfig from DB + test setup patterns

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/lib/admin/auth.ts` — Barrel re-export combining Node and Edge auth functions
- `src/lib/admin/auth-node.ts` — Node runtime: signSessionCookie (HMAC-SHA256), verifySessionCookie (timing-safe)
- `src/lib/admin/auth-edge.ts` — Edge runtime: verifySessionCookieEdge (Web Crypto API), SESSION_COOKIE_NAME
- `middleware.ts` — Edge middleware, matcher: ['/admin/:path*'], imports from auth-edge.ts only
- `src/lib/admin/login-action.ts` — Server Action verifying ADMIN_PASSWORD, setting signed httpOnly cookie, redirect to /admin/articles
- `src/app/(admin)/admin/login/page.tsx` — Server Component login page container
- `src/app/(admin)/admin/login/login-form.tsx` — Client Component with useActionState for error display
- `src/app/(admin)/layout.tsx` — Admin shell: sidebar with 4 nav items + secondary session guard
- `src/lib/admin/articles-actions.ts` — statusFilter type corrected (ArticleStatus | filter objects)
- `src/lib/ingestion/adapters/rss.test.ts` — Source stubs updated with healthFailureThreshold
- `src/lib/ingestion/ingest.ts` — Uses source.healthFailureThreshold from DB (not module constant)
- `src/lib/ai/pipeline.ts` — Uses pipelineConfig.maxRetryCount from DB (configurable via CMS)
- `package.json` / `package-lock.json` — tailwindcss upgraded to ^4

## Decisions Made

- Auth split into auth-node.ts + auth-edge.ts because Next.js Edge runtime cannot bundle node:crypto. The barrel auth.ts re-exports both — safe for Server Components since Next.js tree-shakes the node:crypto-using functions for Edge bundles only when imported through the barrel from Server Components, but middleware must import auth-edge.ts directly to guarantee no accidental inclusion.
- loginAction signature is `(prevState, formData)` to work with useActionState — returns `LoginState = { error: string } | null` for wrong password, redirects on success.
- tailwindcss@3 (devDependency) conflicted with @tailwindcss/postcss@4 because webpack resolves `@import "tailwindcss"` in globals.css to root node_modules/tailwindcss (v3, no CSS entry point). Upgrading to v4 ensures webpack and PostCSS both resolve to the same v4 implementation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript error in articles-actions.ts: statusFilter type `object` rejected ArticleStatus string**
- **Found during:** Task 1/2 verification (TypeScript check)
- **Issue:** `let statusFilter: object` — TypeScript rejected `string` (ArticleStatus) assignment as `object` is not assignable from string primitives
- **Fix:** Changed type to `ArticleStatus | { in: ArticleStatus[] } | { notIn: ArticleStatus[] }`
- **Files modified:** `src/lib/admin/articles-actions.ts`
- **Verification:** `npx tsc --noEmit` clean
- **Committed in:** `f9a13b1`

**2. [Rule 1 - Bug] rss.test.ts Source stubs missing healthFailureThreshold (added in Phase 5-01)**
- **Found during:** TypeScript check
- **Issue:** Phase 5-01 added `healthFailureThreshold: Int` to Source schema; rss.test.ts Source stubs not updated
- **Fix:** Added `healthFailureThreshold: 3` to all 3 Source stubs in rss.test.ts
- **Files modified:** `src/lib/ingestion/adapters/rss.test.ts`
- **Verification:** `npx tsc --noEmit` clean
- **Committed in:** `f9a13b1`

**3. [Rule 1 - Bug] ingest.ts used HEALTH_FAILURE_THRESHOLD module constant instead of per-source DB field**
- **Found during:** Reviewing modified files pre-commit
- **Issue:** Phase 5-01 added healthFailureThreshold per-source but ingest.ts still read module constant
- **Fix:** Changed comparison to use `src.healthFailureThreshold`; removed exported constant; ingest.test.ts defines local constant
- **Files modified:** `src/lib/ingestion/ingest.ts`, `src/lib/ingestion/ingest.test.ts`
- **Verification:** 139 tests pass
- **Committed in:** `f9a13b1`

**4. [Rule 3 - Blocking] tailwindcss@3 caused next build failure: Can't resolve 'tailwindcss' in CSS**
- **Found during:** Task 2 verification (npx next build)
- **Issue:** globals.css uses `@import "tailwindcss"` (Tailwind v4 syntax) but root node_modules/tailwindcss is v3 (no CSS entry point). Webpack resolved the import to v3 before PostCSS could handle it.
- **Fix:** `npm install tailwindcss@^4 --save-dev` — now consistent with @tailwindcss/postcss@4
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** `npx next build` succeeds with /admin/login route compiled
- **Committed in:** `135a1c1`

---

**Total deviations:** 4 auto-fixed (3 bugs, 1 blocking)
**Impact on plan:** All fixes necessary for TypeScript correctness and build success. No scope creep.

## Issues Encountered

- Auth utilities were already partially created in Phase 5-01 context (commit b5802ce had monolithic auth.ts). Execution refactored to the split module pattern since auth.ts was modified to a barrel before this plan ran.
- `npx` requires explicit PATH including nvm node — used `~/.nvm/versions/node/v24.13.1/bin/` prefix for all npm/npx commands.

## User Setup Required

None - no external service configuration required.

Environment variables needed at runtime (documented in plan, no setup needed now):
- `ADMIN_SESSION_SECRET` — used by signSessionCookie/verifySessionCookie
- `ADMIN_PASSWORD` — checked in loginAction

## Next Phase Readiness

- Auth gate fully operational — middleware + layout guard all /admin/** routes
- Login form functional with error state via useActionState
- All subsequent Phase 5 plans (05-03 to 05-07) can now implement admin UI with authenticated access
- 139 tests green — no regressions from auth additions
- Build clean: `npx next build` succeeds, /admin/login compiled as dynamic route

## Self-Check: PASSED

- FOUND: src/lib/admin/auth.ts
- FOUND: src/lib/admin/auth-node.ts
- FOUND: src/lib/admin/auth-edge.ts
- FOUND: middleware.ts
- FOUND: src/lib/admin/login-action.ts
- FOUND: src/app/(admin)/admin/login/page.tsx
- FOUND: src/app/(admin)/admin/login/login-form.tsx
- FOUND: src/app/(admin)/layout.tsx
- FOUND commit: 317b786 (auth utilities split)
- FOUND commit: bf2a14f (middleware + login + layout)

---
*Phase: 05-editorial-cms*
*Completed: 2026-03-22*
