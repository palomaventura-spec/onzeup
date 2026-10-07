-- CreateEnum
CREATE TYPE "AthleteEvaluationProcessStatus" AS ENUM (
  'IN_EVALUATION',
  'APPROVED',
  'REJECTED',
  'RELEASED',
  'WITHDRAWN'
);

-- CreateEnum
CREATE TYPE "AthleteEvaluationProcessEntryMode" AS ENUM (
  'CURRENT',
  'RETROACTIVE'
);

-- CreateTable
CREATE TABLE "AthleteEvaluationProcess" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "athleteId" TEXT NOT NULL,
  "evaluationCategoryId" TEXT,
  "targetCategoryId" TEXT,
  "createdByUserId" TEXT,
  "decidedByUserId" TEXT,
  "sport" "SportType" NOT NULL,
  "status" "AthleteEvaluationProcessStatus" NOT NULL DEFAULT 'IN_EVALUATION',
  "entryMode" "AthleteEvaluationProcessEntryMode" NOT NULL DEFAULT 'CURRENT',
  "startedAt" TIMESTAMP(3) NOT NULL,
  "decidedAt" TIMESTAMP(3),
  "decisionReason" TEXT,
  "notes" TEXT,
  "evaluationCategoryNameSnapshot" TEXT,
  "targetCategoryNameSnapshot" TEXT,
  "seasonSnapshot" TEXT,
  "createdByNameSnapshot" TEXT,
  "decidedByNameSnapshot" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AthleteEvaluationProcess_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "TrainingAttendance"
ADD COLUMN "evaluationProcessId" TEXT;

-- AlterTable
ALTER TABLE "AthleteEvaluation"
ADD COLUMN "evaluationProcessId" TEXT;

-- CreateIndex
CREATE INDEX "AthleteEvaluationProcess_organizationId_status_decidedAt_idx"
ON "AthleteEvaluationProcess"("organizationId", "status", "decidedAt");

-- CreateIndex
CREATE INDEX "AEP_org_target_status_decided_idx"
ON "AthleteEvaluationProcess"("organizationId", "targetCategoryId", "status", "decidedAt");

-- CreateIndex
CREATE INDEX "AEP_org_eval_status_idx"
ON "AthleteEvaluationProcess"("organizationId", "evaluationCategoryId", "status");

-- CreateIndex
CREATE INDEX "AthleteEvaluationProcess_athleteId_startedAt_idx"
ON "AthleteEvaluationProcess"("athleteId", "startedAt");

-- CreateIndex
CREATE INDEX "AthleteEvaluationProcess_createdByUserId_idx"
ON "AthleteEvaluationProcess"("createdByUserId");

-- CreateIndex
CREATE INDEX "AthleteEvaluationProcess_decidedByUserId_idx"
ON "AthleteEvaluationProcess"("decidedByUserId");

-- CreateIndex
CREATE INDEX "TrainingAttendance_evaluationProcessId_idx"
ON "TrainingAttendance"("evaluationProcessId");

-- CreateIndex
CREATE INDEX "AthleteEvaluation_evaluationProcessId_idx"
ON "AthleteEvaluation"("evaluationProcessId");

-- AddForeignKey
ALTER TABLE "AthleteEvaluationProcess"
ADD CONSTRAINT "AthleteEvaluationProcess_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteEvaluationProcess"
ADD CONSTRAINT "AthleteEvaluationProcess_athleteId_fkey"
FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteEvaluationProcess"
ADD CONSTRAINT "AthleteEvaluationProcess_evaluationCategoryId_fkey"
FOREIGN KEY ("evaluationCategoryId") REFERENCES "Category"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteEvaluationProcess"
ADD CONSTRAINT "AthleteEvaluationProcess_targetCategoryId_fkey"
FOREIGN KEY ("targetCategoryId") REFERENCES "Category"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteEvaluationProcess"
ADD CONSTRAINT "AthleteEvaluationProcess_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteEvaluationProcess"
ADD CONSTRAINT "AthleteEvaluationProcess_decidedByUserId_fkey"
FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAttendance"
ADD CONSTRAINT "TrainingAttendance_evaluationProcessId_fkey"
FOREIGN KEY ("evaluationProcessId") REFERENCES "AthleteEvaluationProcess"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteEvaluation"
ADD CONSTRAINT "AthleteEvaluation_evaluationProcessId_fkey"
FOREIGN KEY ("evaluationProcessId") REFERENCES "AthleteEvaluationProcess"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
