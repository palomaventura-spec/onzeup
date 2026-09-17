"use server";

import { CallUpMode, CallUpStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function respondToCallUp(formData: FormData) {
  const token = clean(formData.get("token"));
  const rawStatus = clean(formData.get("status"));
  const responseByName = clean(formData.get("responseByName")) || null;

  if (!token || !["CONFIRMED", "DECLINED"].includes(rawStatus)) return;

  const callUp = await prisma.callUp.findUnique({
    where: { responseToken: token },
    include: {
      match: { select: { id: true, callUpMode: true, status: true } },
    },
  });

  if (
    !callUp ||
    callUp.match.callUpMode !== CallUpMode.CONFIRMATION_REQUIRED ||
    callUp.match.status !== "SCHEDULED"
  ) {
    redirect(`/confirmar-convocacao/${token}?erro=indisponivel`);
  }

  const status =
    rawStatus === "CONFIRMED" ? CallUpStatus.CONFIRMED : CallUpStatus.DECLINED;
  const previousHistory = Array.isArray(callUp.responseHistory)
    ? callUp.responseHistory
    : [];
  const responseHistory: Prisma.InputJsonArray = [
    ...previousHistory,
    {
      status,
      source: "PUBLIC_LINK",
      responseByName,
      at: new Date().toISOString(),
    },
  ] as Prisma.InputJsonArray;

  await prisma.callUp.update({
    where: { id: callUp.id },
    data: {
      status,
      respondedAt: new Date(),
      responseSource: "PUBLIC_LINK",
      responseByName,
      responseHistory,
    },
  });

  revalidatePath(`/convocacoes/${callUp.match.id}`);
  redirect(`/confirmar-convocacao/${token}?sucesso=1`);
}
