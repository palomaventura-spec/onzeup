"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function nullable(value: FormDataEntryValue | null) {
  const v = clean(value);
  return v || null;
}

export async function updateOrganization(formData: FormData) {
  const user = await requireOrganizationUser();

  const name = clean(formData.get("name"));
  const publicName = nullable(formData.get("publicName"));
  const description = nullable(formData.get("description"));
  const logoUrl = nullable(formData.get("logoUrl"));
  const coverUrl = nullable(formData.get("coverUrl"));
  const accentColor = clean(formData.get("accentColor")) || "#9DDB16";
  const secondaryColor = clean(formData.get("secondaryColor")) || "#FFFFFF";
  const publicBackground = clean(formData.get("publicBackground")) || "#080B0C";
  const publicTheme = clean(formData.get("publicTheme")) || "DARK";
  const pixKey = nullable(formData.get("pixKey"));
  const taxId = nullable(formData.get("taxId"));
  const phone = nullable(formData.get("phone"));
  const whatsapp = nullable(formData.get("whatsapp"));
  const email = nullable(formData.get("email"));
  const instagram = nullable(formData.get("instagram"));
  const address = nullable(formData.get("address"));
  const city = nullable(formData.get("city"));
  const state = nullable(formData.get("state"));

  const showAthletesPublicly = clean(formData.get("showAthletesPublicly")) === "on";
  const showStaffPublicly = clean(formData.get("showStaffPublicly")) === "on";
  const showTrainingsPublicly = clean(formData.get("showTrainingsPublicly")) === "on";
  const showMatchesPublicly = clean(formData.get("showMatchesPublicly")) === "on";

  if (!name) return;

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: {
      name,
      publicName,
      description,
      logoUrl,
      coverUrl,
      accentColor, secondaryColor, publicBackground, publicTheme, pixKey, taxId,
      phone,
      whatsapp,
      email,
      instagram,
      address,
      city,
      state,
      showAthletesPublicly,
      showStaffPublicly,
      showTrainingsPublicly,
      showMatchesPublicly,
      onboardingCompleted: true,
    },
  });

  revalidatePath("/organizacao");
  revalidatePath(`/o/${user.organization?.slug}`);
}
