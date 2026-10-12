-- CreateTable
CREATE TABLE "PlayerPartnershipActivationIntent" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "consumedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerPartnershipActivationIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerPartnershipActivationIntent_tokenHash_key"
ON "PlayerPartnershipActivationIntent"("tokenHash");

-- CreateIndex
CREATE INDEX "PlayerPartnershipActivationIntent_organizationId_expiresAt_idx"
ON "PlayerPartnershipActivationIntent"("organizationId", "expiresAt");

-- CreateIndex
CREATE INDEX "PlayerPartnershipActivationIntent_athleteId_expiresAt_idx"
ON "PlayerPartnershipActivationIntent"("athleteId", "expiresAt");

-- CreateIndex
CREATE INDEX "PlayerPartnershipActivationIntent_consumedAt_expiresAt_idx"
ON "PlayerPartnershipActivationIntent"("consumedAt", "expiresAt");

-- AddForeignKey
ALTER TABLE "PlayerPartnershipActivationIntent"
ADD CONSTRAINT "PlayerPartnershipActivationIntent_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "Organization"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerPartnershipActivationIntent"
ADD CONSTRAINT "PlayerPartnershipActivationIntent_athleteId_fkey"
FOREIGN KEY ("athleteId")
REFERENCES "Athlete"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;