-- AlterTable
ALTER TABLE "AthleteGpsRecord" ADD COLUMN     "averageHeartRateBpm" INTEGER,
ADD COLUMN     "gpsSessionId" TEXT,
ADD COLUMN     "highIntensityAccelerations" INTEGER,
ADD COLUMN     "highIntensityDecelerations" INTEGER,
ADD COLUMN     "maxHeartRateBpm" INTEGER,
ADD COLUMN     "peakAccelerationMps2" DECIMAL(7,3),
ADD COLUMN     "peakDecelerationMps2" DECIMAL(7,3),
ADD COLUMN     "sessionRpe" INTEGER,
ADD COLUMN     "speedZones" JSONB,
ADD COLUMN     "sprintDistanceMeters" DECIMAL(10,2),
ADD COLUMN     "timeBlocks" JSONB;

-- CreateTable
CREATE TABLE "GpsProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "sport" "SportType" NOT NULL DEFAULT 'BOTH',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "providerName" TEXT,
    "enabledMetrics" JSONB,
    "speedZones" JSONB,
    "thresholds" JSONB,
    "columnMapping" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GpsProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GpsSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT,
    "trainingSessionId" TEXT,
    "matchId" TEXT,
    "profileId" TEXT,
    "createdByUserId" TEXT,
    "context" "GpsContext" NOT NULL,
    "sport" "SportType" NOT NULL DEFAULT 'BOTH',
    "source" "GpsDataSource" NOT NULL DEFAULT 'MANUAL',
    "activityAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "durationMinutes" INTEGER,
    "sourceFileName" TEXT,
    "notes" TEXT,
    "profileSnapshot" JSONB,
    "importMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GpsSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GpsProfile_organizationId_sport_active_idx" ON "GpsProfile"("organizationId", "sport", "active");

-- CreateIndex
CREATE INDEX "GpsProfile_organizationId_categoryId_idx" ON "GpsProfile"("organizationId", "categoryId");

-- CreateIndex
CREATE INDEX "GpsSession_organizationId_activityAt_idx" ON "GpsSession"("organizationId", "activityAt");

-- CreateIndex
CREATE INDEX "GpsSession_organizationId_sport_activityAt_idx" ON "GpsSession"("organizationId", "sport", "activityAt");

-- CreateIndex
CREATE INDEX "GpsSession_categoryId_activityAt_idx" ON "GpsSession"("categoryId", "activityAt");

-- CreateIndex
CREATE INDEX "GpsSession_trainingSessionId_idx" ON "GpsSession"("trainingSessionId");

-- CreateIndex
CREATE INDEX "GpsSession_matchId_idx" ON "GpsSession"("matchId");

-- CreateIndex
CREATE INDEX "GpsSession_profileId_idx" ON "GpsSession"("profileId");

-- CreateIndex
CREATE INDEX "GpsSession_createdByUserId_idx" ON "GpsSession"("createdByUserId");

-- CreateIndex
CREATE INDEX "AthleteGpsRecord_gpsSessionId_idx" ON "AthleteGpsRecord"("gpsSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteGpsRecord_gpsSessionId_athleteId_key" ON "AthleteGpsRecord"("gpsSessionId", "athleteId");

-- AddForeignKey
ALTER TABLE "GpsProfile" ADD CONSTRAINT "GpsProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GpsProfile" ADD CONSTRAINT "GpsProfile_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GpsSession" ADD CONSTRAINT "GpsSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GpsSession" ADD CONSTRAINT "GpsSession_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GpsSession" ADD CONSTRAINT "GpsSession_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "TrainingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GpsSession" ADD CONSTRAINT "GpsSession_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GpsSession" ADD CONSTRAINT "GpsSession_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "GpsProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GpsSession" ADD CONSTRAINT "GpsSession_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteGpsRecord" ADD CONSTRAINT "AthleteGpsRecord_gpsSessionId_fkey" FOREIGN KEY ("gpsSessionId") REFERENCES "GpsSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
