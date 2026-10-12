"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireClubPermission } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

type CommunicationAudience =
  | "ATHLETE"
  | "CATEGORY"
  | "MODALITY"
  | "ALL";

type CommunicationSport =
  | "FOOTBALL"
  | "FUTSAL";

function clean(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function fail(code: string): never {
  redirect(`/comunicacao?comunicacao=${encodeURIComponent(code)}`);
}

export async function searchCommunicationAthletes(
  query: string,
) {
  const user =
    await requireClubPermission("COMMUNICATION_MANAGE");

  const term = query.trim();

  if (term.length < 2) {
    return [];
  }

  const athletes = await prisma.athlete.findMany({
    where: {
      organizationId: user.organizationId,
      active: true,
      memberships: {
        some: {
          organizationId: user.organizationId,
          status: "ACTIVE",
        },
      },
      OR: [
        {
          name: {
            contains: term,
            mode: "insensitive",
          },
        },
        {
          nickname: {
            contains: term,
            mode: "insensitive",
          },
        },
      ],
    },
    orderBy: {
      name: "asc",
    },
    take: 10,
    select: {
      id: true,
      name: true,
      nickname: true,
      memberships: {
        where: {
          organizationId: user.organizationId,
          status: "ACTIVE",
        },
        select: {
          sport: true,
          category: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return athletes.map((athlete) => {
    const details = Array.from(
      new Set(
        athlete.memberships.map((membership) => {
          const sport =
            membership.sport === "FOOTBALL"
              ? "Futebol"
              : membership.sport === "FUTSAL"
                ? "Futsal"
                : "Futebol e Futsal";

          return membership.category?.name
            ? `${membership.category.name} · ${sport}`
            : sport;
        }),
      ),
    );

    return {
      id: athlete.id,
      name: athlete.name,
      nickname: athlete.nickname,
      details,
    };
  });
}
export async function sendClubCommunication(
  formData: FormData,
) {
  const user =
    await requireClubPermission("COMMUNICATION_MANAGE");

  const audienceType =
    clean(formData.get("audienceType")) as CommunicationAudience;

  const title = clean(formData.get("title"));
  const body = clean(formData.get("body"));

  const categoryId =
    clean(formData.get("categoryId")) || null;

  const targetAthleteId =
    clean(formData.get("targetAthleteId")) || null;

  const sportRaw =
    clean(formData.get("sport"));

  const sport =
    sportRaw === "FOOTBALL" || sportRaw === "FUTSAL"
      ? (sportRaw as CommunicationSport)
      : null;

  const allowedAudiences: CommunicationAudience[] = [
    "ATHLETE",
    "CATEGORY",
    "MODALITY",
    "ALL",
  ];

  if (!allowedAudiences.includes(audienceType)) {
    fail("publico-invalido");
  }

  if (title.length < 3 || title.length > 120) {
    fail("titulo-invalido");
  }

  if (!body || body.length > 5000) {
    fail("mensagem-invalida");
  }

  if (
    audienceType === "ATHLETE" &&
    !targetAthleteId
  ) {
    fail("atleta-obrigatorio");
  }

  if (
    audienceType === "CATEGORY" &&
    !categoryId
  ) {
    fail("categoria-obrigatoria");
  }

  if (
    audienceType === "MODALITY" &&
    !sport
  ) {
    fail("modalidade-obrigatoria");
  }

  if (audienceType === "ATHLETE") {
    const athlete = await prisma.athlete.findFirst({
      where: {
        id: targetAthleteId!,
        organizationId: user.organizationId,
        active: true,
      },
      select: {
        id: true,
      },
    });

    if (!athlete) {
      fail("atleta-invalido");
    }
  }

  if (audienceType === "CATEGORY") {
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId!,
        organizationId: user.organizationId,
        active: true,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      fail("categoria-invalida");
    }
  }

  const membershipWhere: Prisma.AthleteMembershipWhereInput = {
    organizationId: user.organizationId,
    status: "ACTIVE",
  };

  if (audienceType === "ATHLETE") {
    membershipWhere.athleteId = targetAthleteId!;
  }

  if (audienceType === "CATEGORY") {
    membershipWhere.categoryId = categoryId!;
  }

  if (audienceType === "MODALITY") {
    membershipWhere.sport = {
      in: [sport!, "BOTH"],
    };
  }

  const memberships =
    await prisma.athleteMembership.findMany({
      where: membershipWhere,
      select: {
        athlete: {
          select: {
            id: true,
            playerLinks: {
              where: {
                verified: true,
                active: true,
              },
              select: {
                playerId: true,
              },
            },
          },
        },
      },
    });

  if (
    audienceType === "ATHLETE" &&
    memberships.length === 0
  ) {
    fail("atleta-sem-vinculo-ativo");
  }

  const recipientMap = new Map<
    string,
    {
      athleteId: string;
      playerId: string;
    }
  >();

  for (const membership of memberships) {
    for (const link of membership.athlete.playerLinks) {
      const key =
        `${membership.athlete.id}:${link.playerId}`;

      if (!recipientMap.has(key)) {
        recipientMap.set(key, {
          athleteId: membership.athlete.id,
          playerId: link.playerId,
        });
      }
    }
  }

  const recipients =
    Array.from(recipientMap.values());

  await prisma.$transaction(async (tx) => {
    const communication =
      await tx.clubCommunication.create({
        data: {
          organizationId: user.organizationId,
          authorUserId: user.id,
          title,
          body,
          audienceType,
          sport:
            audienceType === "MODALITY"
              ? sport
              : null,
          categoryId:
            audienceType === "CATEGORY"
              ? categoryId
              : null,
          targetAthleteId:
            audienceType === "ATHLETE"
              ? targetAthleteId
              : null,
        },
        select: {
          id: true,
        },
      });

    if (recipients.length > 0) {
      await tx.clubCommunicationRecipient.createMany({
        data: recipients.map((recipient) => ({
          communicationId: communication.id,
          athleteId: recipient.athleteId,
          playerId: recipient.playerId,
        })),
        skipDuplicates: true,
      });
    }
  });

  revalidatePath("/comunicacao");

  redirect(
    `/comunicacao?comunicacao=enviada&destinatarios=${recipients.length}`,
  );
}