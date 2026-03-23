-- Phase 8: Add Article.sourceId nullable FK to Source
-- onDelete: SET NULL — articles survive Source deletion, fall through to global AI config
ALTER TABLE "Article" ADD COLUMN "sourceId" INTEGER REFERENCES "Source"("id") ON DELETE SET NULL;
CREATE INDEX "Article_sourceId_idx" ON "Article"("sourceId");
