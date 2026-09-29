ALTER TABLE "Athlete"
ADD COLUMN "evaluationTargetCategoryId" TEXT;

CREATE INDEX "Athlete_evaluationTargetCategoryId_idx"
ON "Athlete"("evaluationTargetCategoryId");

ALTER TABLE "Athlete"
ADD CONSTRAINT "Athlete_evaluationTargetCategoryId_fkey"
FOREIGN KEY ("evaluationTargetCategoryId")
REFERENCES "Category"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;