"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";

const VALID = new Set(["ACTIVE", "COMPLIMENTARY", "SUSPENDED", "CANCELLED"]);

function adminOrganizationUrl(id: string, params: string) {
  return `/admin/organizacoes/${id}?${params}`;
}

export async function updateOrganizationAccess(formData: FormData) {
  await requireSuperAdmin();
  const organizationId = String(formData.get("organizationId") || "");
  const accessStatus = String(formData.get("accessStatus") || "ACTIVE").toUpperCase();
  const complimentaryMode = String(formData.get("complimentaryMode") || "NO_EXPIRY");
  const untilRaw = String(formData.get("complimentaryUntil") || "").trim();
  const reason = String(formData.get("complimentaryReason") || "").trim();
  if (!organizationId || !VALID.has(accessStatus)) return;

  let complimentaryUntil: Date | null = null;
  if (accessStatus === "COMPLIMENTARY" && complimentaryMode === "UNTIL" && untilRaw) {
    const parsed = new Date(`${untilRaw}T23:59:59`);
    if (!Number.isNaN(parsed.getTime())) complimentaryUntil = parsed;
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      accessStatus,
      active: accessStatus === "ACTIVE" || accessStatus === "COMPLIMENTARY",
      complimentaryUntil: accessStatus === "COMPLIMENTARY" ? complimentaryUntil : null,
      complimentaryReason: accessStatus === "COMPLIMENTARY" ? (reason || null) : null,
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

  revalidatePath("/admin");
  revalidatePath("/admin/organizacoes");
  revalidatePath(`/admin/organizacoes/${organizationId}`);
  redirect(adminOrganizationUrl(organizationId, "saved=1"));
}

export async function deactivateOrganization(formData: FormData) {
  await requireSuperAdmin();
  const organizationId = String(formData.get("organizationId") || "").trim();
  if (!organizationId) redirect("/admin/organizacoes?error=missing");

  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organization) redirect("/admin/organizacoes?error=not_found");

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      active: false,
      accessStatus: "SUSPENDED",
      complimentaryUntil: null,
      complimentaryReason: null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/organizacoes");
  revalidatePath(`/admin/organizacoes/${organizationId}`);
  redirect(adminOrganizationUrl(organizationId, "saved=deactivated"));
}

export async function reactivateOrganization(formData: FormData) {
  await requireSuperAdmin();
  const organizationId = String(formData.get("organizationId") || "").trim();
  if (!organizationId) redirect("/admin/organizacoes?error=missing");

  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organization) redirect("/admin/organizacoes?error=not_found");

  await prisma.organization.update({
    where: { id: organizationId },
    data: { active: true, accessStatus: "ACTIVE" },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/organizacoes");
  revalidatePath(`/admin/organizacoes/${organizationId}`);
  redirect(adminOrganizationUrl(organizationId, "saved=reactivated"));
}

export async function deleteInactiveOrganization(formData: FormData) {
  await requireSuperAdmin();
  const organizationId = String(formData.get("organizationId") || "").trim();
  if (!organizationId) redirect("/admin/organizacoes?error=missing");

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

  if (!organization) redirect("/admin/organizacoes?error=not_found");

  const deletableStatus =
    !organization.active &&
    (organization.accessStatus === "SUSPENDED" || organization.accessStatus === "CANCELLED");

  if (!deletableStatus) {
    redirect(adminOrganizationUrl(organizationId, "error=must_deactivate"));
  }

  const [paidPayments, paidCharges] = await Promise.all([
    prisma.payment.count({
      where: { organizationId, status: "PAID" },
    }),
    prisma.charge.count({
      where: { organizationId, status: "PAID" },
    }),
  ]);

  if (paidPayments > 0 || paidCharges > 0) {
    redirect(adminOrganizationUrl(organizationId, "error=financial_history"));
  }

  await prisma.organization.delete({ where: { id: organizationId } });

  revalidatePath("/admin");
  revalidatePath("/admin/organizacoes");
  redirect("/admin/organizacoes?deleted=1");
}
