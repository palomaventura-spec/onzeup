"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireClubPermission } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

type StaffSport =
  | "FOOTBALL"
  | "FUTSAL"
  | "BOTH";

type StaffLinkData = {
  organizationId: string;
  coachEmail: string | null;
  categoryId: string | null;
  sport: StaffSport;
  roleTitle: string;
  canManageCallUps: boolean;
};

function clean(
  value: FormDataEntryValue | null
) {
  return String(value ?? "").trim();
}

function nullable(
  value: FormDataEntryValue | null
) {
  const valueCleaned = clean(value);
  return valueCleaned || null;
}

function validSport(
  value: string
): value is StaffSport {
  return [
    "FOOTBALL",
    "FUTSAL",
    "BOTH",
  ].includes(value);
}

async function findCoachByEmail(
  coachEmail: string | null
) {
  if (!coachEmail) {
    return null;
  }

  return prisma.coachProfile.findFirst({
    where: {
      owner: {
        email: {
          equals: coachEmail,
          mode: "insensitive",
        },
      },
    },

    select: {
      id: true,
    },
  });
}

async function syncCoachAccess(
  staff: StaffLinkData
) {
  const coach =
    await findCoachByEmail(
      staff.coachEmail
    );

  if (!coach) {
    return false;
  }

  const existingAccesses =
    await prisma
      .coachOrganizationAccess
      .findMany({
        where: {
          coachId: coach.id,
          organizationId:
            staff.organizationId,
          categoryId:
            staff.categoryId,
          sport: staff.sport,
        },

        select: {
          id: true,
        },
      });

  const accessData = {
    roleTitle: staff.roleTitle,
    canViewRoster: true,
    canViewSchedule: true,
    canViewCallUps: true,
    canManageCallUps:
      staff.canManageCallUps,
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

    return true;
  }

  await prisma
    .coachOrganizationAccess
    .create({
      data: {
        coachId: coach.id,
        organizationId:
          staff.organizationId,
        categoryId:
          staff.categoryId,
        sport: staff.sport,
        requestedBy: "CLUB",
        active: false,
        ...accessData,
      },
    });

  return true;
}

async function removeOrphanedCoachAccess({
  staffMemberId,
  staff,
}: {
  staffMemberId: string;
  staff: StaffLinkData;
}) {
  const coach =
    await findCoachByEmail(
      staff.coachEmail
    );

  if (!coach || !staff.coachEmail) {
    return;
  }

  const anotherStaffMember =
    await prisma.staffMember.findFirst({
      where: {
        id: {
          not: staffMemberId,
        },

        organizationId:
          staff.organizationId,

        coachEmail: {
          equals: staff.coachEmail,
          mode: "insensitive",
        },

        categoryId:
          staff.categoryId,

        sport: staff.sport,
      },

      select: {
        id: true,
      },
    });

  if (anotherStaffMember) {
    return;
  }

  await prisma
    .coachOrganizationAccess
    .deleteMany({
      where: {
        coachId: coach.id,
        organizationId:
          staff.organizationId,
        categoryId:
          staff.categoryId,
        sport: staff.sport,
      },
    });
}

function sameStaffLink(
  previous: StaffLinkData,
  next: StaffLinkData
) {
  return (
    previous.organizationId ===
      next.organizationId &&
    previous.coachEmail ===
      next.coachEmail &&
    previous.categoryId ===
      next.categoryId &&
    previous.sport === next.sport
  );
}

export async function createStaffMember(
  formData: FormData
) {
  const user =
    await requireClubPermission(
      "STAFF_EDIT"
    );

  const name =
    clean(formData.get("name"));

  const roleTitle =
    clean(formData.get("roleTitle"));

  const categoryId =
    nullable(
      formData.get("categoryId")
    );

  const photoUrl =
    nullable(formData.get("photoUrl"));

  const bio =
    nullable(formData.get("bio"));

  const coachEmail =
    nullable(
      formData.get("coachEmail")
    )?.toLowerCase() || null;

  const rawSport =
    clean(formData.get("sport")) ||
    "BOTH";

  const sport: StaffSport =
    validSport(rawSport)
      ? rawSport
      : "BOTH";

  const canManageCallUps =
    formData.get(
      "canManageCallUps"
    ) === "on";

  if (!name || !roleTitle) {
    return;
  }

  if (categoryId) {
    const category =
      await prisma.category.findFirst({
        where: {
          id: categoryId,
          organizationId:
            user.organizationId,
        },

        select: {
          id: true,
        },
      });

    if (!category) {
      return;
    }
  }

  const member =
    await prisma.staffMember.create({
      data: {
        name,
        roleTitle,
        categoryId,
        photoUrl,
        bio,
        coachEmail,
        sport,
        canManageCallUps,
        organizationId:
          user.organizationId,
      },

      select: {
        id: true,
      },
    });

  const coachExists =
    await syncCoachAccess({
      organizationId:
        user.organizationId,
      coachEmail,
      categoryId,
      sport,
      roleTitle,
      canManageCallUps,
    });

  revalidatePath("/comissao");
  revalidatePath(
    "/coach/dashboard"
  );

  if (coachEmail) {
    redirect(
      `/comissao?coachInvite=${
        coachExists
          ? "sent"
          : "saved"
      }`
    );
  }

  void member;
}

