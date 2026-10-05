import { redirect } from "next/navigation";

import { requireOrganizationUser } from "@/lib/auth";
import { hasEffectiveClubElite } from "@/lib/billing-entitlements";
import { getClubGrowthCategoryAccess } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

async function organizationHasElite(organizationId: string) {
  const [subscription, organization] = await Promise.all([
    prisma.subscription.findUnique({ where: { organizationId } }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { accessStatus: true, complimentaryUntil: true },
    }),
  ]);
  return hasEffectiveClubElite({
    plan: subscription?.plan,
    status: subscription?.status,
    trialEnds: subscription?.trialEnds,
    currentPeriodEnd: subscription?.currentPeriodEnd,
    accessStatus: organization?.accessStatus,
    complimentaryUntil: organization?.complimentaryUntil,
  });
}

export async function requireClubGrowthAccess(
  athleteId: string,
  mode: "view" | "manage" = "view",
) {
  const user = await requireOrganizationUser();

  // Crescimento contém dados privados/saúde. Suporte administrativo nunca abre o conteúdo.
  if (user.role === "SUPER_ADMIN" || user.isSupportMode) {
    redirect(`/atletas/${athleteId}?support=private-data-restricted`);
  }

  const athlete = await prisma.athlete.findFirst({
    where: { id: athleteId, organizationId: user.organizationId },
    select: { id: true, categoryId: true, organizationId: true },
  });
  if (!athlete) redirect("/atletas?erro=acesso");
  if (!(await organizationHasElite(athlete.organizationId))) redirect("/performance?erro=elite");

  const access = await getClubGrowthCategoryAccess(user, athlete.categoryId, "BOTH");
  if (mode === "manage" ? !access.canManageGrowth : !access.canViewGrowth) {
    redirect(`/atletas/${athleteId}/performance?erro=sem-permissao`);
  }
  return { user, athlete, ...access };
}
