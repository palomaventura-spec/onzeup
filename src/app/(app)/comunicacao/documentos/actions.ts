"use server";

import { revalidatePath } from "next/cache";
import { requireClubPermission } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

export async function replyClubDocumentConversation(formData: FormData) {
  const user = await requireClubPermission("COMMUNICATION_MANAGE");
  const recipientId = String(formData.get("recipientId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!recipientId || !body || body.length > 3000) throw new Error("Mensagem inválida.");
  await prisma.$transaction(async tx => {
    const recipient = await tx.clubCommunicationRecipient.findFirst({
      where: { id: recipientId, communication: { organizationId: user.organizationId }, athlete: { organizationId: user.organizationId, active: true } },
      select: { id: true },
    });
    if (!recipient) throw new Error("Conversa indisponível para este clube.");
    await tx.clubCommunicationMessage.create({ data: {
      recipientId, authorUserId: user.id, senderType: "CLUB", body,
    }});
  });
  revalidatePath("/comunicacao/documentos");
  revalidatePath("/responsavel/comunicacao");
}
