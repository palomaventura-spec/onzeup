import crypto from "node:crypto";

import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";

import { decryptPrivateData } from "@/lib/private-data-crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
const CATEGORIES = ["IDENTITY", "MEDICAL_EXAM", "MEDICAL_CLEARANCE", "AUTHORIZATION", "SPORTS_REGISTRATION", "SCHOOL", "OTHER"] as const;
type Category = (typeof CATEGORIES)[number];
type RequestedItem = { key: string; label: string; category: Category };

function hash(value: string | Buffer) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function optionalDate(value: FormDataEntryValue | null) {
  const normalized = clean(value);
  if (!normalized) return null;
  const parsed = new Date(`${normalized}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function validSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "application/pdf") return buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mimeType === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return buffer.length >= signature.length && signature.every((byte, index) => buffer[index] === byte);
  }
  return false;
}

function extension(mimeType: string) {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/png") return "png";
  return "jpg";
}

function invitationPayload(encrypted: string | null) {
  try {
    const parsed = JSON.parse(decryptPrivateData(encrypted) || "{}") as {
      guardianId?: string | null;
      requestedItems?: RequestedItem[];
    };
    return {
      guardianId: parsed.guardianId || null,
      requestedItems: (parsed.requestedItems || []).filter(
        (item) => item && item.key && item.label && CATEGORIES.includes(item.category)
      ),
    };
  } catch {
    return { guardianId: null, requestedItems: [] as RequestedItem[] };
  }
}

async function findInvitation(rawToken: string) {
  if (!rawToken || rawToken.length < 32) return null;
  return prisma.athleteRegistrationRequest.findUnique({
    where: { tokenHash: hash(rawToken) },
    include: {
      organization: { select: { documentStorageLimitBytes: true, documentStorageUsedBytes: true } },
      documents: { where: { deletedAt: null }, select: { id: true, category: true, requestItemKey: true } },
    },
  });
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  let uploadedUrl: string | null = null;
  try {
    const { token: rawToken } = await context.params;
    const invitation = await findInvitation(rawToken);
    if (!invitation || invitation.status !== "PENDING") {
      return NextResponse.json({ error: "Este link não está disponível." }, { status: 410 });
    }
    if (invitation.expiresAt < new Date()) {
      await prisma.athleteRegistrationRequest.update({ where: { id: invitation.id }, data: { status: "EXPIRED" } });
      return NextResponse.json({ error: "Este link expirou." }, { status: 410 });
    }

    const blobToken = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
    if (!blobToken) return NextResponse.json({ error: "Armazenamento indisponível." }, { status: 503 });

    const payload = invitationPayload(invitation.payloadEncrypted);
    const formData = await request.formData();
    const file = formData.get("file");
    const requestItemKey = clean(formData.get("requestItemKey"));
    const requestedItem = payload.requestedItems.find((item) => item.key === requestItemKey);
    const title = clean(formData.get("title"));

    if (!(file instanceof File)) return NextResponse.json({ error: "Selecione um arquivo." }, { status: 400 });
    if (!requestedItem) {
      return NextResponse.json({ error: "Documento não solicitado pelo clube." }, { status: 400 });
    }
    if (!title) return NextResponse.json({ error: "Informe o título do documento." }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
      return NextResponse.json({ error: "Use um arquivo PDF, JPG ou PNG." }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "O arquivo deve possuir no máximo 4 MB." }, { status: 400 });
    }

    if (invitation.organization.documentStorageUsedBytes + BigInt(file.size) > invitation.organization.documentStorageLimitBytes) {
      return NextResponse.json({ error: "O limite de armazenamento do clube foi atingido." }, { status: 413 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (!validSignature(bytes, file.type)) {
      return NextResponse.json({ error: "O conteúdo do arquivo é inválido." }, { status: 400 });
    }

    const checksum = hash(bytes);
    const pathname = ["onzeup-private", invitation.organizationId, "athletes", invitation.athleteId, "family", `${Date.now()}-${crypto.randomUUID()}.${extension(file.type)}`].join("/");
    const blob = await put(pathname, bytes, { access: "private", addRandomSuffix: false, token: blobToken, contentType: file.type });
    uploadedUrl = blob.url;

    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = hash(`${invitation.tokenHash}:${forwardedFor}`);

    const document = await prisma.$transaction(async (transaction) => {
      const created = await transaction.athleteDocument.create({
        data: {
          organizationId: invitation.organizationId,
          athleteId: invitation.athleteId,
          guardianId: payload.guardianId,
          registrationRequestId: invitation.id,
          category: requestedItem.category,
          requestItemKey: requestedItem.key,
          status: "PENDING",
          title,
          storageProvider: "VERCEL_BLOB_PRIVATE",
          storageKey: blob.url,
          originalFileName: file.name.slice(0, 255),
          mimeType: file.type,
          sizeBytes: file.size,
          checksumSha256: checksum,
          issuedAt: optionalDate(formData.get("issuedAt")),
          expiresAt: optionalDate(formData.get("expiresAt")),
        },
        select: { id: true },
      });
      await transaction.organization.update({ where: { id: invitation.organizationId }, data: { documentStorageUsedBytes: { increment: BigInt(file.size) } } });
      await transaction.athleteDataAuditLog.create({
        data: {
          organizationId: invitation.organizationId,
          athleteId: invitation.athleteId,
          action: "CREATED",
          entityType: "AthleteDocument",
          entityId: created.id,
          ipHash,
          metadataJson: JSON.stringify({ source: "FAMILY_LINK", requestItemKey: requestedItem.key, category: requestedItem.category, requestId: invitation.id }),
        },
      });
      return created;
    });

    return NextResponse.json({ id: document.id });
  } catch (error) {
    if (uploadedUrl && process.env.PRIVATE_BLOB_READ_WRITE_TOKEN) {
      try { await del(uploadedUrl, { token: process.env.PRIVATE_BLOB_READ_WRITE_TOKEN }); } catch {}
    }
    console.error("FAMILY_DOCUMENT_UPLOAD_ERROR", error);
    return NextResponse.json({ error: "Não foi possível enviar o documento." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token: rawToken } = await context.params;
    const invitation = await findInvitation(rawToken);
    if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: "Este link não está disponível." }, { status: 410 });
    }

    const payload = invitationPayload(invitation.payloadEncrypted);
    const received = new Set(invitation.documents.map((document) => document.requestItemKey).filter(Boolean));
    const missing = payload.requestedItems.filter((item) => !received.has(item.key)).map((item) => item.key);
    if (missing.length) {
      return NextResponse.json({ error: "Envie todos os documentos solicitados antes de finalizar.", missing }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.athleteRegistrationRequest.update({ where: { id: invitation.id }, data: { status: "SUBMITTED", submittedAt: new Date() } }),
      prisma.athleteDataAuditLog.create({
        data: {
          organizationId: invitation.organizationId,
          athleteId: invitation.athleteId,
          action: "SUBMITTED",
          entityType: "AthleteRegistrationRequest",
          entityId: invitation.id,
          metadataJson: JSON.stringify({ documentCount: invitation.documents.length }),
        },
      }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("FAMILY_DOCUMENT_SUBMIT_ERROR", error);
    return NextResponse.json({ error: "Não foi possível finalizar o envio." }, { status: 500 });
  }
}
