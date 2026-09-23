-- CreateEnum
CREATE TYPE "CompetitionAthleteSource" AS ENUM ('MANUAL', 'CLUB_SHARED');

-- AlterTable
ALTER TABLE "CompetitionAthlete" ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "source" "CompetitionAthleteSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "sourceAthleteId" TEXT,
ADD COLUMN     "sourceSnapshotAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "CompetitionAthlete_sourceAthleteId_idx" ON "CompetitionAthlete"("sourceAthleteId");

-- AddForeignKey
ALTER TABLE "CompetitionAthlete" ADD CONSTRAINT "CompetitionAthlete_sourceAthleteId_fkey" FOREIGN KEY ("sourceAthleteId") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;
