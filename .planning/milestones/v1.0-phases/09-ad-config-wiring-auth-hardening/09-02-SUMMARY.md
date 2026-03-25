---
phase: 09-ad-config-wiring-auth-hardening
plan: 02
subsystem: auth
tags: [next.js, server-actions, cookies, hmac, auth]

# Dependency graph
requires:
  - phase: 05-editorial-cms
    provides: admin Server Action wrappers (articles, exceptions, ai-config, pipeline-config, sources)
  - phase: 09-ad-config-wiring-auth-hardening
    plan: 01
    provides: auth-node.ts with signSessionCookie/verifySessionCookie
provides:
  - requireAuth() exported from auth-node.ts — redirects to /admin/login on missing/invalid session cookie
  - All 22+ exported admin Server Action wrappers gated with await requireAuth() as first call
affects: [admin-actions, auth-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns: [requireAuth() as first call before any try/catch in Server Actions, TDD red-green for auth guard]

key-files:
  created: []
  modified:
    - src/lib/admin/auth-node.ts
    - src/lib/admin/auth-node.test.ts
    - src/lib/admin/articles-actions.ts
    - src/lib/admin/exceptions-actions.ts
    - src/lib/admin/ai-config-actions.ts
    - src/lib/admin/pipeline-config-actions.ts
    - src/lib/admin/sources-actions.ts

key-decisions:
  - "requireAuth() uses await cookies() (Next.js 15 async) and redirect() outside try/catch — redirect() throws NEXT_REDIRECT internally"
  - "loginAction and middleware.ts exempt from requireAuth() — these are the auth entry points"
  - "listExceptionQueue gated along with mutating actions — all exported Server Actions require auth"

patterns-established:
  - "requireAuth() pattern: placed as first line before any try/catch, before any DB call in every exported Server Action wrapper"

requirements-completed: [AD-02]

# Metrics
duration: multi-session
completed: 2026-03-24
---

# Phase 9 Plan 02: Auth Hardening — requireAuth() on All Admin Server Actions

**requireAuth() added to auth-node.ts and wired as first call across 22+ exported admin Server Action wrappers, closing direct POST bypass of middleware session guard**

## Performance

- **Duration:** Multi-session (TDD across two tasks)
- **Started:** 2026-03-24
- **Completed:** 2026-03-24
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- requireAuth() implemented in auth-node.ts using Next.js 15 async cookies() and redirect()
- Unit tests verify redirect on missing session, invalid HMAC, and no-op on valid session
- All five admin action files (articles, exceptions, ai-config, pipeline-config, sources) fully gated
- 39 admin tests pass with no regressions after wiring

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): requireAuth() tests** - `7052167` (test)
2. **Task 1 (GREEN): requireAuth() implementation** - `23f78c2` (feat)
3. **Task 2: Wire requireAuth() into all admin Server Action files** - `633475a` (feat)

## Files Created/Modified
- `src/lib/admin/auth-node.ts` - Added requireAuth() export alongside signSessionCookie/verifySessionCookie
- `src/lib/admin/auth-node.test.ts` - Unit tests for requireAuth() redirect behavior (3 cases)
- `src/lib/admin/articles-actions.ts` - 9 exported wrappers gated (typed + FormData variants, uncommented placeholders)
- `src/lib/admin/exceptions-actions.ts` - 5 exported wrappers gated (approve, reject, both Form variants, listExceptionQueue)
- `src/lib/admin/ai-config-actions.ts` - 3 exported wrappers gated (global upsert, source override upsert/delete)
- `src/lib/admin/pipeline-config-actions.ts` - 1 exported wrapper gated
- `src/lib/admin/sources-actions.ts` - 4 exported wrappers gated (createSource, updateSource, *Form variants)

## Decisions Made
- requireAuth() places redirect() outside any try/catch — Next.js 15 redirect() throws NEXT_REDIRECT which must not be caught
- await cookies() required (Next.js 15 async change from Next.js 14 synchronous cookies())
- listExceptionQueue included in gated actions even though it is read-only — all exported Server Actions require auth per plan

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Auth hardening complete: admin Server Actions are protected end-to-end (middleware for pages, requireAuth() for direct POSTs)
- Plan 09-03 (Impressum/config wiring) was already completed prior to this plan
- Phase 9 complete — all three plans (01, 02, 03) done

---
*Phase: 09-ad-config-wiring-auth-hardening*
*Completed: 2026-03-24*
