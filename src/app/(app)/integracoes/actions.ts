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

export async function updateIntegrationSettings(formData: FormData) {
  const user = await requireOrganizationUser();

  const customDomain = nullable(formData.get("customDomain"));
  const whatsappPhone = nullable(formData.get("whatsappPhone"));
  const paymentProvider = nullable(formData.get("paymentProvider"));

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: {
      customDomain,
      whatsappPhone,
      whatsappStatus: whatsappPhone ? IntegrationStatus.PENDING : IntegrationStatus.DISCONNECTED,
      paymentProvider,
      paymentStatus: paymentProvider ? IntegrationStatus.PENDING : IntegrationStatus.DISCONNECTED,
      domainVerified: false,
    },
  });

  revalidatePath("/integracoes");
}

export async function markDomainVerified() {
  const user = await requireOrganizationUser();
  await prisma.organization.update({
    where: { id: user.organizationId },
    data: { domainVerified: true },
  });
  revalidatePath("/integracoes");
}
