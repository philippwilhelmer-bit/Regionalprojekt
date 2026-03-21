-- Phase 3 AI Pipeline migration
-- Adds Article.seoTitle field and PipelineRun model

-- AlterTable: add seoTitle to Article for SEO-optimised titles (distinct from display title)
ALTER TABLE "Article" ADD COLUMN "seoTitle" TEXT;

-- CreateTable: PipelineRun — records each AI processing run (mirrors IngestionRun)
CREATE TABLE "PipelineRun" (
    "id" SERIAL NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "articlesProcessed" INTEGER,
    "articlesWritten" INTEGER,
    "totalInputTokens" INTEGER,
    "totalOutputTokens" INTEGER,
    "error" TEXT,

    CONSTRAINT "PipelineRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PipelineRun_startedAt_idx" ON "PipelineRun"("startedAt");
