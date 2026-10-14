import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { hasClubPermission } from "@/lib/club-permissions";
import { encryptPrivateData } from "@/lib/private-data-crypto";
import { prisma } from "@/lib/prisma";
import { sendTransactionalEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

type Category = (typeof CATEGORIES)[number];

type RequestedItem = {
  key: string;
  label: string;
  category: Category;
  subject: "ATHLETE" | "GUARDIAN";
  requirementId?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(input: string) {
  return input.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] || char);
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
    const sendEmail = body.sendEmail === true;
    const sendPlayer = body.sendPlayer === true;
    const requestedItems: RequestedItem[] = Array.isArray(body.requestedItems)
      ? body.requestedItems.flatMap((item) => {
          if (!item || typeof item !== "object") return [];
          const candidate = item as Record<string, unknown>;
          const key = clean(candidate.key).slice(0, 80);
          const label = clean(candidate.label).slice(0, 140);
          const categoryInput = clean(candidate.category);
          const subject = clean(candidate.subject).toUpperCase();
          const requirementId = clean(candidate.requirementId) || undefined;
          if (!/^[a-z0-9_-]+$/i.test(key) || !label || !CATEGORIES.includes(categoryInput as Category) || !["ATHLETE", "GUARDIAN"].includes(subject)) return [];
          return [{ key, label, category: categoryInput as Category, subject: subject as "ATHLETE" | "GUARDIAN", requirementId }];
        }).filter((item, index, all) => all.findIndex((other) => other.key === item.key) === index).slice(0, 30)
      : [];

    if (!athleteId || !recipientName || requestedItems.length === 0) {
      return NextResponse.json(
        { error: "Informe o destinatário e ao menos um documento solicitado." },
        { status: 400 }
      );
    }

    if (requestedItems.some((item) => item.subject === "GUARDIAN") && !guardianId) {
      return NextResponse.json(
        { error: "Selecione um responsável cadastrado para solicitar documentos dele." },
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

    let guardianEmail: string | null = null;
    if (guardianId) {
      const guardian = await prisma.athleteGuardian.findFirst({
        where: { id: guardianId, athleteId },
        select: { id: true, email: true },
      });
      if (!guardian) {
        return NextResponse.json({ error: "Responsável não encontrado." }, { status: 404 });
      }
      guardianEmail = guardian.email;
    }

    // Requisitos devem pertencer à organização e a uma categoria ativa do atleta.
    const declaredIds = [...new Set(requestedItems.map((item) => item.requirementId).filter((id): id is string => Boolean(id)))];
    if (declaredIds.length) {
      const valid = await prisma.categoryDocumentRequirement.findMany({
        where: {
          id: { in: declaredIds },
          organizationId: context.organizationId,
          active: true,
          category: {
            athleteMemberships: {
              some: { athleteId, organizationId: context.organizationId, status: "ACTIVE" },
            },
          },
        },
        select: { id: true, documentCategory: true, subject: true },
      });
      const validMap = new Map(valid.map((item) => [item.id, item]));
      for (const item of requestedItems) {
        if (!item.requirementId) continue;
        const requirement = validMap.get(item.requirementId);
        if (!requirement || requirement.documentCategory !== item.category || requirement.subject !== item.subject) {
          return NextResponse.json({ error: "Um dos documentos solicitados não corresponde aos requisitos ativos do atleta." }, { status: 400 });
        }
      }
    }

    // Comunicar somente o responsável do Player que corresponda ao destinatário.
    const deliveryEmail = (recipientEmail || guardianEmail || "").trim().toLowerCase();
    const playerLinks = sendPlayer && deliveryEmail
      ? await prisma.playerAthleteLink.findMany({
          where: {
            athleteId, verified: true, active: true,
            player: { guardian: { user: { email: { equals: deliveryEmail, mode: "insensitive" } } } },
          },
          select: { playerId: true },
        })
      : [];
    const playerIds = [...new Set(playerLinks.map((item) => item.playerId))];

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
            // Token acessível somente à rota privada do Player, após autenticação.
            ...(playerIds.length ? { playerAccessToken: rawToken } : {}),
          })),
        },
        select: { id: true, expiresAt: true },
      });

      if (playerIds.length) {
        const communication = await transaction.clubCommunication.create({
          data: {
            organizationId: context.organizationId,
            authorUserId: context.user.id,
            title: "Documentos pendentes — envio solicitado",
            body: [
              "O clube solicitou a atualização da documentação do atleta.",
              "", "Documentos solicitados:",
              ...requestedItems.map((item) => `• ${item.label}`),
              "", "Use o botão Enviar documentos neste comunicado.",
              `[DOCUMENT_REQUEST:${created.id}]`,
            ].join("\n"),
            audienceType: "ATHLETE",
            targetAthleteId: athleteId,
            recipients: {
              create: playerIds.map((playerId) => ({ athleteId, playerId })),
            },
          },
        });
        void communication;
      }

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
    const link = `${origin}/envio-documentos/${rawToken}`;
    let emailStatus: "not_requested" | "sent" | "failed" = "not_requested";

    if (sendEmail) {
      if (!deliveryEmail) {
        emailStatus = "failed";
      } else {
        const list = requestedItems.map((item) => `<li>${escapeHtml(item.label)}</li>`).join("");
        const result = await sendTransactionalEmail({
          to: deliveryEmail,
          subject: "11UP Club — Documentos pendentes",
          html: `<p>Olá, ${escapeHtml(recipientName)}!</p><p>O clube solicitou os documentos abaixo para atualização do cadastro esportivo.</p><ul>${list}</ul><p><a href="${escapeHtml(link)}">Enviar documentos em ambiente seguro</a></p><p>O link é individual, não deve ser compartilhado e expira em ${validityDays} dia(s).</p><p>Se você não reconhece esta solicitação, entre em contato com o clube.</p>`,
        });
        emailStatus = result.ok ? "sent" : "failed";
      }
    }

    if (sendEmail) {
      await prisma.athleteDataAuditLog.create({
        data: {
          organizationId: context.organizationId,
          athleteId,
          actorUserId: context.user.id,
          action: "UPDATED",
          entityType: "AthleteRegistrationRequest",
          entityId: registrationRequest.id,
          metadataJson: JSON.stringify({ notificationChannel: "EMAIL", notificationResult: emailStatus }),
        },
      }).catch((error) => console.error("DOCUMENT_NOTIFICATION_AUDIT_ERROR", error));
    }

    return NextResponse.json({
      id: registrationRequest.id,
      expiresAt: registrationRequest.expiresAt,
      link,
      emailStatus,
      playerStatus: sendPlayer ? (playerIds.length ? "sent" : "not_linked") : "not_requested",
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
