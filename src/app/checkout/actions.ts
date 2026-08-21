"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  asaasIsSandbox,
  createAsaasPlayerPremiumCheckout,
  readAsaasData,
  writeAsaasData,
} from "@/lib/asaas";

const APP_URL = (process.env.APP_URL || "https://www.onzeup.com.br").replace(
  /\/$/,
  "",
);

export async function createPlayerPremiumAsaas(formData: FormData) {
  const user = await requireUser();

  if (user.role !== "GUARDIAN") {
    redirect("/responsavel");
  }

  const playerId = String(formData.get("playerId") || "");

  const guardian = await prisma.guardianProfile.findUnique({
    where: { userId: user.id },
  });

  if (!guardian) {
    redirect("/responsavel");
  }

  const player = await prisma.playerProfile.findFirst({
    where: {
      id: playerId,
      guardianId: guardian.id,
    },
  });

  if (!player) {
    redirect("/responsavel");
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
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    const saved = readAsaasData(existing.pixPayload);
    if (saved.checkoutUrl) {
      redirect(saved.checkoutUrl);
    }
  }

  const localReference = `ASAAS${Date.now()}${Math.random()
    .toString(36)
    .slice(2, 8)}`.toUpperCase();

  const payment =
    existing ||
    (await prisma.payment.create({
      data: {
        userId: user.id,
        playerId,
        product: "PLAYER_PREMIUM_MONTHLY",
        amountCents: 2990,
        method: "ASAAS",
        pixTxid: localReference,
        note: `ONZEUP Player Premium - ${player.name}`,
      },
    }));

  const returnBase = `${APP_URL}/checkout/asaas/retorno`;

  try {
    const checkout = await createAsaasPlayerPremiumCheckout({
      externalReference: payment.id,
      playerName: player.name,
      successUrl: `${returnBase}?status=success&paymentId=${encodeURIComponent(
        payment.id,
      )}`,
      cancelUrl: `${returnBase}?status=cancel&paymentId=${encodeURIComponent(
        payment.id,
      )}`,
      expiredUrl: `${returnBase}?status=expired&paymentId=${encodeURIComponent(
        payment.id,
      )}`,
    });

    if (!checkout.link) {
      throw new Error("Asaas não retornou o link do checkout.");
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        pixPayload: writeAsaasData({
          provider: "ASAAS",
          environment: asaasIsSandbox() ? "SANDBOX" : "PRODUCTION",
          checkoutId: checkout.id,
          checkoutUrl: checkout.link,
          checkoutStatus: checkout.status || "ACTIVE",
          processedEventIds: [],
        }),
      },
    });

    await prisma.playerProfile.update({
      where: { id: player.id },
      data: { planStatus: "AWAITING_PAYMENT" },
    });

    redirect(checkout.link);
  } catch (error) {
    console.error(
      "PLAYER_PREMIUM_ASAAS_CREATE_ERROR",
      error instanceof Error ? error.message : error,
    );

    redirect(`/responsavel?player=${player.id}&paymentStatus=erro`);
  }
}

// Compatibilidade com a tela atual.
export async function createPlayerPremiumPix(formData: FormData) {
  return createPlayerPremiumAsaas(formData);
}

export async function createPlayerPremiumMercadoPago(formData: FormData) {
  return createPlayerPremiumAsaas(formData);
}
