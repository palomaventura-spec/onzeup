import { AthleteHistoryVisibility } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import SafeAvatar from "@/components/SafeAvatar";
import ModuleTabs from "@/components/ModuleTabs";

import { requireClubPermission } from "@/lib/club-access";
import { getEffectiveClubRole } from "@/lib/club-permissions";
import { prisma } from "@/lib/prisma";


type TrainingKpiIcon =
  | "attendance"
  | "sessions"
  | "present"
  | "absent";

function TrainingIcon({
  name,
  size = 20,
}: {
  name: TrainingKpiIcon;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "attendance") {
    return (
      <svg {...common}>
        <path d="M7 3v3M17 3v3M4 9h16" />
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="m8 14 2.2 2.2L16 11" />
      </svg>
    );
  }

  if (name === "sessions") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (name === "present") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3" />
        <path d="M5.5 20c.7-4 3-6 6.5-6s5.8 2 6.5 6" />
        <path d="m16.5 9 1.5 1.5L21 7.5" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="8" r="3" />
      <path d="M5.5 20c.7-4 3-6 6.5-6s5.8 2 6.5 6" />
      <path d="m17 7 4 4M21 7l-4 4" />
    </svg>
  );
}


const COUNTED_STATUSES = new Set([
  "PRESENT",
  "LATE",
  "PARTIAL",
  "ABSENT",
  "JUSTIFIED_ABSENCE",
  "INJURED",
  "EXCUSED",
]);

const PRESENT_STATUSES = new Set([
  "PRESENT",
  "LATE",
  "PARTIAL",
]);

function attendanceLabel(status: string) {
  switch (status) {
    case "PRESENT":
      return "Presente";
    case "LATE":
      return "Atraso";
    case "PARTIAL":
      return "Parcial";
    case "ABSENT":
      return "Falta";
    case "JUSTIFIED_ABSENCE":
      return "Falta justificada";
    case "INJURED":
      return "Lesionado";
    case "EXCUSED":
      return "Dispensado";
    default:
      return status;
  }
}

function sessionDurationMinutes(session: {
  actualStartedAt: Date | null;
  actualEndedAt: Date | null;
  startsAt: Date;
  endsAt: Date | null;
}) {
  const start = session.actualStartedAt ?? session.startsAt;
  const end = session.actualEndedAt ?? session.endsAt;

  if (!end || end <= start) return null;

  return Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 60_000),
  );
}

function participationPercent(
  minutesPresent: number | null,
  durationMinutes: number | null,
) {
  if (
    minutesPresent === null ||
    durationMinutes === null ||
    durationMinutes <= 0
  ) {
    return null;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round((minutesPresent / durationMinutes) * 1000) / 10,
    ),
  );
}

