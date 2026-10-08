-- CreateEnum
CREATE TYPE "AthleteDocumentManualIssueStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "AthleteDocumentManualIssue" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "blocking" BOOLEAN NOT NULL DEFAULT false,
    "status" "AthleteDocumentManualIssueStatus" NOT NULL DEFAULT 'OPEN',
    "createdByUserId" TEXT,
    "createdByNameSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    "resolvedByNameSnapshot" TEXT,
    "resolutionNotes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteDocumentManualIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AthleteDocumentManualIssue_organizationId_athleteId_status_idx"
ON "AthleteDocumentManualIssue"("organizationId", "athleteId", "status");

-- CreateIndex
CREATE INDEX "AthleteDocumentManualIssue_athleteId_blocking_status_idx"
ON "AthleteDocumentManualIssue"("athleteId", "blocking", "status");

-- CreateIndex
CREATE INDEX "AthleteDocumentManualIssue_createdAt_idx"
ON "AthleteDocumentManualIssue"("createdAt");

-- AddForeignKey
ALTER TABLE "AthleteDocumentManualIssue"
ADD CONSTRAINT "AthleteDocumentManualIssue_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "Organization"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteDocumentManualIssue"
ADD CONSTRAINT "AthleteDocumentManualIssue_athleteId_fkey"
FOREIGN KEY ("athleteId")
REFERENCES "Athlete"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteDocumentManualIssue"
ADD CONSTRAINT "AthleteDocumentManualIssue_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteDocumentManualIssue"
ADD CONSTRAINT "AthleteDocumentManualIssue_resolvedByUserId_fkey"
FOREIGN KEY ("resolvedByUserId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;