import type { SupportTicketStatus } from "@prisma/client";

export const SUPPORT_STATUS_LABEL: Record<SupportTicketStatus, string> = {
  OPEN: "Aberto",
  IN_PROGRESS: "Em atendimento",
  ANSWERED: "Respondido",
  CLOSED: "Concluído",
};
export function formatSupportDate(value: Date): string {
  return value.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}
