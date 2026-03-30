---
phase: 30-cms-admin-restyling
plan: "02"
subsystem: cms-admin
tags: [restyling, wurzelwelt, tokens, tailwind, admin-ui]
dependency_graph:
  requires: []
  provides: [restyled-admin-content-pages]
  affects: [admin-articles, admin-exceptions, admin-sources, admin-ai-config]
tech_stack:
  added: []
  patterns: [wurzelwelt-semantic-tokens, gradient-pill-cta, font-headline-headings, bg-surface-elevated-cards]
key_files:
  created: []
  modified:
    - src/app/(admin)/admin/articles/page.tsx
    - src/app/(admin)/admin/articles/ArticleRow.tsx
    - src/app/(admin)/admin/articles/ArticleFilters.tsx
    - src/app/(admin)/admin/articles/new/page.tsx
    - src/app/(admin)/admin/articles/[id]/edit/page.tsx
    - src/app/(admin)/admin/exceptions/page.tsx
    - src/app/(admin)/admin/exceptions/ExceptionCard.tsx
    - src/app/(admin)/admin/sources/page.tsx
    - src/app/(admin)/admin/sources/SourceCard.tsx
    - src/app/(admin)/admin/sources/SourceFormFields.tsx
    - src/app/(admin)/admin/sources/new/page.tsx
    - src/app/(admin)/admin/ai-config/page.tsx
    - src/app/(admin)/admin/ai-config/GlobalAiConfigForm.tsx
    - src/app/(admin)/admin/ai-config/SourceOverrideForm.tsx
decisions:
  - "FETCHED status badge changed from bg-blue-100/text-blue-800 to bg-surface/text-text/70 — blue is not in the semantic status palette, neutral Wurzelwelt token used instead"
  - "Source type badges (OTS.at/RSS) retain bg-blue-100/text-blue-700 — explicitly kept as semantic type indicator per plan spec"
metrics:
  duration: "5min"
  completed_date: "2026-03-30"
  tasks_completed: 2
  files_modified: 14
---

# Phase 30 Plan 02: CMS Admin Content Pages Restyling Summary

Restyled all 14 CMS admin content pages (Articles, Exceptions, Sources, AI Config) with Wurzelwelt brand tokens — replacing every legacy gray/blue Tailwind default with semantic palette tokens, gradient pill CTAs, Newsreader headlines, and tonal bg-surface card separation.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Restyle Articles pages (list, row, filters, new, edit) | f852748 | 5 files |
| 2 | Restyle Exceptions, Sources, and AI Config pages | 66f1522 | 9 files |

## Token Mapping Applied

| Legacy Class | Wurzelwelt Replacement |
|---|---|
| `text-gray-900` heading | `text-text font-headline` |
| `text-gray-800` heading | `text-text font-headline` |
| `text-gray-700` body | `text-text/70` |
| `text-gray-600` secondary | `text-text/60` |
| `text-gray-500` muted | `text-text/50` |
| `bg-white rounded-lg border border-gray-200` | `bg-surface-elevated rounded-sm` |
| `bg-gray-50 border-b border-gray-200` | `bg-surface` |
| `border border-gray-300 rounded` | `border border-surface rounded-sm` |
| `focus:ring-blue-500` | `focus:ring-primary` |
| `bg-blue-600 ... rounded hover:bg-blue-700` | `bg-gradient-to-br from-primary to-primary-container rounded-full hover:opacity-90` |
| `border-gray-300 text-gray-700 hover:bg-gray-50` | `border-surface text-text/70 rounded-sm hover:bg-surface` |
| `text-blue-600/700` links | `text-secondary` |
| `divide-gray-100` | `divide-surface` |
| `bg-gray-100 text-gray-700` inactive badge | `bg-surface text-text/70` |

## Semantic Colors Preserved (Intentional Exceptions)

- Green (approve, health OK, published status, active source)
- Yellow (review status, source badge)
- Red (reject, error counts, delete/disable actions, rejected status)
- Orange (pin action, override active badge)
- Purple (feature action, source category badge)
- Amber (keywords badge)
- Blue (source type badge: OTS.at/RSS — explicitly kept per plan spec)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] FETCHED status badge used legacy blue**

- **Found during:** Task 1 verification
- **Issue:** `STATUS_COLORS.FETCHED = 'bg-blue-100 text-blue-800'` matched the legacy blue pattern
- **Fix:** Changed to `bg-surface text-text/70` — a neutral Wurzelwelt token appropriate for a neutral/pending state
- **Files modified:** `src/app/(admin)/admin/articles/ArticleRow.tsx`
- **Commit:** f852748

## Self-Check: PASSED

All 14 modified files exist. Both commits verified.
