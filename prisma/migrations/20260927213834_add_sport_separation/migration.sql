/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,name,sport]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,athleteId,sport,periodStart]` on the table `MonthlyAthleteReport` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Category_organizationId_name_key";

-- DropIndex
DROP INDEX "Category_organizationId_type_active_idx";

-- DropIndex
DROP INDEX "MonthlyAthleteReport_organizationId_athleteId_periodStart_key";

-- AlterTable
ALTER TABLE "AthleteGpsRecord" ADD COLUMN     "sport" "SportType" NOT NULL DEFAULT 'BOTH';

-- AlterTable
ALTER TABLE "AthletePerformanceGoal" ADD COLUMN     "sport" "SportType" NOT NULL DEFAULT 'BOTH';

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "sport" "SportType" NOT NULL DEFAULT 'BOTH';

-- AlterTable
ALTER TABLE "MonthlyAthleteReport" ADD COLUMN     "sport" "SportType" NOT NULL DEFAULT 'BOTH';

-- AlterTable
ALTER TABLE "PerformanceReport" ADD COLUMN     "sport" "SportType" NOT NULL DEFAULT 'BOTH';

-- AlterTable
ALTER TABLE "TrainingSession" ADD COLUMN     "sport" "SportType" NOT NULL DEFAULT 'BOTH';

-- CreateIndex
CREATE INDEX "Category_organizationId_sport_type_active_idx" ON "Category"("organizationId", "sport", "type", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Category_organizationId_name_sport_key" ON "Category"("organizationId", "name", "sport");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyAthleteReport_organizationId_athleteId_sport_periodS_key" ON "MonthlyAthleteReport"("organizationId", "athleteId", "sport", "periodStart");
