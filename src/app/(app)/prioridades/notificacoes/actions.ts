"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getEffectiveClubRole } from "@/lib/club-permissions";
import { requireClubPermission } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";
import {
  buildDocumentNoticePreview,
  readDocumentNoticeSettings,
  sendOneDocumentNotice,
  type DocumentNoticeOptions,
} from "@/lib/document-notice-service";

export async function saveDocumentNoticeSettings(formData: FormData) {
  const user = await requireClubPermission("ORGANIZATION_MANAGE");
  if (getEffectiveClubRole(user) !== "MANAGER") throw new Error("Apenas o gestor pode definir avisos automaticos.");
  const mode = String(formData.get("mode") || "MANUAL");
  const intervalDays = Number(formData.get("intervalDays"));
  if (mode !== "MANUAL" && mode !== "AUTOMATIC") throw new Error("Modo invalido.");
  if (![7, 15, 30].includes(intervalDays)) throw new Error("Intervalo invalido.");
  const previous = await readDocumentNoticeSettings(user.organizationId);
  if (mode === "AUTOMATIC" && previous.mode !== "AUTOMATIC" &&
      String(formData.get("confirmActivation")) !== "CONFIRMAR") {
    throw new Error("Confirme a ativacao antes de habilitar os disparos.");
  }
  const now = new Date();
  const data: DocumentNoticeOptions = {
    mode, intervalDays: intervalDays as 7 | 15 | 30,
    notifyMissing: formData.get("notifyMissing") === "on",
    notifyRejected: formData.get("notifyRejected") === "on",
    notifyExpired: formData.get("notifyExpired") === "on",
    notifyExpiring: formData.get("notifyExpiring") === "on",
    activatedAt: mode === "AUTOMATIC" ? (previous.mode === "AUTOMATIC" ? previous.activatedAt : now) : null,
  };
  if (mode === "AUTOMATIC") {
    if (!(data.notifyMissing || data.notifyRejected || data.notifyExpired || data.notifyExpiring)) {
      throw new Error("Selecione pelo menos um tipo de aviso.");
    }
    // A gestora ve a previa e confirma antes de ativar. Nenhum envio e feito aqui.
    const preview = await buildDocumentNoticePreview(user.organizationId, user.organization?.timezone || "America/Sao_Paulo", data);
    if (preview.configurationWarnings.length > 0) {
      // Bloqueio esperado: orientar o gestor na própria tela, sem erro 500 do Next.js.
      // Não gravar preferências nem habilitar a rotina de envio.
      redirect("/prioridades/notificacoes?erro=requisitos");
    }
  }
  await prisma.documentNoticeSettings.upsert({
    where: { organizationId: user.organizationId },
    create: { organizationId: user.organizationId, mode: data.mode,
      intervalDays: data.intervalDays, notifyMissing: data.notifyMissing,
      notifyRejected: data.notifyRejected, notifyExpired: data.notifyExpired,
      notifyExpiring: data.notifyExpiring, activatedAt: data.activatedAt,
      updatedByUserId: user.id,
    },
    update: { mode: data.mode, intervalDays: data.intervalDays,
      notifyMissing: data.notifyMissing, notifyRejected: data.notifyRejected,
      notifyExpired: data.notifyExpired, notifyExpiring: data.notifyExpiring,
      activatedAt: data.activatedAt, updatedByUserId: user.id,
    },
  });
  revalidatePath("/prioridades/notificacoes");
  redirect("/prioridades/notificacoes?salvo=1");
}

export async function sendManualDocumentNotice(formData: FormData) {
  const user = await requireClubPermission("ATHLETES_EDIT");
  const athleteId = String(formData.get("athleteId") || "").trim();
  const priorityKey = String(formData.get("priorityKey") || "").trim();
  if (!athleteId || athleteId.length > 128) throw new Error("Atleta invalido.");
  const settings = await readDocumentNoticeSettings(user.organizationId);
  const timeZone = user.organization?.timezone || "America/Sao_Paulo";
  const preview = await buildDocumentNoticePreview(user.organizationId, timeZone, settings);
  const group = preview.groups.find((g) => g.athleteId === athleteId);
  if (!group) redirect("/prioridades?aviso=sem-pendencias");
  const items = priorityKey ? group.items.filter((item) => item.key === priorityKey) : group.items;
  if (!items.length) redirect("/prioridades?aviso=sem-pendencias");
  if (!group.playerIds.length) redirect("/prioridades?aviso=sem-player");
  let sent = 0;
  for (const playerId of group.playerIds) {
    if (await sendOneDocumentNotice({ organizationId: user.organizationId,
      athleteId, playerId, items, mode: "MANUAL", timeZone,
      intervalDays: settings.intervalDays, authorUserId: user.id,
    })) sent++;
  }
  revalidatePath("/prioridades");
  revalidatePath("/prioridades/notificacoes");
  revalidatePath("/responsavel/comunicacao");
  redirect(`/prioridades?aviso=${sent ? "enviado" : "recente"}`);
}
