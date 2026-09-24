import type { SportType } from "@prisma/client";
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

type StaffScopedPermission = Extract<
  ClubPermission,
  | "TRAINING_ATTENDANCE_VIEW"
  | "TRAINING_ATTENDANCE_MANAGE"
  | "PERFORMANCE_VIEW"
  | "PERFORMANCE_MANAGE"
  | "PERFORMANCE_REPORT_GENERATE"
  | "PERFORMANCE_REPORT_REVIEW"
  | "PERFORMANCE_REPORT_APPROVE"
  | "PERFORMANCE_REPORT_SEND"
  | "GPS_VIEW"
  | "GPS_IMPORT"
  | "GPS_MANAGE"
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
      active: true,
      OR: [
        {
          userId: user.id,
        },
        {
          coachEmail: {
            equals: user.email,
            mode: "insensitive",
          },
        },
      ],
    },
    select: {
      categoryId: true,
      canManageCallUps: true,
    },
  });
}

async function findStaffCategoryPermissions(
  user: OrganizationUser,
  categoryId: string,
  sport: SportType = "BOTH"
): Promise<Set<StaffScopedPermission>> {
  const allowedSports: SportType[] =
    sport === "BOTH"
      ? ["BOTH"]
      : ["BOTH", sport];

  const staffLinks = await prisma.staffMember.findMany({
    where: {
      organizationId: user.organizationId,
      active: true,
      OR: [
        {
          userId: user.id,
        },
        {
          coachEmail: {
            equals: user.email,
            mode: "insensitive",
          },
        },
      ],
    },
    select: {
      categoryPermissions: {
        where: {
          organizationId: user.organizationId,
          categoryId,
          enabled: true,
          sport: {
            in: allowedSports,
          },
        },
        select: {
          permission: true,
        },
      },
    },
  });

  const permissions = new Set<StaffScopedPermission>();

  for (const staffLink of staffLinks) {
    for (const item of staffLink.categoryPermissions) {
      permissions.add(item.permission as StaffScopedPermission);
    }
  }

  return permissions;
}

function hasRoleOrScopedPermission(
  user: OrganizationUser,
  scopedPermissions: Set<StaffScopedPermission>,
  permission: StaffScopedPermission
) {
  return (
    hasClubPermission(user, permission) ||
    scopedPermissions.has(permission)
  );
}

export async function getClubTrainingCategoryAccess(
  user: OrganizationUser,
  categoryId: string,
  sport: SportType = "BOTH"
) {
  const scopedPermissions =
    await findStaffCategoryPermissions(
      user,
      categoryId,
      sport
    );

  const canManageAttendance =
    hasRoleOrScopedPermission(
      user,
      scopedPermissions,
      "TRAINING_ATTENDANCE_MANAGE"
    );

  const canViewAttendance =
    canManageAttendance ||
    hasRoleOrScopedPermission(
      user,
      scopedPermissions,
      "TRAINING_ATTENDANCE_VIEW"
    );

  const canManagePerformance =
    hasRoleOrScopedPermission(
      user,
      scopedPermissions,
      "PERFORMANCE_MANAGE"
    );

  const canViewPerformance =
    canManagePerformance ||
    hasRoleOrScopedPermission(
      user,
      scopedPermissions,
      "PERFORMANCE_VIEW"
    );

  const canGeneratePerformanceReport =
    hasRoleOrScopedPermission(
      user,
      scopedPermissions,
      "PERFORMANCE_REPORT_GENERATE"
    );

  const canReviewPerformanceReport =
    hasRoleOrScopedPermission(
      user,
      scopedPermissions,
      "PERFORMANCE_REPORT_REVIEW"
    );

  const canApprovePerformanceReport =
    hasRoleOrScopedPermission(
      user,
      scopedPermissions,
      "PERFORMANCE_REPORT_APPROVE"
    );

  const canSendPerformanceReport =
    hasRoleOrScopedPermission(
      user,
      scopedPermissions,
      "PERFORMANCE_REPORT_SEND"
    );

  const canManageGps =
    hasRoleOrScopedPermission(
      user,
      scopedPermissions,
      "GPS_MANAGE"
    );

  const canImportGps =
    canManageGps ||
    hasRoleOrScopedPermission(
      user,
      scopedPermissions,
      "GPS_IMPORT"
    );

  const canViewGps =
    canImportGps ||
    hasRoleOrScopedPermission(
      user,
      scopedPermissions,
      "GPS_VIEW"
    );

  const canEditTraining =
    hasClubPermission(
      user,
      "TRAININGS_EDIT"
    );

  const canViewTraining =
    hasClubPermission(
      user,
      "TRAININGS_VIEW"
    ) ||
    canViewAttendance ||
    canViewPerformance ||
    canViewGps;

  return {
    canViewTraining,
    canEditTraining,
    canViewAttendance,
    canManageAttendance,
    canViewPerformance,
    canManagePerformance,
    canGeneratePerformanceReport,
    canReviewPerformanceReport,
    canApprovePerformanceReport,
    canSendPerformanceReport,
    canViewGps,
    canImportGps,
    canManageGps,
  };
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
