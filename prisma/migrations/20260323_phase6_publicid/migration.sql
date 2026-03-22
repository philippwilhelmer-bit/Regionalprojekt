-- Phase 6: Add publicId to Article for stable reader-facing URLs
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "publicId" TEXT;

-- Backfill existing rows with a generated 10-char nanoid-style random value
-- Using substring of md5(random()::text) as a portable SQL approximation
UPDATE "Article" SET "publicId" = substring(md5(random()::text || id::text) from 1 for 10)
WHERE "publicId" IS NULL;

-- Add unique constraint after backfill
CREATE UNIQUE INDEX IF NOT EXISTS "Article_publicId_key" ON "Article"("publicId");
CREATE INDEX IF NOT EXISTS "Article_publicId_idx" ON "Article"("publicId");
