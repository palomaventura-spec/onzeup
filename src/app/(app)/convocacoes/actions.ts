"use server";

import { CallUpStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getClubCallUpCategoryAccess,
  requireClubPermission,
} from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

function clean(
  value: FormDataEntryValue | null
) {
  return String(value ?? "").trim();
}

export async function createCallUps(
  formData: FormData
) {
  const user =
    await requireClubPermission(
      "CALLUPS_MANAGE"
    );

  const matchId =
    clean(formData.get("matchId"));

  const athleteIds = formData
    .getAll("athleteIds")
    .map(String)
    .filter(Boolean);

  if (
    !matchId ||
    athleteIds.length === 0
  ) {
    return;
  }

  const match =
    await prisma.match.findFirst({
      where: {
        id: matchId,
        organizationId:
          user.organizationId,
      },

      select: {
        id: true,
        categoryId: true,
      },
    });

  if (!match) return;

  const categoryAccess =
    await getClubCallUpCategoryAccess(
      user,
      match.categoryId
    );

  if (!categoryAccess.canManage) {
    return;
  }

  const athletes =
    await prisma.athlete.findMany({
      where: {
        id: {
          in: athleteIds,
        },

        organizationId:
          user.organizationId,

        categoryId:
          match.categoryId,

        active: true,
      },

      select: {
        id: true,
      },
    });

  if (athletes.length === 0) {
    return;
  }

  await prisma.$transaction(
    athletes.map((athlete) =>
      prisma.callUp.upsert({
        where: {
          matchId_athleteId: {
            matchId: match.id,
            athleteId: athlete.id,
          },
        },

        update: {},

        create: {
          matchId: match.id,
          athleteId: athlete.id,
          organizationId:
            user.organizationId,
        },
      })
    )
  );

  revalidatePath(
    `/convocacoes/${match.id}`
  );
}

export async function deleteCallUp(
  formData: FormData
) {
  const user =
    await requireClubPermission(
      "CALLUPS_MANAGE"
    );

  const id =
    clean(formData.get("id"));

  if (!id) return;

  const callUp =
    await prisma.callUp.findFirst({
      where: {
        id,
        organizationId:
          user.organizationId,
      },

      select: {
        id: true,
        matchId: true,

        match: {
          select: {
            categoryId: true,
          },
        },
      },
    });

  if (!callUp) return;

  const categoryAccess =
    await getClubCallUpCategoryAccess(
      user,
      callUp.match.categoryId
    );

  if (!categoryAccess.canManage) {
    return;
  }

  await prisma.callUp.delete({
    where: {
      id: callUp.id,
    },
  });

  revalidatePath(
    `/convocacoes/${callUp.matchId}`
  );
}

export async function updateCallUpStatus(
  formData: FormData
) {
  const user =
    await requireClubPermission(
      "CALLUPS_MANAGE"
    );

  const id =
    clean(formData.get("id"));

  const rawStatus =
    clean(formData.get("status"));

  if (!id) return;

  const callUp =
    await prisma.callUp.findFirst({
      where: {
        id,
        organizationId:
          user.organizationId,
      },

      select: {
        id: true,
        matchId: true,

        match: {
          select: {
            categoryId: true,
          },
        },
      },
    });

  if (!callUp) return;

  const categoryAccess =
    await getClubCallUpCategoryAccess(
      user,
      callUp.match.categoryId
    );

  if (!categoryAccess.canManage) {
    return;
  }

  const status =
    rawStatus === "CONFIRMED"
      ? CallUpStatus.CONFIRMED
      : rawStatus === "DECLINED"
        ? CallUpStatus.DECLINED
        : CallUpStatus.PENDING;

  await prisma.callUp.update({
    where: {
      id: callUp.id,
    },

    data: {
      status,

      respondedAt:
        status ===
        CallUpStatus.PENDING
          ? null
          : new Date(),
    },
  });

  revalidatePath(
    `/convocacoes/${callUp.matchId}`
  );
}

export async function markCallUpsSent(
  formData: FormData
) {
  const user =
    await requireClubPermission(
      "CALLUPS_MANAGE"
    );

  const matchId =
    clean(formData.get("matchId"));

  if (!matchId) return;

  const match =
    await prisma.match.findFirst({
      where: {
        id: matchId,
        organizationId:
          user.organizationId,
      },

      select: {
        id: true,
        categoryId: true,
      },
    });

  if (!match) return;

  const categoryAccess =
    await getClubCallUpCategoryAccess(
      user,
      match.categoryId
    );

  if (!categoryAccess.canManage) {
    return;
  }

  await prisma.callUp.updateMany({
    where: {
      matchId: match.id,
      organizationId:
        user.organizationId,
    },

    data: {
      sentAt: new Date(),
    },
  });

  revalidatePath(
    `/convocacoes/${match.id}`
  );
}

export async function goToMatchCallUps(
  formData: FormData
) {
  const user =
    await requireClubPermission(
      "CALLUPS_VIEW"
    );

  const matchId =
    clean(formData.get("matchId"));

  if (!matchId) return;

  const match =
    await prisma.match.findFirst({
      where: {
        id: matchId,
        organizationId:
          user.organizationId,
      },

      select: {
        id: true,
        categoryId: true,
      },
    });

  if (!match) return;

  const categoryAccess =
    await getClubCallUpCategoryAccess(
      user,
      match.categoryId
    );

  if (!categoryAccess.canView) {
    redirect(
      "/convocacoes?erro=sem-acesso-categoria"
    );
  }

  redirect(
    `/convocacoes/${match.id}`
  );
}