import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  listClubDocumentPriorities,
  type DocumentPriority,
  type DocumentNoticeKind,
} from "@/lib/club-document-priorities";

export type DocumentNoticeOptions = {
  mode: "MANUAL" | "AUTOMATIC";
  intervalDays: 7 | 15 | 30;
  notifyMissing: boolean;
  notifyRejected: boolean;
  notifyExpired: boolean;
  notifyExpiring: boolean;
  activatedAt: Date | null;
};
export const DEFAULT_DOCUMENT_NOTICE_OPTIONS: DocumentNoticeOptions = {
  mode: "MANUAL", intervalDays: 7, notifyMissing: true,
  notifyRejected: true, notifyExpired: true, notifyExpiring: true, activatedAt: null,
};

export function shouldNotify(kind: DocumentNoticeKind, settings: DocumentNoticeOptions): boolean {
  if (kind === "REVIEW") return false; // Aguardando analise do clube e pendencias internas
  if (kind === "MISSING") return settings.notifyMissing;
  if (kind === "REJECTED") return settings.notifyRejected;
  if (kind === "EXPIRED") return settings.notifyExpired;
  return settings.notifyExpiring;
}

export async function readDocumentNoticeSettings(organizationId: string) {
  const settings = await prisma.documentNoticeSettings.findUnique({ where: { organizationId } });
  return settings ? {
    mode: settings.mode === "AUTOMATIC" ? "AUTOMATIC" as const : "MANUAL" as const,
    intervalDays: ([7, 15, 30].includes(settings.intervalDays) ? settings.intervalDays : 7) as 7 | 15 | 30,
    notifyMissing: settings.notifyMissing, notifyRejected: settings.notifyRejected,
    notifyExpired: settings.notifyExpired, notifyExpiring: settings.notifyExpiring,
    activatedAt: settings.activatedAt,
  } : DEFAULT_DOCUMENT_NOTICE_OPTIONS;
}

type NoticeGroup = {
  athleteId: string;
  athleteName: string;
  items: DocumentPriority[];
  playerIds: string[];
};

// A unica fonte das pendencias continua sendo a Central de Prioridades.
export async function buildDocumentNoticePreview(
  organizationId: string, timeZone: string, settings: DocumentNoticeOptions,
) {
  const priorities = await listClubDocumentPriorities(organizationId, timeZone);
  const ignoredCategories = new Set(priorities.configurationWarnings.map((c) => c.categoryId));
  const rows = priorities.rows.filter((r) =>
    shouldNotify(r.notificationKind, settings) && (!r.categoryId || !ignoredCategories.has(r.categoryId)),
  );
  const groupMap = new Map<string, NoticeGroup>();
  for (const row of rows) {
    let group = groupMap.get(row.athleteId);
    if (!group) {
      group = { athleteId: row.athleteId, athleteName: row.athleteName, items: [], playerIds: [] };
      groupMap.set(row.athleteId, group);
    }
    group.items.push(row);
  }
  const groups = [...groupMap.values()].sort((a, b) => a.athleteName.localeCompare(b.athleteName, "pt-BR"));
  if (groups.length) {
    const links = await prisma.playerAthleteLink.findMany({
      where: { athleteId: { in: groups.map((g) => g.athleteId) }, verified: true, active: true,
        athlete: { organizationId, active: true },
      },
      select: { athleteId: true, playerId: true },
    });
    const byAthlete = new Map<string, Set<string>>();
    for (const link of links) {
      if (!byAthlete.has(link.athleteId)) byAthlete.set(link.athleteId, new Set());
      byAthlete.get(link.athleteId)!.add(link.playerId);
    }
    for (const group of groups) group.playerIds = [...(byAthlete.get(group.athleteId) ?? [])];
  }
  return {
    groups,
    pendingAthletes: groups.filter((g) => g.playerIds.length === 0).length,
    linkedAthletes: groups.filter((g) => g.playerIds.length > 0).length,
    eligibleRecipients: groups.reduce((n, g) => n + g.playerIds.length, 0),
    configurationWarnings: priorities.configurationWarnings,
  };
}

