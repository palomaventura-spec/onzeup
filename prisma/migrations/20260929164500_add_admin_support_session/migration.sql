-- CreateTable
CREATE TABLE "AdminSupportSession" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'SUPPORT',
    "reason" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSupportSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminSupportSession_adminUserId_startedAt_idx"
ON "AdminSupportSession"("adminUserId", "startedAt");

-- CreateIndex
CREATE INDEX "AdminSupportSession_organizationId_startedAt_idx"
ON "AdminSupportSession"("organizationId", "startedAt");

-- CreateIndex
CREATE INDEX "AdminSupportSession_endedAt_idx"
ON "AdminSupportSession"("endedAt");

-- AddForeignKey
ALTER TABLE "AdminSupportSession"
ADD CONSTRAINT "AdminSupportSession_adminUserId_fkey"
FOREIGN KEY ("adminUserId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminSupportSession"
ADD CONSTRAINT "AdminSupportSession_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "Organization"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;