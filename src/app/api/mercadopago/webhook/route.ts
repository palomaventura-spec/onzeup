import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getMercadoPagoPayment,
  getMercadoPagoSubscription,
  readProviderData,
  validateMercadoPagoWebhook,
  writeProviderData,
} from "@/lib/mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function addMonth(base?: Date | null) {
  const start = base && base.getTime() > Date.now() ? new Date(base) : new Date();
  start.setDate(start.getDate() + 31);
  return start;
}

async function syncSubscription(resourceId: string) {
  const subscription = await getMercadoPagoSubscription(resourceId);
  const localId = String(subscription.external_reference || "");
  if (!localId) return;

  const payment = await prisma.payment.findUnique({
    where: { id: localId },
    include: { player: true },
  });
  if (!payment) return;

  const previous = readProviderData(payment.pixPayload);

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      pixPayload: writeProviderData({
        ...previous,
        provider: "MERCADOPAGO",
        subscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
      }),
    },
  });

  if (!payment.playerId) return;

  if (subscription.status === "cancelled" || subscription.status === "canceled") {
    await prisma.playerProfile.update({
      where: { id: payment.playerId },
      data: { planStatus: "CANCELLED" },
    });
  } else if (subscription.status === "paused") {
    await prisma.playerProfile.update({
      where: { id: payment.playerId },
      data: { planStatus: "PAUSED" },
    });
  } else if (subscription.status === "authorized") {
    // A autorização confirma a assinatura, mas o Premium só é liberado
    // definitivamente quando chegar um pagamento aprovado.
    await prisma.playerProfile.update({
      where: { id: payment.playerId },
      data: { planStatus: "AWAITING_PAYMENT" },
    });
  }
}

async function syncPayment(resourceId: string) {
  const mp = await getMercadoPagoPayment(resourceId);
  const localId = String(mp.external_reference || "");
  if (!localId) return;

  const payment = await prisma.payment.findUnique({
    where: { id: localId },
    include: { player: true },
  });
  if (!payment) return;

  const previous = readProviderData(payment.pixPayload);
  const processed = new Set(previous.processedPaymentIds || []);
  const providerPaymentId = String(mp.id);

  if (mp.status === "approved" && !processed.has(providerPaymentId)) {
    processed.add(providerPaymentId);

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          confirmedAt: new Date(),
          pixPayload: writeProviderData({
            ...previous,
            provider: "MERCADOPAGO",
            processedPaymentIds: Array.from(processed).slice(-24),
            lastPaymentId: providerPaymentId,
            lastPaymentStatus: mp.status,
          }),
        },
      }),
      ...(payment.playerId
        ? [
            prisma.playerProfile.update({
              where: { id: payment.playerId },
              data: {
                plan: "PREMIUM",
                planStatus: "ACTIVE",
                premiumUntil: addMonth(payment.player?.premiumUntil),
              },
            }),
          ]
        : []),
    ]);

    return;
  }

  const cancelled = ["cancelled", "canceled", "rejected", "refunded", "charged_back"].includes(mp.status);

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      ...(cancelled && payment.status !== "PAID" ? { status: "CANCELLED" as const } : {}),
      pixPayload: writeProviderData({
        ...previous,
        processedPaymentIds: Array.from(processed).slice(-24),
        lastPaymentId: providerPaymentId,
        lastPaymentStatus: mp.status,
      }),
    },
  });
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    let dataId =
      url.searchParams.get("data.id") ||
      url.searchParams.get("data_id") ||
      url.searchParams.get("id");

    const body = await request.json().catch(() => null) as
      | { type?: string; topic?: string; data?: { id?: string | number } }
      | null;

    if (!dataId && body?.data?.id != null) {
      dataId = String(body.data.id);
    }

    const signatureOk = validateMercadoPagoWebhook({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
    });

    if (!signatureOk) {
      console.warn("MERCADOPAGO_WEBHOOK_INVALID_SIGNATURE", {
        dataId,
        type: body?.type || body?.topic,
      });
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const type =
      url.searchParams.get("type") ||
      url.searchParams.get("topic") ||
      body?.type ||
      body?.topic ||
      "";

    if (!dataId) {
      return NextResponse.json({ ok: true, ignored: "missing-data-id" });
    }

    if (type === "payment") {
      await syncPayment(dataId);
    } else if (type === "subscription_preapproval") {
      await syncSubscription(dataId);
    } else if (type === "subscription_authorized_payment") {
      // O evento de invoice é útil para auditoria; a liberação do plano
      // continua baseada no evento payment aprovado.
      console.info("MERCADOPAGO_AUTHORIZED_PAYMENT_EVENT", { dataId });
    } else {
      console.info("MERCADOPAGO_WEBHOOK_IGNORED", { type, dataId });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      "MERCADOPAGO_WEBHOOK_ERROR",
      error instanceof Error ? error.message : error,
    );

    // 500 faz o Mercado Pago tentar novamente.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
