import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { hasClubPermission } from "@/lib/club-permissions";
import { encryptPrivateData } from "@/lib/private-data-crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function hashToken(token: string) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (
      !user?.organizationId ||
      !hasClubPermission(user, "ATHLETES_EDIT")
    ) {
      return NextResponse.json(
        { error: "Acesso não autorizado." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as Record<
      string,
      unknown
    >;

    const categoryId =
      clean(body.categoryId) || null;

    const recipientName =
      clean(body.recipientName) || null;

    const recipientEmail =
      clean(body.recipientEmail) || null;

    const recipientPhone =
      clean(body.recipientPhone) || null;

    const validityDays = Math.min(
      30,
      Math.max(
        1,
        Number(body.validityDays) || 7,
      ),
    );

    if (
      !recipientName ||
      (!recipientEmail && !recipientPhone)
    ) {
      return NextResponse.json(
        {
          error:
            "Informe o responsável e pelo menos WhatsApp ou e-mail.",
        },
        { status: 400 },
      );
    }

    if (categoryId) {
      const category =
        await prisma.category.findFirst({
          where: {
            id: categoryId,
            organizationId:
              user.organizationId,
            active: true,
          },
          select: {
            id: true,
          },
        });

      if (!category) {
        return NextResponse.json(
          { error: "Categoria inválida." },
          { status: 400 },
        );
      }
    }

    const rawToken = crypto
      .randomBytes(32)
      .toString("base64url");

    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() + validityDays,
    );

    const created =
      await prisma.athletePreRegistrationRequest.create({
        data: {
          organizationId:
            user.organizationId,
          categoryId,
          createdByUserId: user.id,
          tokenHash: hashToken(rawToken),
          recipientName,
          recipientEmail,
          recipientPhone,
          expiresAt,

          payloadEncrypted:
            encryptPrivateData(
              JSON.stringify({
                version: 1,
                source: "CLUB_INVITATION",
              }),
            ),
        },

        select: {
          id: true,
          expiresAt: true,
        },
      });

    const origin =
      new URL(request.url).origin;

    return NextResponse.json({
      id: created.id,
      expiresAt: created.expiresAt,
      link: `${origin}/cadastro-atleta/${rawToken}`,
    });
  } catch (error) {
    console.error(
      "ATHLETE_PRE_REGISTRATION_CREATE_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível gerar o link de cadastro.",
      },
      { status: 500 },
    );
  }
}
