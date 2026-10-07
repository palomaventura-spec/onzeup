-- 11UP: vínculo esportivo por modalidade + escopo de elegibilidade
-- Migração aditiva e compatível com os dados atuais.

CREATE TYPE "AthleteEligibilityScope" AS ENUM ('GLOBAL', 'FOOTBALL', 'FUTSAL');

ALTER TABLE "AthleteExitRecord"
ADD COLUMN "sport" "SportType";

ALTER TABLE "AthleteEligibilityIssue"
ADD COLUMN "scope" "AthleteEligibilityScope" NOT NULL DEFAULT 'GLOBAL';

-- Pendências federativas automáticas já existentes passam a ter escopo correto.
UPDATE "AthleteEligibilityIssue"
SET "scope" = 'FOOTBALL'
WHERE "key" = 'AUTO:FEDERATION:FOOTBALL';

UPDATE "AthleteEligibilityIssue"
SET "scope" = 'FUTSAL'
WHERE "key" = 'AUTO:FEDERATION:FUTSAL';

-- Cria vínculo esportivo para atletas que hoje dependem apenas de Athlete.categoryId.
-- Não duplica vínculo equivalente já existente.
INSERT INTO "AthleteMembership" (
  "id",
  "athleteId",
  "organizationId",
  "categoryId",
  "sport",
  "season",
  "status",
  "verified",
  "startedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  'asm_' || md5(random()::text || clock_timestamp()::text || a."id" || c."id"),
  a."id",
  a."organizationId",
  a."categoryId",
  c."sport",
  EXTRACT(YEAR FROM COALESCE(a."createdAt", NOW()))::text,
  CASE
    WHEN a."currentStatus" = 'RELEASED' THEN 'RELEASED'
    ELSE 'ACTIVE'
  END,
  FALSE,
  a."createdAt",
  NOW(),
  NOW()
FROM "Athlete" a
JOIN "Category" c ON c."id" = a."categoryId"
WHERE a."categoryId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "AthleteMembership" m
    WHERE m."athleteId" = a."id"
      AND m."organizationId" = a."organizationId"
      AND m."categoryId" = a."categoryId"
      AND m."sport" = c."sport"
      AND m."status" = CASE
        WHEN a."currentStatus" = 'RELEASED' THEN 'RELEASED'
        ELSE 'ACTIVE'
      END
  );

CREATE INDEX "AthleteExitRecord_athleteId_sport_occurredAt_idx"
ON "AthleteExitRecord"("athleteId", "sport", "occurredAt");

CREATE INDEX "AthleteEligibilityIssue_athleteId_scope_blocking_resolvedAt_idx"
ON "AthleteEligibilityIssue"("athleteId", "scope", "blocking", "resolvedAt");
