-- Phase 4: Scheduler + Autonomous Publishing
-- Adds ERROR/FAILED to ArticleStatus enum and retryCount/errorMessage to Article.
--
-- IMPORTANT: ALTER TYPE ... ADD VALUE cannot run inside a transaction block
-- (PostgreSQL restriction). These statements must remain at top level.

ALTER TYPE "ArticleStatus" ADD VALUE 'ERROR';
ALTER TYPE "ArticleStatus" ADD VALUE 'FAILED';

ALTER TABLE "Article" ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Article" ADD COLUMN "errorMessage" TEXT;
