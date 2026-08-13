"use server";

import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";
import { redirect } from "next/navigation";

const clean = (v: FormDataEntryValue | null) => String(v || "").trim();

export async function finishClubOnboarding(formData: FormData) {
  const user = await requireOrganizationUser();
  const orgId = user.organizationId;

  const publicName = clean(formData.get("publicName"));
  const city = clean(formData.get("city"));
  const state = clean(formData.get("state"));
  const sport = clean(formData.get("sport")) || "BOTH";
  const instagram = clean(formData.get("instagram"));
  const pixKey = clean(formData.get("pixKey"));
  const accentColor = clean(formData.get("accentColor")) || "#9DDB16";
  const categoryName = clean(formData.get("categoryName"));
  const birthYearRaw = clean(formData.get("birthYear"));
  const weekdayRaw = clean(formData.get("weekday"));
  const startTime = clean(formData.get("startTime"));
  const endTime = clean(formData.get("endTime"));
  const location = clean(formData.get("location"));

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      publicName: publicName || user.organization?.name,
      city: city || null,
      state: state || null,
      sport: sport as any,
      instagram: instagram || null,
      pixKey: pixKey || null,
      accentColor,
      onboardingCompleted: true,
    },
  });

  if (categoryName) {
    const category = await prisma.category.upsert({
      where: { organizationId_name: { organizationId: orgId, name: categoryName } },
      update: { birthYear: birthYearRaw ? Number(birthYearRaw) : null },
      create: {
        name: categoryName,
        birthYear: birthYearRaw ? Number(birthYearRaw) : null,
        organizationId: orgId,
      },
    });

    if (weekdayRaw && startTime && endTime) {
      await prisma.trainingSchedule.create({
        data: {
          weekday: Number(weekdayRaw),
          startTime,
          endTime,
          location: location || null,
          organizationId: orgId,
          categoryId: category.id,
        },
      });
    }
  }

  redirect("/dashboard");
}
