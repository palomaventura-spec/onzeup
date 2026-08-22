import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readAsaasData, writeAsaasData } from "@/lib/asaas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function addMonths(base: Date | null | undefined, months: number) {
  const start =
    base && base.getTime() > Date.now() ? new Date(base) : new Date();
  start.setMonth(start.getMonth() + months);
  return start;
}

type AsaasWebhookBody = {
  id?: string;
  event?: string;
  checkout?: { id?: string; status?: string };
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
  const checkoutId = String(
    body.checkout?.id || body.payment?.checkoutSession || "",
  ).trim();

  const subscriptionId = String(
    body.payment?.subscription || body.subscription?.id || "",
  ).trim();

  const externalReference = String(
    body.payment?.externalReference ||
      body.subscription?.externalReference ||
      "",
  ).trim();

  const include = {
    player: true,
    organization: { include: { subscription: true } },
  } as const;

  if (externalReference) {
    const exact = await prisma.payment.findUnique({
      where: { id: externalReference },
      include,
    });
    if (exact) return exact;
  }

  if (checkoutId) {
    const byCheckout = await prisma.payment.findFirst({
      where: {
        method: "ASAAS",
        pixPayload: { contains: `"checkoutId":"${checkoutId}"` },
      },
      include,
      orderBy: { createdAt: "desc" },
    });
    if (byCheckout) return byCheckout;
  }

  if (subscriptionId) {
    return prisma.payment.findFirst({
      where: {
        method: "ASAAS",
        pixPayload: { contains: `"subscriptionId":"${subscriptionId}"` },
      },
      include,
      orderBy: { createdAt: "desc" },
    });
  }

  return null;
}

function planCode(product: string) {
  if (product.includes("ESSENTIAL")) return "STARTER" as const;
  if (product.includes("_PRO_")) return "PRO" as const;
  return "BUSINESS" as const;
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

    console.info("ASAAS_WEBHOOK_RECEIVED", {
      eventId: body.id,
      event: body.event,
      paymentId: body.payment?.id || null,
      paymentStatus: body.payment?.status || null,
      checkoutId: body.checkout?.id || body.payment?.checkoutSession || null,
      subscriptionId:
        body.payment?.subscription || body.subscription?.id || null,
    });

    const local = await findLocalPayment(body);

    if (!local) {
      console.info("ASAAS_WEBHOOK_NO_LOCAL_PAYMENT", {
        event: body.event,
        eventId: body.id,
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
    const paymentStatus = String(body.payment?.status || "").toUpperCase();
    const checkoutId =
      body.checkout?.id ||
      body.payment?.checkoutSession ||
      previous.checkoutId;

    const subscriptionId =
      body.payment?.subscription ||
      body.subscription?.id ||
      previous.subscriptionId;

    const isPaid =
      ["CHECKOUT_PAID", "PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(
        event,
      ) ||
      ["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"].includes(paymentStatus);

    const providerData = writeAsaasData({
      ...previous,
      provider: "ASAAS",
      checkoutId,
      subscriptionId,
      checkoutStatus:
        body.checkout?.status || previous.checkoutStatus || undefined,
      processedEventIds: Array.from(processed).slice(-50),
      lastEvent: event,
      lastPaymentId: body.payment?.id || previous.lastPaymentId,
      lastPaymentStatus:
        body.payment?.status || previous.lastPaymentStatus,
    });

    if (isPaid) {
      const operations: any[] = [
        prisma.payment.update({
          where: { id: local.id },
          data: {
            status: "PAID",
            confirmedAt: local.confirmedAt || new Date(),
            pixPayload: providerData,
          },
        }),
      ];

      if (local.playerId) {
        operations.push(
          prisma.playerProfile.update({
            where: { id: local.playerId },
            data: {
              plan: "PREMIUM",
              planStatus: "ACTIVE",
              premiumUntil:
                local.status === "PAID"
                  ? local.player?.premiumUntil
                  : addMonths(local.player?.premiumUntil, 1),
            },
          }),
        );
      }

      if (
        local.organizationId &&
        String(local.product).startsWith("CLUB_")
      ) {
        const annual = String(local.product).endsWith("_ANNUAL");
        const currentEnd =
          local.organization?.subscription?.currentPeriodEnd;

        operations.push(
          prisma.subscription.upsert({
            where: { organizationId: local.organizationId },
            create: {
              organizationId: local.organizationId,
              plan: planCode(String(local.product)),
              status: "ACTIVE",
              billingCycle: annual ? "ANNUAL" : "MONTHLY",
              currentPeriodEnd: addMonths(null, annual ? 12 : 1),
              provider: "ASAAS",
              providerSubscriptionId: subscriptionId || null,
            },
            update: {
              plan: planCode(String(local.product)),
              status: "ACTIVE",
              billingCycle: annual ? "ANNUAL" : "MONTHLY",
              currentPeriodEnd:
                local.status === "PAID"
                  ? currentEnd
                  : addMonths(currentEnd, annual ? 12 : 1),
              provider: "ASAAS",
              providerSubscriptionId:
                subscriptionId || undefined,
            },
          }),
        );
      }

      await prisma.$transaction(operations);

      if (local.organizationId) {
        console.info("ASAAS_CLUB_SUBSCRIPTION_ACTIVATED", {
          paymentId: local.id,
          organizationId: local.organizationId,
          product: local.product,
          event,
          paymentStatus,
        });
      } else {
        console.info("ASAAS_PLAYER_PREMIUM_ACTIVATED", {
          paymentId: local.id,
          playerId: local.playerId,
          event,
          paymentStatus,
        });
      }

      return NextResponse.json({ ok: true, activated: true });
    }

    await prisma.payment.update({
      where: { id: local.id },
      data: { pixPayload: providerData },
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
