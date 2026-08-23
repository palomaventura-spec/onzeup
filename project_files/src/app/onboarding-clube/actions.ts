"use server";

import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";
import { redirect } from "next/navigation";

const clean = (v: FormDataEntryValue | null) => String(v || "").trim();

export async function finishClubOnboarding(formData: FormData) {
  const user = await requireOrganizationUser();
  const orgId = user.organizationId;

  const publicName = clean(formData.get("publicName"));
  const taxId = clean(formData.get("taxId"));
  const sport = clean(formData.get("sport")) || "BOTH";
  const whatsapp = clean(formData.get("whatsapp"));
  const address = clean(formData.get("address"));
  const city = clean(formData.get("city"));
  const state = clean(formData.get("state"));

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      publicName: publicName || user.organization?.name,
      taxId: taxId || null,
      sport: sport as any,
      whatsapp: whatsapp || null,
      phone: whatsapp || user.organization?.phone || null,
      address: address || null,
      city: city || null,
      state: state || null,
      onboardingCompleted: true,
    },
  });

  redirect("/dashboard");
}
