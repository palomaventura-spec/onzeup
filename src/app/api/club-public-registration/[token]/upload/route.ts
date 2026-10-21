import crypto from "node:crypto";
import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  privateRegistrationBlobPath,
  validatePublicRegistrationFile,
  verifySubmissionUploadCredential,
  PUBLIC_REGISTRATION_MAX_FILE_SIZE,
} from "@/lib/public-registration-upload-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };
const errorResponse = (message: string, status: number) => NextResponse.json({ error: message }, { status });

export async function POST(request: Request, { params }: Ctx) {
  let uploadedUrl: string | null = null;
  const blobToken = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
  if (!blobToken) return errorResponse("Armazenamento privado indisponível.", 503);
  if (process.env.CLUB_PUBLIC_REGISTRATION_UPLOADS_ENABLED !== "true") {
    return errorResponse("Envio de documentos ainda não habilitado.", 503);
  }
  try {
    const { token } = await params;
    if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) return errorResponse("Link indisponível.", 404);
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const link = await prisma.publicRegistrationLink.findUnique({
      where: { tokenHash },
      select: { id: true, status: true, expiresAt: true },
    });
    // A validade/status do link controla novas inscrições, não a continuação de uma inscrição existente.
    // O acesso aos documentos exige submissionId + credencial individual válida abaixo.
    if (!link) return errorResponse("Link indisponível.", 410);
    const headerSize = Number(request.headers.get("content-length") || 0);
    if (headerSize > PUBLIC_REGISTRATION_MAX_FILE_SIZE + 16_384) return errorResponse("Arquivo muito grande.", 413);
    const form = await request.formData();
    const rawSubmissionId = form.get("submissionId");
    const rawCredential = form.get("uploadCredential");
    const kind = form.get("kind");
    const requirementId = form.get("requirementId");
    const file = form.get("file");
    if (typeof rawSubmissionId !== "string" || !/^[a-z0-9]{10,40}$/i.test(rawSubmissionId)) return errorResponse("Inscrição inválida.", 400);
    if (!(file instanceof File) || file.size < 1 || file.size > PUBLIC_REGISTRATION_MAX_FILE_SIZE) return errorResponse("Arquivo inválido ou maior que 4 MB.", 400);
    if (kind !== "PHOTO" && kind !== "DOCUMENT") return errorResponse("Tipo de envio inválido.", 400);
    const submission = await prisma.publicRegistrationSubmission.findFirst({
      where: { id: rawSubmissionId, linkId: link.id, status: "PENDING_DOCUMENTS" },
      select: { id: true, organizationId: true, uploadTokenHash: true, uploadTokenExpiresAt: true, photoStorageKey: true,
        documents: { select: { requirementId: true } },
      },
    });
    if (!submission || !verifySubmissionUploadCredential(rawCredential, submission.uploadTokenHash, submission.uploadTokenExpiresAt)) {
      return errorResponse("Credencial expirada ou inválida.", 403);
    }
    if (kind === "PHOTO" && submission.photoStorageKey) return errorResponse("Foto já enviada.", 409);
    let requirement: { id: string; label: string; owner: "ATHLETE" | "FATHER" | "MOTHER" | "GUARDIAN"; expires: boolean } | null = null;
    let expiresAt: Date | null = null;
    if (kind === "DOCUMENT") {
      if (typeof requirementId !== "string") return errorResponse("Documento não selecionado.", 400);
      requirement = await prisma.publicRegistrationDocumentRequirement.findFirst({
        where: { id: requirementId, linkId: link.id, active: true },
        select: { id: true, label: true, owner: true, expires: true },
      });
      if (!requirement) return errorResponse("Exigência documental inválida.", 400);
      if (submission.documents.some(d => d.requirementId === requirement!.id)) return errorResponse("Documento já enviado.", 409);
      const expiryInput = form.get("expiresAt");
      if (requirement.expires) {
        if (typeof expiryInput !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(expiryInput)) return errorResponse("Informe a validade do documento.", 400);
        expiresAt = new Date(`${expiryInput}T12:00:00Z`);
        if (Number.isNaN(expiresAt.getTime()) || expiresAt.toISOString().slice(0, 10) !== expiryInput) return errorResponse("Validade inválida.", 400);
      }
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const validated = validatePublicRegistrationFile(bytes, file.type, kind);
    if (!validated) return errorResponse("Formato ou conteúdo inválido. Use PDF, JPG, PNG ou WEBP (foto: somente imagem).", 400);
    const org = await prisma.organization.findUnique({ where: { id: submission.organizationId }, select: { documentStorageUsedBytes: true, documentStorageLimitBytes: true } });
    if (!org || org.documentStorageUsedBytes + BigInt(bytes.length) > org.documentStorageLimitBytes) return errorResponse("Limite de armazenamento do clube atingido.", 413);
    const key = privateRegistrationBlobPath(submission.organizationId, submission.id, validated.extension);
    const uploaded = await put(key, bytes, { access: "private", addRandomSuffix: false, token: blobToken, contentType: validated.mimeType });
    uploadedUrl = uploaded.url;
    const result = await prisma.$transaction(async tx => {
      const guard = await tx.publicRegistrationSubmission.findFirst({ where: {
        id: submission.id, status: "PENDING_DOCUMENTS", uploadTokenHash: submission.uploadTokenHash,
        uploadTokenExpiresAt: { gt: new Date() },
      }, select: { id: true, photoStorageKey: true } });
      if (!guard) throw new Error("UPLOAD_TOKEN_CHANGED");
      let id: string | null = null;
      if (kind === "PHOTO") {
        if (guard.photoStorageKey) throw new Error("PHOTO_ALREADY_EXISTS");
        await tx.publicRegistrationSubmission.update({ where: { id: submission.id }, data: { photoStorageKey: uploaded.url } });
      } else if (requirement) {
        const dup = await tx.publicRegistrationDocument.count({ where: { submissionId: submission.id, requirementId: requirement.id } });
        if (dup) throw new Error("DOCUMENT_ALREADY_EXISTS");
        const created = await tx.publicRegistrationDocument.create({ data: {
          submissionId: submission.id, requirementId: requirement.id,
          labelSnapshot: requirement.label, ownerSnapshot: requirement.owner,
          storageKey: uploaded.url, originalFileName: file.name.slice(0, 255),
          mimeType: validated.mimeType, sizeBytes: bytes.length, expiresAt,
        }, select: { id: true } });
        id = created.id;
      }
      await tx.organization.update({ where: { id: submission.organizationId }, data: { documentStorageUsedBytes: { increment: BigInt(bytes.length) } } });
      return id;
    });
    return NextResponse.json({ ok: true, documentId: result }, { status: 201 });
  } catch (error) {
    if (uploadedUrl && blobToken) {
      try { await del(uploadedUrl, { token: blobToken }); } catch { console.error("PUBLIC_REGISTRATION_BLOB_CLEANUP_FAILED"); }
    }
    console.error("PUBLIC_REGISTRATION_UPLOAD_ERROR", error instanceof Error ? error.message : "unknown");
    return errorResponse("Não foi possível receber o arquivo.", 500);
  }
}
