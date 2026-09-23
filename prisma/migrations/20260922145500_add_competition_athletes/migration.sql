-- CreateEnum
CREATE TYPE "CompetitionAthleteStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "CompetitionAthlete" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "jerseyNumber" INTEGER,
    "position" TEXT,
    "status" "CompetitionAthleteStatus" NOT NULL DEFAULT 'APPROVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionAthlete_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompetitionAthlete_teamId_status_idx" ON "CompetitionAthlete"("teamId", "status");

-- CreateIndex
CREATE INDEX "CompetitionAthlete_teamId_name_idx" ON "CompetitionAthlete"("teamId", "name");

-- CreateIndex
CREATE INDEX "CompetitionAthlete_birthDate_idx" ON "CompetitionAthlete"("birthDate");

-- AddForeignKey
ALTER TABLE "CompetitionAthlete" ADD CONSTRAINT "CompetitionAthlete_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "CompetitionTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
