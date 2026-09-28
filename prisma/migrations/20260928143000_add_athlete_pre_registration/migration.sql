-- CreateEnum
CREATE TYPE "AthletePreRegistrationStatus" AS ENUM ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "AthletePreRegistrationRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT,
    "createdByUserId" TEXT,
    "reviewedByUserId" TEXT,
    "createdAthleteId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "status" "AthletePreRegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "recipientName" TEXT,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "payloadEncrypted" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthletePreRegistrationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AthletePreRegistrationRequest_tokenHash_key" ON "AthletePreRegistrationRequest"("tokenHash");

-- CreateIndex
CREATE INDEX "AthletePreRegistrationRequest_organizationId_status_created_idx" ON "AthletePreRegistrationRequest"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AthletePreRegistrationRequest_categoryId_status_idx" ON "AthletePreRegistrationRequest"("categoryId", "status");

-- CreateIndex
CREATE INDEX "AthletePreRegistrationRequest_expiresAt_idx" ON "AthletePreRegistrationRequest"("expiresAt");

-- CreateIndex
CREATE INDEX "AthletePreRegistrationRequest_createdAthleteId_idx" ON "AthletePreRegistrationRequest"("createdAthleteId");

-- AddForeignKey
ALTER TABLE "AthletePreRegistrationRequest" ADD CONSTRAINT "AthletePreRegistrationRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthletePreRegistrationRequest" ADD CONSTRAINT "AthletePreRegistrationRequest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
