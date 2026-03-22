---
phase: 05-editorial-cms
plan: 06
subsystem: ui
tags: [next.js, react, server-components, server-actions, tailwindcss, cms, articles, exceptions]

# Dependency graph
requires:
  - phase: 05-editorial-cms plan 02
    provides: Auth middleware, admin layout shell with sidebar nav guarding /admin/:path*
  - phase: 05-editorial-cms plan 03
    provides: listArticlesAdmin, createManualArticleDb, togglePinDb, toggleFeatureDb, softDeleteDb, listExceptionQueueDb, approveArticleDb, rejectArticleDb Server Actions

provides:
  - Articles list page at /admin/articles with filter toolbar (bezirkId, source, status, date range) and pagination
  - ArticleRow with inline pin/feature/soft-delete form actions wired to Server Actions
  - Manual article creation form at /admin/articles/new with all 7 required fields
  - Exception queue page at /admin/exceptions with side-by-side article content vs rawPayload layout
  - Approve/Reject form actions wired to approveArticleForm/rejectArticleForm

affects: [06-frontend]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FormData-based Server Action wrappers (*Form suffix) — typed *Db functions take number args; form-facing wrappers parse FormData.get('id') and delegate"
    - "ArticleFilters as 'use client' component using useRouter + useSearchParams for URL-driven filter state"
    - "ArticleRow as 'use client' component for window.confirm on delete — Client Components can use Server Actions via form action={}"
    - "ExceptionCard side-by-side layout: grid-cols-2 divide-x with left=content, right=rawPayload JSON.stringify pre block"

key-files:
  created:
    - src/app/(admin)/admin/articles/page.tsx
    - src/app/(admin)/admin/articles/ArticleFilters.tsx
    - src/app/(admin)/admin/articles/ArticleRow.tsx
    - src/app/(admin)/admin/articles/new/page.tsx
    - src/app/(admin)/admin/exceptions/page.tsx
    - src/app/(admin)/admin/exceptions/ExceptionCard.tsx
  modified:
    - src/lib/admin/articles-actions.ts
    - src/lib/admin/exceptions-actions.ts

key-decisions:
  - "FormData wrappers (*Form suffix) added to Server Action files — typed *Db functions can't be used directly as form actions since they take number not FormData"
  - "ArticleRow is a Client Component to support window.confirm on soft-delete — Client Components can still use Server Actions via form action={}"
  - "createManualArticleForm uses dynamic import('next/navigation').redirect — avoids redirect() at module top-level in 'use server' files"
  - "listExceptionQueue() exported from exceptions-actions.ts as a production convenience wrapper — page.tsx calls it directly"

patterns-established:
  - "FormData wrapper pattern: *Form suffix functions parse FormData.get('id') and call the typed *Db function — single source of truth for business logic"
  - "Client Component + Server Action form: 'use client' components can reference Server Actions directly in form action={} prop"

requirements-completed: [CMS-01, CMS-02, CMS-03]

# Metrics
duration: 20min
completed: 2026-03-22
---

# Phase 5 Plan 06: CMS UI Pages Summary

**Next.js 15 Server Component admin pages for articles list (filter/paginate/pin/feature/delete), manual article creation form, and exception queue with side-by-side AI vs raw source review**

## Performance

- **Duration:** 20 min
- **Started:** 2026-03-22T13:00:00Z
- **Completed:** 2026-03-22T13:20:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Articles list page at /admin/articles: Server Component with filter toolbar (bezirkId, source, status, date range), pagination, and inline pin/feature/soft-delete per row
- Manual article creation form at /admin/articles/new: all 7 fields (title, content, bezirke checkboxes, seoTitle, metaDescription, isPinned, isFeatured) wired to createManualArticleForm Server Action with redirect to /admin/articles
- Exception queue at /admin/exceptions: side-by-side ExceptionCard showing rewritten content vs rawPayload JSON, Genehmigen (green) and Ablehnen (red) form action buttons
- next build succeeds: all 3 new routes compiled as dynamic Server Components
- 139 vitest tests still GREEN, 0 TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Articles list page with filters and inline actions** - `0a9c96f` (feat)
2. **Task 2: Manual article creation form + Exception Queue page** - `1107457` (feat)

