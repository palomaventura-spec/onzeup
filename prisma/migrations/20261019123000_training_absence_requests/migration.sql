-- CreateEnum
CREATE TYPE "TrainingAbsenceRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "TrainingAbsenceRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" "TrainingAbsenceRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingAbsenceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingAbsenceAttachment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingAbsenceAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingAbsenceRequestEvent" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingAbsenceRequestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingAbsenceRequest_organizationId_status_createdAt_idx" ON "TrainingAbsenceRequest"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "TrainingAbsenceRequest_athleteId_scheduleId_idx" ON "TrainingAbsenceRequest"("athleteId", "scheduleId");

-- CreateIndex
CREATE INDEX "TrainingAbsenceRequest_scheduleId_status_idx" ON "TrainingAbsenceRequest"("scheduleId", "status");

-- CreateIndex
CREATE INDEX "TrainingAbsenceRequest_submittedById_createdAt_idx" ON "TrainingAbsenceRequest"("submittedById", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingAbsenceAttachment_storageKey_key" ON "TrainingAbsenceAttachment"("storageKey");

-- CreateIndex
CREATE INDEX "TrainingAbsenceAttachment_requestId_idx" ON "TrainingAbsenceAttachment"("requestId");

-- CreateIndex
CREATE INDEX "TrainingAbsenceRequestEvent_requestId_createdAt_idx" ON "TrainingAbsenceRequestEvent"("requestId", "createdAt");

-- AddForeignKey
ALTER TABLE "TrainingAbsenceRequest" ADD CONSTRAINT "TrainingAbsenceRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAbsenceRequest" ADD CONSTRAINT "TrainingAbsenceRequest_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAbsenceRequest" ADD CONSTRAINT "TrainingAbsenceRequest_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "TrainingSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAbsenceRequest" ADD CONSTRAINT "TrainingAbsenceRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAbsenceRequest" ADD CONSTRAINT "TrainingAbsenceRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAbsenceAttachment" ADD CONSTRAINT "TrainingAbsenceAttachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TrainingAbsenceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAbsenceRequestEvent" ADD CONSTRAINT "TrainingAbsenceRequestEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TrainingAbsenceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAbsenceRequestEvent" ADD CONSTRAINT "TrainingAbsenceRequestEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
