/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `StaffMember` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "TrainingDurationSource" AS ENUM ('SCHEDULED_DURATION_USED', 'ACTUAL_DURATION_USED');

-- CreateEnum
CREATE TYPE "TrainingAuditAction" AS ENUM ('TRAINING_CREATED', 'TRAINING_UPDATED', 'TRAINING_DELETED', 'SESSION_STARTED', 'SESSION_COMPLETED', 'SESSION_CANCELLED', 'ATTENDANCE_RECORDED', 'ATTENDANCE_UPDATED', 'ATTENDANCE_JUSTIFIED', 'MINUTES_RECALCULATED', 'PERMISSION_UPDATED', 'PERFORMANCE_RULE_UPDATED', 'REPORT_GENERATED', 'REPORT_APPROVED', 'REPORT_SENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ClubPermissionCode" ADD VALUE 'TRAININGS_VIEW';
ALTER TYPE "ClubPermissionCode" ADD VALUE 'TRAININGS_EDIT';
ALTER TYPE "ClubPermissionCode" ADD VALUE 'TRAINING_ATTENDANCE_VIEW';
ALTER TYPE "ClubPermissionCode" ADD VALUE 'TRAINING_ATTENDANCE_MANAGE';
ALTER TYPE "ClubPermissionCode" ADD VALUE 'PERFORMANCE_REPORT_REVIEW';
ALTER TYPE "ClubPermissionCode" ADD VALUE 'PERFORMANCE_REPORT_APPROVE';
ALTER TYPE "ClubPermissionCode" ADD VALUE 'PERFORMANCE_REPORT_SEND';
ALTER TYPE "ClubPermissionCode" ADD VALUE 'GPS_VIEW';
ALTER TYPE "ClubPermissionCode" ADD VALUE 'GPS_IMPORT';
ALTER TYPE "ClubPermissionCode" ADD VALUE 'GPS_MANAGE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TrainingSessionStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "TrainingSessionStatus" ADD VALUE 'ARCHIVED';

-- AlterTable
ALTER TABLE "StaffMember" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "TrainingAttendance" ADD COLUMN     "justification" TEXT;

-- AlterTable
ALTER TABLE "TrainingSchedule" ADD COLUMN     "responsibleStaffMemberId" TEXT,
ADD COLUMN     "sport" "SportType" NOT NULL DEFAULT 'BOTH',
ADD COLUMN     "trainingType" TEXT;

-- AlterTable
ALTER TABLE "TrainingSession" ADD COLUMN     "actualEndedAt" TIMESTAMP(3),
ADD COLUMN     "actualStartedAt" TIMESTAMP(3),
ADD COLUMN     "durationSource" "TrainingDurationSource" NOT NULL DEFAULT 'SCHEDULED_DURATION_USED',
ADD COLUMN     "responsibleStaffMemberId" TEXT,
ADD COLUMN     "trainingType" TEXT;

-- CreateTable
CREATE TABLE "StaffCategoryPermission" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "sport" "SportType" NOT NULL DEFAULT 'BOTH',
    "permission" "ClubPermissionCode" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffCategoryPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingAuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "sessionId" TEXT,
    "attendanceId" TEXT,
    "actorUserId" TEXT,
    "action" "TrainingAuditAction" NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffCategoryPermission_organizationId_categoryId_permissio_idx" ON "StaffCategoryPermission"("organizationId", "categoryId", "permission");

-- CreateIndex
CREATE INDEX "StaffCategoryPermission_staffMemberId_enabled_idx" ON "StaffCategoryPermission"("staffMemberId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "StaffCategoryPermission_staffMemberId_categoryId_sport_perm_key" ON "StaffCategoryPermission"("staffMemberId", "categoryId", "sport", "permission");

-- CreateIndex
CREATE INDEX "TrainingAuditLog_organizationId_createdAt_idx" ON "TrainingAuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "TrainingAuditLog_scheduleId_createdAt_idx" ON "TrainingAuditLog"("scheduleId", "createdAt");

-- CreateIndex
CREATE INDEX "TrainingAuditLog_sessionId_createdAt_idx" ON "TrainingAuditLog"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "TrainingAuditLog_attendanceId_createdAt_idx" ON "TrainingAuditLog"("attendanceId", "createdAt");

-- CreateIndex
CREATE INDEX "TrainingAuditLog_actorUserId_createdAt_idx" ON "TrainingAuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StaffMember_userId_key" ON "StaffMember"("userId");

-- CreateIndex
CREATE INDEX "TrainingAttendance_sessionId_status_idx" ON "TrainingAttendance"("sessionId", "status");

-- CreateIndex
CREATE INDEX "TrainingSchedule_responsibleStaffMemberId_idx" ON "TrainingSchedule"("responsibleStaffMemberId");

-- CreateIndex
CREATE INDEX "TrainingSession_responsibleStaffMemberId_idx" ON "TrainingSession"("responsibleStaffMemberId");

-- CreateIndex
CREATE INDEX "TrainingSession_status_startsAt_idx" ON "TrainingSession"("status", "startsAt");

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffCategoryPermission" ADD CONSTRAINT "StaffCategoryPermission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffCategoryPermission" ADD CONSTRAINT "StaffCategoryPermission_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffCategoryPermission" ADD CONSTRAINT "StaffCategoryPermission_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSchedule" ADD CONSTRAINT "TrainingSchedule_responsibleStaffMemberId_fkey" FOREIGN KEY ("responsibleStaffMemberId") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_responsibleStaffMemberId_fkey" FOREIGN KEY ("responsibleStaffMemberId") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAuditLog" ADD CONSTRAINT "TrainingAuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAuditLog" ADD CONSTRAINT "TrainingAuditLog_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "TrainingSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAuditLog" ADD CONSTRAINT "TrainingAuditLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAuditLog" ADD CONSTRAINT "TrainingAuditLog_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "TrainingAttendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAuditLog" ADD CONSTRAINT "TrainingAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
