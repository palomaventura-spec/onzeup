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
      organizationId: user.organizationId,
    },
  });

  revalidatePath("/comissao");
}

export async function updateStaffMember(formData: FormData) {
  const user = await requireOrganizationUser();
  const id = clean(formData.get("id"));
  const name = clean(formData.get("name"));
  const roleTitle = clean(formData.get("roleTitle"));
  const categoryId = nullable(formData.get("categoryId"));
  const photoUrl = nullable(formData.get("photoUrl"));
  const bio = nullable(formData.get("bio"));

  if (!id || !name || !roleTitle) return;

  if (categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, organizationId: user.organizationId },
      select: { id: true },
    });
    if (!category) return;
  }

  await prisma.staffMember.updateMany({
    where: { id, organizationId: user.organizationId },
    data: { name, roleTitle, categoryId, photoUrl, bio },
  });

  revalidatePath("/comissao");
  redirect("/comissao");
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
