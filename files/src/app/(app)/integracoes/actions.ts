"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";
import { IntegrationStatus } from "@prisma/client";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function nullable(value: FormDataEntryValue | null) {
  const v = clean(value);
  return v || null;
}

function normalizeDomain(value: FormDataEntryValue | null) {
  let domain = clean(value).toLowerCase();
  if (!domain) return null;
  domain = domain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  domain = domain.split("/")[0];
  return domain || null;
}

function normalizeWhatsapp(value: FormDataEntryValue | null) {
  const raw = clean(value);
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

export async function updateConnectionSettings(formData: FormData) {
  const user = await requireOrganizationUser();

  const customDomain = normalizeDomain(formData.get("customDomain"));
  const whatsappPhone = normalizeWhatsapp(formData.get("whatsappPhone"));
  const pixKey = nullable(formData.get("pixKey"));

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: {
      customDomain,
      domainVerified: false,
      whatsappPhone,
      whatsapp: whatsappPhone,
      whatsappStatus: whatsappPhone
        ? IntegrationStatus.CONNECTED
        : IntegrationStatus.DISCONNECTED,
      pixKey,
    },
  });

  revalidatePath("/integracoes");
  revalidatePath("/financeiro");
  revalidatePath("/organizacao");
}