export async function updateStaffMember(
  formData: FormData
) {
  const user =
    await requireClubPermission(
      "STAFF_EDIT"
    );

  const id =
    clean(formData.get("id"));

  const name =
    clean(formData.get("name"));

  const roleTitle =
    clean(formData.get("roleTitle"));

  const categoryId =
    nullable(
      formData.get("categoryId")
    );

  const photoUrl =
    nullable(formData.get("photoUrl"));

  const bio =
    nullable(formData.get("bio"));

  const coachEmail =
    nullable(
      formData.get("coachEmail")
    )?.toLowerCase() || null;

  const rawSport =
    clean(formData.get("sport")) ||
    "BOTH";

  const sport: StaffSport =
    validSport(rawSport)
      ? rawSport
      : "BOTH";

  const canManageCallUps =
    formData.get(
      "canManageCallUps"
    ) === "on";

  if (
    !id ||
    !name ||
    !roleTitle
  ) {
    return;
  }

  if (categoryId) {
    const category =
      await prisma.category.findFirst({
        where: {
          id: categoryId,
          organizationId:
            user.organizationId,
        },

        select: {
          id: true,
        },
      });

    if (!category) {
      return;
    }
  }

  const previousMember =
    await prisma.staffMember.findFirst({
      where: {
        id,
        organizationId:
          user.organizationId,
      },

      select: {
        id: true,
        coachEmail: true,
        categoryId: true,
        sport: true,
        roleTitle: true,
        canManageCallUps: true,
      },
    });

  if (!previousMember) {
    return;
  }

  const previousLink: StaffLinkData = {
    organizationId:
      user.organizationId,

    coachEmail:
      previousMember.coachEmail
        ?.toLowerCase() || null,

    categoryId:
      previousMember.categoryId,

    sport:
      previousMember.sport,

    roleTitle:
      previousMember.roleTitle,

    canManageCallUps:
      previousMember.canManageCallUps,
  };

  const nextLink: StaffLinkData = {
    organizationId:
      user.organizationId,
    coachEmail,
    categoryId,
    sport,
    roleTitle,
    canManageCallUps,
  };

  await prisma.staffMember.update({
    where: {
      id: previousMember.id,
    },

    data: {
      name,
      roleTitle,
      categoryId,
      photoUrl,
      bio,
      coachEmail,
      sport,
      canManageCallUps,
    },
  });

  if (
    !sameStaffLink(
      previousLink,
      nextLink
    )
  ) {
    await removeOrphanedCoachAccess({
      staffMemberId:
        previousMember.id,
      staff: previousLink,
    });
  }

  await syncCoachAccess(nextLink);

  revalidatePath("/comissao");
  revalidatePath(
    "/coach/dashboard"
  );
  revalidatePath("/convocacoes");

  redirect("/comissao");
}

export async function approveCoachAccessRequest(
  formData: FormData
) {
  const user =
    await requireClubPermission(
      "STAFF_EDIT"
    );

  const accessId =
    clean(formData.get("accessId"));

  if (!accessId) {
    return;
  }

  await prisma
    .coachOrganizationAccess
    .updateMany({
      where: {
        id: accessId,
        organizationId:
          user.organizationId,
        active: false,
        requestedBy: "COACH",
      },

      data: {
        active: true,
      },
    });

  revalidatePath("/comissao");
  revalidatePath(
    "/coach/dashboard"
  );

  redirect(
    "/comissao?coachInvite=approved"
  );
}

export async function rejectCoachAccessRequest(
  formData: FormData
) {
  const user =
    await requireClubPermission(
      "STAFF_EDIT"
    );

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
        organizationId:
          user.organizationId,
        active: false,
        requestedBy: "COACH",
      },
    });

  revalidatePath("/comissao");
  revalidatePath(
    "/coach/dashboard"
  );

  redirect(
    "/comissao?coachInvite=rejected"
  );
}

export async function deleteStaffMember(
  formData: FormData
) {
  const user =
    await requireClubPermission(
      "STAFF_EDIT"
    );

  const id =
    clean(formData.get("id"));

  if (!id) {
    return;
  }

  const member =
    await prisma.staffMember.findFirst({
      where: {
        id,
        organizationId:
          user.organizationId,
      },

      select: {
        id: true,
        coachEmail: true,
        categoryId: true,
        sport: true,
        roleTitle: true,
        canManageCallUps: true,
      },
    });

  if (!member) {
    return;
  }

  const previousLink: StaffLinkData = {
    organizationId:
      user.organizationId,

    coachEmail:
      member.coachEmail
        ?.toLowerCase() || null,

    categoryId:
      member.categoryId,

    sport:
      member.sport,

    roleTitle:
      member.roleTitle,

    canManageCallUps:
      member.canManageCallUps,
  };

  await prisma.staffMember.delete({
    where: {
      id: member.id,
    },
  });

  await removeOrphanedCoachAccess({
    staffMemberId: member.id,
    staff: previousLink,
  });

  revalidatePath("/comissao");
  revalidatePath(
    "/coach/dashboard"
  );
  revalidatePath("/convocacoes");
}