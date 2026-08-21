import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  createPlayerPremiumSandboxSubscription,
  mercadoPagoIsTestMode,
  writeProviderData,
} from "@/lib/mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL = (process.env.APP_URL || "https://www.onzeup.com.br").replace(
  /\/$/,
  "",
);

export async function POST(request: Request) {
  try {
    const accessTokenIsTest =
      process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith("TEST-") || false;
    const publicKeyIsTest =
      process.env.MERCADOPAGO_PUBLIC_KEY?.startsWith("TEST-") || false;

    console.log("MP_RUNTIME_ENV", {
      accessTokenIsTest,
      publicKeyIsTest,
      vercelEnv: process.env.VERCEL_ENV || "unknown",
      nodeEnv: process.env.NODE_ENV || "unknown",
    });

    if (!mercadoPagoIsTestMode()) {
      return NextResponse.json(
        { error: "Sandbox indisponível fora do ambiente TEST." },
        { status: 403 },
      );
    }

    if (!publicKeyIsTest) {
      return NextResponse.json(
        { error: "Public Key não está em ambiente TEST." },
        { status: 500 },
      );
    }

    const user = await getCurrentUser();

    if (!user || user.role !== "GUARDIAN") {
      return NextResponse.json(
        { error: "Sessão expirada. Entre novamente." },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => null)) as
      | {
          playerId?: string;
          cardTokenId?: string;
          payerEmail?: string;
        }
      | null;

    const playerId = String(body?.playerId || "").trim();
    const cardTokenId = String(body?.cardTokenId || "").trim();
    const payerEmail = String(body?.payerEmail || "").trim().toLowerCase();

    if (!playerId || !cardTokenId || !payerEmail) {
      return NextResponse.json(
        { error: "Dados incompletos para criar a assinatura." },
        { status: 400 },
      );
    }

    if (!payerEmail.includes("@")) {
      return NextResponse.json(
        { error: "Informe um e-mail válido para o pagador." },
        { status: 400 },
      );
    }

    const forbiddenEmails = [
      String(process.env.MERCADOPAGO_ACCOUNT_EMAIL || "").trim().toLowerCase(),
      String(process.env.MERCADOPAGO_TEST_PAYER_EMAIL || "").trim().toLowerCase(),
    ].filter(Boolean);

    if (forbiddenEmails.includes(payerEmail)) {
      return NextResponse.json(
        {
          error:
            "Use um e-mail comum diferente da conta Mercado Pago e diferente de usuários de teste.",
        },
        { status: 400 },
      );
    }

    const guardian = await prisma.guardianProfile.findUnique({
      where: { userId: user.id },
    });

    if (!guardian) {
      return NextResponse.json(
        { error: "Perfil do responsável não encontrado." },
        { status: 404 },
      );
    }

    const player = await prisma.playerProfile.findFirst({
      where: {
        id: playerId,
        guardianId: guardian.id,
      },
    });

    if (!player) {
      return NextResponse.json(
        { error: "Player não encontrado." },
        { status: 404 },
      );
    }

    const localReference = `MPSBX${Date.now()}${Math.random()
      .toString(36)
      .slice(2, 8)}`.toUpperCase();

    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        playerId: player.id,
        product: "PLAYER_PREMIUM_MONTHLY",
        amountCents: 2990,
        method: "MERCADOPAGO",
        pixTxid: localReference,
        note: `SANDBOX - ONZEUP Player Premium - ${player.name}`,
      },
    });

    const backUrl = `${APP_URL}/checkout/mercadopago/retorno?paymentId=${encodeURIComponent(
      payment.id,
    )}`;

    try {
      const subscription = await createPlayerPremiumSandboxSubscription({
        payerEmail,
        externalReference: payment.id,
        playerName: player.name,
        backUrl,
        cardTokenId,
      });

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          pixPayload: writeProviderData({
            provider: "MERCADOPAGO",
            environment: "TEST",
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            processedPaymentIds: [],
          }),
        },
      });

      await prisma.playerProfile.update({
        where: { id: player.id },
        data: {
          planStatus:
            subscription.status === "authorized"
              ? "AWAITING_PAYMENT"
              : "SANDBOX_PENDING",
        },
      });

      return NextResponse.json({
        ok: true,
        paymentId: payment.id,
        subscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        redirectUrl: backUrl,
      });
    } catch (error) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "CANCELLED",
          note: `SANDBOX ERROR - ONZEUP Player Premium - ${player.name}`,
        },
      });

      throw error;
    }
  } catch (error) {
    console.error(
      "MERCADOPAGO_SANDBOX_SUBSCRIPTION_ERROR",
      error instanceof Error ? error.message : error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível criar a assinatura de teste. Confira o e-mail do pagador e tente novamente.",
      },
      { status: 502 },
    );
  }
}
