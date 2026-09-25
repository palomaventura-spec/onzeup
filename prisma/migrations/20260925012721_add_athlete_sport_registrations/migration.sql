-- CreateEnum
CREATE TYPE "AthleteRegistrationAuthority" AS ENUM ('FEDERATION', 'CBF');

-- CreateEnum
CREATE TYPE "AthleteRegistrationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');

-- CreateTable
CREATE TABLE "AthleteSportRegistration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "sport" "SportType" NOT NULL,
    "authorityType" "AthleteRegistrationAuthority" NOT NULL,
    "authorityName" TEXT,
    "registrationNumber" TEXT NOT NULL,
    "status" "AthleteRegistrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteSportRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AthleteSportRegistration_organizationId_sport_authorityType_idx" ON "AthleteSportRegistration"("organizationId", "sport", "authorityType");

-- CreateIndex
CREATE INDEX "AthleteSportRegistration_registrationNumber_idx" ON "AthleteSportRegistration"("registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteSportRegistration_athleteId_sport_authorityType_key" ON "AthleteSportRegistration"("athleteId", "sport", "authorityType");

-- AddForeignKey
ALTER TABLE "AthleteSportRegistration" ADD CONSTRAINT "AthleteSportRegistration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteSportRegistration" ADD CONSTRAINT "AthleteSportRegistration_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
