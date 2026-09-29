CREATE TABLE "QtrSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "trainingColor" TEXT NOT NULL DEFAULT '#2B9D47',
    "matchColor" TEXT NOT NULL DEFAULT '#D4AA18',
    "friendlyColor" TEXT NOT NULL DEFAULT '#3377A5',
    "eventColor" TEXT NOT NULL DEFAULT '#76539A',
    "otherColor" TEXT NOT NULL DEFAULT '#29333D',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QtrSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QtrSettings_organizationId_key"
ON "QtrSettings"("organizationId");

ALTER TABLE "QtrSettings"
ADD CONSTRAINT "QtrSettings_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "Organization"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;