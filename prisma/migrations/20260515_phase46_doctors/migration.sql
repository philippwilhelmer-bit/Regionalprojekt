-- Phase 46 DIR-01 / DIR-02: Doctor table + DoctorKategorie enum (Ärzteverzeichnis).
-- Additive migration; existing models untouched (Bezirk gains only a Prisma-side back-relation
-- that does NOT require a column change).
-- publicId is declared NOT NULL with no SQL DEFAULT — Prisma's @default(nanoid()) runs
-- client-side, so only Prisma-mediated inserts are expected (no raw psql / no seed inserts).

-- CreateEnum
CREATE TYPE "DoctorKategorie" AS ENUM ('ALLGEMEINMEDIZIN', 'FACHARZT', 'ZAHNARZT');

-- CreateTable
CREATE TABLE "Doctor" (
    "id"                SERIAL          NOT NULL,
    "publicId"          TEXT            NOT NULL,
    "name"              TEXT            NOT NULL,
    "titel"             TEXT,
    "kategorie"         "DoctorKategorie" NOT NULL,
    "fachrichtung"      TEXT,
    "address"           TEXT            NOT NULL,
    "lat"               DOUBLE PRECISION,
    "lon"               DOUBLE PRECISION,
    "bezirkId"          INTEGER         NOT NULL,
    "email"             TEXT,
    "website"           TEXT,
    "phone"             TEXT,
    "editorialNote"     TEXT,
    "relatedArticleIds" TEXT[]          NOT NULL DEFAULT ARRAY[]::TEXT[],
    "mapImageUrl"       TEXT,
    "isVerified"        BOOLEAN         NOT NULL DEFAULT false,
    "createdAt"         TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3)    NOT NULL,
    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_publicId_key" ON "Doctor"("publicId");
CREATE INDEX "Doctor_bezirkId_idx" ON "Doctor"("bezirkId");
CREATE INDEX "Doctor_kategorie_idx" ON "Doctor"("kategorie");
CREATE INDEX "Doctor_isVerified_name_idx" ON "Doctor"("isVerified", "name");

-- AddForeignKey
ALTER TABLE "Doctor"
  ADD CONSTRAINT "Doctor_bezirkId_fkey"
  FOREIGN KEY ("bezirkId") REFERENCES "Bezirk"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
