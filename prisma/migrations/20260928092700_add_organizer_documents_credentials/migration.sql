-- CreateEnum
CREATE TYPE "CompetitionDocumentStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CompetitionDocumentSource" AS ENUM ('MANUAL_UPLOAD', 'CLUB_SHARED');

-- CreateEnum
CREATE TYPE "CompetitionCredentialStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "CompetitionDocumentRequirement" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionDocumentRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionAthleteDocument" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "source" "CompetitionDocumentSource" NOT NULL DEFAULT 'MANUAL_UPLOAD',
    "status" "CompetitionDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "fileUrl" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "sourceReferenceId" TEXT,
    "reviewNotes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionAthleteDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionAthleteCredential" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "code" TEXT,
    "status" "CompetitionCredentialStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionAthleteCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompetitionDocumentRequirement_competitionId_active_sortOrd_idx" ON "CompetitionDocumentRequirement"("competitionId", "active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionDocumentRequirement_competitionId_name_key" ON "CompetitionDocumentRequirement"("competitionId", "name");

-- CreateIndex
CREATE INDEX "CompetitionAthleteDocument_athleteId_status_idx" ON "CompetitionAthleteDocument"("athleteId", "status");

-- CreateIndex
CREATE INDEX "CompetitionAthleteDocument_requirementId_status_idx" ON "CompetitionAthleteDocument"("requirementId", "status");

-- CreateIndex
CREATE INDEX "CompetitionAthleteDocument_athleteId_requirementId_createdA_idx" ON "CompetitionAthleteDocument"("athleteId", "requirementId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionAthleteCredential_athleteId_key" ON "CompetitionAthleteCredential"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionAthleteCredential_code_key" ON "CompetitionAthleteCredential"("code");

-- CreateIndex
CREATE INDEX "CompetitionAthleteCredential_status_validUntil_idx" ON "CompetitionAthleteCredential"("status", "validUntil");

-- AddForeignKey
ALTER TABLE "CompetitionDocumentRequirement" ADD CONSTRAINT "CompetitionDocumentRequirement_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionAthleteDocument" ADD CONSTRAINT "CompetitionAthleteDocument_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "CompetitionAthlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionAthleteDocument" ADD CONSTRAINT "CompetitionAthleteDocument_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "CompetitionDocumentRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionAthleteCredential" ADD CONSTRAINT "CompetitionAthleteCredential_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "CompetitionAthlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
