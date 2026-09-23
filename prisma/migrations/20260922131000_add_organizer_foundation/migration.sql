-- CreateEnum
CREATE TYPE "CompetitionStatus" AS ENUM ('DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS', 'FINISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CompetitionFormat" AS ENUM ('GROUP_STAGE_KNOCKOUT', 'ROUND_ROBIN', 'KNOCKOUT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CompetitionTeamStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- AlterEnum
ALTER TYPE "OrganizationType" ADD VALUE 'ORGANIZER';

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "season" TEXT,
    "sport" "SportType" NOT NULL DEFAULT 'FOOTBALL',
    "status" "CompetitionStatus" NOT NULL DEFAULT 'DRAFT',
    "format" "CompetitionFormat" NOT NULL DEFAULT 'CUSTOM',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "registrationStart" TIMESTAMP(3),
    "registrationEnd" TIMESTAMP(3),
    "maxTeams" INTEGER,
    "logoUrl" TEXT,
    "coverUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionCategory" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "birthYearFrom" INTEGER,
    "birthYearTo" INTEGER,
    "maxTeams" INTEGER,
    "rosterLimit" INTEGER,
    "matchDurationMinutes" INTEGER NOT NULL DEFAULT 20,
    "transitionMinutes" INTEGER NOT NULL DEFAULT 5,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionTeam" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "linkedOrganizationId" TEXT,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "logoUrl" TEXT,
    "city" TEXT,
    "state" TEXT,
    "responsibleName" TEXT,
    "responsibleEmail" TEXT,
    "responsiblePhone" TEXT,
    "status" "CompetitionTeamStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionVenue" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "fieldCount" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionVenue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Competition_organizationId_status_idx" ON "Competition"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Competition_sport_status_idx" ON "Competition"("sport", "status");

-- CreateIndex
CREATE INDEX "Competition_startDate_idx" ON "Competition"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "Competition_organizationId_slug_key" ON "Competition"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "CompetitionCategory_competitionId_active_idx" ON "CompetitionCategory"("competitionId", "active");

-- CreateIndex
CREATE INDEX "CompetitionCategory_competitionId_sortOrder_idx" ON "CompetitionCategory"("competitionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionCategory_competitionId_name_key" ON "CompetitionCategory"("competitionId", "name");

-- CreateIndex
CREATE INDEX "CompetitionTeam_competitionId_status_idx" ON "CompetitionTeam"("competitionId", "status");

-- CreateIndex
CREATE INDEX "CompetitionTeam_categoryId_status_idx" ON "CompetitionTeam"("categoryId", "status");

-- CreateIndex
CREATE INDEX "CompetitionTeam_linkedOrganizationId_idx" ON "CompetitionTeam"("linkedOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionTeam_competitionId_categoryId_name_key" ON "CompetitionTeam"("competitionId", "categoryId", "name");

-- CreateIndex
CREATE INDEX "CompetitionVenue_competitionId_active_idx" ON "CompetitionVenue"("competitionId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionVenue_competitionId_name_key" ON "CompetitionVenue"("competitionId", "name");

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionCategory" ADD CONSTRAINT "CompetitionCategory_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionTeam" ADD CONSTRAINT "CompetitionTeam_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionTeam" ADD CONSTRAINT "CompetitionTeam_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CompetitionCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionTeam" ADD CONSTRAINT "CompetitionTeam_linkedOrganizationId_fkey" FOREIGN KEY ("linkedOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionVenue" ADD CONSTRAINT "CompetitionVenue_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
