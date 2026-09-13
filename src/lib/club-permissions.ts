import type { UserRole } from "@prisma/client";

export type ClubRole =
  | "MANAGER"
  | "COORDINATOR"
  | "COACH"
  | "FINANCE";

export type ClubPermission =
  | "DASHBOARD_VIEW"
  | "AGENDA_VIEW"
  | "AGENDA_EDIT"
  | "CATEGORIES_VIEW"
  | "CATEGORIES_EDIT"
  | "STAFF_VIEW"
  | "STAFF_EDIT"
  | "ATHLETES_VIEW"
  | "ATHLETES_EDIT"
  | "TRAININGS_VIEW"
  | "TRAININGS_EDIT"
  | "MATCHES_VIEW"
  | "MATCHES_EDIT"
  | "QTR_VIEW"
  | "QTR_EDIT"
  | "CALLUPS_VIEW"
  | "CALLUPS_MANAGE"
  | "COMMUNICATION_VIEW"
  | "PLAYER_LINKS_VIEW"
  | "FINANCE_VIEW"
  | "FINANCE_EDIT"
  | "ORGANIZATION_MANAGE"
  | "PLAN_MANAGE"
  | "INTEGRATIONS_MANAGE"
  | "USERS_MANAGE";

type ClubUserLike = {
  role: UserRole;
  clubRole?: ClubRole | null;
  organizationId?: string | null;
};

export function getEffectiveClubRole(
  user: ClubUserLike
): ClubRole | null {
  if (user.role === "SUPER_ADMIN") {
    return "MANAGER";
  }

  if (
    user.role !== "COORDINATOR" ||
    !user.organizationId
  ) {
    return null;
  }

  return user.clubRole ?? "MANAGER";
}

const MANAGER_PERMISSIONS: ClubPermission[] = [
  "DASHBOARD_VIEW",

  "AGENDA_VIEW",
  "AGENDA_EDIT",

  "CATEGORIES_VIEW",
  "CATEGORIES_EDIT",

  "STAFF_VIEW",
  "STAFF_EDIT",

  "ATHLETES_VIEW",
  "ATHLETES_EDIT",

  "TRAININGS_VIEW",
  "TRAININGS_EDIT",

  "MATCHES_VIEW",
  "MATCHES_EDIT",

  "QTR_VIEW",
  "QTR_EDIT",

  "CALLUPS_VIEW",
  "CALLUPS_MANAGE",

  "COMMUNICATION_VIEW",
  "PLAYER_LINKS_VIEW",

  "FINANCE_VIEW",
  "FINANCE_EDIT",

  "ORGANIZATION_MANAGE",
  "PLAN_MANAGE",
  "INTEGRATIONS_MANAGE",

  "USERS_MANAGE",
];

const COORDINATOR_PERMISSIONS: ClubPermission[] = [
  "DASHBOARD_VIEW",

  "AGENDA_VIEW",
  "AGENDA_EDIT",

  "CATEGORIES_VIEW",

  "STAFF_VIEW",

  "ATHLETES_VIEW",
  "ATHLETES_EDIT",

  "TRAININGS_VIEW",
  "TRAININGS_EDIT",

  "MATCHES_VIEW",
  "MATCHES_EDIT",

  "QTR_VIEW",
  "QTR_EDIT",

  "CALLUPS_VIEW",
  "CALLUPS_MANAGE",

  "COMMUNICATION_VIEW",
  "PLAYER_LINKS_VIEW",
];

const COACH_PERMISSIONS: ClubPermission[] = [
  "DASHBOARD_VIEW",

  "AGENDA_VIEW",

  "CATEGORIES_VIEW",

  "ATHLETES_VIEW",

  "TRAININGS_VIEW",

  "MATCHES_VIEW",

  "QTR_VIEW",

  "CALLUPS_VIEW",
  "CALLUPS_MANAGE",
];

const FINANCE_PERMISSIONS: ClubPermission[] = [
  "DASHBOARD_VIEW",

  "FINANCE_VIEW",
  "FINANCE_EDIT",
];

function permissionsForRole(
  clubRole: ClubRole
): ClubPermission[] {
  switch (clubRole) {
    case "MANAGER":
      return MANAGER_PERMISSIONS;

    case "COORDINATOR":
      return COORDINATOR_PERMISSIONS;

    case "COACH":
      return COACH_PERMISSIONS;

    case "FINANCE":
      return FINANCE_PERMISSIONS;

    default:
      return [];
  }
}

export function hasClubPermission(
  user: ClubUserLike,
  permission: ClubPermission
): boolean {
  const clubRole =
    getEffectiveClubRole(user);

  if (!clubRole) {
    return false;
  }

  return permissionsForRole(
    clubRole
  ).includes(permission);
}

export function canManageClubUsers(
  user: ClubUserLike
): boolean {
  return hasClubPermission(
    user,
    "USERS_MANAGE"
  );
}

export function clubRoleLabel(
  clubRole: ClubRole | null | undefined
): string {
  switch (clubRole) {
    case "MANAGER":
      return "Gestor";

    case "COORDINATOR":
      return "Coordenador";

    case "COACH":
      return "Coach";

    case "FINANCE":
      return "Financeiro";

    default:
      return "Gestor";
  }
}