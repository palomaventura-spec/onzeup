-- CreateEnum
CREATE TYPE "MonthlyAthleteReportStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'SENT', 'ARCHIVED');

-- CreateTable
CREATE TABLE "MonthlyAthleteReport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "categoryId" TEXT,
    "createdByUserId" TEXT,
    "reviewedByUserId" TEXT,
    "approvedByUserId" TEXT,
    "sentByUserId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "MonthlyAthleteReportStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT,
    "professionalComment" TEXT,
    "managerComment" TEXT,
    "includePresence" BOOLEAN NOT NULL DEFAULT true,
    "includeGps" BOOLEAN NOT NULL DEFAULT false,
    "includeEvaluation" BOOLEAN NOT NULL DEFAULT false,
    "presenceSnapshot" JSONB,
    "gpsSnapshot" JSONB,
    "evaluationSnapshot" JSONB,
    "snapshotVersion" INTEGER NOT NULL DEFAULT 1,
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyAthleteReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthlyAthleteReport_organizationId_periodStart_status_idx" ON "MonthlyAthleteReport"("organizationId", "periodStart", "status");

-- CreateIndex
CREATE INDEX "MonthlyAthleteReport_athleteId_periodStart_idx" ON "MonthlyAthleteReport"("athleteId", "periodStart");

-- CreateIndex
CREATE INDEX "MonthlyAthleteReport_categoryId_periodStart_idx" ON "MonthlyAthleteReport"("categoryId", "periodStart");

-- CreateIndex
CREATE INDEX "MonthlyAthleteReport_createdByUserId_idx" ON "MonthlyAthleteReport"("createdByUserId");

-- CreateIndex
CREATE INDEX "MonthlyAthleteReport_reviewedByUserId_idx" ON "MonthlyAthleteReport"("reviewedByUserId");

-- CreateIndex
CREATE INDEX "MonthlyAthleteReport_approvedByUserId_idx" ON "MonthlyAthleteReport"("approvedByUserId");

-- CreateIndex
CREATE INDEX "MonthlyAthleteReport_sentByUserId_idx" ON "MonthlyAthleteReport"("sentByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyAthleteReport_organizationId_athleteId_periodStart_key" ON "MonthlyAthleteReport"("organizationId", "athleteId", "periodStart");

-- AddForeignKey
ALTER TABLE "MonthlyAthleteReport" ADD CONSTRAINT "MonthlyAthleteReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyAthleteReport" ADD CONSTRAINT "MonthlyAthleteReport_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyAthleteReport" ADD CONSTRAINT "MonthlyAthleteReport_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyAthleteReport" ADD CONSTRAINT "MonthlyAthleteReport_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyAthleteReport" ADD CONSTRAINT "MonthlyAthleteReport_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyAthleteReport" ADD CONSTRAINT "MonthlyAthleteReport_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyAthleteReport" ADD CONSTRAINT "MonthlyAthleteReport_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
