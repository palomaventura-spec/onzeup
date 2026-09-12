"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";
import { IntegrationStatus } from "@prisma/client";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function normalizeWhatsapp(value: FormDataEntryValue | null) {
  const raw = clean(value);
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

export async function updateConnectionSettings(formData: FormData) {
  const user = await requireOrganizationUser();
  const whatsappPhone = normalizeWhatsapp(formData.get("whatsappPhone"));

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: {
      whatsappPhone,
      whatsapp: whatsappPhone,
      whatsappStatus: whatsappPhone ? IntegrationStatus.CONNECTED : IntegrationStatus.DISCONNECTED,
    },
  });

  revalidatePath("/integracoes");
  revalidatePath("/comunicacao");
  revalidatePath("/organizacao");
  redirect("/integracoes?salvo=1");
}
