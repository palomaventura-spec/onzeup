import crypto from "node:crypto";

import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { hasClubPermission } from "@/lib/club-permissions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
const CATEGORIES = [
  "IDENTITY",
  "MEDICAL_EXAM",
  "MEDICAL_CLEARANCE",
  "ELECTROCARDIOGRAM",
  "ECHOCARDIOGRAM",
  "AUTHORIZATION",
  "SPORTS_REGISTRATION",
  "SCHOOL",
  "SCHOOL_DECLARATION",
  "OTHER",
] as const;

type DocumentCategory = (typeof CATEGORIES)[number];

const EXPIRY_REQUIRED_CATEGORIES = new Set<DocumentCategory>([
  "MEDICAL_CLEARANCE",
  "ELECTROCARDIOGRAM",
  "ECHOCARDIOGRAM",
  "SCHOOL_DECLARATION",
]);

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
  if (mimeType === "application/pdf") {
    return buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  }
  if (mimeType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
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

export async function POST(request: Request) {
  let uploadedUrl: string | null = null;

  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    const organizationId: string = user.organizationId;

    if (!hasClubPermission(user, "ATHLETES_EDIT")) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    const token = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "Armazenamento privado não configurado." }, { status: 503 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const athleteId = clean(formData.get("athleteId"));
    const guardianId = clean(formData.get("guardianId")) || null;
    const title = clean(formData.get("title"));
    const categoryInput = clean(formData.get("category"));
    const category = CATEGORIES.includes(categoryInput as DocumentCategory)
      ? (categoryInput as DocumentCategory)
      : null;

    const issuedAt = optionalDate(formData.get("issuedAt"));
    const expiresAt = optionalDate(formData.get("expiresAt"));

    if (
      category &&
      EXPIRY_REQUIRED_CATEGORIES.has(category) &&
      !expiresAt
    ) {
      return NextResponse.json(
        { error: "Informe a data de validade deste documento." },
        { status: 400 },
      );
    }

    if (issuedAt && expiresAt && expiresAt < issuedAt) {
      return NextResponse.json(
        { error: "A validade não pode ser anterior à data de emissão." },
        { status: 400 },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Selecione um arquivo." }, { status: 400 });
    }
    if (!athleteId || !title || !category) {
      return NextResponse.json({ error: "Informe atleta, título e categoria." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
      return NextResponse.json({ error: "Formato não permitido. Use PDF, JPG ou PNG." }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "O arquivo deve possuir no máximo 4 MB." }, { status: 400 });
    }

    const athlete = await prisma.athlete.findFirst({
      where: { id: athleteId, organizationId },
      select: { id: true },
    });
    if (!athlete) {
      return NextResponse.json({ error: "Atleta não encontrado." }, { status: 404 });
    }

    if (guardianId) {
      const guardian = await prisma.athleteGuardian.findFirst({
        where: { id: guardianId, athleteId },
        select: { id: true },
      });
      if (!guardian) {
        return NextResponse.json({ error: "Responsável não encontrado." }, { status: 404 });
      }
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { documentStorageLimitBytes: true, documentStorageUsedBytes: true },
    });
    if (!organization) {
      return NextResponse.json({ error: "Organização não encontrada." }, { status: 404 });
    }

    const nextUsage = organization.documentStorageUsedBytes + BigInt(file.size);
    if (nextUsage > organization.documentStorageLimitBytes) {
      return NextResponse.json({ error: "O limite de armazenamento de documentos foi atingido." }, { status: 413 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (!validSignature(bytes, file.type)) {
      return NextResponse.json({ error: "O conteúdo não corresponde ao formato informado." }, { status: 400 });
    }

    const checksum = crypto.createHash("sha256").update(bytes).digest("hex");
    const pathname = [
      "onzeup-private",
      organizationId,
      "athletes",
      athleteId,
      `${Date.now()}-${crypto.randomUUID()}.${extension(file.type)}`,
    ].join("/");

    const blob = await put(pathname, bytes, {
      access: "private",
      addRandomSuffix: false,
      token,
      contentType: file.type,
    });
    uploadedUrl = blob.url;

    const document = await prisma.$transaction(async (transaction) => {
      const created = await transaction.athleteDocument.create({
        data: {
          organizationId,
          athleteId,
          guardianId,
          uploadedByUserId: user.id,
          category,
          status: "PENDING",
          title,
          storageProvider: "VERCEL_BLOB_PRIVATE",
          storageKey: blob.url,
          originalFileName: file.name.slice(0, 255),
          mimeType: file.type,
          sizeBytes: file.size,
          checksumSha256: checksum,
          issuedAt,
          expiresAt,
        },
        select: { id: true },
      });

      await transaction.organization.update({
        where: { id: organizationId },
        data: { documentStorageUsedBytes: { increment: BigInt(file.size) } },
      });

      await transaction.athleteDataAuditLog.create({
        data: {
          organizationId,
          athleteId,
          actorUserId: user.id,
          action: "CREATED",
          entityType: "AthleteDocument",
          entityId: created.id,
          metadataJson: JSON.stringify({ category, sizeBytes: file.size }),
        },
      });

      return created;
    });

    return NextResponse.json({ id: document.id, status: "PENDING" });
  } catch (error) {
    if (uploadedUrl && process.env.PRIVATE_BLOB_READ_WRITE_TOKEN) {
      try {
        await del(uploadedUrl, { token: process.env.PRIVATE_BLOB_READ_WRITE_TOKEN });
      } catch (cleanupError) {
        console.error("PRIVATE_DOCUMENT_CLEANUP_ERROR", cleanupError);
      }
    }
    console.error("PRIVATE_DOCUMENT_UPLOAD_ERROR", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Não foi possível enviar o documento." }, { status: 500 });
  }
}
