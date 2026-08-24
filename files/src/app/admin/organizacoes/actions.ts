"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";

const VALID = new Set(["ACTIVE", "COMPLIMENTARY", "SUSPENDED", "CANCELLED"]);

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
      create: { organizationId, status: "ACTIVE", provider: "MANUAL_COMPLIMENTARY", currentPeriodEnd: complimentaryUntil },
      update: { status: "ACTIVE", provider: "MANUAL_COMPLIMENTARY", currentPeriodEnd: complimentaryUntil },
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/organizacoes");
  revalidatePath(`/admin/organizacoes/${organizationId}`);
  redirect(`/admin/organizacoes/${organizationId}?saved=1`);
}