function dateKey(now: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const value = (part: string) => parts.find((p) => p.type === part)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function itemsForMessage(rows: DocumentPriority[]): string[] {
  return [...new Set(rows.map((r) => r.documentName.trim()).filter(Boolean))].slice(0, 30);
}

// Um envio = um Player vinculado + um atleta. Atomicidade evita mensagem sem log.
// A chave de deduplicacao tambem protege contra duas execucoes da rotina no mesmo dia.
export async function sendOneDocumentNotice(args: {
  organizationId: string; athleteId: string; playerId: string;
  items: DocumentPriority[]; mode: "MANUAL" | "AUTOMATIC";
  timeZone: string; intervalDays: number; authorUserId?: string | null;
}) {
  const names = itemsForMessage(args.items);
  if (!names.length) return false;
  const now = new Date();
  const limit = new Date(now.getTime() - args.intervalDays * 86400_000);
  const recent = await prisma.documentNoticeLog.findFirst({
    where: { organizationId: args.organizationId, athleteId: args.athleteId,
      playerId: args.playerId, createdAt: { gte: limit } },
    select: { id: true },
  });
  if (recent) {
    // Avisos enviados antes da Comunicação Documental não tinham pedidos estruturados.
    // Reaproveitar a conversa original; nunca disparar outra comunicação neste intervalo.
    const authorized = await prisma.playerAthleteLink.findFirst({
      where: { athleteId: args.athleteId, playerId: args.playerId, verified: true, active: true,
        athlete: { organizationId: args.organizationId, active: true } },
      select: { id: true },
    });
    if (!authorized) return false;
    const oldNotice = await prisma.documentNoticeLog.findFirst({
      where: { organizationId: args.organizationId, athleteId: args.athleteId,
        playerId: args.playerId, createdAt: { gte: limit }, communicationId: { not: null } },
      orderBy: { createdAt: "desc" }, select: { communicationId: true },
    });
    if (!oldNotice?.communicationId) return false;
    const recipient = await prisma.clubCommunicationRecipient.findFirst({
      where: { communicationId: oldNotice.communicationId,
        athleteId: args.athleteId, playerId: args.playerId,
        communication: { organizationId: args.organizationId },
        athlete: { organizationId: args.organizationId, active: true } },
      select: { id: true },
    });
    if (!recipient) return false;
    const requested = args.items.filter(item => item.notificationKind !== "REVIEW");
    if (!requested.length) return false;
    const linked = await prisma.clubCommunicationDocumentRequest.createMany({
      data: requested.map(item => ({
        recipientId: recipient.id, priorityKey: item.key,
        documentName: item.documentName, notificationKind: item.notificationKind,
        requirementId: item.requirementId ?? null,
        sourceDocumentId: item.sourceDocumentId ?? null,
        categoryId: item.categoryId ?? null,
        description: item.description,
      })),
      skipDuplicates: true,
    });
    return linked.count > 0 ? "UPDATED" as const : false;
  }

  // Revalidar o vinculo imediatamente antes de criar o comunicado.
  const verified = await prisma.playerAthleteLink.findFirst({
    where: { athleteId: args.athleteId, playerId: args.playerId, verified: true, active: true,
      athlete: { organizationId: args.organizationId, active: true } },
    select: { id: true },
  });
  if (!verified) return false;

  const fingerprint = crypto.createHash("sha256").update(
    args.items.map((x) => `${x.key}:${x.notificationKind}`).sort().join("|")
  ).digest("hex");
  const dedupKey = `${args.mode}:${args.organizationId}:${args.athleteId}:${args.playerId}:${dateKey(now, args.timeZone)}`;
  const body = [
    "O clube identificou documentos que precisam de regularização no cadastro do atleta.",
    "", "Documentos para conferir:", ...names.map((n) => `• ${n}`),
    "", "Abra a Comunicação do Player para enviar os documentos solicitados, quando disponíveis para envio.",
    "Se você já enviou os documentos, aguarde a análise do clube.",
  ].join("\n");

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.documentNoticeLog.createMany({
      data: [{ organizationId: args.organizationId, athleteId: args.athleteId,
        playerId: args.playerId, mode: args.mode, itemCount: names.length,
        itemSignature: fingerprint, dedupKey }],
      skipDuplicates: true,
    });
    if (!claimed.count) return false;
    const communication = await tx.clubCommunication.create({
      data: {
        organizationId: args.organizationId,
        authorUserId: args.authorUserId || null,
        title: "11UP Club — Documentos para regularizar",
        body, audienceType: "ATHLETE", targetAthleteId: args.athleteId,
        recipients: { create: [{
          athleteId: args.athleteId,
          playerId: args.playerId,
          documentRequests: {
            create: args.items.filter((item) => item.notificationKind !== "REVIEW").map((item) => ({
              priorityKey: item.key,
              documentName: item.documentName,
              notificationKind: item.notificationKind,
              requirementId: item.requirementId ?? null,
              sourceDocumentId: item.sourceDocumentId ?? null,
              categoryId: item.categoryId ?? null,
              description: item.description,
            })),
          },
        }] },
      }, select: { id: true },
    });
    await tx.documentNoticeLog.update({ where: { dedupKey },
      data: { communicationId: communication.id } });
    return true;
  });
}

export async function runAutomaticDocumentNotices() {
  const settings = await prisma.documentNoticeSettings.findMany({
    where: { mode: "AUTOMATIC", activatedAt: { not: null }, organization: { active: true } },
    include: { organization: { select: { timezone: true } } },
    take: 100,
  });
  const results: Array<{ organizationId: string; delivered: number; eligible: number; failed: number }> = [];
  for (const row of settings) {
    const prefs: DocumentNoticeOptions = {
      mode: "AUTOMATIC", intervalDays: ([7, 15, 30].includes(row.intervalDays) ? row.intervalDays : 7) as 7 | 15 | 30,
      notifyMissing: row.notifyMissing, notifyRejected: row.notifyRejected,
      notifyExpired: row.notifyExpired, notifyExpiring: row.notifyExpiring,
      activatedAt: row.activatedAt,
    };
    const preview = await buildDocumentNoticePreview(row.organizationId, row.organization.timezone, prefs);
    let delivered = 0, failed = 0;
    // Limite de 20 destinatarios por clube/dia; sem rajada ao ativar.
    for (const group of preview.groups) {
      for (const playerId of group.playerIds) {
        if (delivered >= 20) break;
        try {
          const sent = await sendOneDocumentNotice({
            organizationId: row.organizationId, athleteId: group.athleteId,
            playerId, items: group.items, mode: "AUTOMATIC",
            timeZone: row.organization.timezone,
            intervalDays: prefs.intervalDays,
          });
          if (sent === true) delivered++;
        } catch (error) {
          failed++;
          console.error("DOCUMENT_NOTICE_AUTO_DELIVERY_ERROR", row.organizationId,
            error instanceof Error ? error.name : "unknown_error");
        }
      }
      if (delivered >= 20) break;
    }
    results.push({ organizationId: row.organizationId, delivered,
      eligible: preview.eligibleRecipients, failed });
  }
  return { processedOrganizations: settings.length, results };
}
