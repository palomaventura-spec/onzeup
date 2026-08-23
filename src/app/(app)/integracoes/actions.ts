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

export async function updateConnectionSettings(formData: FormData) {
  const user = await requireOrganizationUser();

  const customDomain = nullable(formData.get("customDomain"));
  const whatsappPhone = nullable(formData.get("whatsappPhone"));
  const pixKey = nullable(formData.get("pixKey"));

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: {
      customDomain,
      domainVerified: customDomain ? false : false,
      whatsappPhone,
      whatsapp: whatsappPhone,
      whatsappStatus: whatsappPhone
        ? IntegrationStatus.CONNECTED
        : IntegrationStatus.DISCONNECTED,
      pixKey,
      // paymentProvider/paymentStatus ficam reservados para futura integração automática.
    },
  });

  revalidatePath("/integracoes");
  revalidatePath("/financeiro");
  revalidatePath("/organizacao");
}
