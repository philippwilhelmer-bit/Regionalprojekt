# Phase 24: Admin Login Banner Fix - Research

**Researched:** 2026-03-28
**Domain:** Next.js 15 App Router route group layouts, admin/login page isolation
**Confidence:** HIGH

## Summary

Phase 24 is a surgical fix for a gap discovered during the v1.2 audit: the `/admin/login` page does not receive the TESTSEITE banner. The root cause is structural — `src/app/admin/login/` is a real path segment under `src/app/admin/`, whereas the authenticated admin pages live under `src/app/(admin)/` (a route group). Route groups in Next.js App Router do not affect URL paths; they only determine which `layout.tsx` applies. The login page at `src/app/admin/login/page.tsx` falls under a different layout tree and never sees `src/app/(admin)/layout.tsx`.

Phase 22 correctly wired `TestSiteBanner` into `src/app/(admin)/layout.tsx`, but that layout includes an auth redirect that redirects unauthenticated users away from it. The login page deliberately bypasses this layout to avoid an infinite redirect loop. The fix is to add `TestSiteBanner` directly to `src/app/admin/login/page.tsx` — the only page in this isolated route tree.

**Primary recommendation:** Import and render `TestSiteBanner` as the first element in `src/app/admin/login/page.tsx`. No new files, no new layout, no new component needed. Add one unit test for the login page render behavior.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TEST-02 | A visible "TESTSEITE" banner appears on every CMS/admin page when test mode is active | `TestSiteBanner` component already exists at `src/components/TestSiteBanner.tsx`; adding it to the login page renders the banner above the login card. The `(admin)` route group layout already covers all authenticated admin pages; only the login page is uncovered. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `TestSiteBanner` (project component) | existing | Env-gated TESTSEITE banner | Already built in Phase 22, used in both layouts |
| Next.js App Router | 15.5.14 | Server Component rendering | Already in use throughout project |
| Tailwind CSS v4 | ^4.2.2 | Layout styling | Already used in login page |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 2.1.9 | Unit tests | Consistent with all Phase 22 test patterns |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct import in page.tsx | New `src/app/admin/login/layout.tsx` | A dedicated layout works but is unnecessary overhead for a single page; adds a file that future developers might misread as an auth boundary |
| Direct import in page.tsx | Moving login into `(admin)` route group | Would require auth bypass logic in the layout — fragile and increases risk of accidental auth hole |

**Installation:** No new dependencies required.

## Architecture Patterns

### Route Group vs Real Path Segment

The project uses two separate admin route trees:

```
src/app/
├── (admin)/                  # Route GROUP — URL: /admin/*
│   ├── layout.tsx            # Has auth check + TestSiteBanner + sidebar nav
│   └── login/                # DOES NOT EXIST here
│       └── page.tsx
├── admin/                    # Real path segment — URL: /admin/login
│   ├── page.tsx              # Redirects to /admin/articles
│   └── login/
│       ├── page.tsx          # Login form — NO layout wrapper currently
│       └── login-form.tsx    # Client Component with useActionState
```

`src/app/(admin)/layout.tsx` serves pages rooted at `src/app/(admin)/`. The login page at `src/app/admin/login/` sits outside this tree and inherits only `src/app/layout.tsx` (root layout).

### Pattern: Direct Banner Injection in Page Component

**What:** Import `TestSiteBanner` in the page component and render it above the page content using a React fragment.

**When to use:** When a page intentionally sits outside a layout that already includes the banner — specifically the login page which must bypass auth checks.

**Example (established pattern from `src/app/(admin)/layout.tsx`):**
```tsx
// Source: src/app/(admin)/layout.tsx lines 22-25
return (
  <>
    <TestSiteBanner />
    <div className="flex h-screen bg-gray-100">
    ...
```

Applied to the login page:
```tsx
// src/app/admin/login/page.tsx — after fix
import config from '@/../bundesland.config'
import { LoginForm } from './login-form'
import { TestSiteBanner } from '@/components/TestSiteBanner'

export default function LoginPage() {
  return (
    <>
      <TestSiteBanner />
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-6 text-gray-900">{config.siteName} Admin</h1>
          <LoginForm />
        </div>
      </div>
    </>
  )
}
```

### Anti-Patterns to Avoid

- **Creating a `src/app/admin/login/layout.tsx`:** Unnecessary for a single page. Adds cognitive overhead and a file that could be mistaken for an auth checkpoint.
- **Moving login into the `(admin)` route group:** The `(admin)/layout.tsx` redirects unauthenticated users to `/admin/login`. If the login page were inside that group, an unauthenticated visit would trigger an infinite redirect loop.
- **Conditional layout logic in `(admin)/layout.tsx`:** Whitelisting the login path inside the auth-checking layout is fragile and undermines the clean separation between auth pages and protected pages.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TESTSEITE banner | New banner component | `TestSiteBanner` from `@/components/TestSiteBanner` | Already implemented with 3 passing tests; env gating logic is correct and tested |

**Key insight:** The banner component is already production-ready. This phase is purely a wiring task.

## Common Pitfalls

