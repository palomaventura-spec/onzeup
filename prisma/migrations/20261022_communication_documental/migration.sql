-- 11UP Comunicação Documental — revisão prévia obrigatória.
-- Não execute em produção sem backup, confirmação da DATABASE_URL, janela de implantação e aprovação.
-- Exclusivamente NOVAS tabelas/tipo/índices/relações. Não altera tabelas existentes.
BEGIN;

CREATE TYPE "ClubCommunicationSenderType" AS ENUM ('CLUB', 'PLAYER');

CREATE TABLE "ClubCommunicationDocumentRequest" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "priorityKey" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "notificationKind" TEXT NOT NULL,
    "requirementId" TEXT,
    "sourceDocumentId" TEXT,
    "categoryId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClubCommunicationDocumentRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClubCommunicationMessage" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "senderType" "ClubCommunicationSenderType" NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClubCommunicationMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClubCommunicationMessageAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "athleteDocumentId" TEXT NOT NULL,
    "documentRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClubCommunicationMessageAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClubCommunicationDocumentRequest_recipientId_priorityKey_key" ON "ClubCommunicationDocumentRequest"("recipientId", "priorityKey");
CREATE INDEX "ClubCommunicationDocumentRequest_recipientId_createdAt_idx" ON "ClubCommunicationDocumentRequest"("recipientId", "createdAt");
CREATE INDEX "ClubCommunicationDocumentRequest_requirementId_idx" ON "ClubCommunicationDocumentRequest"("requirementId");
CREATE INDEX "ClubCommunicationMessage_recipientId_createdAt_idx" ON "ClubCommunicationMessage"("recipientId", "createdAt");
CREATE INDEX "ClubCommunicationMessage_authorUserId_createdAt_idx" ON "ClubCommunicationMessage"("authorUserId", "createdAt");
CREATE UNIQUE INDEX "ClubCommunicationMessageAttachment_athleteDocumentId_key" ON "ClubCommunicationMessageAttachment"("athleteDocumentId");
CREATE INDEX "ClubCommunicationMessageAttachment_messageId_idx" ON "ClubCommunicationMessageAttachment"("messageId");

ALTER TABLE "ClubCommunicationDocumentRequest" ADD CONSTRAINT "ClubCommunicationDocumentRequest_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "ClubCommunicationRecipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubCommunicationMessage" ADD CONSTRAINT "ClubCommunicationMessage_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "ClubCommunicationRecipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubCommunicationMessage" ADD CONSTRAINT "ClubCommunicationMessage_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClubCommunicationMessageAttachment" ADD CONSTRAINT "ClubCommunicationMessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ClubCommunicationMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubCommunicationMessageAttachment" ADD CONSTRAINT "ClubCommunicationMessageAttachment_athleteDocumentId_fkey" FOREIGN KEY ("athleteDocumentId") REFERENCES "AthleteDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClubCommunicationMessageAttachment" ADD CONSTRAINT "ClubCommunicationMessageAttachment_documentRequestId_fkey" FOREIGN KEY ("documentRequestId") REFERENCES "ClubCommunicationDocumentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
