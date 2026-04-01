---
phase: 37-search-and-cms-refresh
plan: "01"
subsystem: admin-cms
tags: [token-migration, archivist, cms, admin]
dependency_graph:
  requires: []
  provides: [archivist-admin-ui]
  affects: [admin-login, admin-layout, admin-articles, admin-sources, admin-exceptions, admin-ai-config]
tech_stack:
  added: []
  patterns: [archivist-token-system, ink-parchment-slate-palette]
key_files:
  created: []
  modified:
    - src/app/admin/login/page.tsx
    - src/app/admin/login/login-form.tsx
    - src/app/(admin)/layout.tsx
    - src/app/(admin)/admin/articles/page.tsx
    - src/app/(admin)/admin/articles/ArticleRow.tsx
    - src/app/(admin)/admin/articles/ArticleFilters.tsx
    - src/app/(admin)/admin/articles/[id]/edit/page.tsx
    - src/app/(admin)/admin/articles/new/page.tsx
    - src/components/admin/LogoutButton.tsx
    - src/app/(admin)/admin/sources/page.tsx
    - src/app/(admin)/admin/sources/SourceCard.tsx
    - src/app/(admin)/admin/sources/SourceFormFields.tsx
    - src/app/(admin)/admin/sources/new/page.tsx
    - src/app/(admin)/admin/exceptions/ExceptionCard.tsx
    - src/app/(admin)/admin/exceptions/page.tsx
    - src/app/(admin)/admin/ai-config/page.tsx
    - src/app/(admin)/admin/ai-config/GlobalAiConfigForm.tsx
    - src/app/(admin)/admin/ai-config/SourceOverrideForm.tsx
    - src/components/admin/UnsplashPicker.tsx
    - src/components/admin/UnsplashPickerNew.tsx
decisions:
  - "Non-semantic badges (source type, category, keywords, bezirk preview) migrate to bg-surface text-slate — no color meaning"
  - "Semantic action colors preserved: PUBLISHED/REVIEW/REJECTED status, OK/DEGRADED/DOWN health, Approve/Reject buttons, Loeschen button"
  - "isPinned button uses bg-surface text-slate (active state) — neutral tone, not orange"
  - "isFeatured button uses bg-ink/10 text-ink (active state) — editorial emphasis without purple"
  - "border-surface on inputs replaced with border-parchment-dim — lighter boundary consistent with parchment bg"
  - "theme option label is 'Grune der Woche' (matches homepage section title)"
metrics:
  duration_minutes: 13
  completed_date: "2026-04-02"
  tasks_completed: 3
  files_modified: 20
---

# Phase 37 Plan 01: CMS Admin Token Migration Summary

**One-liner:** Full Archivist Ink/Parchment/Slate token migration across all 20 admin files — login, layout, articles, sources, exceptions, AI config, and Unsplash pickers.

## What Was Built

Migrated every admin page and component from legacy MD3 tokens (`primary`, `secondary`, `text`, `background`, `accent`) to the v3.0 Archivist color system. All 20 files in the admin surface now use `ink/parchment/slate` tokens exclusively.

**Token replacement applied throughout:**
- `bg-background` -> `bg-parchment`
- `text-text` (and `/70`, `/60`, `/50`) -> `text-ink`, `text-ink-muted`, `text-ink-dim`
- `from-primary to-primary-container` gradient -> `from-ink to-ink-soft`
- `text-white` on dark buttons -> `text-parchment`
- `rounded-full` on buttons -> `rounded-sm`
- `ring-primary` -> `ring-ink`
- `border-surface` on inputs -> `border-parchment-dim`
- `text-secondary` -> `text-slate`
- `text-accent bg-accent` -> `text-red-600 bg-red-50`

**CMS-02 verified:** Article edit form contains `<select name="theme">` with "Kein Thema" and "Grune der Woche" options, styled with Archivist tokens. Server action wiring (`theme: themeRaw === '' ? null : themeRaw`) unchanged.

**Semantic colors preserved:**
- Status badges: PUBLISHED (green), REVIEW (yellow), REJECTED (red)
- Health badges: OK (green), DEGRADED (yellow), DOWN (red)
- Action buttons: Approve (green-600), Reject/Loeschen (red-600)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing coverage] Migrated SourceFormFields.tsx and sources/new/page.tsx**
- **Found during:** Task 3 audit grep
- **Issue:** These files were not listed in the plan but are part of the sources admin area and contained legacy tokens
- **Fix:** Applied same token replacement map
- **Files modified:** `src/app/(admin)/admin/sources/SourceFormFields.tsx`, `src/app/(admin)/admin/sources/new/page.tsx`
- **Commit:** b3e465e (included in Task 3 commit)

**2. [Rule 2 - Missing coverage] Migrated exceptions/page.tsx**
- **Found during:** Task 3 audit grep
- **Issue:** Not listed in plan but contains legacy `text-text` tokens
- **Fix:** Applied same token replacement map
- **Files modified:** `src/app/(admin)/admin/exceptions/page.tsx`
- **Commit:** 2127ea4 (Task 2 commit)

**3. [Rule 2 - Missing coverage] Migrated UnsplashPicker.tsx and UnsplashPickerNew.tsx**
- **Found during:** Task 3 comprehensive audit grep
- **Issue:** These admin components used by article edit/new forms had legacy tokens — not in plan's files list
- **Fix:** Applied same token replacement map; `hover:border-primary` -> `hover:border-ink`
- **Files modified:** `src/components/admin/UnsplashPicker.tsx`, `src/components/admin/UnsplashPickerNew.tsx`
- **Commit:** b3e465e

## Verification Results

- Zero legacy tokens remaining in `src/app/admin/`, `src/app/(admin)/`, `src/components/admin/` (grep confirmed)
- `npx next build` succeeded with no errors
- `npx vitest run`: 259/261 tests pass — 2 pre-existing failures in `bezirke.test.ts` (`gemeindeSynonyms` data issue, unrelated to token migration)

## Self-Check: PASSED
