-- CreateEnum
CREATE TYPE "AthleteHistorySource" AS ENUM (
  'TRAINING',
  'MATCH',
  'EVALUATION',
  'GPS',
  'CATEGORY_CHANGE',
  'REPORT',
  'MANUAL'
);

-- CreateEnum
CREATE TYPE "AthleteHistoryTopic" AS ENUM (
  'TECHNICAL',
  'TACTICAL',
  'PHYSICAL',
  'COGNITIVE',
  'EMOTIONAL',
  'BEHAVIORAL',
  'OCCURRENCE',
  'GENERAL'
);

-- CreateEnum
CREATE TYPE "AthleteHistoryVisibility" AS ENUM (
  'TECHNICAL_STAFF',
  'MANAGEMENT',
  'SHAREABLE'
);

-- CreateTable
CREATE TABLE "AthleteHistoryEntry" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "athleteId" TEXT NOT NULL,
  "authorUserId" TEXT,
  "followUpResolvedByUserId" TEXT,

  "source" "AthleteHistorySource" NOT NULL DEFAULT 'MANUAL',
  "sourceId" TEXT,
  "sourceLabelSnapshot" TEXT,

  "topic" "AthleteHistoryTopic" NOT NULL DEFAULT 'GENERAL',
  "visibility" "AthleteHistoryVisibility" NOT NULL DEFAULT 'TECHNICAL_STAFF',

  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  "title" TEXT,
  "content" TEXT NOT NULL,

  "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
  "followUpResolvedAt" TIMESTAMP(3),

  "categoryIdSnapshot" TEXT,
  "categoryNameSnapshot" TEXT,
  "categoryBirthYearSnapshot" INTEGER,
  "sportSnapshot" "SportType",
  "seasonSnapshot" TEXT,
  "positionSnapshot" TEXT,

  "authorNameSnapshot" TEXT,
  "resolvedByNameSnapshot" TEXT,

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AthleteHistoryEntry_pkey"
    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX
  "AthleteHistoryEntry_organizationId_athleteId_occurredAt_idx"
ON
  "AthleteHistoryEntry"(
    "organizationId",
    "athleteId",
    "occurredAt"
  );

-- CreateIndex
CREATE INDEX
  "AthleteHistoryEntry_athleteId_source_occurredAt_idx"
ON
  "AthleteHistoryEntry"(
    "athleteId",
    "source",
    "occurredAt"
  );

-- CreateIndex
CREATE INDEX
  "AthleteHistoryEntry_organizationId_source_sourceId_idx"
ON
  "AthleteHistoryEntry"(
    "organizationId",
    "source",
    "sourceId"
  );

-- CreateIndex
CREATE INDEX
  "AthleteHistoryEntry_organizationId_followUpRequired_followUpResolvedAt_idx"
ON
  "AthleteHistoryEntry"(
    "organizationId",
    "followUpRequired",
    "followUpResolvedAt"
  );

-- CreateIndex
CREATE INDEX
  "AthleteHistoryEntry_authorUserId_idx"
ON
  "AthleteHistoryEntry"(
    "authorUserId"
  );

-- CreateIndex
CREATE INDEX
  "AthleteHistoryEntry_followUpResolvedByUserId_idx"
ON
  "AthleteHistoryEntry"(
    "followUpResolvedByUserId"
  );

-- AddForeignKey
ALTER TABLE "AthleteHistoryEntry"
ADD CONSTRAINT
  "AthleteHistoryEntry_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "Organization"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteHistoryEntry"
ADD CONSTRAINT
  "AthleteHistoryEntry_athleteId_fkey"
FOREIGN KEY ("athleteId")
REFERENCES "Athlete"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteHistoryEntry"
ADD CONSTRAINT
  "AthleteHistoryEntry_authorUserId_fkey"
FOREIGN KEY ("authorUserId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteHistoryEntry"
ADD CONSTRAINT
  "AthleteHistoryEntry_followUpResolvedByUserId_fkey"
FOREIGN KEY ("followUpResolvedByUserId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;