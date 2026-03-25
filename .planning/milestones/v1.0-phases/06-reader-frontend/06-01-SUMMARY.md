---
phase: "06-reader-frontend"
plan: "01"
subsystem: "reader-frontend"
tags: [schema, migration, test-stubs, publicId, wave-0]
dependency_graph:
  requires: []
  provides:
    - "Article.publicId field in Prisma schema with @unique @default(nanoid())"
    - "Migration SQL for publicId column with backfill"
    - "Wave 0 test stubs for reader modules (slug, rss, metadata, sitemap)"
    - "Wave 0 test stubs for getArticleByPublicId and listArticlesReader in articles.test.ts"
  affects:
    - "All subsequent Phase 6 plans that implement reader DAL and routing"
tech_stack:
  added: []
  patterns:
    - "Wave 0 stub pattern: it.todo() with no implementation imports"
    - "nanoid() as Prisma @default — Prisma 6 native, no custom generator"
    - "Migration SQL with backfill before unique constraint — safe for existing rows"
key_files:
  created:
    - prisma/migrations/20260323_phase6_publicid/migration.sql
    - src/lib/reader/slug.test.ts
    - src/lib/reader/rss.test.ts
    - src/lib/reader/metadata.test.ts
    - src/lib/reader/sitemap.test.ts
  modified:
    - prisma/schema.prisma
    - src/lib/content/articles.test.ts
decisions:
  - "publicId is String? (nullable) so existing articles don't fail migration — backfill populates values before unique constraint is added"
  - "Wave 0 stubs use only describe/it from vitest — no implementation imports — follows Phase 2 and 4 pattern to prevent TypeScript errors before implementation files exist"
metrics:
  duration: "~4 minutes"
  completed_date: "2026-03-22"
  tasks_completed: 2
  files_modified: 7
---

# Phase 6 Plan 01: Schema publicId and Wave 0 Test Stubs Summary

**One-liner:** Added `publicId String? @unique @default(nanoid())` to Article model with migration SQL backfill plus five Wave 0 it.todo() test stubs for reader modules.

## What Was Built

### Task 1: Article schema publicId field and migration SQL

Added the `publicId` field to the `Article` model in `prisma/schema.prisma`:
- Position: between `id` and `externalId` (matching plan specification)
- Type: `String? @unique @default(nanoid())` — nullable so existing rows don't fail, Prisma 6 native nanoid support
- Index: `@@index([publicId])` added alongside existing indexes

Created `prisma/migrations/20260323_phase6_publicid/migration.sql`:
- `ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "publicId" TEXT`
- Backfill via `md5(random()::text || id::text)` — portable across PostgreSQL and pgLite
- Unique constraint and index created after backfill to prevent conflicts
- Prisma client regenerated: `@prisma/client` v6.19.2 updated with `publicId` field

### Task 2: Wave 0 test stubs for reader modules

Created `src/lib/reader/` directory with four new stub files:

- `slug.test.ts` — 6 it.todo() stubs for German umlaut slugification
- `rss.test.ts` — 5 it.todo() stubs for Bezirk RSS feed generation (READ-06)
- `metadata.test.ts` — 6 it.todo() stubs for OG metadata building (SEO-01)
- `sitemap.test.ts` — 5 it.todo() stubs for sitemap.xml generation (SEO-03)

Extended `src/lib/content/articles.test.ts` by appending two new describe blocks:
- `getArticleByPublicId` — 2 it.todo() stubs
- `listArticlesReader` — 6 it.todo() stubs (READ-01 through READ-05, AD-01)

All existing 139 tests continue to pass. 30 new todo items registered as skipped.

## Verification Results

- `npx tsc --noEmit` — passes with no errors (outside pre-existing .next/ build artifacts)
- `npx vitest run` — 139 tests pass, 30 todo, 0 failures
- `prisma/schema.prisma` — Article model contains `publicId String? @unique @default(nanoid())`
- `prisma/migrations/20260323_phase6_publicid/migration.sql` — exists with backfill SQL
- All five test stub files exist with `it.todo()` entries only

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 | ef0dd3c | feat(06-01): add publicId to Article schema and write migration SQL |
| Task 2 | b9c2319 | feat(06-01): create Wave 0 test stubs for all reader modules |

## Self-Check: PASSED
