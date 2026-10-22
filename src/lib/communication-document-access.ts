import { prisma } from "@/lib/prisma";

export async function getAuthorizedPlayerCommunication(userId: string, recipientId: string) {
  if (!userId || !recipientId) return null;

  const recipient = await prisma.clubCommunicationRecipient.findFirst({
    where: {
      id: recipientId,
      player: { guardian: { userId } },
      athlete: { active: true },
      communication: { organization: { active: true } },
    },
    include: { communication: true, athlete: true },
  });

  if (!recipient) return null;
  if (recipient.athlete.organizationId !== recipient.communication.organizationId) return null;

  const link = await prisma.playerAthleteLink.findFirst({
    where: {
      playerId: recipient.playerId,
      athleteId: recipient.athleteId,
      verified: true,
      active: true,
    },
    select: { id: true },
  });

  return link ? recipient : null;
}