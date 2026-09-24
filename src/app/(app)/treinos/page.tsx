import Link from "next/link";

import ModuleHero from "@/components/ModuleHero";
import ModuleKpiGrid from "@/components/ModuleKpiGrid";
import ModulePanel from "@/components/ModulePanel";
import ModuleTabs from "@/components/ModuleTabs";

import { requireClubPermission } from "@/lib/club-access";
import { hasClubPermission } from "@/lib/club-permissions";
import { prisma } from "@/lib/prisma";

import { createTraining, deleteTraining } from "./actions";

type TrainingView = "upcoming" | "active" | "history";

const ATTENDED = new Set(["PRESENT", "LATE", "PARTIAL"]);

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(date: Date | null, weekday: number) {
  if (!date) {
    const weekdays = [
      "Domingo",
      "Segunda-feira",
      "Terça-feira",
      "Quarta-feira",
      "Quinta-feira",
      "Sexta-feira",
      "Sábado",
    ];

    return `Legado • ${weekdays[weekday]}`;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function timeLabel(value: Date | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function durationMinutes(start: Date | null, end: Date | null) {
  if (!start || !end || end <= start) return null;

  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

function normalizeView(value?: string): TrainingView {
  if (value === "active" || value === "history") return value;
  return "upcoming";
}

export default async function TrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const user = await requireClubPermission("TRAININGS_VIEW");
  const canEdit = hasClubPermission(user, "TRAININGS_EDIT");
  const query = await searchParams;
  const view = normalizeView(query.view);

  const [trainings, categories] = await Promise.all([
    prisma.trainingSchedule.findMany({
      where: {
        organizationId: user.organizationId,
      },
      include: {
        category: true,
        sessions: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          include: {
            attendances: {
              select: {
                status: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          date: "asc",
        },
        {
          startTime: "asc",
        },
      ],
    }),

    prisma.category.findMany({
      where: {
        organizationId: user.organizationId,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = trainings.map((training) => {
    const session = training.sessions[0] ?? null;
    const status = session?.status ?? "SCHEDULED";
    const isHistory =
      status === "COMPLETED" ||
      status === "CANCELLED" ||
      status === "ARCHIVED";

    const isPastScheduled =
      !isHistory &&
      status !== "IN_PROGRESS" &&
      Boolean(training.date && training.date < today);

    const bucket: TrainingView = isHistory
      ? "history"
      : status === "IN_PROGRESS" || isPastScheduled
        ? "active"
        : "upcoming";

    const attendances = session?.attendances ?? [];
    const attended = attendances.filter((item) =>
      ATTENDED.has(item.status),
    ).length;

    const actualDuration = durationMinutes(
      session?.actualStartedAt ?? null,
      session?.actualEndedAt ?? null,
    );

    return {
      training,
      session,
      status,
      bucket,
      attended,
      attendanceTotal: attendances.length,
      actualDuration,
      isPastScheduled,
    };
  });

  const upcomingCount = rows.filter(
    (item) => item.bucket === "upcoming",
  ).length;

  const activeCount = rows.filter(
    (item) => item.bucket === "active",
  ).length;

  const historyCount = rows.filter(
    (item) => item.bucket === "history",
  ).length;

  const visibleRows = rows
    .filter((item) => item.bucket === view)
    .sort((a, b) => {
      const aDate = a.training.date?.getTime() ?? 0;
      const bDate = b.training.date?.getTime() ?? 0;

      return view === "history"
        ? bDate - aDate
        : aDate - bDate;
    });

  const todayInput = dateInputValue(new Date());

  function statusCopy(item: (typeof rows)[number]) {
    if (item.status === "COMPLETED") {
      return {
        label: "Finalizado",
        tone: "done",
      };
    }

    if (item.status === "CANCELLED") {
      return {
        label: "Cancelado",
        tone: "cancelled",
      };
    }

    if (item.status === "ARCHIVED") {
      return {
        label: "Arquivado",
        tone: "archived",
      };
    }

    if (item.status === "IN_PROGRESS") {
      return {
        label: "Em andamento",
        tone: "active",
      };
    }

    if (item.isPastScheduled) {
      return {
        label: "Pendente de fechamento",
        tone: "pending",
      };
    }

    return {
      label: "Agendado",
      tone: "scheduled",
    };
  }

  function actionLabel(item: (typeof rows)[number]) {
    if (item.bucket === "history") return "Ver chamada";
    if (item.status === "IN_PROGRESS") return "Continuar chamada";
    if (item.isPastScheduled) return "Revisar treino";
    return "Lista de presença";
  }

  return (
    <main className="training-hub">
      <ModuleHero
        eyebrow="ROTINA ESPORTIVA"
        title="Treinos"
        description={
          <p>
            Planejamento, chamada, minutagem e histórico dos treinamentos.
          </p>
        }
        aside={
          <>
            <small>TREINOS CADASTRADOS</small>
            <strong>{trainings.length}</strong>
            <span>programação do clube</span>
          </>
        }
      />

      {!canEdit ? (
        <div
          className="notice"
          role="status"
          style={{ marginBottom: 16 }}
        >
          <strong>Somente visualização.</strong> A programação dos treinos é
          alterada por usuários autorizados.
        </div>
      ) : null}

      <ModuleKpiGrid
        className="training-kpis"
        ariaLabel="Indicadores dos Treinos"
        items={[
          {
            label: "PRÓXIMOS",
            value: upcomingCount,
            description: "agendados",
          },
          {
            label: "EM ABERTO",
            value: activeCount,
            description: "em andamento ou pendentes",
          },
          {
            label: "HISTÓRICO",
            value: historyCount,
            description: "finalizados ou cancelados",
          },
          {
            label: "CATEGORIAS",
            value: categories.length,
            description: "com acesso no clube",
          },
        ]}
      />

      {canEdit ? (
        <details className="training-create-drawer">
          <summary>
            <div>
              <span className="page-eyebrow">PLANEJAMENTO</span>
              <h2>Novo treino</h2>
              <p>Cadastre a programação antes de realizar a chamada.</p>
            </div>

            <span className="btn">+ Novo treino</span>
          </summary>

          <div className="training-create-body">
            {categories.length === 0 ? (
              <div className="empty">
                Cadastre pelo menos uma categoria antes de criar treinos.
              </div>
            ) : (
              <form className="form" action={createTraining}>
                <label>
                  Categoria
                  <select name="categoryId" required defaultValue="">
                    <option value="" disabled>
                      Selecione
                    </option>

                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Data
                  <input
                    name="date"
                    type="date"
                    min={todayInput}
                    required
                  />
                </label>

                <div className="two-field-row">
                  <label>
                    Início
                    <input name="startTime" type="time" required />
                  </label>

                  <label>
                    Fim
                    <input name="endTime" type="time" required />
                  </label>
                </div>

                <label>
                  Local
                  <input
                    name="location"
                    placeholder="Ex.: Campo / Ginásio"
                  />
                </label>

                <label>
                  Observações
                  <textarea
                    name="notes"
                    rows={3}
                    placeholder="Informações do treino"
                  />
                </label>

                <button type="submit">Adicionar treino</button>
              </form>
            )}
          </div>
        </details>
      ) : null}

      <ModuleTabs
        className="training-tabs"
        ariaLabel="Visualização dos treinos"
        items={[
          {
            label: "Próximos",
            href: "/treinos?view=upcoming",
            active: view === "upcoming",
            badge: upcomingCount,
          },
          {
            label: "Em aberto",
            href: "/treinos?view=active",
            active: view === "active",
            badge: activeCount,
          },
          {
            label: "Histórico",
            href: "/treinos?view=history",
            active: view === "history",
            badge: historyCount,
          },
        ]}
      />

      <ModulePanel
        className="training-history-panel"
        eyebrow={
          view === "upcoming"
            ? "AGENDA"
            : view === "active"
              ? "ACOMPANHAMENTO"
              : "REGISTROS"
        }
        title={
          view === "upcoming"
            ? "Próximos treinos"
            : view === "active"
              ? "Treinos em aberto"
              : "Histórico de treinos"
        }
      >

        {visibleRows.length === 0 ? (
          <div className="empty">
            {view === "upcoming"
              ? "Nenhum treino futuro agendado."
              : view === "active"
                ? "Nenhum treino em andamento ou pendente."
                : "Ainda não há treinos finalizados ou cancelados."}
          </div>
        ) : (
          <div className="training-history-list">
            {visibleRows.map((item) => {
              const status = statusCopy(item);
              const { training, session } = item;

              return (
                <article
                  className="training-history-card"
                  key={training.id}
                >
                  <div className="training-history-date">
                    <strong>
                      {training.date
                        ? String(training.date.getDate()).padStart(2, "0")
                        : "—"}
                    </strong>

                    <span>
                      {training.date
                        ? new Intl.DateTimeFormat("pt-BR", {
                            month: "short",
                          })
                            .format(training.date)
                            .replace(".", "")
                            .toUpperCase()
                        : "LEGADO"}
                    </span>
                  </div>

                  <div className="training-history-main">
                    <div className="training-history-title">
                      <div>
                        <span className="page-eyebrow">
                          {training.category.name}
                        </span>

                        <h3>{formatDate(training.date, training.weekday)}</h3>
                      </div>

                      <span
                        className={`training-status-badge ${status.tone}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div className="training-history-metrics">
                      <div>
                        <span>PLANEJADO</span>
                        <strong>
                          {training.startTime} – {training.endTime}
                        </strong>
                      </div>

                      <div>
                        <span>REALIZADO</span>
                        <strong>
                          {session?.actualStartedAt ||
                          session?.actualEndedAt
                            ? `${timeLabel(
                                session?.actualStartedAt ?? null,
                              )} – ${timeLabel(
                                session?.actualEndedAt ?? null,
                              )}`
                            : "—"}
                        </strong>
                      </div>

                      <div>
                        <span>DURAÇÃO REAL</span>
                        <strong>
                          {item.actualDuration !== null
                            ? `${item.actualDuration} min`
                            : "—"}
                        </strong>
                      </div>

                      <div>
                        <span>PRESENÇA</span>
                        <strong>
                          {item.attendanceTotal
                            ? `${item.attended}/${item.attendanceTotal}`
                            : "Não registrada"}
                        </strong>
                      </div>
                    </div>

                    <div className="training-history-footer">
                      <span>
                        {training.location ?? "Local a definir"}
                      </span>

                      <div className="actions">
                        <Link
                          className="btn btn-secondary btn-small"
                          href={`/treinos/${training.id}`}
                        >
                          {actionLabel(item)}
                        </Link>

                        {canEdit &&
                        view === "upcoming" &&
                        !session ? (
                          <form
                            className="inline-form"
                            action={deleteTraining}
                          >
                            <input
                              type="hidden"
                              name="id"
                              value={training.id}
                            />

                            <button
                              className="btn-danger btn-small"
                              type="submit"
                            >
                              Excluir
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </ModulePanel>
    </main>
  );
}
