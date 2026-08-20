"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  createPlayerPremiumSubscription,
  readProviderData,
  writeProviderData,
} from "@/lib/mercadopago";

const APP_URL = (process.env.APP_URL || "https://www.onzeup.com.br").replace(/\/$/, "");

export async function createPlayerPremiumMercadoPago(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "GUARDIAN") redirect("/responsavel");

  const playerId = String(formData.get("playerId") || "");
  const guardian = await prisma.guardianProfile.findUnique({
    where: { userId: user.id },
  });
  if (!guardian) redirect("/responsavel");

  const player = await prisma.playerProfile.findFirst({
    where: { id: playerId, guardianId: guardian.id },
  });
  if (!player) redirect("/responsavel");

  if (player.plan === "PREMIUM" && player.planStatus === "ACTIVE") {
    redirect(`/responsavel?player=${player.id}`);
  }

  const existing = await prisma.payment.findFirst({
    where: {
      userId: user.id,
      playerId,
      product: "PLAYER_PREMIUM_MONTHLY",
      status: "PENDING",
      method: "MERCADOPAGO",
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    const saved = readProviderData(existing.pixPayload);
    if (saved.checkoutUrl) redirect(saved.checkoutUrl);
  }

  const localReference = `MP${Date.now()}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();

  const payment = existing || await prisma.payment.create({
    data: {
      userId: user.id,
      playerId,
      product: "PLAYER_PREMIUM_MONTHLY",
      amountCents: 2990,
      method: "MERCADOPAGO",
      pixTxid: localReference,
      note: `ONZEUP Player Premium - ${player.name}`,
    },
  });

  const backUrl =
    `${APP_URL}/checkout/mercadopago/retorno?paymentId=${encodeURIComponent(payment.id)}`;

  try {
    const subscription = await createPlayerPremiumSubscription({
      payerEmail: user.email,
      externalReference: payment.id,
      playerName: player.name,
      backUrl,
    });

    if (!subscription.init_point) {
      throw new Error("Mercado Pago não retornou o link do checkout.");
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        pixPayload: writeProviderData({
          provider: "MERCADOPAGO",
          subscriptionId: subscription.id,
          checkoutUrl: subscription.init_point,
          subscriptionStatus: subscription.status,
          processedPaymentIds: [],
        }),
      },
    });

    await prisma.playerProfile.update({
      where: { id: player.id },
      data: { planStatus: "AWAITING_PAYMENT" },
    });

    redirect(subscription.init_point);
  } catch (error) {
    console.error(
      "PLAYER_PREMIUM_MERCADOPAGO_CREATE_ERROR",
      error instanceof Error ? error.message : error,
    );

    redirect(`/responsavel?player=${player.id}&paymentStatus=erro`);
  }
}

// Mantido temporariamente para não quebrar referências antigas.
export async function createPlayerPremiumPix(formData: FormData) {
  return createPlayerPremiumMercadoPago(formData);
}
