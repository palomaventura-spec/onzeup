import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  getAsaasCheckout,
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

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "GUARDIAN") {
      return NextResponse.json(
        { error: "Não autorizado." },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => null)) as
      | { paymentId?: string }
      | null;

    const paymentId = String(body?.paymentId || "").trim();

    if (!paymentId) {
      return NextResponse.json(
        { error: "paymentId ausente." },
        { status: 400 },
      );
    }

    const local = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        userId: user.id,
        method: "ASAAS",
      },
      include: { player: true },
    });

    if (!local) {
      return NextResponse.json(
        { error: "Pagamento não encontrado." },
        { status: 404 },
      );
    }

    const saved = readAsaasData(local.pixPayload);

    if (!saved.checkoutId) {
      return NextResponse.json(
        { error: "Checkout Asaas não encontrado no pagamento." },
        { status: 409 },
      );
    }

    const checkout = await getAsaasCheckout(saved.checkoutId);
    const status = String(checkout.status || "").toUpperCase();

    console.info("ASAAS_SYNC_CHECKOUT_STATUS", {
      localPaymentId: local.id,
      checkoutId: saved.checkoutId,
      checkoutStatus: status,
      externalReference: checkout.externalReference || null,
    });

    if (status !== "PAID") {
      await prisma.payment.update({
        where: { id: local.id },
        data: {
          pixPayload: writeAsaasData({
            ...saved,
            checkoutStatus: status || saved.checkoutStatus,
            lastEvent: "MANUAL_CHECKOUT_SYNC_PENDING",
          }),
        },
      });

      return NextResponse.json({
        ok: true,
        paid: false,
        checkoutStatus: status,
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
            lastEvent: "MANUAL_CHECKOUT_SYNC_PAID",
          }),
        },
      }),

      ...(local.playerId
        ? [
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
          ]
        : []),
    ]);

    console.info("ASAAS_SYNC_PLAYER_PREMIUM_ACTIVATED", {
      localPaymentId: local.id,
      checkoutId: saved.checkoutId,
      playerId: local.playerId,
      checkoutStatus: status,
      alreadyPaid,
    });

    return NextResponse.json({
      ok: true,
      paid: true,
      checkoutStatus: status,
      playerId: local.playerId,
    });
  } catch (error) {
    console.error(
      "ASAAS_SYNC_ERROR",
      error instanceof Error ? error.message : error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível consultar o status do checkout no Asaas.",
      },
      { status: 502 },
    );
  }
}
