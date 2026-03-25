-- Phase 18: Add isEilmeldung and imageUrl fields to Article
ALTER TABLE "Article" ADD COLUMN "isEilmeldung" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Article" ADD COLUMN "imageUrl" TEXT;

-- Index for isEilmeldung queries (banner detection)
CREATE INDEX "Article_isEilmeldung_idx" ON "Article"("isEilmeldung");
