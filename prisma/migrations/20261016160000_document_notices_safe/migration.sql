-- 11UP Entrega 1.2 - preferencias e historico (default MANUAL; sem disparos na migracao).
CREATE TABLE "DocumentNoticeSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'MANUAL',
    "intervalDays" INTEGER NOT NULL DEFAULT 7,
    "notifyMissing" BOOLEAN NOT NULL DEFAULT true,
    "notifyRejected" BOOLEAN NOT NULL DEFAULT true,
    "notifyExpired" BOOLEAN NOT NULL DEFAULT true,
    "notifyExpiring" BOOLEAN NOT NULL DEFAULT true,
    "activatedAt" TIMESTAMP(3),
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DocumentNoticeSettings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DocumentNoticeSettings_organizationId_key" ON "DocumentNoticeSettings"("organizationId");
ALTER TABLE "DocumentNoticeSettings" ADD CONSTRAINT "DocumentNoticeSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DocumentNoticeLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "communicationId" TEXT,
    "mode" TEXT NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "itemSignature" TEXT NOT NULL,
    "dedupKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentNoticeLog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DocumentNoticeLog_dedupKey_key" ON "DocumentNoticeLog"("dedupKey");
CREATE INDEX "DocumentNoticeLog_organizationId_createdAt_idx" ON "DocumentNoticeLog"("organizationId", "createdAt");
CREATE INDEX "DocumentNoticeLog_organizationId_athleteId_createdAt_idx" ON "DocumentNoticeLog"("organizationId", "athleteId", "createdAt");
CREATE INDEX "DocumentNoticeLog_organizationId_playerId_createdAt_idx" ON "DocumentNoticeLog"("organizationId", "playerId", "createdAt");
ALTER TABLE "DocumentNoticeLog" ADD CONSTRAINT "DocumentNoticeLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
