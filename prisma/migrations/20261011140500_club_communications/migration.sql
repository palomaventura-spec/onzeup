-- CreateEnum
CREATE TYPE "ClubCommunicationAudienceType" AS ENUM ('ATHLETE', 'CATEGORY', 'MODALITY', 'ALL');

-- CreateTable
CREATE TABLE "ClubCommunication" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audienceType" "ClubCommunicationAudienceType" NOT NULL,
    "sport" "SportType",
    "categoryId" TEXT,
    "targetAthleteId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubCommunication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubCommunicationRecipient" (
    "id" TEXT NOT NULL,
    "communicationId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubCommunicationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClubCommunication_organizationId_sentAt_idx" ON "ClubCommunication"("organizationId", "sentAt");

-- CreateIndex
CREATE INDEX "ClubCommunication_organizationId_audienceType_sentAt_idx" ON "ClubCommunication"("organizationId", "audienceType", "sentAt");

-- CreateIndex
CREATE INDEX "ClubCommunication_categoryId_sentAt_idx" ON "ClubCommunication"("categoryId", "sentAt");

-- CreateIndex
CREATE INDEX "ClubCommunication_targetAthleteId_sentAt_idx" ON "ClubCommunication"("targetAthleteId", "sentAt");

-- CreateIndex
CREATE INDEX "ClubCommunicationRecipient_communicationId_readAt_idx" ON "ClubCommunicationRecipient"("communicationId", "readAt");

-- CreateIndex
CREATE INDEX "ClubCommunicationRecipient_playerId_readAt_createdAt_idx" ON "ClubCommunicationRecipient"("playerId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "ClubCommunicationRecipient_athleteId_createdAt_idx" ON "ClubCommunicationRecipient"("athleteId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClubCommunicationRecipient_communicationId_athleteId_player_key" ON "ClubCommunicationRecipient"("communicationId", "athleteId", "playerId");

-- AddForeignKey
ALTER TABLE "ClubCommunication" ADD CONSTRAINT "ClubCommunication_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubCommunication" ADD CONSTRAINT "ClubCommunication_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubCommunication" ADD CONSTRAINT "ClubCommunication_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubCommunication" ADD CONSTRAINT "ClubCommunication_targetAthleteId_fkey" FOREIGN KEY ("targetAthleteId") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubCommunicationRecipient" ADD CONSTRAINT "ClubCommunicationRecipient_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "ClubCommunication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubCommunicationRecipient" ADD CONSTRAINT "ClubCommunicationRecipient_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubCommunicationRecipient" ADD CONSTRAINT "ClubCommunicationRecipient_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
