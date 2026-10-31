CREATE TYPE "PlayerHistoryPeriodType" AS ENUM ('SEASON', 'SEMESTER', 'CUSTOM_PERIOD');

CREATE TABLE "PlayerHistoryPeriod" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "periodType" "PlayerHistoryPeriodType" NOT NULL,
  "season" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "sport" "SportType" NOT NULL DEFAULT 'FOOTBALL',
  "startedAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3) NOT NULL,
  "clubName" TEXT,
  "competition" TEXT,
  "matches" INTEGER NOT NULL DEFAULT 0,
  "goals" INTEGER NOT NULL DEFAULT 0,
  "assists" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlayerHistoryPeriod_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PlayerHistoryPeriod" ADD CONSTRAINT "PlayerHistoryPeriod_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "PlayerHistoryPeriod_playerId_startedAt_endedAt_idx"
  ON "PlayerHistoryPeriod"("playerId", "startedAt", "endedAt");
CREATE INDEX "PlayerHistoryPeriod_playerId_season_idx"
  ON "PlayerHistoryPeriod"("playerId", "season");
