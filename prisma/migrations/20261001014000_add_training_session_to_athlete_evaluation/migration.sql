ALTER TABLE "AthleteEvaluation"
ADD COLUMN "trainingSessionId" TEXT;

CREATE INDEX "AthleteEvaluation_trainingSessionId_idx"
ON "AthleteEvaluation"("trainingSessionId");

ALTER TABLE "AthleteEvaluation"
ADD CONSTRAINT "AthleteEvaluation_trainingSessionId_fkey"
FOREIGN KEY ("trainingSessionId")
REFERENCES "TrainingSession"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
