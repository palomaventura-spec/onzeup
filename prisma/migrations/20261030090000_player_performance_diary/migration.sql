-- CreateEnum
CREATE TYPE "PlayerDiaryEntryType" AS ENUM ('MATCH', 'TOURNAMENT', 'ACHIEVEMENT');

-- AlterTable
ALTER TABLE "PlayerProfile" ADD COLUMN "showDiaryStatsPublic" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PlayerDiaryEntry" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "entryType" "PlayerDiaryEntryType" NOT NULL DEFAULT 'MATCH',
    "sport" "SportType" NOT NULL DEFAULT 'FOOTBALL',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "teamName" TEXT,
    "opponent" TEXT,
    "competition" TEXT,
    "categoryLabel" TEXT,
    "location" TEXT,
    "scoreFor" INTEGER,
    "scoreAgainst" INTEGER,
    "minutesPlayed" INTEGER,
    "position" TEXT,
    "jerseyNumber" INTEGER,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "yellowCards" INTEGER NOT NULL DEFAULT 0,
    "redCards" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerDiaryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlayerDiaryEntry_playerId_occurredAt_idx" ON "PlayerDiaryEntry"("playerId", "occurredAt");

-- CreateIndex
CREATE INDEX "PlayerDiaryEntry_playerId_entryType_occurredAt_idx" ON "PlayerDiaryEntry"("playerId", "entryType", "occurredAt");

-- AddForeignKey
ALTER TABLE "PlayerDiaryEntry" ADD CONSTRAINT "PlayerDiaryEntry_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

