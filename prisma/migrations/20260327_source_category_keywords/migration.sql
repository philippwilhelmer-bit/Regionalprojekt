-- AlterTable
ALTER TABLE "Source" ADD COLUMN "category" TEXT;
ALTER TABLE "Source" ADD COLUMN "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[];
