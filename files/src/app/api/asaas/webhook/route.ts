import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readAsaasData, writeAsaasData } from "@/lib/asaas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function addMonths(base: Date | null | undefined, months: number) {
  const start = base ? new Date(base) : new Date();
  start.setMonth(start.getMonth() + months);
  return start;
}

function parseAsaasDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

type AsaasWebhookBody = {
  id?: string;
  event?: string;
  checkout?: { id?: string; status?: string };
  payment?: {
    id?: string;
    status?: string;
    dueDate?: string | null;
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
  const checkoutId = String(body.checkout?.id || body.payment?.checkoutSession || "").trim();
  const subscriptionId = String(body.payment?.subscription || body.subscription?.id || "").trim();
  const externalReference = String(
    body.payment?.externalReference || body.subscription?.externalReference || "",
  ).trim();

  const include = {
    player: true,
    organization: { include: { subscription: true } },
  } as const;

  if (externalReference) {
    const exact = await prisma.payment.findUnique({ where: { id: externalReference }, include });
    if (exact) return exact;
  }

  if (checkoutId) {
    const byCheckout = await prisma.payment.findFirst({
      where: { method: "ASAAS", pixPayload: { contains: `"checkoutId":"${checkoutId}"` } },
      include,
      orderBy: { createdAt: "desc" },
    });
    if (byCheckout) return byCheckout;
  }

  if (subscriptionId) {
    return prisma.payment.findFirst({
      where: { method: "ASAAS", pixPayload: { contains: `"subscriptionId":"${subscriptionId}"` } },
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

    const body = (await request.json().catch(() => null)) as AsaasWebhookBody | null;
    if (!body?.event || !body?.id) {
      return NextResponse.json({ ok: true, ignored: "invalid-body" });
    }

    const local = await findLocalPayment(body);
    if (!local) {
      console.info("ASAAS_WEBHOOK_NO_LOCAL_PAYMENT", { event: body.event, eventId: body.id });
      return NextResponse.json({ ok: true, ignored: "not-found" });
    }

    const previous = readAsaasData(local.pixPayload);
    const processedEvents = new Set(previous.processedEventIds || []);
    if (processedEvents.has(body.id)) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    processedEvents.add(body.id);

    const processedPaymentIds = new Set(previous.processedPaymentIds || []);
    const event = String(body.event).toUpperCase();
    const paymentStatus = String(body.payment?.status || "").toUpperCase();
    const paymentId = String(body.payment?.id || "").trim();
    const dueDate = parseAsaasDate(body.payment?.dueDate);
    const checkoutId = body.checkout?.id || body.payment?.checkoutSession || previous.checkoutId;
    const subscriptionId = body.payment?.subscription || body.subscription?.id || previous.subscriptionId;

    const isPaidPayment = Boolean(paymentId) && (
      ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(event) ||
      ["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"].includes(paymentStatus)
    );
    const isOverdue = event === "PAYMENT_OVERDUE" || paymentStatus === "OVERDUE";
    const isSubscriptionCancelled = ["SUBSCRIPTION_INACTIVATED", "SUBSCRIPTION_DELETED"].includes(event);
    const paymentAlreadyApplied = paymentId ? processedPaymentIds.has(paymentId) : false;

    if (isPaidPayment && !paymentAlreadyApplied) processedPaymentIds.add(paymentId);

    const providerData = writeAsaasData({
      ...previous,
      provider: "ASAAS",
      checkoutId,
      subscriptionId,
      checkoutStatus: body.checkout?.status || previous.checkoutStatus || undefined,
      processedEventIds: Array.from(processedEvents).slice(-80),
      processedPaymentIds: Array.from(processedPaymentIds).slice(-80),
      lastEvent: event,
      lastPaymentId: paymentId || previous.lastPaymentId,
      lastPaymentStatus: body.payment?.status || previous.lastPaymentStatus,
      lastDueDate: body.payment?.dueDate || previous.lastDueDate,
    });

    if (isPaidPayment) {
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
        const nextPremiumUntil = paymentAlreadyApplied
          ? local.player?.premiumUntil
          : addMonths(dueDate || local.player?.premiumUntil || new Date(), 1);

        operations.push(
          prisma.playerProfile.update({
            where: { id: local.playerId },
            data: {
              plan: "PREMIUM",
              planStatus: "ACTIVE",
              premiumUntil: nextPremiumUntil,
              template: local.player?.template === "FREE_CLEAN" ? "PREMIUM_DARK" : undefined,
            },
          }),
        );
      }

      if (local.organizationId && String(local.product).startsWith("CLUB_")) {
        const annual = String(local.product).endsWith("_ANNUAL");
        const nextPeriodEnd = paymentAlreadyApplied
          ? local.organization?.subscription?.currentPeriodEnd
          : addMonths(dueDate || local.organization?.subscription?.currentPeriodEnd || new Date(), annual ? 12 : 1);

        operations.push(
          prisma.subscription.upsert({
            where: { organizationId: local.organizationId },
            create: {
              organizationId: local.organizationId,
              plan: planCode(String(local.product)),
              status: "ACTIVE",
              billingCycle: annual ? "ANNUAL" : "MONTHLY",
              currentPeriodEnd: nextPeriodEnd,
              provider: "ASAAS",
              providerSubscriptionId: subscriptionId || null,
            },
            update: {
              plan: planCode(String(local.product)),
              status: "ACTIVE",
              billingCycle: annual ? "ANNUAL" : "MONTHLY",
              currentPeriodEnd: nextPeriodEnd,
              provider: "ASAAS",
              providerSubscriptionId: subscriptionId || undefined,
            },
          }),
        );
      }

      await prisma.$transaction(operations);
      return NextResponse.json({ ok: true, activated: true, paymentAlreadyApplied });
    }

    if (isOverdue) {
      const operations: any[] = [
        prisma.payment.update({ where: { id: local.id }, data: { pixPayload: providerData } }),
      ];

      if (local.playerId) {
        operations.push(
          prisma.playerProfile.update({
            where: { id: local.playerId },
            data: {
              plan: "PREMIUM",
              planStatus: "PAST_DUE",
              premiumUntil: dueDate || local.player?.premiumUntil || new Date(),
            },
          }),
        );
      }

      if (local.organizationId && String(local.product).startsWith("CLUB_")) {
        operations.push(
          prisma.subscription.upsert({
            where: { organizationId: local.organizationId },
            create: {
              organizationId: local.organizationId,
              plan: planCode(String(local.product)),
              status: "PAST_DUE",
              currentPeriodEnd: dueDate || new Date(),
              provider: "ASAAS",
              providerSubscriptionId: subscriptionId || null,
            },
            update: {
              status: "PAST_DUE",
              currentPeriodEnd: dueDate || local.organization?.subscription?.currentPeriodEnd || new Date(),
              provider: "ASAAS",
              providerSubscriptionId: subscriptionId || undefined,
            },
          }),
        );
      }

      await prisma.$transaction(operations);
      return NextResponse.json({ ok: true, overdue: true, graceDays: 10 });
    }

    if (isSubscriptionCancelled) {
      const operations: any[] = [
        prisma.payment.update({ where: { id: local.id }, data: { pixPayload: providerData } }),
      ];

      if (local.playerId) {
        operations.push(
          prisma.playerProfile.update({
            where: { id: local.playerId },
            data: { plan: "FREE", planStatus: "CANCELLED", template: "FREE_CLEAN" },
          }),
        );
      }

      if (local.organizationId && String(local.product).startsWith("CLUB_")) {
        operations.push(
          prisma.subscription.updateMany({
            where: { organizationId: local.organizationId },
            data: { status: "CANCELLED" },
          }),
        );
      }

      await prisma.$transaction(operations);
      return NextResponse.json({ ok: true, cancelled: true });
    }

    await prisma.payment.update({ where: { id: local.id }, data: { pixPayload: providerData } });
    return NextResponse.json({ ok: true, ignored: event });
  } catch (error) {
    console.error("ASAAS_WEBHOOK_ERROR", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
