"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { buildPixPayload } from "@/lib/pix";

export async function createPlayerPremiumPix(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "GUARDIAN") redirect("/responsavel");

  const playerId = String(formData.get("playerId") || "");
  const guardian = await prisma.guardianProfile.findUnique({ where: { userId: user.id } });
  if (!guardian) redirect("/responsavel");

  const player = await prisma.playerProfile.findFirst({ where: { id: playerId, guardianId: guardian.id } });
  if (!player) redirect("/responsavel");

  const existing = await prisma.payment.findFirst({
    where: { userId: user.id, playerId, product: "PLAYER_PREMIUM_MONTHLY", status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  if (existing) redirect(`/checkout/pix/${existing.id}`);

  const pixKey = process.env.ONZEUP_PIX_KEY || "";
  const txid = `ONZE${Date.now().toString().slice(-12)}`;
  const payload = pixKey ? buildPixPayload({
    key: pixKey,
    name: process.env.ONZEUP_PIX_NAME || "ONZEUP",
    city: process.env.ONZEUP_PIX_CITY || "RIO DE JANEIRO",
    amount: 29.90,
    txid,
  }) : null;

  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      playerId,
      product: "PLAYER_PREMIUM_MONTHLY",
      amountCents: 2990,
      pixTxid: txid,
      pixPayload: payload,
      pixKeySnapshot: pixKey || null,
      note: `ONZEUP Player Premium - ${player.name}`,
    },
  });

  redirect(`/checkout/pix/${payment.id}`);
}
