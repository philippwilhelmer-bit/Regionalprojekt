---
phase: 35-homepage-feature-components
plan: "01"
subsystem: data-layer
tags: [prisma, dal, cms, components, tdd]
dependency_graph:
  requires: []
  provides: [Article.theme-field, listGrueneWocheArticles, GrueneWocheSection]
  affects: [prisma/schema.prisma, src/lib/content/articles.ts, src/lib/admin/articles-actions.ts, src/app/(admin)/admin/articles/[id]/edit/page.tsx]
tech_stack:
  added: []
  patterns: [overloaded-prisma-dal, tdd-red-green, injectable-prisma-client]
key_files:
  created:
    - prisma/migrations/20260401_add_article_theme/migration.sql
    - src/components/reader/GrueneWocheSection.tsx
  modified:
    - prisma/schema.prisma
    - src/lib/content/articles.ts
    - src/lib/content/articles.test.ts
    - src/lib/admin/articles-actions.ts
    - src/app/(admin)/admin/articles/[id]/edit/page.tsx
    - src/test/articles-phase18.test.ts
requirements-completed: [HOME-05]
decisions:
  - "Used prisma db push instead of migrate dev due to historical migration drift (20260321_ingestion name mismatch); created migration file manually for history"
  - "theme field is String? (nullable) on Article model — empty string in CMS form maps to null in DB"
  - "GrueneWocheSection renders null when articles array is empty (no fallback UI)"
metrics:
  duration_seconds: 554
  completed_date: "2026-04-01"
  tasks_completed: 2
  files_modified: 6
---

# Phase 35 Plan 01: Das Gruene der Woche Data Layer Summary

**One-liner:** Prisma theme field migration with listGrueneWocheArticles DAL (TDD), CMS dropdown, and GrueneWocheSection reader component — full vertical slice from DB to UI.

## Tasks Completed

| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Prisma migration + listGrueneWocheArticles DAL with tests | 6ccec50 | Done |
| 2 | CMS theme field + GrueneWocheSection component | 04b0611 | Done |

## What Was Built

**Database:** `theme String?` nullable field added to the `Article` model in Prisma schema, with `@@index([theme])` for query performance. Applied via `prisma db push` (see deviation below). Migration SQL file created manually at `prisma/migrations/20260401_add_article_theme/migration.sql`.

**DAL function:** `listGrueneWocheArticles` follows the existing overloaded pattern (optional injectable PrismaClient as first arg). Queries `WHERE status = 'PUBLISHED' AND theme = 'gruene_woche'`, orders by `publishedAt DESC`, default limit 10. Four TDD tests covering filter correctness, empty result, ordering, and limit parameter — all passing.

**CMS edit form:** Theme select dropdown added after Bezirke fieldset in the article edit page. Options: "Kein Thema" (maps to null) and "Gruenes der Woche" (maps to `gruene_woche`). `updateArticleForm` server action extracts `theme` from FormData and passes to `updateArticle()` with empty string mapped to null. `UpdateArticleInput` interface extended with `theme?: string | null`.

**GrueneWocheSection component:** Renders the featured article via `RegionalEditorialCard`, followed by up to 3 list articles in `ListItem` rows. Returns null when articles array is empty. Ready for Plan 03 HomepageLayout integration.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript type errors in articles-phase18.test.ts mock objects**
- **Found during:** Task 2 TypeScript check
- **Issue:** Adding `theme String?` to the Prisma Article model regenerated the generated types to include `theme: string | null`. Three `makeArticle` factory functions in `src/test/articles-phase18.test.ts` used inline object literals that no longer matched the `ArticleWithBezirke` type.
- **Fix:** Added `theme: null` to all three `makeArticle` factory function objects
- **Files modified:** `src/test/articles-phase18.test.ts`
- **Commit:** 04b0611

**2. [Rule 3 - Blocking] Used `prisma db push` instead of `migrate dev` due to migration drift**
- **Found during:** Task 1 migration step
- **Issue:** Remote DB had a migration `20260321_ingestion` that doesn't match the local migration folder name `20260321000001_ingestion`. `migrate dev` refused to run without resetting the DB.
- **Fix:** Applied schema changes via `prisma db push` (non-destructive, schema-sync only). Created `prisma/migrations/20260401_add_article_theme/migration.sql` manually to preserve migration history in the codebase.
- **Files modified:** `prisma/schema.prisma`, `prisma/migrations/20260401_add_article_theme/migration.sql`
- **Commit:** 6ccec50

## Verification

- `npx vitest run src/lib/content/articles.test.ts` — 25/25 tests pass
- `npx tsc --noEmit` — zero errors
- `prisma/migrations/20260401_add_article_theme/migration.sql` exists
- `GrueneWocheSection.tsx` exports the component
- CMS edit page includes theme select field

## Self-Check: PASSED
