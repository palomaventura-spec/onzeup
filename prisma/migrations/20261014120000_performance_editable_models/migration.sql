-- Modelos por clube, versões imutáveis e classificação por modelo.
ALTER TABLE "PerformanceTemplate" ADD COLUMN "modelFamilyKey" TEXT;
ALTER TABLE "PerformanceTemplate" ADD COLUMN "classificationJson" TEXT;
CREATE UNIQUE INDEX "PerformanceTemplate_organizationId_modelFamilyKey_version_key"
  ON "PerformanceTemplate"("organizationId", "modelFamilyKey", "version");
