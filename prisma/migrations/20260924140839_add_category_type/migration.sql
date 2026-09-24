-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('STANDARD', 'EVALUATION');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "type" "CategoryType" NOT NULL DEFAULT 'STANDARD';

-- CreateIndex
CREATE INDEX "Category_organizationId_type_active_idx" ON "Category"("organizationId", "type", "active");