### Pitfall 1: Forgetting the Fragment Wrapper
**What goes wrong:** `LoginPage` currently returns a single `<div>`. Adding `<TestSiteBanner />` as a sibling requires wrapping in a React fragment `<>...</>` — otherwise JSX will throw "Adjacent JSX elements must be wrapped."
**Why it happens:** The page currently returns one root element; inserting a sibling requires a structural change.
**How to avoid:** Wrap the existing `<div>` in a fragment alongside `<TestSiteBanner />`, same pattern used in `(admin)/layout.tsx`.
**Warning signs:** TypeScript/JSX compilation errors if fragment is missing.

### Pitfall 2: Wrong Import Path
**What goes wrong:** Using a relative import `./../../components/TestSiteBanner` instead of the `@/` alias.
**Why it happens:** The login page is nested two levels deep; relative paths are error-prone.
**How to avoid:** Use `import { TestSiteBanner } from '@/components/TestSiteBanner'` — consistent with how both layouts import it.
**Warning signs:** Module not found error at build time.

### Pitfall 3: Assuming Root Layout Provides the Banner
**What goes wrong:** Thinking the `src/app/layout.tsx` root layout already shows the banner and no fix is needed.
**Why it happens:** The root layout wraps all routes. But `TestSiteBanner` is NOT in the root layout — it was added to each sub-layout individually in Phase 22.
**How to avoid:** Verify the actual root layout (`src/app/layout.tsx`) — it only conditionally renders the AdSense `<Script>` tag, not the banner.
**Warning signs:** Visual check fails: no banner appears on `/admin/login` after deployment.

## Code Examples

Verified patterns from Phase 22 codebase:

### Existing TestSiteBanner Component
```tsx
// Source: src/components/TestSiteBanner.tsx
import React from 'react'

export function TestSiteBanner() {
  if (process.env.NEXT_PUBLIC_IS_TEST_SITE !== 'true') {
    return null
  }

  return (
    <div
      role="banner"
      className="w-full bg-yellow-400 text-black text-center text-sm font-bold py-1 z-50"
    >
      TESTSEITE — Diese Seite ist nicht öffentlich zugänglich
    </div>
  )
}
```

### Existing Test Pattern (from TestSiteBanner.test.tsx)
```tsx
// Source: src/components/TestSiteBanner.test.tsx
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TestSiteBanner } from './TestSiteBanner'

describe('TestSiteBanner', () => {
  const origEnv = { ...process.env }

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_IS_TEST_SITE
  })

  afterEach(() => {
    process.env = { ...origEnv }
  })

  it('renders a banner with "TESTSEITE" text when NEXT_PUBLIC_IS_TEST_SITE is "true"', () => {
    process.env.NEXT_PUBLIC_IS_TEST_SITE = 'true'
    const result = TestSiteBanner()
    expect(result).not.toBeNull()
    expect(result).toHaveProperty('props.role', 'banner')
    const children = result?.props?.children as string
    expect(children).toContain('TESTSEITE')
  })
  // ...
})
```

### Mocking Pattern for bundesland.config (from root-layout-adsense.test.ts)
```ts
// Source: src/app/__tests__/root-layout-adsense.test.ts
vi.mock('@/../bundesland.config', () => ({
  default: { siteName: 'Test Site', features: { ads: true } },
}))
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Banner only on authenticated admin pages (via `(admin)/layout.tsx`) | Banner on ALL admin pages including login | Phase 24 | Closes TEST-02 gap: login page is now fully covered |

**Gap origin:** Phase 22 Research correctly identified `src/app/(admin)/layout.tsx` as the admin banner injection point. The research did not distinguish between the `(admin)` route group (authenticated pages) and the `admin/login` real path (unauthenticated page). The audit after deployment discovered the login page gap.

## Open Questions

None — the gap is precisely understood, the fix is clear, and all required infrastructure exists.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-02 | Login page renders `TestSiteBanner` when `NEXT_PUBLIC_IS_TEST_SITE=true` | unit | `npx vitest run src/app/admin/login` | ❌ Wave 0 |
| TEST-02 | Login page renders no banner when `NEXT_PUBLIC_IS_TEST_SITE` is unset | unit | `npx vitest run src/app/admin/login` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/app/admin/login/login-page.test.tsx` — covers TEST-02 (banner render and hide on login page)

The test pattern mirrors `TestSiteBanner.test.tsx`: call the Server Component as a plain function, check result for `role="banner"` presence/absence, mock `bundesland.config` and `./login-form`.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `src/app/admin/login/page.tsx`, `src/app/(admin)/layout.tsx`, `src/components/TestSiteBanner.tsx`, existing test files
- Phase 22 SUMMARY and VERIFICATION artifacts — confirmed what was implemented and what gap exists

### Secondary (MEDIUM confidence)
- Next.js App Router route group documentation (route groups `(folder)` affect layout inheritance but not URL path; pages at `app/admin/login/` outside `app/(admin)/` are in a different layout tree)

## Metadata

**Confidence breakdown:**
- Root cause: HIGH — directly observed from file system structure; `src/app/admin/login/page.tsx` has no `TestSiteBanner`, `src/app/(admin)/layout.tsx` does
- Fix approach: HIGH — identical pattern used successfully in both `(public)/layout.tsx` and `(admin)/layout.tsx` in Phase 22
- Test pattern: HIGH — identical to existing `TestSiteBanner.test.tsx` and `root-layout-adsense.test.ts` patterns

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable Next.js App Router conventions)
