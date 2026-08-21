import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  listAsaasPaymentsByCheckout,
  readAsaasData,
  writeAsaasData,
} from "@/lib/asaas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function addMonth(base?: Date | null) {
  const start =
    base && base.getTime() > Date.now() ? new Date(base) : new Date();
  start.setMonth(start.getMonth() + 1);
  return start;
}

const PAID_STATUSES = new Set([
  "CONFIRMED",
  "RECEIVED",
  "RECEIVED_IN_CASH",
]);

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "GUARDIAN") {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
      | { paymentId?: string }
      | null;

    const paymentId = String(body?.paymentId || "").trim();

    if (!paymentId) {
      return NextResponse.json({ error: "paymentId ausente." }, { status: 400 });
    }

    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        userId: user.id,
        method: "ASAAS",
      },
      include: { player: true },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Pagamento não encontrado." },
        { status: 404 },
      );
    }

    const provider = readAsaasData(payment.pixPayload);

    if (!provider.checkoutId) {
      return NextResponse.json(
        { error: "Checkout Asaas não encontrado." },
        { status: 409 },
      );
    }

    const result = await listAsaasPaymentsByCheckout(provider.checkoutId);
    const payments = result.data || [];

    console.info("ASAAS_SYNC_PAYMENTS", {
      localPaymentId: payment.id,
      checkoutId: provider.checkoutId,
      count: payments.length,
      statuses: payments.map((item) => item.status),
    });

    const paidPayment = payments.find((item) =>
      PAID_STATUSES.has(String(item.status || "").toUpperCase()),
    );

    if (!paidPayment) {
      const latest = payments[0];

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          pixPayload: writeAsaasData({
            ...provider,
            lastEvent: "MANUAL_SYNC_PENDING",
            lastPaymentId: latest?.id || provider.lastPaymentId,
            lastPaymentStatus:
              latest?.status || provider.lastPaymentStatus,
            subscriptionId:
              latest?.subscription || provider.subscriptionId,
          }),
        },
      });

      return NextResponse.json({
        ok: true,
        paid: false,
        statuses: payments.map((item) => item.status),
      });
    }

    const alreadyPaid = payment.status === "PAID";

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          confirmedAt: payment.confirmedAt || new Date(),
          pixPayload: writeAsaasData({
            ...provider,
            checkoutStatus: "PAID",
            subscriptionId:
              paidPayment.subscription || provider.subscriptionId,
            lastEvent: "MANUAL_SYNC_PAID",
            lastPaymentId: paidPayment.id,
            lastPaymentStatus: paidPayment.status || "CONFIRMED",
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
                premiumUntil: alreadyPaid
                  ? payment.player?.premiumUntil
                  : addMonth(payment.player?.premiumUntil),
              },
            }),
          ]
        : []),
    ]);

    console.info("ASAAS_SYNC_PLAYER_PREMIUM_ACTIVATED", {
      localPaymentId: payment.id,
      asaasPaymentId: paidPayment.id,
      playerId: payment.playerId,
      status: paidPayment.status,
      alreadyPaid,
    });

    return NextResponse.json({
      ok: true,
      paid: true,
      status: paidPayment.status,
      playerId: payment.playerId,
    });
  } catch (error) {
    console.error(
      "ASAAS_SYNC_ERROR",
      error instanceof Error ? error.message : error,
    );

    return NextResponse.json(
      { error: "Não foi possível sincronizar o pagamento com o Asaas." },
      { status: 502 },
    );
  }
}
