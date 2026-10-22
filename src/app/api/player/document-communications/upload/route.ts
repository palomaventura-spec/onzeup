import crypto from "node:crypto";
import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncAutomaticEligibility } from "@/lib/athlete-eligibility";
import { getAuthorizedPlayerCommunication } from "@/lib/communication-document-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BYTES = 4 * 1024 * 1024;
const types = ["application/pdf", "image/jpeg", "image/png"] as const;
const str = (v: FormDataEntryValue | null) => typeof v === "string" ? v.trim() : "";
function dateValue(raw: string) {
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;
  const date = new Date(`${raw}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw ? undefined : date;
}
function signature(bytes: Buffer, kind: string) {
  if (kind === "application/pdf") return bytes.subarray(0, 1024).includes(Buffer.from("%PDF-"));
  if (kind === "image/jpeg") return bytes.length > 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  return bytes.length > 8 && Buffer.from([137,80,78,71,13,10,26,10]).equals(bytes.subarray(0, 8));
}
function json(error: string, status: number) { return NextResponse.json({ error }, { status }); }

export async function POST(request: Request) {
  let uploaded: string | null = null;
  try {
    if (process.env.PLAYER_DOCUMENT_UPLOAD_ENABLED !== "true") return json("Envio documental ainda não liberado.", 503);
    const user = await getCurrentUser();
    if (!user) return json("Sessão inválida.", 401);
    if (user.role !== "GUARDIAN") return json("Acesso não autorizado.", 403);
    const token = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
    if (!token) return json("Armazenamento privado não configurado.", 503);
    const data = await request.formData();
    const recipientId = str(data.get("recipientId"));
    const documentRequestId = str(data.get("documentRequestId"));
    const file = data.get("file");
    const issuedAt = dateValue(str(data.get("issuedAt")));
    const expiresAt = dateValue(str(data.get("expiresAt")));
    if (!recipientId || !documentRequestId) return json("Solicitação inválida.", 400);
    if (issuedAt === undefined || expiresAt === undefined) return json("Data inválida.", 400);
    if (!(file instanceof File)) return json("Selecione um arquivo.", 400);
    if (!types.includes(file.type as typeof types[number]) || file.size < 1 || file.size > MAX_BYTES) {
      return json("Envie PDF, JPG ou PNG com até 4 MB.", 400);
    }
    const recipient = await getAuthorizedPlayerCommunication(user.id, recipientId);
    if (!recipient) return json("Acesso à conversa negado.", 403);
    const organizationId = recipient.communication.organizationId;
    const athleteId = recipient.athleteId;
    const requirementRequest = await prisma.clubCommunicationDocumentRequest.findFirst({
      where: { id: documentRequestId, recipientId },
    });
    if (!requirementRequest?.requirementId) return json("Esta pendência exige tratamento do clube antes do upload.", 400);
    if (!["MISSING", "REJECTED", "EXPIRED", "EXPIRING"].includes(requirementRequest.notificationKind)) {
      return json("Esta pendência não permite reenvio.", 400);
    }
    const requirement = await prisma.categoryDocumentRequirement.findFirst({
      where: {
        id: requirementRequest.requirementId, organizationId, active: true, subject: "ATHLETE",
      },
      select: { id: true, key: true, label: true, documentCategory: true, requiresExpiry: true, categoryId: true },
    });
    const membership = requirement ? await prisma.athleteMembership.findFirst({ where: { athleteId, organizationId, categoryId: requirement.categoryId, status: "ACTIVE" }, select: { id: true } }) : null;
    if (!requirement || !membership || (requirementRequest.categoryId && requirement.categoryId !== requirementRequest.categoryId)) {
      return json("Requisito documental indisponível para o atleta.", 400);
    }
    if (requirement.requiresExpiry && !expiresAt) return json("Informe a validade deste documento.", 400);
    if (issuedAt && expiresAt && expiresAt < issuedAt) return json("Validade anterior à emissão.", 400);
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!signature(bytes, file.type)) return json("O conteúdo não corresponde ao tipo do arquivo.", 400);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
    const path = `onzeup-private/${organizationId}/athletes/${athleteId}/player-communications/${crypto.randomUUID()}.${ext}`;
    // Limite conferido antes e dentro da transação; atualização condicional impede ultrapassar a quota por concorrência.
    const quota = await prisma.organization.findUnique({ where: { id: organizationId }, select: { documentStorageUsedBytes: true, documentStorageLimitBytes: true } });
    if (!quota || quota.documentStorageUsedBytes + BigInt(file.size) > quota.documentStorageLimitBytes) return json("Limite de armazenamento atingido.", 413);
    const blob = await put(path, bytes, { access: "private", token, addRandomSuffix: false, contentType: file.type });
    uploaded = blob.url;
    const result = await prisma.$transaction(async tx => {
      // Revalidar vínculo, destinatário e requisito imediatamente antes da persistência.
      const validLink = await tx.playerAthleteLink.findFirst({ where: { playerId: recipient.playerId, athleteId, verified: true, active: true }, select: { id: true } });
      const validRequest = await tx.clubCommunicationDocumentRequest.findFirst({ where: { id: documentRequestId, recipientId, requirementId: requirement.id, recipient: { player: { guardian: { userId: user.id } }, athlete: { organizationId, active: true }, communication: { organizationId } } }, select: { id: true } });
      const stillActive = await tx.categoryDocumentRequirement.findFirst({ where: { id: requirement.id, organizationId, active: true, subject: "ATHLETE" }, select: { id: true } });
      if (!validLink || !validRequest || !stillActive) throw new Error("Autorização revogada durante o envio.");
      const reserved = await tx.$executeRaw`UPDATE "Organization" SET "documentStorageUsedBytes" = "documentStorageUsedBytes" + ${BigInt(file.size)} WHERE "id" = ${organizationId} AND "documentStorageUsedBytes" + ${BigInt(file.size)} <= "documentStorageLimitBytes"`;
      if (reserved !== 1) throw new Error("Limite de armazenamento atingido.");
      const doc = await tx.athleteDocument.create({ data: {
        organizationId, athleteId, uploadedByUserId: user.id,
        category: requirement.documentCategory, status: "PENDING", title: requirement.label,
        requirementId: requirement.id, requirementKeySnapshot: requirement.key, requirementLabelSnapshot: requirement.label,
        storageProvider: "VERCEL_BLOB_PRIVATE", storageKey: blob.url, originalFileName: file.name.slice(0, 255),
        mimeType: file.type, sizeBytes: file.size, checksumSha256: sha256, issuedAt, expiresAt,
      }, select: { id: true } });
      const message = await tx.clubCommunicationMessage.create({ data: {
        recipientId, authorUserId: user.id, senderType: "PLAYER",
        body: `Documento enviado para análise: ${requirement.label}`,
      }, select: { id: true } });
      await tx.clubCommunicationMessageAttachment.create({ data: { messageId: message.id, athleteDocumentId: doc.id, documentRequestId } });
      await tx.athleteDataAuditLog.create({ data: {
        organizationId, athleteId, actorUserId: user.id, action: "CREATED",
        entityType: "AthleteDocument", entityId: doc.id,
        metadataJson: JSON.stringify({ via: "PLAYER_DOCUMENT_COMMUNICATION", recipientId, documentRequestId, requirementId: requirement.id }),
      } });
      await syncAutomaticEligibility(tx, { organizationId, athleteId, actor: { id: user.id, name: user.name } });
      return doc.id;
    });
    return NextResponse.json({ id: result, status: "PENDING" });
  } catch (error) {
    if (uploaded && process.env.PRIVATE_BLOB_READ_WRITE_TOKEN) {
      try { await del(uploaded, { token: process.env.PRIVATE_BLOB_READ_WRITE_TOKEN }); }
      catch (cleanupError) { console.error("PLAYER_DOCUMENT_ORPHAN_CLEANUP", cleanupError); }
    }
    console.error("PLAYER_DOCUMENT_UPLOAD_ERROR", error);
    return json("Não foi possível enviar o documento.", 500);
  }
}
