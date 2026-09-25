"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireClubPermission } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function nullable(value: FormDataEntryValue | null) {
  return clean(value) || null;
}

function accent(value: FormDataEntryValue | null) {
  const color = clean(value);
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "#9DDB16";
}

function categoryType(value: FormDataEntryValue | null) {
  return clean(value) === "EVALUATION" ? "EVALUATION" : "STANDARD";
}

export async function createCategory(formData: FormData) {
  const user = await requireClubPermission("CATEGORIES_EDIT");

  const name = clean(formData.get("name"));
  const birthYearRaw = clean(formData.get("birthYear"));
  const birthYear = birthYearRaw ? Number(birthYearRaw) : null;
  const description = nullable(formData.get("description"));
  const accentColor = accent(formData.get("accentColor"));
  const type = categoryType(formData.get("type"));

  if (!name) return;

  await prisma.category.create({
    data: {
      name,
      birthYear: Number.isFinite(birthYear) ? birthYear : null,
      description,
      accentColor,
      type,
      active: true,
      organizationId: user.organizationId,
    },
  });

  revalidatePath("/categorias");
  revalidatePath("/atletas");
}

export async function updateCategory(formData: FormData) {
  const user = await requireClubPermission("CATEGORIES_EDIT");

  const id = clean(formData.get("id"));
  const name = clean(formData.get("name"));
  const birthYearRaw = clean(formData.get("birthYear"));
  const birthYear = birthYearRaw ? Number(birthYearRaw) : null;
  const description = nullable(formData.get("description"));
  const accentColor = accent(formData.get("accentColor"));
  const type = categoryType(formData.get("type"));
  const active = clean(formData.get("active")) !== "false";

  if (!id || !name) return;

  await prisma.category.updateMany({
    where: {
      id,
      organizationId: user.organizationId,
    },
    data: {
      name,
      birthYear: Number.isFinite(birthYear) ? birthYear : null,
      description,
      accentColor,
      type,
      active,
    },
  });

  revalidatePath("/categorias");
  revalidatePath(`/categorias/${id}`);
  revalidatePath("/atletas");

  redirect("/categorias");
}

export async function deleteCategory(formData: FormData) {
  const user = await requireClubPermission("CATEGORIES_EDIT");
  const id = clean(formData.get("id"));

  if (!id) return;

  await prisma.category.updateMany({
    where: {
      id,
      organizationId: user.organizationId,
    },
    data: {
      active: false,
    },
  });

  revalidatePath("/categorias");
  revalidatePath(`/categorias/${id}`);
  revalidatePath("/atletas");
}
