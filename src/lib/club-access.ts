import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";
import {
  getEffectiveClubRole,
  hasClubPermission,
  type ClubPermission,
} from "@/lib/club-permissions";

type OrganizationUser = Awaited<
  ReturnType<typeof requireOrganizationUser>
>;

export async function requireClubPermission(
  permission: ClubPermission
) {
  const user = await requireOrganizationUser();

  if (!hasClubPermission(user, permission)) {
    redirect("/dashboard?erro=sem-permissao");
  }

  return user;
}

async function findInternalCoachStaffLinks(
  user: OrganizationUser
) {
  if (getEffectiveClubRole(user) !== "COACH") {
    return [];
  }

  return prisma.staffMember.findMany({
    where: {
      organizationId: user.organizationId,
      coachEmail: {
        equals: user.email,
        mode: "insensitive",
      },
    },
    select: {
      categoryId: true,
      canManageCallUps: true,
    },
  });
}

export async function getClubCallUpCategoryIds(
  user: OrganizationUser
): Promise<string[] | null> {
  if (getEffectiveClubRole(user) !== "COACH") {
    return null;
  }

  const links =
    await findInternalCoachStaffLinks(user);

  if (
    links.some(
      (link) => link.categoryId === null
    )
  ) {
    return null;
  }

  return Array.from(
    new Set(
      links
        .map((link) => link.categoryId)
        .filter(
          (categoryId): categoryId is string =>
            Boolean(categoryId)
        )
    )
  );
}

export async function getClubCallUpCategoryAccess(
  user: OrganizationUser,
  categoryId: string
) {
  const canViewByRole =
    hasClubPermission(
      user,
      "CALLUPS_VIEW"
    );

  const canManageByRole =
    hasClubPermission(
      user,
      "CALLUPS_MANAGE"
    );

  if (
    getEffectiveClubRole(user) !== "COACH"
  ) {
    return {
      canView: canViewByRole,
      canManage: canManageByRole,
    };
  }

  const links =
    await findInternalCoachStaffLinks(user);

  const matchingLinks =
    links.filter(
      (link) =>
        link.categoryId === null ||
        link.categoryId === categoryId
    );

  return {
    canView:
      canViewByRole &&
      matchingLinks.length > 0,

    canManage:
      canManageByRole &&
      matchingLinks.some(
        (link) =>
          link.canManageCallUps
      ),
  };
}