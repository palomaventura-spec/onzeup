-- CreateEnum
CREATE TYPE "CallUpRuleSource" AS ENUM ('CLUB_MANUAL', 'ORGANIZER_COMPETITION');

-- CreateEnum
CREATE TYPE "FormationSlotType" AS ENUM ('GOALKEEPER', 'OUTFIELD');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "callUpConfigSnapshot" JSONB,
ADD COLUMN     "callUpRuleId" TEXT,
ADD COLUMN     "formationSnapshot" JSONB,
ADD COLUMN     "formationTemplateId" TEXT,
ADD COLUMN     "reserveCount" INTEGER,
ADD COLUMN     "starterGoalkeeperCount" INTEGER,
ADD COLUMN     "starterOutfieldCount" INTEGER;

-- CreateTable
CREATE TABLE "FormationTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sport" "SportType" NOT NULL DEFAULT 'FOOTBALL',
    "outfieldPlayerCount" INTEGER NOT NULL,
    "goalkeeperCount" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isSystemPreset" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormationSlot" (
    "id" TEXT NOT NULL,
    "formationTemplateId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "slotType" "FormationSlotType" NOT NULL DEFAULT 'OUTFIELD',
    "tacticalLine" INTEGER,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormationSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionCallUpRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT,
    "competitionId" TEXT,
    "competitionCategoryId" TEXT,
    "competitionName" TEXT,
    "source" "CallUpRuleSource" NOT NULL DEFAULT 'CLUB_MANUAL',
    "sport" "SportType" NOT NULL DEFAULT 'FOOTBALL',
    "outfieldStarterCount" INTEGER NOT NULL,
    "goalkeeperStarterCount" INTEGER NOT NULL DEFAULT 1,
    "reserveCount" INTEGER NOT NULL DEFAULT 0,
    "defaultFormationId" TEXT,
    "organizerLocked" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionCallUpRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FormationTemplate_organizationId_sport_active_idx" ON "FormationTemplate"("organizationId", "sport", "active");

-- CreateIndex
CREATE INDEX "FormationTemplate_outfieldPlayerCount_goalkeeperCount_idx" ON "FormationTemplate"("outfieldPlayerCount", "goalkeeperCount");

-- CreateIndex
CREATE INDEX "FormationSlot_formationTemplateId_sortOrder_idx" ON "FormationSlot"("formationTemplateId", "sortOrder");

-- CreateIndex
CREATE INDEX "FormationSlot_slotType_idx" ON "FormationSlot"("slotType");

-- CreateIndex
CREATE UNIQUE INDEX "FormationSlot_formationTemplateId_code_key" ON "FormationSlot"("formationTemplateId", "code");

-- CreateIndex
CREATE INDEX "CompetitionCallUpRule_organizationId_active_idx" ON "CompetitionCallUpRule"("organizationId", "active");

-- CreateIndex
CREATE INDEX "CompetitionCallUpRule_categoryId_sport_active_idx" ON "CompetitionCallUpRule"("categoryId", "sport", "active");

-- CreateIndex
CREATE INDEX "CompetitionCallUpRule_competitionId_active_idx" ON "CompetitionCallUpRule"("competitionId", "active");

-- CreateIndex
CREATE INDEX "CompetitionCallUpRule_competitionCategoryId_active_idx" ON "CompetitionCallUpRule"("competitionCategoryId", "active");

-- CreateIndex
CREATE INDEX "CompetitionCallUpRule_defaultFormationId_idx" ON "CompetitionCallUpRule"("defaultFormationId");

-- CreateIndex
CREATE INDEX "Match_callUpRuleId_idx" ON "Match"("callUpRuleId");

-- CreateIndex
CREATE INDEX "Match_formationTemplateId_idx" ON "Match"("formationTemplateId");

-- AddForeignKey
ALTER TABLE "FormationTemplate" ADD CONSTRAINT "FormationTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormationSlot" ADD CONSTRAINT "FormationSlot_formationTemplateId_fkey" FOREIGN KEY ("formationTemplateId") REFERENCES "FormationTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionCallUpRule" ADD CONSTRAINT "CompetitionCallUpRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionCallUpRule" ADD CONSTRAINT "CompetitionCallUpRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionCallUpRule" ADD CONSTRAINT "CompetitionCallUpRule_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionCallUpRule" ADD CONSTRAINT "CompetitionCallUpRule_competitionCategoryId_fkey" FOREIGN KEY ("competitionCategoryId") REFERENCES "CompetitionCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionCallUpRule" ADD CONSTRAINT "CompetitionCallUpRule_defaultFormationId_fkey" FOREIGN KEY ("defaultFormationId") REFERENCES "FormationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_callUpRuleId_fkey" FOREIGN KEY ("callUpRuleId") REFERENCES "CompetitionCallUpRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_formationTemplateId_fkey" FOREIGN KEY ("formationTemplateId") REFERENCES "FormationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
