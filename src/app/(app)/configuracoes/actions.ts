"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { requireOrganizationUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function updateAccountProfile(formData: FormData) {
  const user = await requireOrganizationUser();

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();

  if (!name) {
    throw new Error("Informe o nome do titular da conta.");
  }

  if (!email || !email.includes("@")) {
    throw new Error("Informe um e-mail válido.");
  }

  try {
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        name,
        email,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("Este e-mail já está vinculado a outra conta.");
    }

    throw error;
  }

  revalidatePath("/configuracoes");
}