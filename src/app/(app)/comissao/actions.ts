"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}
function nullable(value: FormDataEntryValue | null) {
  const v = clean(value);
  return v || null;
}

export async function createStaffMember(formData: FormData) {
  const user = await requireOrganizationUser();
  const name = clean(formData.get("name"));
  const roleTitle = clean(formData.get("roleTitle"));
  const categoryId = nullable(formData.get("categoryId"));
  const photoUrl = nullable(formData.get("photoUrl"));
  const bio = nullable(formData.get("bio"));
  const coachEmail = nullable(formData.get("coachEmail"))?.toLowerCase() || null;
  const sport = (clean(formData.get("sport")) || "BOTH") as "FOOTBALL" | "FUTSAL" | "BOTH";
  const canManageCallUps = formData.get("canManageCallUps") === "on";

  if (!name || !roleTitle) return;

  if (categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, organizationId: user.organizationId },
      select: { id: true },
    });
    if (!category) return;
  }

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
      organizationId: user.organizationId,
    },
  });

  if (coachEmail) {
    const coach = await prisma.coachProfile.findFirst({
      where: { owner: { email: { equals: coachEmail, mode: "insensitive" } } },
      select: { id: true },
    });

    if (coach) {
      const existing = await prisma.coachOrganizationAccess.findFirst({
        where: { coachId: coach.id, organizationId: user.organizationId, categoryId, sport },
        select: { id: true },
      });

      const data = {
        roleTitle,
        requestedBy: "CLUB",
        active: false,
        canViewRoster: true,
        canViewSchedule: true,
        canViewCallUps: true,
        canManageCallUps,
      };

      if (existing) {
        await prisma.coachOrganizationAccess.update({ where: { id: existing.id }, data });
      } else {
        await prisma.coachOrganizationAccess.create({
          data: {
            coachId: coach.id,
            organizationId: user.organizationId,
            categoryId,
            sport,
            ...data,
          },
        });
      }
    }
  }

  revalidatePath("/comissao");
  revalidatePath("/coach/dashboard");

  if (coachEmail) {
    const coachExists = await prisma.coachProfile.findFirst({
      where: { owner: { email: { equals: coachEmail, mode: "insensitive" } } },
      select: { id: true },
    });
    redirect(`/comissao?coachInvite=${coachExists ? "sent" : "saved"}`);
  }
}

export async function updateStaffMember(formData: FormData) {
  const user = await requireOrganizationUser();
  const id = clean(formData.get("id"));
  const name = clean(formData.get("name"));
  const roleTitle = clean(formData.get("roleTitle"));
  const categoryId = nullable(formData.get("categoryId"));
  const photoUrl = nullable(formData.get("photoUrl"));
  const bio = nullable(formData.get("bio"));
  const coachEmail = nullable(formData.get("coachEmail"))?.toLowerCase() || null;
  const sport = (clean(formData.get("sport")) || "BOTH") as "FOOTBALL" | "FUTSAL" | "BOTH";
  const canManageCallUps = formData.get("canManageCallUps") === "on";

  if (!id || !name || !roleTitle) return;

  await prisma.staffMember.updateMany({
    where: { id, organizationId: user.organizationId },
    data: { name, roleTitle, categoryId, photoUrl, bio, coachEmail, sport, canManageCallUps },
  });

  revalidatePath("/comissao");
  redirect("/comissao");
}

export async function approveCoachAccessRequest(formData: FormData) {
  const user = await requireOrganizationUser();
  const accessId = clean(formData.get("accessId"));
  if (!accessId) return;

  await prisma.coachOrganizationAccess.updateMany({
    where: {
      id: accessId,
      organizationId: user.organizationId,
      active: false,
      requestedBy: "COACH",
    },
    data: { active: true },
  });

  revalidatePath("/comissao");
  revalidatePath("/coach/dashboard");
  redirect("/comissao?coachInvite=approved");
}

export async function rejectCoachAccessRequest(formData: FormData) {
  const user = await requireOrganizationUser();
  const accessId = clean(formData.get("accessId"));
  if (!accessId) return;

  await prisma.coachOrganizationAccess.deleteMany({
    where: {
      id: accessId,
      organizationId: user.organizationId,
      active: false,
      requestedBy: "COACH",
    },
  });

  revalidatePath("/comissao");
  revalidatePath("/coach/dashboard");
  redirect("/comissao?coachInvite=rejected");
}

export async function deleteStaffMember(formData: FormData) {
  const user = await requireOrganizationUser();
  const id = clean(formData.get("id"));
  if (!id) return;

  await prisma.staffMember.deleteMany({
    where: { id, organizationId: user.organizationId },
  });

  revalidatePath("/comissao");
}
