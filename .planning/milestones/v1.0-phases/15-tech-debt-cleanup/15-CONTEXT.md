# Phase 15: Tech Debt Cleanup — PUBLISHED Filter + Auth UX - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Close 5 specific tech debt items identified by the v1.0 milestone audit: fix the missing PUBLISHED filter in getArticlesByBezirk(), improve the ADMIN_PASSWORD error handling, wire a logout button into the admin layout, remove the stale requireAuth placeholder comment, and delete the orphaned updateSourceHealth export.

</domain>

<decisions>
## Implementation Decisions

### ADMIN_PASSWORD error handling
- Split the `!adminPassword || password !== adminPassword` check into two separate branches
- Missing ADMIN_PASSWORD: log `console.error` server-side with a clear config warning, return generic user-facing error "Login derzeit nicht möglich."
- Wrong password: keep existing "Falsches Passwort. Bitte erneut versuchen." message
- Never leak to the user that the env var is missing

### LogoutButton
- Add a logout button to the admin interface — "Abmelden" link/button in the top-right of the admin header
- Server action clears the session cookie and redirects to `/admin/login`
- This satisfies success criterion 3 ("wired into admin layout or deleted") by wiring it in

### updateSourceHealth cleanup
- Delete the `updateSourceHealth()` export from `sources.ts` entirely
- Delete the corresponding test block from `sources.test.ts`
- Function is confirmed orphaned — only referenced in its own file and test

### Logout flow
- After clicking "Abmelden": clear session cookie → redirect to /admin/login
- No confirmation dialog or intermediate page

### Test coverage
- Add a test that `getArticlesByBezirk()` only returns PUBLISHED articles (not DRAFT, ERROR, etc.)
- Add a test that missing ADMIN_PASSWORD returns the config error message, not the wrong-password message
- Remove the RSS route post-filter workaround after the DAL fix (success criterion 1)

### Claude's Discretion
- Exact logout button styling (consistent with existing admin header)
- RSS route cleanup approach after PUBLISHED filter fix
- Stale comment removal (straightforward deletion)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `auth-node.ts`: Contains `signSessionCookie()` and `SESSION_COOKIE_NAME` — logout action needs to clear this same cookie
- `login-action.ts`: Existing Server Action pattern for auth — logout action should follow same pattern
- Admin layout at `(admin)/admin/layout.tsx` — logout button goes in the header here

### Established Patterns
- Server Actions with `'use server'` directive for mutations (login, article CRUD)
- DI overload pattern for DAL functions (zero-arg production, client-injection for tests)
- `cleanDb()` helper for test isolation

### Integration Points
- `getArticlesByBezirk()` in `articles.ts:194` — add `status: 'PUBLISHED'` to WHERE clause
- `login-action.ts:14` — split the conditional into two checks
- `articles-actions.ts:214` — delete stale comment
- `sources.ts:98-108` — delete updateSourceHealth function and overloads
- RSS route `rss/[slug]/route.ts` — remove JS post-filter workaround after DAL fix

</code_context>

<specifics>
## Specific Ideas

No specific requirements — all items are precisely defined by the milestone audit success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-tech-debt-cleanup*
*Context gathered: 2026-03-25*
