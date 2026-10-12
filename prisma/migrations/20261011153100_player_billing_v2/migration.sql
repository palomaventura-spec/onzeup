-- AlterEnum
ALTER TYPE "PaymentProduct" ADD VALUE 'PLAYER_SIMPLE_MONTHLY';

-- AlterTable
ALTER TABLE "PlayerProfile" ADD COLUMN     "asaasSubscriptionId" TEXT,
ADD COLUMN     "currentPeriodEndsAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionStartedAt" TIMESTAMP(3),
ADD COLUMN     "trialEndsAt" TIMESTAMP(3),
ADD COLUMN     "trialStartedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PlayerBillingProfile" (
    "id" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "billingName" TEXT,
    "billingEmail" TEXT,
    "billingPhone" TEXT,
    "taxId" TEXT,
    "postalCode" TEXT,
    "address" TEXT,
    "addressNumber" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "asaasCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerBillingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerBillingProfile_guardianId_key" ON "PlayerBillingProfile"("guardianId");

-- CreateIndex
CREATE INDEX "PlayerBillingProfile_asaasCustomerId_idx" ON "PlayerBillingProfile"("asaasCustomerId");

-- AddForeignKey
ALTER TABLE "PlayerBillingProfile" ADD CONSTRAINT "PlayerBillingProfile_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "GuardianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

