CREATE TABLE "CategoryEvaluationTarget" (
    "id" TEXT NOT NULL,
    "evaluationCategoryId" TEXT NOT NULL,
    "targetCategoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryEvaluationTarget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CategoryEvaluationTarget_evaluationCategoryId_targetCategoryId_key"
ON "CategoryEvaluationTarget"("evaluationCategoryId", "targetCategoryId");

CREATE INDEX "CategoryEvaluationTarget_evaluationCategoryId_idx"
ON "CategoryEvaluationTarget"("evaluationCategoryId");

CREATE INDEX "CategoryEvaluationTarget_targetCategoryId_idx"
ON "CategoryEvaluationTarget"("targetCategoryId");

ALTER TABLE "CategoryEvaluationTarget"
ADD CONSTRAINT "CategoryEvaluationTarget_evaluationCategoryId_fkey"
FOREIGN KEY ("evaluationCategoryId")
REFERENCES "Category"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "CategoryEvaluationTarget"
ADD CONSTRAINT "CategoryEvaluationTarget_targetCategoryId_fkey"
FOREIGN KEY ("targetCategoryId")
REFERENCES "Category"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;