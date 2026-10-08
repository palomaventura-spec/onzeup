-- AlterTable
ALTER TABLE "AthleteEligibilityIssue"
ADD COLUMN "authorizedAt" TIMESTAMP(3),
ADD COLUMN "authorizedByUserId" TEXT,
ADD COLUMN "authorizationReason" TEXT,
ADD COLUMN "authorizedByNameSnapshot" TEXT,
ADD COLUMN "authorizationRevokedAt" TIMESTAMP(3),
ADD COLUMN "authorizationRevokedByUserId" TEXT,
ADD COLUMN "authorizationRevocationReason" TEXT,
ADD COLUMN "authorizationRevokedByNameSnapshot" TEXT;

-- CreateIndex
CREATE INDEX "AthleteEligibilityIssue_authorizedByUserId_idx"
ON "AthleteEligibilityIssue"("authorizedByUserId");

-- CreateIndex
CREATE INDEX "AthleteEligibilityIssue_authorizationRevokedByUserId_idx"
ON "AthleteEligibilityIssue"("authorizationRevokedByUserId");

-- CreateIndex
CREATE INDEX "AthleteEligibilityIssue_athleteId_authorizedAt_authorizationRevokedAt_idx"
ON "AthleteEligibilityIssue"("athleteId", "authorizedAt", "authorizationRevokedAt");

-- AddForeignKey
ALTER TABLE "AthleteEligibilityIssue"
ADD CONSTRAINT "AthleteEligibilityIssue_authorizedByUserId_fkey"
FOREIGN KEY ("authorizedByUserId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteEligibilityIssue"
ADD CONSTRAINT "AthleteEligibilityIssue_authorizationRevokedByUserId_fkey"
FOREIGN KEY ("authorizationRevokedByUserId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;