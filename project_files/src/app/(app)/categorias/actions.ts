"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function createCategory(formData: FormData) {
  const user = await requireOrganizationUser();
  const name = clean(formData.get("name"));
  const birthYearRaw = clean(formData.get("birthYear"));
  const birthYear = birthYearRaw ? Number(birthYearRaw) : null;

  if (!name) return;

  await prisma.category.create({
    data: {
      name,
      birthYear: Number.isFinite(birthYear) ? birthYear : null,
      organizationId: user.organizationId,
    },
  });

  revalidatePath("/categorias");
}

export async function updateCategory(formData: FormData) {
  const user = await requireOrganizationUser();
  const id = clean(formData.get("id"));
  const name = clean(formData.get("name"));
  const birthYearRaw = clean(formData.get("birthYear"));
  const birthYear = birthYearRaw ? Number(birthYearRaw) : null;

  if (!id || !name) return;

  await prisma.category.updateMany({
    where: { id, organizationId: user.organizationId },
    data: {
      name,
      birthYear: Number.isFinite(birthYear) ? birthYear : null,
    },
  });

  revalidatePath("/categorias");
  redirect("/categorias");
}

export async function deleteCategory(formData: FormData) {
  const user = await requireOrganizationUser();
  const id = clean(formData.get("id"));
  if (!id) return;

  await prisma.category.deleteMany({
    where: { id, organizationId: user.organizationId },
  });

  revalidatePath("/categorias");
}
