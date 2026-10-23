-- AlterTable
ALTER TABLE "CompetitionDocumentRequirement" ADD COLUMN     "categoryId" TEXT;

-- CreateIndex
CREATE INDEX "CompetitionDocumentRequirement_competitionId_categoryId_act_idx" ON "CompetitionDocumentRequirement"("competitionId", "categoryId", "active", "sortOrder");

-- AddForeignKey
ALTER TABLE "CompetitionDocumentRequirement" ADD CONSTRAINT "CompetitionDocumentRequirement_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CompetitionCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
