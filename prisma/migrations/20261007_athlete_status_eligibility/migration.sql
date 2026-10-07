-- 11UP
-- Situação atual do atleta, saídas do clube e elegibilidade do elenco.
-- Migration aditiva: preserva Athlete.active e os históricos já existentes.

-- CreateEnum
CREATE TYPE "AthleteCurrentStatus" AS ENUM (
  'ACTIVE',
  'EVALUATION',
  'REJECTED',
  'RELEASED'
);

-- CreateEnum
CREATE TYPE "AthleteExitOrigin" AS ENUM (
  'CLUB',
  'FAMILY',
  'UNKNOWN'
);

-- CreateEnum
CREATE TYPE "AthleteEligibilityIssueType" AS ENUM (
  'DOCUMENTATION',
  'MEDICAL_EXAM',
  'FEDERATION_REGISTRATION',
  'COMPETITION_REGISTRATION',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "AthleteEligibilityIssueSource" AS ENUM (
  'AUTOMATIC',
  'MANUAL'
);

-- AlterTable: Category
ALTER TABLE "Category"
ADD COLUMN "requiresDocumentation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "requiresMedicalExam" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "requiresFederationRegistration" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Athlete
ALTER TABLE "Athlete"
ADD COLUMN "currentStatus" "AthleteCurrentStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "AthleteExitRecord" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "athleteId" TEXT NOT NULL,
  "origin" "AthleteExitOrigin" NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "notes" TEXT,
  "previousCategoryId" TEXT,
  "previousCategoryNameSnapshot" TEXT,
  "seasonSnapshot" TEXT,
  "recordedByUserId" TEXT,
  "recordedByNameSnapshot" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AthleteExitRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteEligibilityIssue" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "athleteId" TEXT NOT NULL,
  "type" "AthleteEligibilityIssueType" NOT NULL,
  "source" "AthleteEligibilityIssueSource" NOT NULL DEFAULT 'MANUAL',
  "blocking" BOOLEAN NOT NULL DEFAULT true,
  "key" TEXT,
  "reason" TEXT NOT NULL,
  "notes" TEXT,
  "sourceReferenceType" TEXT,
  "sourceReferenceId" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "resolutionNotes" TEXT,
  "createdByUserId" TEXT,
  "resolvedByUserId" TEXT,
  "createdByNameSnapshot" TEXT,
  "resolvedByNameSnapshot" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AthleteEligibilityIssue_pkey" PRIMARY KEY ("id")
);

-- Backfill currentStatus a partir da situação atual conhecida.
-- 1) Quem está hoje em categoria de avaliação.
UPDATE "Athlete" AS a
SET "currentStatus" = 'EVALUATION'
FROM "Category" AS c
WHERE a."categoryId" = c."id"
  AND c."type" = 'EVALUATION'
  AND a."active" = true;

-- 2) Processos atuais encerrados: usa a decisão mais recente para atletas fora de categoria.
WITH latest_process AS (
  SELECT DISTINCT ON ("athleteId")
    "athleteId",
    "status"
  FROM "AthleteEvaluationProcess"
  WHERE "entryMode" = 'CURRENT'
  ORDER BY
    "athleteId",
    COALESCE("decidedAt", "startedAt") DESC,
    "createdAt" DESC
)
UPDATE "Athlete" AS a
SET "currentStatus" =
  CASE
    WHEN lp."status" = 'REJECTED' THEN 'REJECTED'::"AthleteCurrentStatus"
    WHEN lp."status" IN ('RELEASED', 'WITHDRAWN') THEN 'RELEASED'::"AthleteCurrentStatus"
    ELSE a."currentStatus"
  END
FROM latest_process AS lp
WHERE lp."athleteId" = a."id"
  AND a."categoryId" IS NULL
  AND lp."status" IN ('REJECTED', 'RELEASED', 'WITHDRAWN');

-- 3) Registros antigos já inativos e sem um processo conhecido NÃO são
-- classificados automaticamente como RELEASED. O campo legacy "active"
-- permanece preservado até revisão/migração explícita.
-- Isso evita transformar uma inativação administrativa antiga em dispensa.

-- Mantém compatibilidade com telas antigas somente para resultados
-- que já foram identificados de forma confiável pelo histórico atual.
UPDATE "Athlete"
SET "active" = false
WHERE "currentStatus" IN ('REJECTED', 'RELEASED');

-- CreateIndex
CREATE INDEX "Athlete_organizationId_currentStatus_idx"
ON "Athlete"("organizationId", "currentStatus");

CREATE INDEX "AthleteExitRecord_organizationId_occurredAt_idx"
ON "AthleteExitRecord"("organizationId", "occurredAt");

CREATE INDEX "AthleteExitRecord_athleteId_occurredAt_idx"
ON "AthleteExitRecord"("athleteId", "occurredAt");

CREATE INDEX "AthleteExitRecord_origin_occurredAt_idx"
ON "AthleteExitRecord"("origin", "occurredAt");

CREATE INDEX "AthleteExitRecord_recordedByUserId_idx"
ON "AthleteExitRecord"("recordedByUserId");

CREATE INDEX "AthleteEligibilityIssue_organizationId_resolvedAt_idx"
ON "AthleteEligibilityIssue"("organizationId", "resolvedAt");

CREATE INDEX "AthleteEligibilityIssue_athleteId_blocking_resolvedAt_idx"
ON "AthleteEligibilityIssue"("athleteId", "blocking", "resolvedAt");

CREATE INDEX "AthleteEligibilityIssue_athleteId_type_resolvedAt_idx"
ON "AthleteEligibilityIssue"("athleteId", "type", "resolvedAt");

CREATE INDEX "AthleteEligibilityIssue_athleteId_key_resolvedAt_idx"
ON "AthleteEligibilityIssue"("athleteId", "key", "resolvedAt");

CREATE INDEX "AthleteEligibilityIssue_createdByUserId_idx"
ON "AthleteEligibilityIssue"("createdByUserId");

CREATE INDEX "AthleteEligibilityIssue_resolvedByUserId_idx"
ON "AthleteEligibilityIssue"("resolvedByUserId");

-- AddForeignKey
ALTER TABLE "AthleteExitRecord"
ADD CONSTRAINT "AthleteExitRecord_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AthleteExitRecord"
ADD CONSTRAINT "AthleteExitRecord_athleteId_fkey"
FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AthleteExitRecord"
ADD CONSTRAINT "AthleteExitRecord_recordedByUserId_fkey"
FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AthleteEligibilityIssue"
ADD CONSTRAINT "AthleteEligibilityIssue_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AthleteEligibilityIssue"
ADD CONSTRAINT "AthleteEligibilityIssue_athleteId_fkey"
FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AthleteEligibilityIssue"
ADD CONSTRAINT "AthleteEligibilityIssue_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AthleteEligibilityIssue"
ADD CONSTRAINT "AthleteEligibilityIssue_resolvedByUserId_fkey"
FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
