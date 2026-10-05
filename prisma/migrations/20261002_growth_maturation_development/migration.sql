-- ONZEUP Performance Elite: Crescimento, Maturação e Desenvolvimento Físico
-- Dados privados do atleta. Autorização física, se aplicável, é gerida fora deste módulo.

ALTER TYPE "ClubPermissionCode" ADD VALUE IF NOT EXISTS 'GROWTH_VIEW';
ALTER TYPE "ClubPermissionCode" ADD VALUE IF NOT EXISTS 'GROWTH_MANAGE';

DO $$ BEGIN
  CREATE TYPE "GrowthReferenceSex" AS ENUM ('BOY', 'GIRL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GrowthMeasurementSource" AS ENUM ('CLUB', 'PROFESSIONAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GrowthBoneAgeMethod" AS ENUM ('GREULICH_PYLE', 'TANNER_WHITEHOUSE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "AthleteBodyMeasurement"
  ADD COLUMN IF NOT EXISTS "sittingHeightCm" DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS "measurementSource" "GrowthMeasurementSource" NOT NULL DEFAULT 'CLUB';

CREATE TABLE IF NOT EXISTS "AthleteGrowthProfile" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "athleteId" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "referenceSex" "GrowthReferenceSex",
  "motherHeightCm" DECIMAL(6,2),
  "fatherHeightCm" DECIMAL(6,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AthleteGrowthProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AthleteGrowthProfile_athleteId_key"
  ON "AthleteGrowthProfile"("athleteId");
CREATE INDEX IF NOT EXISTS "AthleteGrowthProfile_organizationId_idx"
  ON "AthleteGrowthProfile"("organizationId");
CREATE INDEX IF NOT EXISTS "AthleteGrowthProfile_createdByUserId_idx"
  ON "AthleteGrowthProfile"("createdByUserId");

CREATE TABLE IF NOT EXISTS "AthleteBoneAgeAssessment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "athleteId" TEXT NOT NULL,
  "recordedByUserId" TEXT,
  "reportDocumentId" TEXT,
  "examinedAt" TIMESTAMP(3) NOT NULL,
  "boneAgeMonths" INTEGER NOT NULL,
  "method" "GrowthBoneAgeMethod" NOT NULL,
  "professionalEncrypted" TEXT,
  "notesEncrypted" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AthleteBoneAgeAssessment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AthleteBoneAgeAssessment_organizationId_athleteId_examinedAt_idx"
  ON "AthleteBoneAgeAssessment"("organizationId", "athleteId", "examinedAt");
CREATE INDEX IF NOT EXISTS "AthleteBoneAgeAssessment_athleteId_examinedAt_idx"
  ON "AthleteBoneAgeAssessment"("athleteId", "examinedAt");
CREATE INDEX IF NOT EXISTS "AthleteBoneAgeAssessment_recordedByUserId_idx"
  ON "AthleteBoneAgeAssessment"("recordedByUserId");
CREATE INDEX IF NOT EXISTS "AthleteBoneAgeAssessment_reportDocumentId_idx"
  ON "AthleteBoneAgeAssessment"("reportDocumentId");

DO $$ BEGIN
  ALTER TABLE "AthleteGrowthProfile"
    ADD CONSTRAINT "AthleteGrowthProfile_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "AthleteGrowthProfile"
    ADD CONSTRAINT "AthleteGrowthProfile_athleteId_fkey"
    FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "AthleteGrowthProfile"
    ADD CONSTRAINT "AthleteGrowthProfile_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AthleteBoneAgeAssessment"
    ADD CONSTRAINT "AthleteBoneAgeAssessment_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "AthleteBoneAgeAssessment"
    ADD CONSTRAINT "AthleteBoneAgeAssessment_athleteId_fkey"
    FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "AthleteBoneAgeAssessment"
    ADD CONSTRAINT "AthleteBoneAgeAssessment_recordedByUserId_fkey"
    FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "AthleteBoneAgeAssessment"
    ADD CONSTRAINT "AthleteBoneAgeAssessment_reportDocumentId_fkey"
    FOREIGN KEY ("reportDocumentId") REFERENCES "AthleteDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
