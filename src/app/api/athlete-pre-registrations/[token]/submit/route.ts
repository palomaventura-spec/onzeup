import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { encryptPrivateData } from "@/lib/private-data-crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function hashToken(value: string) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

function nullableNumber(value: string) {
  if (!value) return null;

  const normalized = value
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{ token: string }>;
  },
) {
  try {
    const { token } = await context.params;

    if (!token) {
      return NextResponse.json(
        { error: "Link inválido." },
        { status: 400 },
      );
    }

    const invitation =
      await prisma.athletePreRegistrationRequest.findUnique({
        where: {
          tokenHash: hashToken(token),
        },
        select: {
          id: true,
          status: true,
          expiresAt: true,
          recipientName: true,
          recipientEmail: true,
          recipientPhone: true,
          categoryId: true,
        },
      });

    if (!invitation) {
      return NextResponse.json(
        {
          error:
            "Este link não existe ou não está mais disponível.",
        },
        { status: 404 },
      );
    }

    if (invitation.status === "REVOKED") {
      return NextResponse.json(
        {
          error:
            "Este link foi cancelado pelo clube.",
        },
        { status: 410 },
      );
    }

    if (
      invitation.status === "EXPIRED" ||
      invitation.expiresAt < new Date()
    ) {
      if (invitation.status === "PENDING") {
        await prisma.athletePreRegistrationRequest.update({
          where: {
            id: invitation.id,
          },
          data: {
            status: "EXPIRED",
          },
        });
      }

      return NextResponse.json(
        {
          error:
            "Este link expirou. Solicite um novo link ao clube.",
        },
        { status: 410 },
      );
    }

    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        {
          error:
            "Este cadastro já foi enviado ao clube.",
        },
        { status: 409 },
      );
    }

    const body = (await request.json()) as {
      athlete?: {
        name?: unknown;
        identity?: unknown;
        cpf?: unknown;
        birthDate?: unknown;
        height?: unknown;
        weight?: unknown;
        category?: unknown;
        position1?: unknown;
        position2?: unknown;
      };

      family?: {
        fatherName?: unknown;
        motherName?: unknown;
        address?: unknown;
        email?: unknown;
        phone1?: unknown;
        phone2?: unknown;
      };

      health?: {
        hasHealthPlan?: unknown;
        healthPlanName?: unknown;
        susCard?: unknown;
      };

      sportsHistory?: {
        lastClub?: unknown;
        registeredClubs?: unknown;
        amateurBond?: unknown;
        referral?: unknown;
        intermediary?: unknown;
        arrivalDate?: unknown;
      };

      guardian?: {
        name?: unknown;
        phone?: unknown;
        email?: unknown;
        accepted?: unknown;
      };
    };

    const athlete = {
      name: clean(body.athlete?.name),
      identity: clean(body.athlete?.identity),
      cpf: clean(body.athlete?.cpf),
      birthDate: clean(body.athlete?.birthDate),
      height: clean(body.athlete?.height),
      weight: clean(body.athlete?.weight),
      category: clean(body.athlete?.category),
      position1: clean(body.athlete?.position1),
      position2: clean(body.athlete?.position2),
    };

    const family = {
      fatherName: clean(body.family?.fatherName),
      motherName: clean(body.family?.motherName),
      address: clean(body.family?.address),
      email: clean(body.family?.email),
      phone1: clean(body.family?.phone1),
      phone2: clean(body.family?.phone2),
    };

    const health = {
      hasHealthPlan:
        body.health?.hasHealthPlan === true,
      healthPlanName: clean(
        body.health?.healthPlanName,
      ),
      susCard: clean(body.health?.susCard),
    };

    const sportsHistory = {
      lastClub: clean(
        body.sportsHistory?.lastClub,
      ),
      registeredClubs: clean(
        body.sportsHistory?.registeredClubs,
      ),
      amateurBond:
        body.sportsHistory?.amateurBond === true,
      referral: clean(
        body.sportsHistory?.referral,
      ),
      intermediary: clean(
        body.sportsHistory?.intermediary,
      ),
      arrivalDate: clean(
        body.sportsHistory?.arrivalDate,
      ),
    };

    const guardian = {
      name: clean(body.guardian?.name),
      phone: clean(body.guardian?.phone),
      email: clean(body.guardian?.email),
      accepted:
        body.guardian?.accepted === true,
    };

    if (!athlete.name) {
      return NextResponse.json(
        {
          error:
            "Informe o nome completo do atleta.",
        },
        { status: 400 },
      );
    }

    if (!athlete.birthDate) {
      return NextResponse.json(
        {
          error:
            "Informe a data de nascimento.",
        },
        { status: 400 },
      );
    }

    const birthDate = new Date(
      `${athlete.birthDate}T12:00:00`,
    );

    if (Number.isNaN(birthDate.getTime())) {
      return NextResponse.json(
        {
          error:
            "Data de nascimento inválida.",
        },
        { status: 400 },
      );
    }

    if (birthDate > new Date()) {
      return NextResponse.json(
        {
          error:
            "A data de nascimento não pode estar no futuro.",
        },
        { status: 400 },
      );
    }

    if (!guardian.name) {
      return NextResponse.json(
        {
          error:
            "Informe o responsável pelo cadastro.",
        },
        { status: 400 },
      );
    }

    if (!guardian.phone && !guardian.email) {
      return NextResponse.json(
        {
          error:
            "Informe WhatsApp ou e-mail do responsável.",
        },
        { status: 400 },
      );
    }

    if (!guardian.accepted) {
      return NextResponse.json(
        {
          error:
            "É necessário confirmar a responsabilidade pelas informações.",
        },
        { status: 400 },
      );
    }

    const height = nullableNumber(
      athlete.height,
    );

    const weight = nullableNumber(
      athlete.weight,
    );

    const payload = {
      version: 2,

      source:
        "ATHLETE_PRE_REGISTRATION",

      submittedAt:
        new Date().toISOString(),

      athlete: {
        name: athlete.name,

        identity:
          athlete.identity || null,

        cpf:
          athlete.cpf || null,

        birthDate:
          athlete.birthDate,

        birthYear:
          birthDate.getFullYear(),

        height,

        weight,

        category:
          athlete.category || null,

        position1:
          athlete.position1 || null,

        position2:
          athlete.position2 || null,
      },

      family: {
        fatherName:
          family.fatherName || null,

        motherName:
          family.motherName || null,

        address:
          family.address || null,

        email:
          family.email || null,

        phone1:
          family.phone1 || null,

        phone2:
          family.phone2 || null,
      },

      health: {
        hasHealthPlan:
          health.hasHealthPlan,

        healthPlanName:
          health.healthPlanName || null,

        susCard:
          health.susCard || null,
      },

      sportsHistory: {
        lastClub:
          sportsHistory.lastClub || null,

        registeredClubs:
          sportsHistory.registeredClubs || null,

        amateurBond:
          sportsHistory.amateurBond,

        referral:
          sportsHistory.referral || null,

        intermediary:
          sportsHistory.intermediary || null,

        arrivalDate:
          sportsHistory.arrivalDate || null,
      },

      guardian: {
        name: guardian.name,

        phone:
          guardian.phone || null,

        email:
          guardian.email || null,

        accepted:
          guardian.accepted,
      },

      invitation: {
        categoryId:
          invitation.categoryId,
      },
    };

    const updated =
      await prisma.athletePreRegistrationRequest.updateMany({
        where: {
          id: invitation.id,
          status: "PENDING",
        },

        data: {
          status: "SUBMITTED",

          submittedAt:
            new Date(),

          payloadEncrypted:
            encryptPrivateData(
              JSON.stringify(payload),
            ),

          recipientName:
            guardian.name,

          recipientEmail:
            guardian.email ||
            family.email ||
            invitation.recipientEmail,

          recipientPhone:
            guardian.phone ||
            family.phone1 ||
            invitation.recipientPhone,
        },
      });

    if (updated.count !== 1) {
      return NextResponse.json(
        {
          error:
            "Este cadastro já foi enviado ou não está mais disponível.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      ok: true,
      message:
        "Cadastro enviado com sucesso.",
    });
  } catch (error) {
    console.error(
      "ATHLETE_PRE_REGISTRATION_SUBMIT_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível enviar o cadastro.",
      },
      { status: 500 },
    );
  }
}