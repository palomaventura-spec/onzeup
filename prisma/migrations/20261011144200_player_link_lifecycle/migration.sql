-- AlterTable
ALTER TABLE "PlayerAthleteLink"
ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "unlinkedAt" TIMESTAMP(3),
ADD COLUMN "unlinkedByUserId" TEXT,
ADD COLUMN "unlinkedByNameSnapshot" TEXT,
ADD COLUMN "unlinkReason" TEXT;

-- CreateIndex
CREATE INDEX "PlayerAthleteLink_athleteId_active_verified_idx"
ON "PlayerAthleteLink"("athleteId", "active", "verified");

-- CreateIndex
CREATE INDEX "PlayerAthleteLink_playerId_active_verified_idx"
ON "PlayerAthleteLink"("playerId", "active", "verified");