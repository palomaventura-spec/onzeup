-- 11UP CLUB 1.3A+1.3B - REVISAO: NAO EXECUTAR CONTRA PRODUCAO.
-- Esta migration substitui a migration DRAFT NAO APLICADA da Etapa 1.
CREATE TYPE "PublicRegistrationLinkStatus" AS ENUM ('DRAFT','ACTIVE','PAUSED','REVOKED');
CREATE TYPE "PublicRegistrationSubmissionStatus" AS ENUM ('PENDING_DOCUMENTS','SUBMITTED','CHANGES_REQUESTED','APPROVED','REJECTED');
CREATE TYPE "PublicRegistrationDocumentStatus" AS ENUM ('PENDING','APPROVED','REJECTED');
CREATE TYPE "PublicRegistrationDocumentOwner" AS ENUM ('ATHLETE','FATHER','MOTHER','GUARDIAN');
CREATE TYPE "ClubBirthdayAudience" AS ENUM ('ATHLETES','GUARDIANS','STAFF');
CREATE TABLE "PublicRegistrationLink" (
 "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "categoryId" TEXT NOT NULL,
 "createdByUserId" TEXT NOT NULL, "name" TEXT NOT NULL, "tokenHash" TEXT NOT NULL,
 "status" "PublicRegistrationLinkStatus" NOT NULL DEFAULT 'DRAFT',
 "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "PublicRegistrationLink_tokenHash_key" ON "PublicRegistrationLink"("tokenHash");
CREATE INDEX "PublicRegistrationLink_organizationId_status_createdAt_idx" ON "PublicRegistrationLink"("organizationId","status","createdAt");
CREATE INDEX "PublicRegistrationLink_categoryId_status_idx" ON "PublicRegistrationLink"("categoryId","status");
CREATE INDEX "PublicRegistrationLink_expiresAt_idx" ON "PublicRegistrationLink"("expiresAt");
ALTER TABLE "PublicRegistrationLink" ADD CONSTRAINT "PublicRegistrationLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublicRegistrationLink" ADD CONSTRAINT "PublicRegistrationLink_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublicRegistrationLink" ADD CONSTRAINT "PublicRegistrationLink_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "PublicRegistrationDocumentRequirement" (
 "id" TEXT PRIMARY KEY, "linkId" TEXT NOT NULL, "label" TEXT NOT NULL,
 "owner" "PublicRegistrationDocumentOwner" NOT NULL DEFAULT 'ATHLETE',
 "required" BOOLEAN NOT NULL DEFAULT true, "expires" BOOLEAN NOT NULL DEFAULT false,
 "sortOrder" INTEGER NOT NULL DEFAULT 0, "active" BOOLEAN NOT NULL DEFAULT true,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "PublicRegistrationDocumentRequirement_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "PublicRegistrationLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "PublicRegistrationDocumentRequirement_linkId_active_sortOrder_idx" ON "PublicRegistrationDocumentRequirement"("linkId","active","sortOrder");
CREATE TABLE "PublicRegistrationSubmission" (
 "id" TEXT PRIMARY KEY, "linkId" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "categoryId" TEXT NOT NULL,
 "status" "PublicRegistrationSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED', "payloadEncrypted" TEXT NOT NULL,
 "reviewedByUserId" TEXT, "reviewNotesEncrypted" TEXT, "linkedAthleteId" TEXT,
 "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "reviewedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "PublicRegistrationSubmission_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "PublicRegistrationLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "PublicRegistrationSubmission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "PublicRegistrationSubmission_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "PublicRegistrationSubmission_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 CONSTRAINT "PublicRegistrationSubmission_linkedAthleteId_fkey" FOREIGN KEY ("linkedAthleteId") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "PublicRegistrationSubmission_organizationId_status_submittedAt_idx" ON "PublicRegistrationSubmission"("organizationId","status","submittedAt");
CREATE INDEX "PublicRegistrationSubmission_linkId_submittedAt_idx" ON "PublicRegistrationSubmission"("linkId","submittedAt");
CREATE INDEX "PublicRegistrationSubmission_linkedAthleteId_idx" ON "PublicRegistrationSubmission"("linkedAthleteId");
CREATE TABLE "PublicRegistrationDocument" (
 "id" TEXT PRIMARY KEY, "submissionId" TEXT NOT NULL, "requirementId" TEXT,
 "labelSnapshot" TEXT NOT NULL, "ownerSnapshot" "PublicRegistrationDocumentOwner" NOT NULL,
 "storageKey" TEXT NOT NULL, "originalFileName" TEXT NOT NULL, "mimeType" TEXT NOT NULL,
 "sizeBytes" INTEGER NOT NULL, "expiresAt" TIMESTAMP(3),
 "status" "PublicRegistrationDocumentStatus" NOT NULL DEFAULT 'PENDING', "reviewedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "PublicRegistrationDocument_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "PublicRegistrationSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "PublicRegistrationDocument_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "PublicRegistrationDocumentRequirement"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PublicRegistrationDocument_storageKey_key" ON "PublicRegistrationDocument"("storageKey");
CREATE INDEX "PublicRegistrationDocument_submissionId_status_idx" ON "PublicRegistrationDocument"("submissionId","status");
ALTER TABLE "AthleteGuardian" ADD COLUMN "birthDate" TIMESTAMP(3);
ALTER TABLE "StaffMember" ADD COLUMN "birthDate" TIMESTAMP(3);
CREATE TABLE "ClubBirthdayReminderSetting" (
 "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "audience" "ClubBirthdayAudience" NOT NULL,
 "leadDays" INTEGER, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ClubBirthdayReminderSetting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "ClubBirthdayReminderSetting_leadDays_check" CHECK ("leadDays" IS NULL OR "leadDays" IN (0,7,30))
);
CREATE UNIQUE INDEX "ClubBirthdayReminderSetting_organizationId_audience_key" ON "ClubBirthdayReminderSetting"("organizationId","audience");

-- 3C.2: credencial temporaria por inscricao e foto privada.
ALTER TABLE "PublicRegistrationSubmission" ADD COLUMN "uploadTokenHash" TEXT;
ALTER TABLE "PublicRegistrationSubmission" ADD COLUMN "uploadTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "PublicRegistrationSubmission" ADD COLUMN "photoStorageKey" TEXT;
CREATE UNIQUE INDEX "PublicRegistrationSubmission_uploadTokenHash_key" ON "PublicRegistrationSubmission"("uploadTokenHash" );

-- 3E.8 Historico de revisoes administrativas (nova tabela, sem alterar registros existentes).
CREATE TABLE "PublicRegistrationReviewLog" (
  "id" TEXT PRIMARY KEY,
  "submissionId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "previousStatus" "PublicRegistrationSubmissionStatus" NOT NULL,
  "newStatus" "PublicRegistrationSubmissionStatus" NOT NULL,
  "reasonEncrypted" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublicRegistrationReviewLog_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "PublicRegistrationSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "PublicRegistrationReviewLog_submissionId_createdAt_idx" ON "PublicRegistrationReviewLog"("submissionId","createdAt");
CREATE INDEX "PublicRegistrationReviewLog_organizationId_createdAt_idx" ON "PublicRegistrationReviewLog"("organizationId","createdAt");

-- Links coletivos: limite opcional de inscrições.
ALTER TABLE "PublicRegistrationLink" ADD COLUMN "maxSubmissions" INTEGER;
ALTER TABLE "PublicRegistrationLink" ADD CONSTRAINT "PublicRegistrationLink_maxSubmissions_check" CHECK ("maxSubmissions" IS NULL OR "maxSubmissions" BETWEEN 1 AND 10000);
