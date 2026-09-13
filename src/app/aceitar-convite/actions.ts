"use server";

import crypto from "crypto";
import { hash } from "bcryptjs";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

const clean = (
  value: FormDataEntryValue | null
) => String(value || "").trim();

function hashToken(token: string) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function acceptClubInvite(
  formData: FormData
) {
  const token =
    clean(formData.get("token"));

  const password =
    clean(formData.get("password"));

  const confirm =
    clean(formData.get("confirm"));

  if (
    !token ||
    password.length < 8 ||
    password !== confirm
  ) {
    redirect(
      `/aceitar-convite?token=${encodeURIComponent(
        token
      )}&erro=senha`
    );
  }

  const tokenHash =
    hashToken(token);

  const invite =
    await prisma.clubUserInvite.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: true,
      },
    });

  if (
    !invite ||
    invite.usedAt ||
    invite.expiresAt < new Date()
  ) {
    redirect(
      "/aceitar-convite?erro=convite"
    );
  }

  if (
    invite.user.active &&
    invite.user.accountStatus ===
      "ACTIVE"
  ) {
    redirect(
      "/aceitar-convite?status=sucesso"
    );
  }

  const passwordHash =
    await hash(password, 12);

  const now =
    new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: invite.userId,
      },

      data: {
        passwordHash,
        active: true,
        accountStatus:
          "ACTIVE",
        emailVerifiedAt: now,
      },
    }),

    prisma.clubUserInvite.update({
      where: {
        id: invite.id,
      },

      data: {
        usedAt: now,
      },
    }),
  ]);

  redirect(
    "/aceitar-convite?status=sucesso"
  );
}