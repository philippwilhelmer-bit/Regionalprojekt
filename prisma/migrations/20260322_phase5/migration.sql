-- Phase 5: Editorial CMS schema additions

-- Article: pin and feature toggles
ALTER TABLE "Article" ADD COLUMN "isPinned"   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Article" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Article_isPinned_isFeatured_idx"  ON "Article"("isPinned", "isFeatured");
CREATE INDEX "Article_source_status_idx"        ON "Article"("source", "status");

-- Source: per-source health failure threshold
ALTER TABLE "Source" ADD COLUMN "healthFailureThreshold" INTEGER NOT NULL DEFAULT 3;

-- New enum types
CREATE TYPE "AiTone"          AS ENUM ('NEUTRAL', 'FORMAL', 'CONVERSATIONAL');
CREATE TYPE "AiArticleLength" AS ENUM ('SHORT', 'MEDIUM', 'LONG');

-- Global AI config (singleton)
CREATE TABLE "AiConfig" (
  "id"            SERIAL PRIMARY KEY,
  "tone"          "AiTone"          NOT NULL DEFAULT 'NEUTRAL',
  "articleLength" "AiArticleLength" NOT NULL DEFAULT 'MEDIUM',
  "styleNotes"    TEXT,
  "modelOverride" TEXT,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Per-source AI config overrides
CREATE TABLE "AiSourceConfig" (
  "id"            SERIAL PRIMARY KEY,
  "sourceId"      INTEGER NOT NULL REFERENCES "Source"("id") ON DELETE CASCADE,
  "tone"          "AiTone",
  "articleLength" "AiArticleLength",
  "styleNotes"    TEXT,
  "modelOverride" TEXT,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("sourceId")
);

-- Pipeline tunable config (singleton)
CREATE TABLE "PipelineConfig" (
  "id"                    SERIAL PRIMARY KEY,
  "maxRetryCount"         INTEGER NOT NULL DEFAULT 3,
  "deadManThresholdHours" INTEGER NOT NULL DEFAULT 6,
  "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
