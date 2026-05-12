-- Phase 44 INGEST-03 / INGEST-04: polling cursor + RSS conditional-GET validators
-- All three columns are nullable so existing Source rows remain valid.
-- The OTS adapter uses lastFetchedAt to compute a 30-min-overlap cursor (NULL → 24h fallback).
-- The RSS adapter uses etag/lastModified to send If-None-Match / If-Modified-Since.

-- AlterTable
ALTER TABLE "Source" ADD COLUMN "lastFetchedAt" TIMESTAMP(3);
ALTER TABLE "Source" ADD COLUMN "etag" TEXT;
ALTER TABLE "Source" ADD COLUMN "lastModified" TEXT;
