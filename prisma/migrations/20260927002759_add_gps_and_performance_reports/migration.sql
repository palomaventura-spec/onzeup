-- CreateEnum
CREATE TYPE "GpsContext" AS ENUM ('TRAINING', 'MATCH');

-- CreateEnum
CREATE TYPE "GpsDataSource" AS ENUM ('MANUAL', 'CSV', 'XLSX', 'INTEGRATION');

-- CreateEnum
CREATE TYPE "PerformanceReportType" AS ENUM ('TRAINING', 'MATCH', 'GPS', 'EVALUATION', 'CONSOLIDATED');

-- CreateEnum
CREATE TYPE "PerformanceReportStatus" AS ENUM ('GENERATED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "PerformanceReport" ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "pdfUrl" TEXT,
ADD COLUMN     "periodEnd" TIMESTAMP(3),
ADD COLUMN     "periodStart" TIMESTAMP(3),
ADD COLUMN     "reportType" "PerformanceReportType" NOT NULL DEFAULT 'EVALUATION',
ADD COLUMN     "snapshot" JSONB,
ADD COLUMN     "status" "PerformanceReportStatus" NOT NULL DEFAULT 'GENERATED';

-- CreateTable
CREATE TABLE "AthleteGpsRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "trainingSessionId" TEXT,
    "matchId" TEXT,
    "recordedByUserId" TEXT,
    "context" "GpsContext" NOT NULL,
    "source" "GpsDataSource" NOT NULL DEFAULT 'MANUAL',
    "activityAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER,
    "distanceMeters" DECIMAL(10,2),
    "maxSpeedKmh" DECIMAL(6,2),
    "averageSpeedKmh" DECIMAL(6,2),
    "sprintCount" INTEGER,
    "highIntensityDistanceMeters" DECIMAL(10,2),
    "accelerations" INTEGER,
    "decelerations" INTEGER,
    "playerLoad" DECIMAL(10,2),
    "notes" TEXT,
    "sourceFileName" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteGpsRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AthleteGpsRecord_organizationId_athleteId_activityAt_idx" ON "AthleteGpsRecord"("organizationId", "athleteId", "activityAt");

-- CreateIndex
CREATE INDEX "AthleteGpsRecord_athleteId_context_activityAt_idx" ON "AthleteGpsRecord"("athleteId", "context", "activityAt");

-- CreateIndex
CREATE INDEX "AthleteGpsRecord_trainingSessionId_idx" ON "AthleteGpsRecord"("trainingSessionId");

-- CreateIndex
CREATE INDEX "AthleteGpsRecord_matchId_idx" ON "AthleteGpsRecord"("matchId");

-- CreateIndex
CREATE INDEX "AthleteGpsRecord_recordedByUserId_idx" ON "AthleteGpsRecord"("recordedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteGpsRecord_athleteId_trainingSessionId_key" ON "AthleteGpsRecord"("athleteId", "trainingSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteGpsRecord_athleteId_matchId_key" ON "AthleteGpsRecord"("athleteId", "matchId");

-- CreateIndex
CREATE INDEX "PerformanceReport_organizationId_athleteId_reportType_creat_idx" ON "PerformanceReport"("organizationId", "athleteId", "reportType", "createdAt");

-- CreateIndex
CREATE INDEX "PerformanceReport_organizationId_athleteId_status_createdAt_idx" ON "PerformanceReport"("organizationId", "athleteId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "AthleteGpsRecord" ADD CONSTRAINT "AthleteGpsRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteGpsRecord" ADD CONSTRAINT "AthleteGpsRecord_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteGpsRecord" ADD CONSTRAINT "AthleteGpsRecord_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "TrainingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteGpsRecord" ADD CONSTRAINT "AthleteGpsRecord_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteGpsRecord" ADD CONSTRAINT "AthleteGpsRecord_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
