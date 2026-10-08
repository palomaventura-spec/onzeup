-- 11UP - requisitos documentais por categoria
-- Migration aditiva: preserva integralmente documentos existentes.

CREATE TYPE "AthleteDocumentRequirementSubject" AS ENUM ('ATHLETE', 'GUARDIAN');

CREATE TABLE "CategoryDocumentRequirement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "documentCategory" "AthleteDocumentCategory" NOT NULL,
    "subject" "AthleteDocumentRequirementSubject" NOT NULL DEFAULT 'ATHLETE',
    "minCount" INTEGER NOT NULL DEFAULT 1,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "requiresExpiry" BOOLEAN NOT NULL DEFAULT false,
    "instructions" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryDocumentRequirement_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AthleteDocument"
ADD COLUMN "requirementId" TEXT,
ADD COLUMN "requirementKeySnapshot" TEXT,
ADD COLUMN "requirementLabelSnapshot" TEXT;

CREATE UNIQUE INDEX "CategoryDocumentRequirement_categoryId_key_key"
ON "CategoryDocumentRequirement"("categoryId", "key");

CREATE INDEX "CategoryDocumentRequirement_organizationId_active_idx"
ON "CategoryDocumentRequirement"("organizationId", "active");

CREATE INDEX "CategoryDocumentRequirement_categoryId_active_sortOrder_idx"
ON "CategoryDocumentRequirement"("categoryId", "active", "sortOrder");

CREATE INDEX "AthleteDocument_requirementId_idx"
ON "AthleteDocument"("requirementId");

CREATE INDEX "AthleteDocument_athleteId_requirementId_status_idx"
ON "AthleteDocument"("athleteId", "requirementId", "status");

ALTER TABLE "CategoryDocumentRequirement"
ADD CONSTRAINT "CategoryDocumentRequirement_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CategoryDocumentRequirement"
ADD CONSTRAINT "CategoryDocumentRequirement_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AthleteDocument"
ADD CONSTRAINT "AthleteDocument_requirementId_fkey"
FOREIGN KEY ("requirementId") REFERENCES "CategoryDocumentRequirement"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
