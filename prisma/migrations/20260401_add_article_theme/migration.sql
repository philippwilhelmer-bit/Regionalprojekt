-- AlterTable
ALTER TABLE "Article" ADD COLUMN "theme" TEXT;

-- CreateIndex
CREATE INDEX "Article_theme_idx" ON "Article"("theme");
