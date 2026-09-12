"use server";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function deactivateCoach(formData: FormData) {
  await requireSuperAdmin();

  const coachId = String(formData.get("coachId") || "");

  if (!coachId) {
    redirect("/admin/coaches?error=not_found");
  }

  const coach = await prisma.coachProfile.findUnique({
    where: { id: coachId },
    select: {
      id: true,
      ownerUserId: true,
    },
  });

  if (!coach) {
    redirect("/admin/coaches?error=not_found");
  }

  await prisma.$transaction([
    prisma.coachProfile.update({
      where: { id: coach.id },
      data: {
        isPublic: false,
        directoryVisible: false,
        isFeatured: false,
        featuredUntil: null,
      },
    }),

    prisma.user.update({
      where: { id: coach.ownerUserId },
      data: {
        active: false,
      },
    }),
  ]);

  revalidatePath("/admin/coaches");
  revalidatePath("/admin");

  redirect("/admin/coaches?saved=deactivated");
}

export async function reactivateCoach(formData: FormData) {
  await requireSuperAdmin();

  const coachId = String(formData.get("coachId") || "");

  if (!coachId) {
    redirect("/admin/coaches?error=not_found");
  }

  const coach = await prisma.coachProfile.findUnique({
    where: { id: coachId },
    select: {
      id: true,
      ownerUserId: true,
    },
  });

  if (!coach) {
    redirect("/admin/coaches?error=not_found");
  }

  await prisma.user.update({
    where: { id: coach.ownerUserId },
    data: {
      active: true,
      accountStatus: "ACTIVE",
    },
  });

  revalidatePath("/admin/coaches");
  revalidatePath("/admin");

  redirect("/admin/coaches?saved=reactivated");
}

export async function deleteInactiveCoach(formData: FormData) {
  await requireSuperAdmin();

  const coachId = String(formData.get("coachId") || "");

  if (!coachId) {
    redirect("/admin/coaches?error=not_found");
  }

  const coach = await prisma.coachProfile.findUnique({
    where: { id: coachId },
    select: {
      id: true,
      ownerUserId: true,
      _count: {
        select: {
          organizationAccesses: true,
          referrals: true,
        },
      },
    },
  });

  if (!coach) {
    redirect("/admin/coaches?error=not_found");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: coach.ownerUserId,
    },
    select: {
      id: true,
      active: true,
    },
  });

  if (!user) {
    redirect("/admin/coaches?error=not_found");
  }

  // Primeiro precisa desativar.
  if (user.active) {
    redirect("/admin/coaches?error=must_deactivate");
  }

  // Não exclui Coach ainda vinculado a organização ou indicação.
  if (
    coach._count.organizationAccesses > 0 ||
    coach._count.referrals > 0
  ) {
    redirect("/admin/coaches?error=has_links");
  }

  await prisma.$transaction(async (tx) => {
    await tx.coachProfile.delete({
      where: {
        id: coach.id,
      },
    });

    await tx.session.deleteMany({
      where: {
        userId: user.id,
      },
    });

    await tx.user.delete({
      where: {
        id: user.id,
      },
    });
  });

  revalidatePath("/admin/coaches");
  revalidatePath("/admin");

  redirect("/admin/coaches?deleted=1");
}