"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAuthorizedPlayerCommunication } from "@/lib/communication-document-access";

export async function replyPlayerCommunication(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "GUARDIAN") throw new Error("Acesso nao autorizado.");

  const recipientId = String(formData.get("recipientId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!recipientId || !body || body.length > 3000) throw new Error("Mensagem invalida.");

  const recipient = await getAuthorizedPlayerCommunication(user.id, recipientId);
  if (!recipient) throw new Error("Conversa nao autorizada.");

  await prisma.$transaction(async (tx) => {
    const link = await tx.playerAthleteLink.findFirst({ where: { playerId: recipient.playerId, athleteId: recipient.athleteId, active: true, verified: true }, select: { id: true } });
    if (!link) throw new Error("Vinculo nao autorizado.");
    await tx.clubCommunicationMessage.create({
    data: {
      recipientId: recipient.id,
      authorUserId: user.id,
      senderType: "PLAYER",
      body,
    },
    });
  });

  revalidatePath("/responsavel/comunicacao");
}