## Files Created/Modified

- `src/app/(admin)/admin/articles/page.tsx` — Server Component: awaits searchParams, calls listArticlesAdmin with parsed filters, renders ArticleFilters + ArticleRow table + prev/next pagination
- `src/app/(admin)/admin/articles/ArticleFilters.tsx` — Client Component: 4 filter controls (bezirkId select, source select, status select, from/to date inputs) updating URL searchParams via useRouter; "Filter zuruecksetzen" button
- `src/app/(admin)/admin/articles/ArticleRow.tsx` — Client Component: renders title (truncated 80 chars), status badge, source label, publishedAt, bezirk tags; form actions for togglePinForm, toggleFeatureForm, softDeleteForm with window.confirm
- `src/app/(admin)/admin/articles/new/page.tsx` — Server Component: manual article creation form with all 7 fields, bezirke as checkbox list, createManualArticleForm Server Action
- `src/app/(admin)/admin/exceptions/page.tsx` — Server Component: calls listExceptionQueue, renders ExceptionCard list with empty state
- `src/app/(admin)/admin/exceptions/ExceptionCard.tsx` — Server Component: two-column layout with AI content (left) vs rawPayload JSON in pre tag (right), Genehmigen/Ablehnen buttons
- `src/lib/admin/articles-actions.ts` — Added FormData wrappers: togglePinForm, toggleFeatureForm, softDeleteForm, createManualArticleForm
- `src/lib/admin/exceptions-actions.ts` — Added FormData wrappers: approveArticleForm, rejectArticleForm; added listExceptionQueue() convenience export

## Decisions Made

- FormData wrapper functions (*Form suffix) added alongside existing typed Server Actions — the typed *Db functions remain for test injection; form-facing wrappers parse FormData.get('id') as Number and delegate. This avoids changing the existing tested API.
- ArticleRow made a Client Component (added 'use client') specifically to support window.confirm on soft-delete. Client Components can reference Server Actions in form action={} in Next.js 15.
- createManualArticleForm uses `const { redirect } = await import('next/navigation')` for the post-create redirect — avoids issues with redirect() called at module top-level in 'use server' context.
- ExceptionCard is a Server Component — no interactivity needed beyond form submissions, which work without client-side JavaScript.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added FormData-based Server Action wrappers**
- **Found during:** Task 1 (articles list page)
- **Issue:** Existing Server Actions (togglePin, toggleFeature, softDelete, createManualArticle, approveArticle, rejectArticle) take typed arguments (number, object) — not compatible with `<form action={...}>` which passes FormData
- **Fix:** Added *Form suffix wrappers in both actions files that parse FormData.get('id') and delegate to the typed *Db functions
- **Files modified:** src/lib/admin/articles-actions.ts, src/lib/admin/exceptions-actions.ts
- **Verification:** TypeScript passes, next build succeeds
- **Committed in:** 0a9c96f (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (missing critical)
**Impact on plan:** Required for correct form wiring — existing typed actions cannot be used as form actions. No scope creep.

## Issues Encountered

None — both tasks compiled cleanly on first TypeScript check. Build succeeded immediately.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CMS-01, CMS-02, CMS-03 fully delivered: manual article creation, curation (pin/feature/delete), exception review all functional
- Admin UI at /admin/articles and /admin/exceptions ready for browser testing
- Phase 5 Editorial CMS complete (all 6 plans executed)
- Phase 6 (Public Frontend) can use the same Server Action patterns established here

## Self-Check: PASSED

Files exist:
- FOUND: src/app/(admin)/admin/articles/page.tsx
- FOUND: src/app/(admin)/admin/articles/ArticleFilters.tsx
- FOUND: src/app/(admin)/admin/articles/ArticleRow.tsx
- FOUND: src/app/(admin)/admin/articles/new/page.tsx
- FOUND: src/app/(admin)/admin/exceptions/page.tsx
- FOUND: src/app/(admin)/admin/exceptions/ExceptionCard.tsx

Commits verified: 0a9c96f (Task 1), 1107457 (Task 2) — both present in git log.
Tests: 139 passed, 0 failed. TypeScript: 0 errors. next build: exit 0.

---
*Phase: 05-editorial-cms*
*Completed: 2026-03-22*
