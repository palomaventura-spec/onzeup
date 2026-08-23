"use server";

import { redirect } from "next/navigation";
import { requireOrganizationUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  asaasIsSandbox,
  createAsaasClubCheckout,
  writeAsaasData,
} from "@/lib/asaas";
import {
  CLUB_PLANS,
  clubPrice,
  clubProduct,
  type ClubBillingCycle,
  type ClubCommercialPlan,
} from "@/lib/club-plans";

const APP_URL = (process.env.APP_URL || "https://www.onzeup.com.br").replace(
  /\/$/,
  "",
);

function isPlan(value: string): value is ClubCommercialPlan {
  return ["ESSENTIAL", "PRO", "ELITE"].includes(value);
}

function isCycle(value: string): value is ClubBillingCycle {
  return ["MONTHLY", "ANNUAL"].includes(value);
}

export async function createClubAsaasCheckout(formData: FormData) {
  const user = await requireOrganizationUser();

  if (!user.organizationId || !user.organization) {
    redirect("/dashboard");
  }

  const plan = String(formData.get("plan") || "");
  const cycle = String(formData.get("cycle") || "");
  const method = String(formData.get("method") || "");

  if (
    !isPlan(plan) ||
    !isCycle(cycle) ||
    !["CARD", "PIX"].includes(method)
  ) {
    redirect("/planos?paymentStatus=invalid");
  }

  const amountCents = clubPrice(plan, cycle);
  const product = clubProduct(plan, cycle);
  const returnBase = `${APP_URL}/checkout/asaas/retorno`;

  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      organizationId: user.organizationId,
      product,
      amountCents,
      method: "ASAAS",
      pixTxid: `CLUB${Date.now()}${Math.random()
        .toString(36)
        .slice(2, 8)}`.toUpperCase(),
      note: `ONZEUP Club ${CLUB_PLANS[plan].label} ${
        cycle === "ANNUAL" ? "Anual" : "Mensal"
      }`,
    },
  });

  let checkout;

  try {
    checkout = await createAsaasClubCheckout({
      externalReference: payment.id,
      organizationName:
        user.organization.publicName || user.organization.name,
      planLabel: CLUB_PLANS[plan].label,
      value: amountCents / 100,
      cycle,
      method: method as "CARD" | "PIX",
      successUrl: `${returnBase}?status=success&paymentId=${payment.id}&origin=club`,
      cancelUrl: `${returnBase}?status=cancel&paymentId=${payment.id}&origin=club`,
      expiredUrl: `${returnBase}?status=expired&paymentId=${payment.id}&origin=club`,
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
          paymentMethod: method as "CARD" | "PIX",
          billingCycle: cycle,
          commercialPlan: plan,
        }),
      },
    });
  } catch (error) {
    console.error(
      "CLUB_ASAAS_CREATE_ERROR",
      error instanceof Error ? error.message : error,
    );

    redirect("/planos?paymentStatus=erro");
  }

  // IMPORTANTE:
  // redirect() do Next.js lança NEXT_REDIRECT internamente.
  // Por isso ele precisa ficar FORA do try/catch.
  redirect(checkout.link!);
}
