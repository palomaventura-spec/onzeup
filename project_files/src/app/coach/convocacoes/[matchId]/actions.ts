"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

async function requireCoachManageAccess(matchId: string) {
  const user = await requireUser();
  if (user.role !== "COACH") redirect("/dashboard");

  const coach = await prisma.coachProfile.findUnique({
    where: { ownerUserId: user.id },
    select: { id: true },
  });
  if (!coach) redirect("/coach/dashboard");

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, organizationId: true, categoryId: true },
  });
  if (!match) redirect("/coach/dashboard");

  const access = await prisma.coachOrganizationAccess.findFirst({
    where: {
      coachId: coach.id,
      organizationId: match.organizationId,
      active: true,
      canManageCallUps: true,
      OR: [{ categoryId: match.categoryId }, { categoryId: null }],
    },
    select: { id: true },
  });

  if (!access) redirect(`/coach/convocacoes/${matchId}`);
  return match;
}

export async function coachAddCallUps(formData: FormData) {
  const matchId = clean(formData.get("matchId"));
  const athleteIds = formData.getAll("athleteIds").map(String).filter(Boolean);
  if (!matchId || !athleteIds.length) return;

  const match = await requireCoachManageAccess(matchId);

  const athletes = await prisma.athlete.findMany({
    where: {
      id: { in: athleteIds },
      organizationId: match.organizationId,
      categoryId: match.categoryId,
      active: true,
    },
    select: { id: true },
  });

  if (!athletes.length) return;

  await prisma.$transaction(
    athletes.map((athlete) =>
      prisma.callUp.upsert({
        where: {
          matchId_athleteId: {
            matchId: match.id,
            athleteId: athlete.id,
          },
        },
        update: {},
        create: {
          matchId: match.id,
          athleteId: athlete.id,
          organizationId: match.organizationId,
        },
      })
    )
  );

  revalidatePath(`/coach/convocacoes/${matchId}`);
  revalidatePath(`/convocacoes/${matchId}`);
  revalidatePath("/coach/dashboard");
}

export async function coachRemoveCallUp(formData: FormData) {
  const matchId = clean(formData.get("matchId"));
  const callUpId = clean(formData.get("callUpId"));
  if (!matchId || !callUpId) return;

  const match = await requireCoachManageAccess(matchId);

  await prisma.callUp.deleteMany({
    where: {
      id: callUpId,
      matchId,
      organizationId: match.organizationId,
    },
  });

  revalidatePath(`/coach/convocacoes/${matchId}`);
  revalidatePath(`/convocacoes/${matchId}`);
  revalidatePath("/coach/dashboard");
}
