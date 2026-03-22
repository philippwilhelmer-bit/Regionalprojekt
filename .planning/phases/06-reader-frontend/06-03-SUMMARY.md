---
phase: "06-reader-frontend"
plan: "03"
subsystem: reader-frontend
tags: [layout, adsense, gdpr, components, cookie-consent]
dependency_graph:
  requires: ["06-01", "06-02"]
  provides: ["public-layout-shell", "reader-components"]
  affects: ["06-04", "06-05", "06-06", "06-07"]
tech_stack:
  added: []
  patterns:
    - "use client components for localStorage reads (Header, CookieBanner, AdUnit)"
    - "Server Components for static chrome (BottomNav, Footer)"
    - "next/script afterInteractive strategy for AdSense"
    - "custom DOM event (openBezirkModal) for cross-component communication"
key_files:
  created:
    - src/app/(public)/layout.tsx
    - src/components/reader/Header.tsx
    - src/components/reader/BottomNav.tsx
    - src/components/reader/Footer.tsx
    - src/components/reader/CookieBanner.tsx
    - src/components/reader/AdUnit.tsx
    - src/app/admin/login/login-form.tsx
    - src/app/admin/login/page.tsx
  modified:
    - src/app/layout.tsx
decisions:
  - "Admin login moved to top-level src/app/admin/login (no route group) — prevents (public)/layout.tsx from wrapping it with reader shell chrome"
  - "AdUnit renders dev placeholder div when NEXT_PUBLIC_ADSENSE_PUB_ID absent — enables local development without AdSense credentials"
  - "CookieBanner fixed bottom-16 (above h-16 bottom nav) — prevents banner overlap with navigation"
  - "Header dispatches custom openBezirkModal event — decouples Header from BezirkModal; Plan 04 listens for this event"
  - "Footer hard-codes 13 Bezirk slugs — avoids DB call in footer render"
metrics:
  duration_minutes: 7
  completed_date: "2026-03-22"
  tasks_completed: 2
  files_created: 8
  files_modified: 1
---

# Phase 6 Plan 03: Public Layout Shell Summary

**One-liner:** Reader shell with GDPR cookie consent, AdSense integration (NPA mode on rejection), and Bezirk-aware sticky header using system sans-serif and alpine-themed Tailwind design.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Update root layout and create (public) route group layout | 259c12f | src/app/layout.tsx, src/app/(public)/layout.tsx |
| 2 | Build Header, BottomNav, Footer, CookieBanner, AdUnit components | 4789f3b | src/components/reader/ (5 files) |

## Verification

- `npx tsc --noEmit` passes (no errors in source files)
- `npx next build` succeeds — all 12 static/dynamic pages generated cleanly
- (public)/layout.tsx, Header, BottomNav, Footer, CookieBanner, AdUnit all exist
- Root layout has lang="de" and AdSense Script tag with afterInteractive strategy

## Decisions Made

1. **Admin login route placement** — Admin login was previously split across `(admin)/admin/login/` (deleted, pre-existing) and `(public)/admin/login/` (untracked). Creating `(public)/layout.tsx` would wrap the login page with reader chrome. Moved to top-level `src/app/admin/login/` (no route group) so it renders as a standalone page. The `(admin)/layout.tsx` redirect to `/admin/login` continues to resolve correctly.

2. **AdSense NPA mode implementation** — `window.__adsenseNpa = true` set on cookie rejection. AdUnit reads this flag on mount and passes `{ google_npa: true }` in the adsbygoogle push. Ads continue to render in non-personalized mode rather than being hidden.

3. **CookieBanner z-index layering** — CookieBanner at `bottom-16` (64px) sits above the BottomNav (h-16, z-40). CookieBanner uses `z-50` and `bottom-16` to always appear above the fixed bottom navigation bar without overlap.

4. **Bezirk display label in Header** — When multiple Bezirke are selected, Header shows `{firstName} +{n}` compact form. Falls back to "Steiermark" when no selection is in localStorage.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Moved admin login to prevent route group layout conflict**
- **Found during:** Overall verification (`next build`)
- **Issue:** Pre-existing `(public)/admin/login/page.tsx` (untracked) would be wrapped by the new `(public)/layout.tsx` reader shell, wrapping the admin login in Header/BottomNav/Footer. Build error before this plan: duplicate route conflict between `(admin)/admin/login` and `(public)/admin/login`.
- **Fix:** Moved admin login files to top-level `src/app/admin/login/` (outside all route groups). Committed as separate fix commit (dbfd757).
- **Files modified:** src/app/admin/login/login-form.tsx, src/app/admin/login/page.tsx (moved from (public)/admin/login/)
- **Commit:** dbfd757

## Self-Check: PASSED

All created files exist on disk. All commits (259c12f, 4789f3b, dbfd757) found in git log. Root layout has lang="de", afterInteractive Script tag, no Geist imports. next build succeeds with 12 pages generated.
