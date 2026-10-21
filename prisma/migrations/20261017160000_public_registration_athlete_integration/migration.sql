-- 11UP: etapa preparatoria de integracao documental / historico preventivo.
-- APENAS ADITIVA. Nao associa nem copia documentos automaticamente.
ALTER TABLE "PublicRegistrationDocumentRequirement" ADD COLUMN "categoryRequirementId" TEXT;
CREATE INDEX "PublicRegistrationDocumentRequirement_categoryRequirementId_idx" ON "PublicRegistrationDocumentRequirement"("categoryRequirementId");
ALTER TABLE "PublicRegistrationDocumentRequirement" ADD CONSTRAINT "PublicRegistrationDocumentRequirement_categoryRequirementI_fkey" FOREIGN KEY ("categoryRequirementId") REFERENCES "CategoryDocumentRequirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AthleteDocument" ADD COLUMN "sourcePublicRegistrationDocumentId" TEXT;
CREATE UNIQUE INDEX "AthleteDocument_sourcePublicRegistrationDocumentId_key" ON "AthleteDocument"("sourcePublicRegistrationDocumentId");
ALTER TABLE "AthleteDocument" ADD CONSTRAINT "AthleteDocument_sourcePublicRegistrationDocumentId_fkey" FOREIGN KEY ("sourcePublicRegistrationDocumentId") REFERENCES "PublicRegistrationDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AthleteHealthDeclaration" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "athleteId" TEXT NOT NULL,
  "sourceSubmissionId" TEXT NOT NULL,
  "questionnaireEncrypted" TEXT NOT NULL,
  "declaredAt" TIMESTAMP(3) NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recordedByUserId" TEXT
);
CREATE UNIQUE INDEX "AthleteHealthDeclaration_sourceSubmissionId_key" ON "AthleteHealthDeclaration"("sourceSubmissionId");
CREATE INDEX "AthleteHealthDeclaration_organizationId_athleteId_recordedA_idx" ON "AthleteHealthDeclaration"("organizationId","athleteId","recordedAt");
ALTER TABLE "AthleteHealthDeclaration" ADD CONSTRAINT "AthleteHealthDeclaration_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AthleteHealthDeclaration" ADD CONSTRAINT "AthleteHealthDeclaration_sourceSubmissionId_fkey" FOREIGN KEY ("sourceSubmissionId") REFERENCES "PublicRegistrationSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
