import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { hasClubPermission } from "@/lib/club-permissions";
import { encryptPrivateData } from "@/lib/private-data-crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES = [
  "IDENTITY",
  "MEDICAL_EXAM",
  "MEDICAL_CLEARANCE",
  "AUTHORIZATION",
  "SPORTS_REGISTRATION",
  "SCHOOL",
  "OTHER",
] as const;

type Category = (typeof CATEGORIES)[number];

type RequestedItem = {
  key: string;
  label: string;
  category: Category;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function tokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function authenticatedContext() {
  const user = await getCurrentUser();
  if (!user?.organizationId) return null;
  if (!hasClubPermission(user, "ATHLETES_EDIT")) return null;
  return { user, organizationId: user.organizationId as string };
}

export async function POST(request: Request) {
  try {
    const context = await authenticatedContext();
    if (!context) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const athleteId = clean(body.athleteId);
    const guardianId = clean(body.guardianId) || null;
    const recipientName = clean(body.recipientName) || null;
    const recipientEmail = clean(body.recipientEmail) || null;
    const recipientPhone = clean(body.recipientPhone) || null;
    const validityDays = Math.min(30, Math.max(1, Number(body.validityDays) || 7));
    const requestedItems: RequestedItem[] = Array.isArray(body.requestedItems)
      ? body.requestedItems.flatMap((item) => {
          if (!item || typeof item !== "object") return [];
          const candidate = item as Record<string, unknown>;
          const key = clean(candidate.key).slice(0, 80);
          const label = clean(candidate.label).slice(0, 140);
          const categoryInput = clean(candidate.category);
          if (!/^[a-z0-9_-]+$/i.test(key) || !label || !CATEGORIES.includes(categoryInput as Category)) return [];
          return [{ key, label, category: categoryInput as Category }];
        }).filter((item, index, all) => all.findIndex((other) => other.key === item.key) === index).slice(0, 30)
      : [];

    if (!athleteId || !recipientName || requestedItems.length === 0) {
      return NextResponse.json(
        { error: "Informe o destinatário e ao menos um documento solicitado." },
        { status: 400 }
      );
    }

    const athlete = await prisma.athlete.findFirst({
      where: { id: athleteId, organizationId: context.organizationId },
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

    const rawToken = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validityDays);

    const registrationRequest = await prisma.$transaction(async (transaction) => {
      const created = await transaction.athleteRegistrationRequest.create({
        data: {
          organizationId: context.organizationId,
          athleteId,
          createdByUserId: context.user.id,
          tokenHash: tokenHash(rawToken),
          recipientName,
          recipientEmail,
          recipientPhone,
          expiresAt,
          payloadEncrypted: encryptPrivateData(JSON.stringify({
            guardianId,
            requestedItems,
          })),
        },
        select: { id: true, expiresAt: true },
      });

      await transaction.athleteDataAuditLog.create({
        data: {
          organizationId: context.organizationId,
          athleteId,
          actorUserId: context.user.id,
          action: "LINK_CREATED",
          entityType: "AthleteRegistrationRequest",
          entityId: created.id,
          metadataJson: JSON.stringify({
            validityDays,
            requestedItemCount: requestedItems.length,
            requestedItemKeys: requestedItems.map((item) => item.key),
          }),
        },
      });

      return created;
    });

    const origin = new URL(request.url).origin;
    return NextResponse.json({
      id: registrationRequest.id,
      expiresAt: registrationRequest.expiresAt,
      link: `${origin}/envio-documentos/${rawToken}`,
    });
  } catch (error) {
    console.error("REGISTRATION_REQUEST_CREATE_ERROR", error);
    return NextResponse.json({ error: "Não foi possível gerar o link." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await authenticatedContext();
    if (!context) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const requestId = clean(body.requestId);
    const athleteId = clean(body.athleteId);
    if (!requestId || !athleteId) {
      return NextResponse.json({ error: "Convite inválido." }, { status: 400 });
    }

    const existing = await prisma.athleteRegistrationRequest.findFirst({
      where: {
        id: requestId,
        athleteId,
        organizationId: context.organizationId,
        status: "PENDING",
      },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Convite ativo não encontrado." }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.athleteRegistrationRequest.update({
        where: { id: requestId },
        data: { status: "REVOKED", revokedAt: new Date() },
      }),
      prisma.athleteDataAuditLog.create({
        data: {
          organizationId: context.organizationId,
          athleteId,
          actorUserId: context.user.id,
          action: "LINK_REVOKED",
          entityType: "AthleteRegistrationRequest",
          entityId: requestId,
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("REGISTRATION_REQUEST_REVOKE_ERROR", error);
    return NextResponse.json({ error: "Não foi possível revogar o link." }, { status: 500 });
  }
}
