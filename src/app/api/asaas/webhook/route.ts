import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readAsaasData, writeAsaasData } from "@/lib/asaas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function addMonth(base?: Date | null) {
  const start =
    base && base.getTime() > Date.now() ? new Date(base) : new Date();
  start.setMonth(start.getMonth() + 1);
  return start;
}

type AsaasWebhookBody = {
  id?: string;
  event?: string;
  checkout?: {
    id?: string;
    status?: string;
  };
  payment?: {
    id?: string;
    status?: string;
    checkoutSession?: string | null;
    subscription?: string | null;
    externalReference?: string | null;
  };
  subscription?: {
    id?: string;
    status?: string;
    externalReference?: string | null;
  };
};

async function findLocalPayment(body: AsaasWebhookBody) {
  const checkoutId =
    String(body.checkout?.id || body.payment?.checkoutSession || "").trim();

  const subscriptionId = String(
    body.payment?.subscription || body.subscription?.id || "",
  ).trim();

  const externalReference = String(
    body.payment?.externalReference ||
      body.subscription?.externalReference ||
      "",
  ).trim();

  if (externalReference) {
    const exact = await prisma.payment.findUnique({
      where: { id: externalReference },
      include: { player: true },
    });
    if (exact) return exact;
  }

  if (checkoutId) {
    const byCheckout = await prisma.payment.findFirst({
      where: {
        method: "ASAAS",
        pixPayload: { contains: `"checkoutId":"${checkoutId}"` },
      },
      include: { player: true },
      orderBy: { createdAt: "desc" },
    });
    if (byCheckout) return byCheckout;
  }

  if (subscriptionId) {
    const bySubscription = await prisma.payment.findFirst({
      where: {
        method: "ASAAS",
        pixPayload: { contains: `"subscriptionId":"${subscriptionId}"` },
      },
      include: { player: true },
      orderBy: { createdAt: "desc" },
    });
    if (bySubscription) return bySubscription;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const configuredToken = process.env.ASAAS_WEBHOOK_TOKEN;

    if (!configuredToken) {
      console.error("ASAAS_WEBHOOK_TOKEN_MISSING");
      return NextResponse.json({ ok: false }, { status: 503 });
    }

    const receivedToken = request.headers.get("asaas-access-token");

    if (!receivedToken || receivedToken !== configuredToken) {
      console.warn("ASAAS_WEBHOOK_INVALID_TOKEN");
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
      | AsaasWebhookBody
      | null;

    if (!body?.event || !body?.id) {
      return NextResponse.json({ ok: true, ignored: "invalid-body" });
    }

    const local = await findLocalPayment(body);

    if (!local) {
      console.info("ASAAS_WEBHOOK_NO_LOCAL_PAYMENT", {
        event: body.event,
        eventId: body.id,
        checkoutId: body.checkout?.id || body.payment?.checkoutSession,
        subscriptionId: body.payment?.subscription || body.subscription?.id,
      });

      return NextResponse.json({ ok: true, ignored: "not-found" });
    }

    const previous = readAsaasData(local.pixPayload);
    const processed = new Set(previous.processedEventIds || []);

    if (processed.has(body.id)) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    processed.add(body.id);

    const event = body.event;
    const checkoutId =
      body.checkout?.id ||
      body.payment?.checkoutSession ||
      previous.checkoutId;

    const subscriptionId =
      body.payment?.subscription ||
      body.subscription?.id ||
      previous.subscriptionId;

    const paidEvents = new Set([
      "CHECKOUT_PAID",
      "PAYMENT_CONFIRMED",
      "PAYMENT_RECEIVED",
    ]);

    const cancelledEvents = new Set([
      "CHECKOUT_CANCELED",
      "CHECKOUT_EXPIRED",
      "PAYMENT_REFUNDED",
      "PAYMENT_DELETED",
    ]);

    if (paidEvents.has(event)) {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: local.id },
          data: {
            status: "PAID",
            confirmedAt: new Date(),
            pixPayload: writeAsaasData({
              ...previous,
              provider: "ASAAS",
              checkoutId,
              subscriptionId,
              checkoutStatus: body.checkout?.status || previous.checkoutStatus,
              processedEventIds: Array.from(processed).slice(-50),
              lastEvent: event,
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
                  premiumUntil: addMonth(local.player?.premiumUntil),
                },
              }),
            ]
          : []),
      ]);

      console.info("ASAAS_PLAYER_PREMIUM_ACTIVATED", {
        paymentId: local.id,
        playerId: local.playerId,
        event,
      });

      return NextResponse.json({ ok: true });
    }

    if (cancelledEvents.has(event)) {
      await prisma.payment.update({
        where: { id: local.id },
        data: {
          ...(local.status !== "PAID"
            ? { status: "CANCELLED" as const }
            : {}),
          pixPayload: writeAsaasData({
            ...previous,
            provider: "ASAAS",
            checkoutId,
            subscriptionId,
            checkoutStatus: body.checkout?.status || previous.checkoutStatus,
            processedEventIds: Array.from(processed).slice(-50),
            lastEvent: event,
          }),
        },
      });

      return NextResponse.json({ ok: true });
    }

    await prisma.payment.update({
      where: { id: local.id },
      data: {
        pixPayload: writeAsaasData({
          ...previous,
          provider: "ASAAS",
          checkoutId,
          subscriptionId,
          checkoutStatus: body.checkout?.status || previous.checkoutStatus,
          processedEventIds: Array.from(processed).slice(-50),
          lastEvent: event,
        }),
      },
    });

    return NextResponse.json({ ok: true, ignored: event });
  } catch (error) {
    console.error(
      "ASAAS_WEBHOOK_ERROR",
      error instanceof Error ? error.message : error,
    );

    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
