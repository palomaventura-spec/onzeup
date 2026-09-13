"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function clean(
  value: FormDataEntryValue | null
) {
  return String(value ?? "").trim();
}

async function currentCoach() {
  const user = await requireUser();

  if (user.role !== "COACH") {
    redirect("/dashboard");
  }

  const coach =
    await prisma.coachProfile.findUnique({
      where: {
        ownerUserId: user.id,
      },

      select: {
        id: true,

        owner: {
          select: {
            email: true,
          },
        },
      },
    });

  if (!coach) {
    redirect("/cadastro-coach");
  }

  return coach;
}

export async function searchMatchingCoachLinks() {
  const coach = await currentCoach();

  const email =
    coach.owner.email.toLowerCase();

  const matches =
    await prisma.staffMember.findMany({
      where: {
        coachEmail: {
          equals: email,
          mode: "insensitive",
        },
      },

      select: {
        organizationId: true,
        categoryId: true,
        sport: true,
        roleTitle: true,
        canManageCallUps: true,
      },
    });

  if (!matches.length) {
    redirect(
      "/coach/dashboard?vinculo=nenhum-cadastro"
    );
  }

  let created = 0;

  for (const match of matches) {
    const existingAccesses =
      await prisma
        .coachOrganizationAccess
        .findMany({
          where: {
            coachId: coach.id,
            organizationId:
              match.organizationId,
            categoryId:
              match.categoryId,
            sport: match.sport,
          },

          select: {
            id: true,
          },
        });

    const accessData = {
      roleTitle: match.roleTitle,
      canViewRoster: true,
      canViewSchedule: true,
      canViewCallUps: true,
      canManageCallUps:
        match.canManageCallUps,
    };

    if (existingAccesses.length > 0) {
      await prisma
        .coachOrganizationAccess
        .updateMany({
          where: {
            id: {
              in: existingAccesses.map(
                (access) => access.id
              ),
            },
          },

          data: accessData,
        });

      continue;
    }

    await prisma
      .coachOrganizationAccess
      .create({
        data: {
          coachId: coach.id,
          organizationId:
            match.organizationId,
          categoryId:
            match.categoryId,
          sport: match.sport,
          requestedBy: "COACH",
          active: false,
          ...accessData,
        },
      });

    created++;
  }

  revalidatePath(
    "/coach/dashboard"
  );
  revalidatePath("/comissao");

  redirect(
    `/coach/dashboard?vinculo=${
      created
        ? "solicitado"
        : "ja-solicitado"
    }`
  );
}

export async function acceptCoachOrganizationInvite(
  formData: FormData
) {
  const coach = await currentCoach();

  const accessId =
    clean(formData.get("accessId"));

  if (!accessId) {
    return;
  }

  const access =
    await prisma
      .coachOrganizationAccess
      .findFirst({
        where: {
          id: accessId,
          coachId: coach.id,
          active: false,
          requestedBy: "CLUB",
        },

        select: {
          id: true,
        },
      });

  if (!access) {
    return;
  }

  await prisma
    .coachOrganizationAccess
    .update({
      where: {
        id: access.id,
      },

      data: {
        active: true,
      },
    });

  revalidatePath(
    "/coach/dashboard"
  );
  revalidatePath("/comissao");

  redirect(
    "/coach/dashboard?vinculo=aceito"
  );
}

export async function declineCoachOrganizationInvite(
  formData: FormData
) {
  const coach = await currentCoach();

  const accessId =
    clean(formData.get("accessId"));

  if (!accessId) {
    return;
  }

  await prisma
    .coachOrganizationAccess
    .deleteMany({
      where: {
        id: accessId,
        coachId: coach.id,
        active: false,
        requestedBy: "CLUB",
      },
    });

  revalidatePath(
    "/coach/dashboard"
  );
  revalidatePath("/comissao");

  redirect(
    "/coach/dashboard?vinculo=recusado"
  );
}