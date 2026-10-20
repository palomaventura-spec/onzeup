import { prisma } from "@/lib/prisma";
import { getClubTrainingCategoryAccess } from "@/lib/club-access";
import { requireOrganizationUser } from "@/lib/auth";
import { reviewTrainingAbsenceRequest } from "./training-absence-actions";

// Somente consultar as tabelas quando a funcionalidade estiver habilitada.
export default async function TrainingAbsenceInbox() {
  if (process.env.TRAINING_ABSENCE_INBOX_ENABLED !== "true") return null;

  const user = await requireOrganizationUser();
  const requests = await prisma.trainingAbsenceRequest.findMany({
    where: { organizationId: user.organizationId },
    select: {
      id: true,
      status: true,
      createdAt: true,
      reason: true,
      details: true,
      reviewNotes: true,
      attachments: { select: { id: true, originalFileName: true }, orderBy: { createdAt: "asc" } },
      athlete: { select: { name: true, nickname: true } },
      schedule: {
        select: {
          categoryId: true,
          sport: true,
          date: true,
          startTime: true,
          category: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  // A permissão geral de Comunicação não autoriza leitura de justificativas.
  const permissions = new Map<string, { canView: boolean; canManage: boolean }>();
  for (const request of requests) {
    const { categoryId, sport } = request.schedule;
    const key = `${categoryId}:${sport}`;
    if (!permissions.has(key)) {
      const access = await getClubTrainingCategoryAccess(user, categoryId, sport);
      permissions.set(key, {
        canView: access.canViewAttendance,
        canManage: access.canManageAttendance,
      });
    }
  }

  const visible = requests.filter((request) =>
    permissions.get(`${request.schedule.categoryId}:${request.schedule.sport}`)?.canView,
  );
  if (!visible.length) return null;

  const statusLabel: Record<string, string> = {
    PENDING: "Aguardando análise",
    APPROVED: "Aprovada",
    REJECTED: "Rejeitada",
  };
  const reasonLabel: Record<string, string> = {
    DOENCA: "Saúde / consulta médica",
    ESCOLAR: "Compromisso escolar",
    FAMILIAR: "Compromisso familiar",
    OUTRO: "Outro motivo",
  };
  const downloadEnabled = process.env.TRAINING_ABSENCE_DOWNLOAD_ENABLED === "true";

  return (
    <section className="card">
      <div className="section-title-row">
        <div>
          <span className="page-eyebrow">MENSAGENS RECEBIDAS</span>
          <h2>Justificativas de faltas</h2>
        </div>
      </div>
      <p className="muted">
        Solicitações dos responsáveis. Aprovação não altera automaticamente a presença oficial.
      </p>
      <div className="comm-list">
        {visible.map((request) => {
          const key = `${request.schedule.categoryId}:${request.schedule.sport}`;
          const canManage = permissions.get(key)?.canManage === true;
          return (
            <article key={request.id} style={{ paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,.12)" }}>
              <div className="comm-title">
                <div style={{ display: "grid", gap: 5 }}>
                  <small>{request.schedule.category.name} · {request.schedule.sport}</small>
                  <strong>{request.athlete.nickname || request.athlete.name}</strong>
                  <span>
                    Treino: {request.schedule.date
                      ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(request.schedule.date)
                      : "Data a definir"} · {request.schedule.startTime}
                  </span>
                  <span>Motivo: {reasonLabel[request.reason] || request.reason}</span>
                  {request.details ? (
                    <p style={{ margin: "4px 0", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                      <strong>Observações do responsável:</strong> {request.details}
                    </p>
                  ) : null}
                  <span>Situação: <strong>{statusLabel[request.status] || request.status}</strong></span>
                  {request.reviewNotes ? (
                    <p style={{ margin: "4px 0", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                      <strong>Observação da análise:</strong> {request.reviewNotes}
                    </p>
                  ) : null}
                  {request.attachments.length ? (
                    <div style={{ display: "grid", gap: 6, marginTop: 4 }}>
                      <strong>Comprovantes:</strong>
                      {request.attachments.map((attachment) =>
                        downloadEnabled ? (
                          <a
                            key={attachment.id}
                            href={`/api/training-absence-attachments/${encodeURIComponent(attachment.id)}`}
                            style={{ color: "#b9e87b", overflowWrap: "anywhere" }}
                          >
                            Ver comprovante — {attachment.originalFileName}
                          </a>
                        ) : (
                          <span key={attachment.id} className="muted">
                            {attachment.originalFileName} (download indisponível até a ativação)
                          </span>
                        ),
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
              {request.status === "PENDING" && canManage ? (
                <form action={reviewTrainingAbsenceRequest} style={{ display: "grid", gap: 10, marginTop: 12 }}>
                  <input type="hidden" name="requestId" value={request.id} />
                  <label htmlFor={`absence-notes-${request.id}`} style={{ fontWeight: 600 }}>
                    Observação do gestor (opcional)
                  </label>
                  <textarea
                    id={`absence-notes-${request.id}`}
                    name="reviewNotes"
                    maxLength={1000}
                    rows={2}
                    placeholder="Registre uma observação para a análise"
                    style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #60717b", background: "#132631", color: "#fff" }}
                  />
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button type="submit" name="decision" value="APPROVED" style={{ borderRadius: 8, padding: "9px 14px", fontWeight: 700, background: "#9ed92b", color: "#142015", border: 0, cursor: "pointer" }}>
                      Aprovar
                    </button>
                    <button type="submit" name="decision" value="REJECTED" style={{ borderRadius: 8, padding: "9px 14px", fontWeight: 700, background: "transparent", color: "#ffb1b1", border: "1px solid #ffb1b1", cursor: "pointer" }}>
                      Rejeitar
                    </button>
                  </div>
                </form>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
