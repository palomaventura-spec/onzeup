import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  listAsaasSubscriptionsByExternalReference,
  listAsaasSubscriptionPayments,
  readAsaasData,
  writeAsaasData,
} from "@/lib/asaas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAID = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]);

function addMonth(base?: Date | null) {
  const start = base && base.getTime() > Date.now() ? new Date(base) : new Date();
  start.setMonth(start.getMonth() + 1);
  return start;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "GUARDIAN") {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const body = await request.json().catch(() => null) as { paymentId?: string } | null;
    const paymentId = String(body?.paymentId || "").trim();
    if (!paymentId) {
      return NextResponse.json({ error: "paymentId ausente." }, { status: 400 });
    }

    const local = await prisma.payment.findFirst({
      where: { id: paymentId, userId: user.id, method: "ASAAS" },
      include: { player: true },
    });

    if (!local) {
      return NextResponse.json({ error: "Pagamento não encontrado." }, { status: 404 });
    }

    const saved = readAsaasData(local.pixPayload);

    // O checkout foi criado com externalReference = payment.id.
    // No checkout recorrente, a assinatura criada pelo Asaas pode ser localizada
    // posteriormente por essa mesma referência externa.
    const subscriptionsResult =
      await listAsaasSubscriptionsByExternalReference(local.id);
    const subscriptions = subscriptionsResult.data || [];

    console.info("ASAAS_SYNC_SUBSCRIPTIONS", {
      localPaymentId: local.id,
      count: subscriptions.length,
      subscriptions: subscriptions.map((s) => ({
        id: s.id,
        status: s.status,
        externalReference: s.externalReference,
      })),
    });

    const subscription =
      subscriptions.find((s) => s.externalReference === local.id) ||
      subscriptions[0];

    if (!subscription?.id) {
      return NextResponse.json({
        ok: true,
        paid: false,
        reason: "subscription-not-found",
      });
    }

    const paymentsResult = await listAsaasSubscriptionPayments(subscription.id);
    const payments = paymentsResult.data || [];

    console.info("ASAAS_SYNC_SUBSCRIPTION_PAYMENTS", {
      localPaymentId: local.id,
      subscriptionId: subscription.id,
      count: payments.length,
      statuses: payments.map((p) => p.status),
    });

    const paidPayment = payments.find((p) =>
      PAID.has(String(p.status || "").toUpperCase()),
    );

    if (!paidPayment) {
      const latest = payments[0];
      await prisma.payment.update({
        where: { id: local.id },
        data: {
          pixPayload: writeAsaasData({
            ...saved,
            subscriptionId: subscription.id,
            lastEvent: "MANUAL_SYNC_PENDING",
            lastPaymentId: latest?.id || saved.lastPaymentId,
            lastPaymentStatus: latest?.status || saved.lastPaymentStatus,
          }),
        },
      });

      return NextResponse.json({
        ok: true,
        paid: false,
        reason: "no-paid-subscription-payment",
        subscriptionId: subscription.id,
        statuses: payments.map((p) => p.status),
      });
    }

    const alreadyPaid = local.status === "PAID";

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: local.id },
        data: {
          status: "PAID",
          confirmedAt: local.confirmedAt || new Date(),
          pixPayload: writeAsaasData({
            ...saved,
            checkoutStatus: "PAID",
            subscriptionId: subscription.id,
            lastEvent: "MANUAL_SUBSCRIPTION_SYNC_PAID",
            lastPaymentId: paidPayment.id,
            lastPaymentStatus: paidPayment.status || "CONFIRMED",
          }),
        },
      }),
      ...(local.playerId ? [
        prisma.playerProfile.update({
          where: { id: local.playerId },
          data: {
            plan: "PREMIUM",
            planStatus: "ACTIVE",
            premiumUntil: alreadyPaid
              ? local.player?.premiumUntil
              : addMonth(local.player?.premiumUntil),
          },
        }),
      ] : []),
    ]);

    console.info("ASAAS_SYNC_PLAYER_PREMIUM_ACTIVATED", {
      localPaymentId: local.id,
      subscriptionId: subscription.id,
      asaasPaymentId: paidPayment.id,
      playerId: local.playerId,
      status: paidPayment.status,
    });

    return NextResponse.json({
      ok: true,
      paid: true,
      subscriptionId: subscription.id,
      paymentStatus: paidPayment.status,
      playerId: local.playerId,
    });
  } catch (error) {
    console.error("ASAAS_SYNC_ERROR", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Não foi possível sincronizar o pagamento com o Asaas." },
      { status: 502 },
    );
  }
}
