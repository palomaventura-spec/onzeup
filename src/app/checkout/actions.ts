"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

import {
  asaasIsSandbox,
  createAsaasPlayerPremiumCheckout,
  createAsaasPlayerPremiumPixCheckout,
  readAsaasData,
  writeAsaasData,
} from "@/lib/asaas";

const APP_URL = (
  process.env.APP_URL || "https://www.onzeup.com.br"
).replace(/\/$/, "");

async function createPlayerPremium(
  formData: FormData,
  paymentMethod: "CARD" | "PIX",
) {
  const user = await requireUser();

  if (user.role !== "GUARDIAN") {
    redirect("/responsavel");
  }

  const playerId = String(formData.get("playerId") || "").trim();

  if (!playerId) {
    redirect("/responsavel?paymentStatus=erro");
  }

  const guardian = await prisma.guardianProfile.findUnique({
    where: {
      userId: user.id,
    },
  });

  if (!guardian) {
    redirect("/responsavel?paymentStatus=erro");
  }

  const player = await prisma.playerProfile.findFirst({
    where: {
      id: playerId,
      guardianId: guardian.id,
    },
  });

  if (!player) {
    redirect("/responsavel?paymentStatus=erro");
  }

  if (player.plan === "PREMIUM" && player.planStatus === "ACTIVE") {
    redirect(`/responsavel?player=${player.id}`);
  }

  const existing = await prisma.payment.findFirst({
    where: {
      userId: user.id,
      playerId,
      product: "PLAYER_PREMIUM_MONTHLY",
      status: "PENDING",
      method: "ASAAS",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (existing) {
    const saved = readAsaasData(existing.pixPayload);

    if (
      saved.checkoutUrl &&
      (!saved.paymentMethod || saved.paymentMethod === paymentMethod)
    ) {
      redirect(saved.checkoutUrl);
    }
  }

  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      playerId,
      product: "PLAYER_PREMIUM_MONTHLY",
      amountCents: 2990,
      method: "ASAAS",
      pixTxid: `ASAAS${Date.now()}${Math.random()
        .toString(36)
        .slice(2, 8)}`.toUpperCase(),
      note: `ONZEUP Player Premium - ${player.name}`,
    },
  });

  const returnBase = `${APP_URL}/checkout/asaas/retorno`;

  let checkoutLink = "";

  try {
    const common = {
      externalReference: payment.id,
      playerName: player.name,

      successUrl: `${returnBase}?status=success&paymentId=${encodeURIComponent(
        payment.id,
      )}&origin=player`,

      cancelUrl: `${returnBase}?status=cancel&paymentId=${encodeURIComponent(
        payment.id,
      )}&origin=player`,

      expiredUrl: `${returnBase}?status=expired&paymentId=${encodeURIComponent(
        payment.id,
      )}&origin=player`,
    };

    const checkout =
      paymentMethod === "PIX"
        ? await createAsaasPlayerPremiumPixCheckout(common)
        : await createAsaasPlayerPremiumCheckout(common);

    if (!checkout.link) {
      throw new Error("Asaas não retornou o link do checkout.");
    }

    checkoutLink = checkout.link;

    await prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        pixPayload: writeAsaasData({
          provider: "ASAAS",
          environment: asaasIsSandbox() ? "SANDBOX" : "PRODUCTION",
          checkoutId: checkout.id,
          checkoutUrl: checkout.link,
          checkoutStatus: checkout.status || "ACTIVE",
          processedEventIds: [],
          paymentMethod,
          billingCycle: "MONTHLY",
        }),
      },
    });

    await prisma.playerProfile.update({
      where: {
        id: player.id,
      },
      data: {
        planStatus: "AWAITING_PAYMENT",
      },
    });
  } catch (error) {
    console.error(
      "PLAYER_PREMIUM_ASAAS_CREATE_ERROR",
      error instanceof Error ? error.message : error,
    );

    await prisma.payment
      .update({
        where: {
          id: payment.id,
        },
        data: {
          status: "CANCELLED",
          note: `Falha ao criar checkout Asaas - ${player.name}`,
        },
      })
      .catch(() => null);

    redirect(
      `/responsavel?player=${encodeURIComponent(
        player.id,
      )}&paymentStatus=erro`,
    );
  }

  if (!checkoutLink) {
    redirect(
      `/responsavel?player=${encodeURIComponent(
        player.id,
      )}&paymentStatus=erro`,
    );
  }

  redirect(checkoutLink);
}

export async function createPlayerPremiumAsaas(formData: FormData) {
  return createPlayerPremium(formData, "CARD");
}

export async function createPlayerPremiumPixAsaas(formData: FormData) {
  return createPlayerPremium(formData, "PIX");
}