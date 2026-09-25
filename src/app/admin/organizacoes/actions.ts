"use server";

import { PlanCode } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";

const VALID = new Set(["ACTIVE", "COMPLIMENTARY", "SUSPENDED", "CANCELLED"]);

function adminOrganizationUrl(id: string, params: string) {
  return `/admin/organizacoes/${id}?${params}`;
}

// Alteração isolada do plano: não modifica cortesia, cobrança ou permissões.
export async function updateOrganizationPlan(formData: FormData) {
  await requireSuperAdmin();
  const organizationId = String(formData.get("organizationId") || "").trim();
  const requestedPlan = String(formData.get("plan") || "").trim();
  if (!organizationId) redirect("/admin/organizacoes?error=missing");

  const plan = Object.values(PlanCode).find((value) => value === requestedPlan);
  if (!plan) redirect(adminOrganizationUrl(organizationId, "error=invalid_plan"));

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, accessStatus: true, complimentaryUntil: true },
  });
  if (!organization) redirect("/admin/organizacoes?error=not_found");

  // Uma assinatura existente recebe somente o novo plano.
  // Na ausência de assinatura, respeita a cortesia já registrada.
  const complimentary = organization.accessStatus === "COMPLIMENTARY";
  await prisma.subscription.upsert({
    where: { organizationId },
    create: {
      organizationId,
      plan,
      status: complimentary ? "ACTIVE" : "TRIAL",
      provider: complimentary ? "MANUAL_COMPLIMENTARY" : null,
      currentPeriodEnd: complimentary ? organization.complimentaryUntil : null,
    },
    update: { plan },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/organizacoes");
  revalidatePath(`/admin/organizacoes/${organizationId}`);
  revalidatePath("/", "layout");
  redirect(adminOrganizationUrl(organizationId, "saved=plan"));
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

  const organizationUsers = await prisma.user.findMany({
    where: { organizationId },
    select: { id: true },
  });
  const userIds = organizationUsers.map((user) => user.id);

  await prisma.$transaction(async (tx) => {
    // PasswordResetToken não possui FK no schema atual; limpamos explicitamente
    // para não deixar token órfão após exclusão definitiva da organização.
    if (userIds.length) {
      await tx.passwordResetToken.deleteMany({
        where: { userId: { in: userIds } },
      });

      // Remove explicitamente as contas da organização para garantir que
      // os e-mails possam ser reutilizados após exclusão definitiva.
      await tx.user.deleteMany({
        where: { id: { in: userIds }, organizationId },
      });
    }

    await tx.organization.delete({ where: { id: organizationId } });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/organizacoes");
  redirect("/admin/organizacoes?deleted=1");
}
