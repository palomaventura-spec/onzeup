import { del, get } from "@vercel/blob";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { hasClubPermission } from "@/lib/club-permissions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPIRY_REQUIRED_CATEGORIES = new Set([
  "MEDICAL_CLEARANCE",
  "ELECTROCARDIOGRAM",
  "ECHOCARDIOGRAM",
  "SCHOOL_DECLARATION",
]);

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalDate(value: unknown) {
  const normalized = clean(value);
  if (!normalized) return null;
  const parsed = new Date(`${normalized}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function safeFileName(value: string) {
  return value.replace(/[\r\n"\\/]/g, "_").slice(0, 180) || "documento";
}

async function context() {
  const user = await getCurrentUser();
  if (!user?.organizationId) return null;
  const allowed = hasClubPermission(user, "ATHLETES_EDIT");
  if (!allowed) return null;
  return { user, organizationId: user.organizationId as string };
}

async function documentForOrganization(documentId: string, organizationId: string) {
  return prisma.athleteDocument.findFirst({
    where: { id: documentId, organizationId, deletedAt: null },
  });
}

export async function GET(_request: Request, route: { params: Promise<{ documentId: string }> }) {
  try {
    const auth = await context();
    if (!auth) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    const { documentId } = await route.params;
    const document = await documentForOrganization(documentId, auth.organizationId);
    if (!document) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });

    const token = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
    if (!token) return NextResponse.json({ error: "Armazenamento indisponível." }, { status: 503 });
    const result = await get(document.storageKey, { access: "private", token });
    if (!result) return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });

    await prisma.athleteDataAuditLog.create({
      data: {
        organizationId: auth.organizationId,
        athleteId: document.athleteId,
        actorUserId: auth.user.id,
        action: "DOWNLOADED",
        entityType: "AthleteDocument",
        entityId: document.id,
      },
    });

    return new Response(result.stream, {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `inline; filename="${safeFileName(document.originalFileName)}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("ATHLETE_DOCUMENT_DOWNLOAD_ERROR", error);
    return NextResponse.json({ error: "Não foi possível abrir o documento." }, { status: 500 });
  }
}

export async function PATCH(request: Request, route: { params: Promise<{ documentId: string }> }) {
  try {
    const auth = await context();
    if (!auth) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    const { documentId } = await route.params;
    const document = await documentForOrganization(documentId, auth.organizationId);
    if (!document) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });

    const body = (await request.json()) as Record<string, unknown>;
    const action = clean(body.action).toUpperCase();
    const issuedAt = optionalDate(body.issuedAt);
    const expiresAt = optionalDate(body.expiresAt);
    const now = new Date();

    if (
      ["UPDATE_DATES", "APPROVE"].includes(action) &&
      EXPIRY_REQUIRED_CATEGORIES.has(document.category) &&
      !expiresAt
    ) {
      return NextResponse.json(
        { error: "Este tipo de documento exige data de validade." },
        { status: 400 },
      );
    }

    if (issuedAt && expiresAt && expiresAt < issuedAt) {
      return NextResponse.json(
        { error: "A validade não pode ser anterior à data de emissão." },
        { status: 400 },
      );
    }

    let data: Prisma.AthleteDocumentUncheckedUpdateInput;
    let auditAction: "UPDATED" | "APPROVED" | "REJECTED";

    if (action === "UPDATE_DATES") {
      data = { issuedAt, expiresAt };
      auditAction = "UPDATED";
    } else if (action === "APPROVE") {
      if (expiresAt && expiresAt < now) {
        return NextResponse.json({ error: "A validade informada já venceu." }, { status: 400 });
      }
      data = { status: "APPROVED", issuedAt, expiresAt, reviewedAt: now, reviewedByUserId: auth.user.id, rejectionReason: null };
      auditAction = "APPROVED";
    } else if (action === "REJECT") {
      const rejectionReason = clean(body.rejectionReason);
      if (!rejectionReason) return NextResponse.json({ error: "Informe o motivo da rejeição." }, { status: 400 });
      data = { status: "REJECTED", issuedAt, expiresAt, reviewedAt: now, reviewedByUserId: auth.user.id, rejectionReason: rejectionReason.slice(0, 500) };
      auditAction = "REJECTED";
    } else if (action === "ARCHIVE") {
      data = { status: "ARCHIVED", reviewedAt: now, reviewedByUserId: auth.user.id };
      auditAction = "UPDATED";
    } else {
      return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.athleteDocument.update({ where: { id: document.id }, data }),
      prisma.athleteDataAuditLog.create({
        data: {
          organizationId: auth.organizationId,
          athleteId: document.athleteId,
          actorUserId: auth.user.id,
          action: auditAction,
          entityType: "AthleteDocument",
          entityId: document.id,
          metadataJson: JSON.stringify({ action, issuedAt, expiresAt }),
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("ATHLETE_DOCUMENT_UPDATE_ERROR", error);
    return NextResponse.json({ error: "Não foi possível atualizar o documento." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, route: { params: Promise<{ documentId: string }> }) {
  try {
    const auth = await context();
    if (!auth) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    const { documentId } = await route.params;
    const document = await documentForOrganization(documentId, auth.organizationId);
    if (!document) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });

    const token = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
    if (!token) return NextResponse.json({ error: "Armazenamento indisponível." }, { status: 503 });
    await del(document.storageKey, { token });

    await prisma.$transaction([
      prisma.athleteDocument.update({ where: { id: document.id }, data: { deletedAt: new Date() } }),
      prisma.organization.update({
        where: { id: auth.organizationId },
        data: { documentStorageUsedBytes: { decrement: BigInt(document.sizeBytes) } },
      }),
      prisma.athleteDataAuditLog.create({
        data: {
          organizationId: auth.organizationId,
          athleteId: document.athleteId,
          actorUserId: auth.user.id,
          action: "DELETED",
          entityType: "AthleteDocument",
          entityId: document.id,
          metadataJson: JSON.stringify({ sizeBytes: document.sizeBytes, category: document.category }),
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("ATHLETE_DOCUMENT_DELETE_ERROR", error);
    return NextResponse.json({ error: "Não foi possível excluir o documento." }, { status: 500 });
  }
}