function formatPercent(value: number | null) {
  if (value === null) return "—";

  return `${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
}

function historyVisibilityLabel(visibility: AthleteHistoryVisibility) {
  switch (visibility) {
    case AthleteHistoryVisibility.MANAGEMENT:
      return "Restrito à gestão";
    case AthleteHistoryVisibility.SHAREABLE:
      return "Autorizado para compartilhamento";
    default:
      return "Equipe técnica";
  }
}

function historySportLabel(sport: string | null) {
  if (sport === "FOOTBALL") return "Campo";
  if (sport === "FUTSAL") return "Futsal";
  if (sport === "BOTH") return "Ambas";
  return "Não informada";
}

function historyTopicLabel(topic: string) {
  switch (topic) {
    case "TECHNICAL":
      return "Técnico";
    case "TACTICAL":
      return "Tático";
    case "PHYSICAL":
      return "Físico";
    case "COGNITIVE":
      return "Cognitivo";
    case "EMOTIONAL":
      return "Emocional";
    case "BEHAVIORAL":
      return "Comportamental";
    case "OCCURRENCE":
      return "Ocorrência";
    default:
      return "Geral";
  }
}

export default async function AthleteTrainingPerformancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireClubPermission("ATHLETES_VIEW");
  const canViewManagement = getEffectiveClubRole(user) === "MANAGER";
  const { id } = await params;

  const athlete = await prisma.athlete.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    include: {
      category: true,
      trainingAttendances: {
        where: {
          session: {
            status: "COMPLETED",
          },
        },
        orderBy: {
          session: {
            startsAt: "desc",
          },
        },
        take: 50,
        include: {
          session: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      historyEntries: {
        where: {
          source: "TRAINING",
          // Registros exclusivos da gestão nunca são carregados para os demais perfis.
          ...(canViewManagement
            ? {}
            : {
                visibility: {
                  in: [
                    AthleteHistoryVisibility.TECHNICAL_STAFF,
                    AthleteHistoryVisibility.SHAREABLE,
                  ],
                },
              }),
        },
        orderBy: {
          occurredAt: "desc",
        },
        take: 30,
      },
    },
  });

  if (!athlete) notFound();

  const completedAttendances =
    athlete.trainingAttendances.filter((item) =>
      COUNTED_STATUSES.has(item.status),
    );

  const presentAttendances =
    completedAttendances.filter((item) =>
      PRESENT_STATUSES.has(item.status),
    );

  const absentAttendances =
    completedAttendances.filter(
      (item) => item.status === "ABSENT",
    );

  const justifiedAbsences =
    completedAttendances.filter(
      (item) => item.status === "JUSTIFIED_ABSENCE",
    );

  const otherZeroAttendances =
    completedAttendances.filter((item) =>
      ["INJURED", "EXCUSED"].includes(item.status),
    );

  /*
   * Frequência oficial:
   * falta justificada continua no denominador e vale zero,
   * conforme a regra definida para rendimento.
   */
  const attendanceRate = completedAttendances.length
    ? Math.round(
        (presentAttendances.length /
          completedAttendances.length) *
          1000,
      ) / 10
    : null;

  /*
   * Aproveitamento real de minutos:
   * soma os minutos efetivamente cumpridos e divide pela
   * soma da duração dos treinos FINALIZADOS.
   */
  const minuteTotals = completedAttendances.reduce(
    (total, attendance) => {
      const duration = sessionDurationMinutes(
        attendance.session,
      );

      return {
        available:
          total.available + (duration ?? 0),
        present:
          total.present +
          (attendance.minutesPresent ?? 0),
      };
    },
    {
      available: 0,
      present: 0,
    },
  );

  const minuteUtilization =
    minuteTotals.available > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              (minuteTotals.present /
                minuteTotals.available) *
                1000,
            ) / 10,
          ),
        )
      : null;

  return (
    <main className="athlete-performance-page athlete-performance-v4 athlete-training-v5">
      <section className="athlete-performance-hero">
        <div className="athlete-performance-hero-main">
          <div className="athlete-performance-hero-avatar">
            <SafeAvatar
              src={athlete.photoUrl}
              name={athlete.nickname || athlete.name}
              alt={athlete.name}
            />
          </div>

          <div className="athlete-performance-hero-copy">
            <span className="athlete-performance-hero-kicker">
              11UP PERFORMANCE · CLUB ELITE
            </span>

            <h1>{athlete.nickname || athlete.name}</h1>

            <p className="athlete-performance-hero-meta">
              <span>{athlete.name}</span>
              <span>
                {athlete.category?.name || "Sem categoria"}
              </span>
              <span>
                {athlete.position ||
                  "Posição não informada"}
              </span>
            </p>

            <p className="athlete-performance-hero-description">
              Acompanhamento individual de presença,
              frequência e rendimento de treino.
            </p>
          </div>
        </div>

        <div className="athlete-performance-hero-actions">
          <span
            className={`athlete-training-v5-status ${
              athlete.active ? "active" : ""
            }`}
          >
            {athlete.active ? "Ativo" : "Inativo"}
          </span>

          <Link
            className="athlete-performance-hero-primary"
            href={`/atletas/${athlete.id}/performance/relatorios`}
          >
            Gerar relatório
          </Link>
        </div>
      </section>

      <nav
        className="athlete-training-v5-athlete-tabs"
        aria-label="Navegação do atleta"
      >
        <Link href={`/atletas/${athlete.id}`}>
          Ficha
        </Link>

        <Link href={`/atletas/${athlete.id}/dados#documentos`}>
          Documentos
        </Link>

        <Link
          className="active"
          href={`/atletas/${athlete.id}/performance`}
        >
          Performance
        </Link>

        <Link
          className="athlete-training-v5-back"
          href="/atletas"
        >
          ← Voltar aos atletas
        </Link>
      </nav>

      <ModuleTabs
        className="performance-module-tabs athlete-performance-tabs"
        ariaLabel="Navegação da performance do atleta"
        items={[
          {
            label: "Visão geral",
            href: `/atletas/${athlete.id}/performance`,
          },
          {
            label: "Treino",
            href: `/atletas/${athlete.id}/performance/treino`,
            active: true,
          },
          {
            label: "Jogo",
            href: `/atletas/${athlete.id}/performance/jogo`,
          },
          {
            label: "GPS",
            href: `/atletas/${athlete.id}/performance/gps`,
          },
          {
            label: "Avaliações",
            href: `/atletas/${athlete.id}/performance/avaliacoes`,
          },
          {
            label: "Crescimento",
            href: `/atletas/${athlete.id}/performance/crescimento`,
          },
          {
            label: "Relatórios",
            href: `/atletas/${athlete.id}/performance/relatorios`,
          },
        ]}
      />

      <section className="athlete-performance-v4-heading">
        <div>
          <span className="page-eyebrow">
            TREINO
          </span>

          <h2>Rendimento de treino</h2>

          <p className="muted">
            Frequência, presença e registros individuais
            de participação do atleta.
          </p>
        </div>
      </section>

      <section className="athlete-performance-v4-kpis athlete-training-v5-kpis">
        <article>
          <span className="athlete-training-v5-kpi-icon">
            <TrainingIcon name="attendance" />
          </span>
          <div>
            <small>PRESENÇA</small>
            <strong>
              {formatPercent(attendanceRate)}
            </strong>
            <span>treinos finalizados · faltas justificadas contam 0</span>
          </div>
        </article>

        <article>
          <span className="athlete-training-v5-kpi-icon">
            <TrainingIcon name="sessions" />
          </span>
          <div>
            <small>TREINOS REGISTRADOS</small>
            <strong>{completedAttendances.length || "—"}</strong>
            <span>sessões concluídas contabilizadas</span>
          </div>
        </article>

        <article>
          <span className="athlete-training-v5-kpi-icon">
            <TrainingIcon name="present" />
          </span>
          <div>
            <small>APROVEITAMENTO</small>
            <strong>{formatPercent(minuteUtilization)}</strong>
            <span>{minuteTotals.present} de {minuteTotals.available || "—"} min realizados</span>
          </div>
        </article>

        <article>
          <span className="athlete-training-v5-kpi-icon">
            <TrainingIcon name="absent" />
          </span>
          <div>
            <small>FALTAS</small>
            <strong>
              {completedAttendances.length
                ? absentAttendances.length
                : "—"}
            </strong>
            <span>
              {justifiedAbsences.length} justificada(s) ·{" "}
              {otherZeroAttendances.length} dispensa/lesão
            </span>
          </div>
        </article>
      </section>

      <section className="card">
        <div className="section-title-row">
          <div>
            <span className="page-eyebrow">
              HISTÓRICO OFICIAL
            </span>

            <h2>Treinos finalizados</h2>

            <p className="muted">
              Somente sessões concluídas entram nos KPIs,
              minutagem e relatórios oficiais.
            </p>
          </div>

          <span className="badge">
            {completedAttendances.length} registro(s)
          </span>
        </div>

        {completedAttendances.length ? (
          <div
            className="table-wrap"
            style={{ marginTop: 18 }}
          >
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Categoria</th>
                  <th>Presença</th>
                  <th>Minutos</th>
                  <th>Aproveitamento</th>
                  <th>Treino</th>
                </tr>
              </thead>

              <tbody>
                {completedAttendances.map(
                  (attendance) => {
                    const duration =
                      sessionDurationMinutes(
                        attendance.session,
                      );

                    const percent =
                      participationPercent(
                        attendance.minutesPresent,
                        duration,
                      );

                    return (
                      <tr key={attendance.id}>
                        <td>
                          {attendance.session.startsAt.toLocaleDateString(
                            "pt-BR",
                          )}
                        </td>

                        <td>
                          {attendance.session.category.name}
                        </td>

                        <td>
                          <span className="badge">
                            {attendanceLabel(
                              attendance.status,
                            )}
                          </span>

                          {attendance.status ===
                            "JUSTIFIED_ABSENCE" &&
                          attendance.justification ? (
                            <small
                              style={{
                                display: "block",
                                marginTop: 5,
                              }}
                            >
                              {attendance.justification}
                            </small>
                          ) : null}
                        </td>

                        <td>
                          {attendance.minutesPresent ??
                            0}{" "}
                          / {duration ?? "—"} min
                        </td>

                        <td>
                          <strong>
                            {formatPercent(percent)}
                          </strong>
                        </td>

                        <td>
                          <span className="badge">
                            Finalizado
                          </span>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">
            Nenhum treino finalizado registrado para este atleta.
          </p>
        )}
      </section>

      <section className="card">
        <div className="section-title-row">
          <div>
            <span className="page-eyebrow">
              REGISTROS DA COMISSÃO
            </span>

            <h2>Histórico individual do treino</h2>

            <p className="muted">
              Observações lançadas manualmente pelo botão Registro
              continuam preservadas separadamente dos cálculos de presença.
            </p>
          </div>

          <span className="badge">
            {athlete.historyEntries.length} registro(s)
          </span>
        </div>

        {athlete.historyEntries.length ? (
          <div className="athlete-training-v5-history-list">
            <div className="athlete-training-v5-history-head" aria-hidden="true">
              <span>Data</span>
              <span>Tipo</span>
              <span>Origem</span>
              <span>Observação</span>
              <span>Acompanhamento</span>
              <span>Ação</span>
            </div>

            {athlete.historyEntries.map((entry) => (
              <details className="athlete-training-v5-history-item" key={entry.id}>
                <summary className="athlete-training-v5-history-row">
                  <span data-label="Data">
                    {entry.occurredAt.toLocaleDateString("pt-BR")}
                  </span>
                  <span data-label="Tipo">{historyTopicLabel(entry.topic)}</span>
                  <span data-label="Origem">
                    {entry.sourceLabelSnapshot || entry.title || "Treino"}
                  </span>
                  <span
                    data-label="Observação"
                    className="athlete-training-v5-history-preview"
                    title={entry.content}
                  >
                    {entry.content}
                  </span>
                  <span data-label="Acompanhamento">
                    {entry.followUpRequired ? (
                      <span className="athlete-training-v5-history-status">
                        {entry.followUpResolvedAt ? "Resolvido" : "Pendente"}
                      </span>
                    ) : (
                      "—"
                    )}
                  </span>
                  <span className="athlete-training-v5-history-action">
                    <span className="athlete-training-v5-history-open">Abrir registro</span>
                    <span className="athlete-training-v5-history-close">Fechar registro</span>
                  </span>
                </summary>

                <div className="athlete-training-v5-history-detail">
                  <div className="athlete-training-v5-history-content">
                    <span className="athlete-training-v5-history-label">Observação completa</span>
                    {entry.title ? <h3>{entry.title}</h3> : null}
                    <p>{entry.content}</p>
                  </div>

                  <dl className="athlete-training-v5-history-meta">
                    <div>
                      <dt>Data e hora</dt>
                      <dd>{entry.occurredAt.toLocaleString("pt-BR")}</dd>
                    </div>
                    <div>
                      <dt>Tipo</dt>
                      <dd>{historyTopicLabel(entry.topic)}</dd>
                    </div>
                    <div>
                      <dt>Origem</dt>
                      <dd>{entry.sourceLabelSnapshot || "Treino"}</dd>
                    </div>
                    <div>
                      <dt>Modalidade</dt>
                      <dd>{historySportLabel(entry.sportSnapshot)}</dd>
                    </div>
                    <div>
                      <dt>Categoria registrada</dt>
                      <dd>{entry.categoryNameSnapshot || "Não informada"}</dd>
                    </div>
                    <div>
                      <dt>Registrado por</dt>
                      <dd>{entry.authorNameSnapshot || "Não informado"}</dd>
                    </div>
                    <div>
                      <dt>Visibilidade</dt>
                      <dd>{historyVisibilityLabel(entry.visibility)}</dd>
                    </div>
                    <div>
                      <dt>Acompanhamento</dt>
                      <dd>
                        {!entry.followUpRequired
                          ? "Não solicitado"
                          : entry.followUpResolvedAt
                            ? `Resolvido em ${entry.followUpResolvedAt.toLocaleDateString("pt-BR")}`
                            : "Pendente"}
                        {entry.followUpResolvedAt && entry.resolvedByNameSnapshot
                          ? ` · ${entry.resolvedByNameSnapshot}`
                          : ""}
                      </dd>
                    </div>
                  </dl>
                </div>
              </details>
            ))}
          </div>
        ) : (
          <p className="muted">
            Nenhuma observação de treino disponível para o seu perfil.
          </p>
        )}
      </section>

      <style>{`
        .athlete-training-v5 {
          --training-ink: #07131d;
          --training-muted: #70808b;
          --training-line: #dfe6ea;
          --training-lime: #99e600;
          --training-lime-soft: #eff9d8;
          display: grid;
          gap: 18px;
          padding: 28px 34px 44px;
          background:
            radial-gradient(circle at 92% 2%, rgba(153,230,0,.075), transparent 25rem),
            #f4f7f8;
        }

        .athlete-training-v5 * {
          box-sizing: border-box;
        }

        .athlete-training-v5 .athlete-performance-hero {
          min-height: 194px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
          position: relative;
          overflow: hidden;
          margin: 0;
          padding: 28px 34px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 26px;
          color: #fff;
          background:
            linear-gradient(
              104deg,
              rgba(5,20,31,.99) 0%,
              rgba(6,29,37,.98) 58%,
              rgba(20,76,30,.97) 100%
            );
          box-shadow: 0 20px 45px rgba(7,19,29,.12);
        }

        .athlete-training-v5 .athlete-performance-hero::after {
          content: "";
          width: 360px;
          height: 360px;
          position: absolute;
          right: -105px;
          top: -175px;
          border: 1px solid rgba(153,230,0,.18);
          border-radius: 999px;
          box-shadow:
            0 0 0 42px rgba(153,230,0,.025),
            0 0 0 84px rgba(153,230,0,.018);
          pointer-events: none;
        }

        .athlete-training-v5 .athlete-performance-hero-main,
        .athlete-training-v5 .athlete-performance-hero-actions {
          position: relative;
          z-index: 1;
        }

        .athlete-training-v5 .athlete-performance-hero-avatar {
          width: 94px;
          height: 94px;
          flex: 0 0 94px;
          overflow: hidden;
          border: 3px solid var(--training-lime);
          border-radius: 22px;
          background: #fff;
          box-shadow: 0 12px 26px rgba(0,0,0,.18);
        }

        .athlete-training-v5 .athlete-performance-hero-avatar img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .athlete-training-v5 .athlete-performance-hero-kicker {
          color: var(--training-lime);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .16em;
        }

        .athlete-training-v5 .athlete-performance-hero h1 {
          margin: 6px 0 0;
          color: #fff !important;
          font-size: clamp(34px,4vw,54px);
          line-height: 1;
          letter-spacing: -.045em;
        }

        .athlete-training-v5 .athlete-performance-hero-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 10px;
        }

        .athlete-training-v5 .athlete-performance-hero-meta span {
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          padding: 0 10px;
          border: 1px solid rgba(255,255,255,.14);
          border-radius: 999px;
          color: rgba(255,255,255,.86);
          background: rgba(255,255,255,.04);
          font-size: 10px;
          font-weight: 800;
        }

        .athlete-training-v5 .athlete-performance-hero-description {
          margin-top: 12px;
          color: rgba(255,255,255,.78);
          font-size: 13px;
        }

        .athlete-training-v5 .athlete-performance-hero-actions {
          min-width: 225px;
          display: grid;
          gap: 10px;
          padding: 12px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 18px;
          background: rgba(4,24,35,.66);
          backdrop-filter: blur(8px);
        }

        .athlete-training-v5-status {
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 14px;
          border-radius: 999px;
          color: #c8d0d5;
          background: rgba(255,255,255,.08);
          font-size: 10px;
          font-weight: 900;
        }

        .athlete-training-v5-status.active {
          color: #10200a;
          background: var(--training-lime);
        }

        .athlete-training-v5 .athlete-performance-hero-primary {
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          color: #07120a;
          background: var(--training-lime);
          font-size: 13px;
          font-weight: 900;
          text-decoration: none;
        }

        .athlete-training-v5-athlete-tabs {
          min-height: 64px;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px;
          border: 1px solid var(--training-line);
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 8px 28px rgba(8,26,38,.035);
        }

        .athlete-training-v5-athlete-tabs > a {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 18px;
          border-radius: 11px;
          color: #5e6f7a;
          font-size: 12px;
          font-weight: 900;
          text-decoration: none;
        }

        .athlete-training-v5-athlete-tabs > a.active {
          color: #0b1806;
          background: var(--training-lime);
          box-shadow: 0 7px 18px rgba(153,230,0,.16);
        }

        .athlete-training-v5-athlete-tabs > .athlete-training-v5-back {
          margin-left: auto;
          border: 1px solid #dfe6ea;
          color: #5f6f7a;
          background: #fafbfb;
        }

        .athlete-training-v5 .athlete-performance-tabs {
          margin: 0;
          padding: 6px;
          border: 1px solid var(--training-line);
          border-radius: 16px;
          background: #eef2f4;
        }

        .athlete-training-v5 .athlete-performance-tabs a {
          min-height: 40px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 900;
        }

        .athlete-training-v5 .athlete-performance-v4-heading {
          margin: 0;
          padding: 2px 0 0;
        }

        .athlete-training-v5 .athlete-performance-v4-heading h2 {
          margin-top: 4px;
          color: var(--training-ink);
          font-size: 27px;
          letter-spacing: -.03em;
        }

        .athlete-training-v5 .page-eyebrow {
          color: #719f00;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .14em;
        }

        .athlete-training-v5 .muted {
          color: var(--training-muted);
          font-size: 12px;
        }

        .athlete-training-v5 .athlete-training-v5-kpis {
          grid-template-columns: repeat(4, minmax(0,1fr));
          gap: 14px;
        }

        .athlete-training-v5 .athlete-training-v5-kpis article {
          min-height: 118px;
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          overflow: hidden;
          padding: 17px;
          border: 1px solid var(--training-line);
          border-radius: 19px;
          background: #fff;
          box-shadow: 0 10px 30px rgba(8,26,38,.04);
        }

        .athlete-training-v5 .athlete-training-v5-kpis article::before,
        .athlete-training-v5 .athlete-training-v5-kpis article::after {
          display: none !important;
          content: none !important;
        }

        .athlete-training-v5-kpi-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          align-self: center;
          flex: 0 0 42px;
          border-radius: 12px;
          color: #719f00;
          background: var(--training-lime-soft);
        }

        .athlete-training-v5-kpis article > div {
          min-width: 0;
          display: grid;
          align-content: center;
        }

        .athlete-training-v5-kpi-icon svg {
          display: block;
          margin: 0;
        }

        .athlete-training-v5 .athlete-training-v5-kpis small {
          color: #74838d;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .1em;
        }

        .athlete-training-v5 .athlete-training-v5-kpis strong {
          margin-top: 2px;
          color: var(--training-ink);
          font-size: 27px;
          line-height: 1.05;
          letter-spacing: -.04em;
        }

        .athlete-training-v5 .athlete-training-v5-kpis article div > span {
          margin-top: 4px;
          color: var(--training-muted);
          font-size: 10px;
          font-weight: 700;
          line-height: 1.35;
        }

        .athlete-training-v5 > section.card {
          margin: 0 !important;
          padding: 24px;
          border: 1px solid var(--training-line);
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 10px 30px rgba(8,26,38,.04);
        }

        .athlete-training-v5 .table-wrap {
          overflow-x: auto;
          border: 1px solid #e2e8eb;
          border-radius: 14px;
        }

        .athlete-training-v5 .table {
          margin: 0;
        }

        .athlete-training-v5 .table th {
          color: #6e7e89;
          background: #f7f9fa;
          font-size: 9px;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .athlete-training-v5 .table td {
          font-size: 11px;
        }

        .athlete-training-v5-history-list {
          margin-top: 18px;
          overflow: hidden;
          border: 1px solid #e2e8eb;
          border-radius: 14px;
        }

        .athlete-training-v5-history-head,
        .athlete-training-v5-history-row {
          display: grid;
          grid-template-columns: 100px 90px minmax(115px, 1fr) minmax(160px, 1.6fr) 110px 116px;
          gap: 12px;
          align-items: center;
          padding: 13px 15px;
        }

        .athlete-training-v5-history-head {
          background: #f7f9fa;
          color: #6e7e89;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .athlete-training-v5-history-item {
          border-top: 1px solid #e8edef;
          background: #fff;
        }

        .athlete-training-v5-history-row {
          list-style: none;
          cursor: pointer;
          color: #24323b;
          font-size: 11px;
          line-height: 1.5;
        }

        .athlete-training-v5-history-row::-webkit-details-marker { display: none; }
        .athlete-training-v5-history-row::marker { content: ""; }
        .athlete-training-v5-history-row:hover,
        .athlete-training-v5-history-item[open] > .athlete-training-v5-history-row {
          background: #f6fbe9;
        }
        .athlete-training-v5-history-row:focus-visible {
          outline: 3px solid #719f00;
          outline-offset: -3px;
        }
        .athlete-training-v5-history-row > span { min-width: 0; }
        .athlete-training-v5-history-preview {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .athlete-training-v5-history-status {
          display: inline-flex;
          padding: 6px 9px;
          border-radius: 999px;
          background: #f2f6f8;
          font-size: 10px;
          font-weight: 800;
        }
        .athlete-training-v5-history-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 34px;
          padding: 6px 10px;
          border: 1px solid #cfe99c;
          border-radius: 9px;
          background: #eef9d8;
          color: #355400;
          font-size: 10px;
          font-weight: 900;
          white-space: nowrap;
        }
        .athlete-training-v5-history-close { display: none; }
        .athlete-training-v5-history-item[open] .athlete-training-v5-history-open { display: none; }
        .athlete-training-v5-history-item[open] .athlete-training-v5-history-close { display: inline; }
        .athlete-training-v5-history-detail {
          padding: 20px;
          border-top: 1px solid #dfe6ea;
          background: #fbfcfc;
        }
        .athlete-training-v5-history-content {
          padding: 16px;
          border: 1px solid #e0e8e8;
          border-radius: 12px;
          background: #fff;
        }
        .athlete-training-v5-history-label,
        .athlete-training-v5-history-meta dt {
          display: block;
          color: #6d8510;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }
        .athlete-training-v5-history-content h3 {
          margin: 8px 0 0;
          color: #07131d;
          font-size: 16px;
        }
        .athlete-training-v5-history-content p {
          margin: 8px 0 0;
          color: #24323b;
          font-size: 12px;
          line-height: 1.65;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }
        .athlete-training-v5-history-meta {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin: 18px 0 0;
        }
        .athlete-training-v5-history-meta div { min-width: 0; }
        .athlete-training-v5-history-meta dd {
          margin: 5px 0 0;
          color: #263741;
          font-size: 11px;
          font-weight: 700;
          overflow-wrap: anywhere;
        }

        @media (max-width: 1200px) {
          .athlete-training-v5-history-head,
          .athlete-training-v5-history-row {
            grid-template-columns: 83px 80px minmax(90px, 1fr) minmax(120px, 1.3fr) 96px 112px;
            gap: 9px;
            padding: 12px;
          }
          .athlete-training-v5-history-meta { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 850px) {
          .athlete-training-v5-history-head { display: none; }
          .athlete-training-v5-history-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            align-items: start;
          }
          .athlete-training-v5-history-row > span::before {
            content: attr(data-label);
            display: block;
            margin-bottom: 3px;
            color: #6e7e89;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: .07em;
            text-transform: uppercase;
          }
          .athlete-training-v5-history-preview {
            white-space: normal;
            overflow: hidden;
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            line-clamp: 2;
          }
          .athlete-training-v5-history-action { align-self: end; }
        }

        @media (max-width: 520px) {
          .athlete-training-v5-history-row { grid-template-columns: 1fr; }
          .athlete-training-v5-history-meta { grid-template-columns: 1fr; }
          .athlete-training-v5-history-detail { padding: 12px; }
        }

        @media (max-width: 980px) {
          .athlete-training-v5 {
            padding: 24px;
          }

          .athlete-training-v5 .athlete-performance-hero {
            min-height: auto;
            align-items: flex-start;
            flex-direction: column;
          }

          .athlete-training-v5 .athlete-performance-hero-actions {
            width: 100%;
          }

          .athlete-training-v5 .athlete-training-v5-kpis {
            grid-template-columns: repeat(2, minmax(0,1fr));
          }
        }

        @media (max-width: 760px) {
          .athlete-training-v5 {
            gap: 14px;
            padding: 16px 12px 32px;
          }

          .athlete-training-v5 .athlete-performance-hero {
            padding: 22px 18px;
            border-radius: 20px;
          }

          .athlete-training-v5 .athlete-performance-hero-avatar {
            width: 72px;
            height: 72px;
            flex-basis: 72px;
            border-radius: 18px;
          }

          .athlete-training-v5 .athlete-performance-hero h1 {
            font-size: 32px;
          }

          .athlete-training-v5-athlete-tabs,
          .athlete-training-v5 .athlete-performance-tabs {
            overflow-x: auto;
            justify-content: flex-start;
            white-space: nowrap;
          }

          .athlete-training-v5-athlete-tabs > a,
          .athlete-training-v5 .athlete-performance-tabs a {
            flex: 0 0 auto;
          }

          .athlete-training-v5-athlete-tabs > .athlete-training-v5-back {
            margin-left: 0;
          }
        }

        @media (max-width: 520px) {
          .athlete-training-v5 .athlete-training-v5-kpis {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}