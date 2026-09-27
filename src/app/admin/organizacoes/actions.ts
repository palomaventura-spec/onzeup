"use server";

import { PlanCode } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_ACCESS = new Set([
  "ACTIVE",
  "COMPLIMENTARY",
  "SUSPENDED",
  "CANCELLED",
]);

const VALID_PLANS = new Set<PlanCode>([
  PlanCode.STARTER,
  PlanCode.PRO,
  PlanCode.BUSINESS,
]);

function adminOrganizationUrl(id: string, params: string) {
  return `/admin/organizacoes/${id}?${params}`;
}

function revalidateOrganizationAdmin(organizationId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/organizacoes");
  revalidatePath(`/admin/organizacoes/${organizationId}`);
  revalidatePath("/dashboard");
  revalidatePath("/performance");
  revalidatePath("/planos");
}

export async function updateOrganizationPlan(formData: FormData) {
  await requireSuperAdmin();

  const organizationId = String(
    formData.get("organizationId") || ""
  ).trim();

  const plan = String(
    formData.get("plan") || ""
  ).toUpperCase() as PlanCode;

  if (!organizationId || !VALID_PLANS.has(plan)) {
    redirect(
      adminOrganizationUrl(
        organizationId || "invalido",
        "error=invalid_plan"
      )
    );
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      accessStatus: true,
      complimentaryUntil: true,
    },
  });

  if (!organization) {
    redirect("/admin/organizacoes?error=not_found");
  }

  await prisma.subscription.upsert({
    where: { organizationId },
    create: {
      organizationId,
      plan,
      status: "ACTIVE",
      provider:
        organization.accessStatus === "COMPLIMENTARY"
          ? "MANUAL_COMPLIMENTARY"
          : "MANUAL_ADMIN",
      currentPeriodEnd:
        organization.accessStatus === "COMPLIMENTARY"
          ? organization.complimentaryUntil
          : null,
    },
    update: {
      plan,
    },
  });

  revalidateOrganizationAdmin(organizationId);

  redirect(
    adminOrganizationUrl(
      organizationId,
      "saved=plan"
    )
  );
}

export async function updateOrganizationAccess(formData: FormData) {
  await requireSuperAdmin();

  const organizationId = String(
    formData.get("organizationId") || ""
  ).trim();

  const accessStatus = String(
    formData.get("accessStatus") || "ACTIVE"
  ).toUpperCase();

  const complimentaryMode = String(
    formData.get("complimentaryMode") || "NO_EXPIRY"
  );

  const untilRaw = String(
    formData.get("complimentaryUntil") || ""
  ).trim();

  const reason = String(
    formData.get("complimentaryReason") || ""
  ).trim();

  if (!organizationId || !VALID_ACCESS.has(accessStatus)) {
    return;
  }

  let complimentaryUntil: Date | null = null;

  if (
    accessStatus === "COMPLIMENTARY" &&
    complimentaryMode === "UNTIL" &&
    untilRaw
  ) {
    const parsed = new Date(`${untilRaw}T23:59:59`);

    if (!Number.isNaN(parsed.getTime())) {
      complimentaryUntil = parsed;
    }
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      accessStatus,
      active:
        accessStatus === "ACTIVE" ||
        accessStatus === "COMPLIMENTARY",
      complimentaryUntil:
        accessStatus === "COMPLIMENTARY"
          ? complimentaryUntil
          : null,
      complimentaryReason:
        accessStatus === "COMPLIMENTARY"
          ? reason || null
          : null,
    },
  });

  if (accessStatus === "COMPLIMENTARY") {
    await prisma.subscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        status: "ACTIVE",
        provider: "MANUAL_COMPLIMENTARY",
        currentPeriodEnd: complimentaryUntil,
      },
      update: {
        status: "ACTIVE",
        provider: "MANUAL_COMPLIMENTARY",
        currentPeriodEnd: complimentaryUntil,
      },
    });
  }

  revalidateOrganizationAdmin(organizationId);

  redirect(
    adminOrganizationUrl(
      organizationId,
      "saved=1"
    )
  );
}

export async function deactivateOrganization(formData: FormData) {
  await requireSuperAdmin();

  const organizationId = String(
    formData.get("organizationId") || ""
  ).trim();

  if (!organizationId) {
    redirect("/admin/organizacoes?error=missing");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    redirect("/admin/organizacoes?error=not_found");
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      active: false,
      accessStatus: "SUSPENDED",
      complimentaryUntil: null,
      complimentaryReason: null,
    },
  });

  revalidateOrganizationAdmin(organizationId);

  redirect(
    adminOrganizationUrl(
      organizationId,
      "saved=deactivated"
    )
  );
}

export async function reactivateOrganization(formData: FormData) {
  await requireSuperAdmin();

  const organizationId = String(
    formData.get("organizationId") || ""
  ).trim();

  if (!organizationId) {
    redirect("/admin/organizacoes?error=missing");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    redirect("/admin/organizacoes?error=not_found");
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      active: true,
      accessStatus: "ACTIVE",
    },
  });

  revalidateOrganizationAdmin(organizationId);

  redirect(
    adminOrganizationUrl(
      organizationId,
      "saved=reactivated"
    )
  );
}

export async function deleteInactiveOrganization(formData: FormData) {
  await requireSuperAdmin();

  const organizationId = String(
    formData.get("organizationId") || ""
  ).trim();

  if (!organizationId) {
    redirect("/admin/organizacoes?error=missing");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      active: true,
      accessStatus: true,
      _count: {
        select: {
          users: true,
          athletes: true,
          categories: true,
          matches: true,
          qtrs: true,
        },
      },
    },
  });

  if (!organization) {
    redirect("/admin/organizacoes?error=not_found");
  }

  const deletableStatus =
    !organization.active &&
    (
      organization.accessStatus === "SUSPENDED" ||
      organization.accessStatus === "CANCELLED"
    );

  if (!deletableStatus) {
    redirect(
      adminOrganizationUrl(
        organizationId,
        "error=must_deactivate"
      )
    );
  }

  const [paidPayments, paidCharges] = await Promise.all([
    prisma.payment.count({
      where: {
        organizationId,
        status: "PAID",
      },
    }),
    prisma.charge.count({
      where: {
        organizationId,
        status: "PAID",
      },
    }),
  ]);

  if (paidPayments > 0 || paidCharges > 0) {
    redirect(
      adminOrganizationUrl(
        organizationId,
        "error=financial_history"
      )
    );
  }

  const organizationUsers = await prisma.user.findMany({
    where: { organizationId },
    select: { id: true },
  });

  const userIds = organizationUsers.map(
    (user) => user.id
  );

  await prisma.$transaction(async (tx) => {
    if (userIds.length) {
      await tx.passwordResetToken.deleteMany({
        where: {
          userId: {
            in: userIds,
          },
        },
      });

      await tx.user.deleteMany({
        where: {
          id: {
            in: userIds,
          },
          organizationId,
        },
      });
    }

    await tx.organization.delete({
      where: { id: organizationId },
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/organizacoes");

  redirect("/admin/organizacoes?deleted=1");
}