"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

async function coachForCurrentUser() {
  const user = await requireUser();
  if (user.role !== "COACH") redirect("/dashboard");

  const coach = await prisma.coachProfile.findUnique({
    where: { ownerUserId: user.id },
    select: { id: true },
  });

  if (!coach) redirect("/cadastro-coach");
  return coach;
}

export async function acceptCoachOrganizationInvite(formData: FormData) {
  const coach = await coachForCurrentUser();
  const accessId = clean(formData.get("accessId"));
  if (!accessId) return;

  const access = await prisma.coachOrganizationAccess.findFirst({
    where: { id: accessId, coachId: coach.id, active: false },
    select: { id: true },
  });

  if (!access) return;

  await prisma.coachOrganizationAccess.update({
    where: { id: access.id },
    data: { active: true },
  });

  revalidatePath("/coach/dashboard");
  redirect("/coach/dashboard?vinculo=aceito");
}

export async function declineCoachOrganizationInvite(formData: FormData) {
  const coach = await coachForCurrentUser();
  const accessId = clean(formData.get("accessId"));
  if (!accessId) return;

  await prisma.coachOrganizationAccess.deleteMany({
    where: { id: accessId, coachId: coach.id, active: false },
  });

  revalidatePath("/coach/dashboard");
  redirect("/coach/dashboard?vinculo=recusado");
}
