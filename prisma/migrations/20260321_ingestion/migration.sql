-- CreateEnum
CREATE TYPE "SourceHealth" AS ENUM ('OK', 'DEGRADED', 'DOWN');

-- AlterTable: add contentHash column to Article for cross-source deduplication
ALTER TABLE "Article" ADD COLUMN "contentHash" TEXT;

-- CreateIndex: unique constraint on contentHash
CREATE UNIQUE INDEX "Article_contentHash_key" ON "Article"("contentHash");

-- CreateTable: Source — tracks polling sources (OTS_AT, RSS)
CREATE TABLE "Source" (
    "id" SERIAL NOT NULL,
    "type" "ArticleSource" NOT NULL,
    "url" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "pollIntervalMinutes" INTEGER NOT NULL DEFAULT 15,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "lastSuccessAt" TIMESTAMP(3),
    "healthStatus" "SourceHealth" NOT NULL DEFAULT 'OK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable: IngestionRun — records each polling attempt
CREATE TABLE "IngestionRun" (
    "id" SERIAL NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "itemsFound" INTEGER,
    "itemsNew" INTEGER,
    "error" TEXT,

    CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Source_url_key" ON "Source"("url");

-- CreateIndex
CREATE INDEX "Source_enabled_idx" ON "Source"("enabled");

-- CreateIndex
CREATE INDEX "IngestionRun_sourceId_startedAt_idx" ON "IngestionRun"("sourceId", "startedAt");

-- AddForeignKey
ALTER TABLE "IngestionRun" ADD CONSTRAINT "IngestionRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
