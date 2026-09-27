import Link from "next/link";
import { notFound } from "next/navigation";

import SafeAvatar from "@/components/SafeAvatar";
import ModuleTabs from "@/components/ModuleTabs";

import { requireClubPermission } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

import { createManualGpsRecord } from "../actions";

type GpsIconName =
  | "sessions"
  | "distance"
  | "speed"
  | "intensity"
  | "load"
  | "training"
  | "match";

function GpsIcon({
  name,
  size = 20,
}: {
  name: GpsIconName;
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

  if (name === "sessions") {
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="15" rx="2.2" />
        <path d="M8 3v4M16 3v4M4 10h16" />
        <path d="M9 14h2M13 14h2M9 17h6" />
      </svg>
    );
  }

  if (name === "distance") {
    return (
      <svg {...common}>
        <path d="M5 18c2.2-4.7 4.6-8.7 7-12 2.1 3 4.3 7 7 12" />
        <circle cx="12" cy="6" r="2.2" />
        <path d="M8 18h8" />
      </svg>
    );
  }

  if (name === "speed") {
    return (
      <svg {...common}>
        <path d="M5 16a7 7 0 1 1 14 0" />
        <path d="M12 13l4-4" />
        <path d="M7 16h10" />
      </svg>
    );
  }

  if (name === "intensity") {
    return (
      <svg {...common}>
        <path d="M12 3 6.5 13h4L9 21l8.5-11h-4L12 3Z" />
      </svg>
    );
  }

  if (name === "load") {
    return (
      <svg {...common}>
        <path d="M7 21h10" />
        <path d="M8.5 21V9.5a3.5 3.5 0 1 1 7 0V21" />
        <path d="M6 9.5h12" />
      </svg>
    );
  }

  if (name === "training") {
    return (
      <svg {...common}>
        <path d="M5 18.5 11.5 12 8 8.5l2-2 7.5 7.5-2 2-3.5-3.5L5 18.5Z" />
        <path d="M13.5 4.5 19.5 10.5" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect x="4" y="6" width="16" height="10" rx="2" />
      <path d="M7 18h10M9 16v2M15 16v2" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  );
}

function paginationItems(current: number, total: number) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  const valid = Array.from(pages)
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);

  const items: Array<number | "ellipsis"> = [];

  valid.forEach((page, index) => {
    const previous = valid[index - 1];
    if (previous && page - previous > 1) {
      items.push("ellipsis");
    }
    items.push(page);
  });

  return items;
}

function formatDateTime(date: Date) {
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatDateOnly(date: Date) {
  return date.toLocaleDateString("pt-BR");
}

function numberValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMetric(
  value: unknown,
  {
    suffix = "",
    digits = 0,
  }: {
    suffix?: string;
    digits?: number;
  } = {},
) {
  const numeric = numberValue(value);
  if (numeric === null) return "—";
  return `${numeric.toFixed(digits)}${suffix}`;
}

export default async function AthleteGpsPerformancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; context?: string }>;
}) {
  const user = await requireClubPermission("ATHLETES_VIEW");
  const { id } = await params;
  const query = await searchParams;

  const pageSize = 10;
  const requestedContext =
    query.context === "TRAINING" || query.context === "MATCH"
      ? query.context
      : "ALL";

  const athlete = await prisma.athlete.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    include: {
      category: true,
      gpsRecords: {
        orderBy: {
          activityAt: "desc",
        },
      },
    },
  });

  if (!athlete) notFound();

  const athleteId = athlete.id;

  const allGpsRecords = athlete.gpsRecords;
  const filteredRecords =
    requestedContext === "ALL"
      ? allGpsRecords
      : allGpsRecords.filter((record) => record.context === requestedContext);

  const totalRecords = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const requestedPage = Number.parseInt(String(query.page || "1"), 10);
  const currentPage = Number.isFinite(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), totalPages)
    : 1;

  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const firstVisible = totalRecords ? (currentPage - 1) * pageSize + 1 : 0;
  const lastVisible = Math.min(currentPage * pageSize, totalRecords);
  const pages = paginationItems(currentPage, totalPages);

  const trainingRecords = allGpsRecords.filter(
    (record) => record.context === "TRAINING",
  );
  const matchRecords = allGpsRecords.filter(
    (record) => record.context === "MATCH",
  );

  const latestTraining = trainingRecords[0];
  const latestMatch = matchRecords[0];

  const totals = allGpsRecords.reduce(
    (acc, record) => {
      const distance = numberValue(record.distanceMeters) || 0;
      const highIntensity =
        numberValue(record.highIntensityDistanceMeters) || 0;
      const maxSpeed = numberValue(record.maxSpeedKmh) || 0;
      const playerLoad = numberValue(record.playerLoad);

      return {
        sessions: acc.sessions + 1,
        totalDistance: acc.totalDistance + distance,
        totalHighIntensity: acc.totalHighIntensity + highIntensity,
        maxSpeed: Math.max(acc.maxSpeed, maxSpeed),
        playerLoadSum:
          acc.playerLoadSum + (playerLoad !== null ? playerLoad : 0),
        playerLoadCount:
          acc.playerLoadCount + (playerLoad !== null ? 1 : 0),
      };
    },
    {
      sessions: 0,
      totalDistance: 0,
      totalHighIntensity: 0,
      maxSpeed: 0,
      playerLoadSum: 0,
      playerLoadCount: 0,
    },
  );

  const averagePlayerLoad = totals.playerLoadCount
    ? totals.playerLoadSum / totals.playerLoadCount
    : null;

  function contextHref(context: "ALL" | "TRAINING" | "MATCH") {
    if (context === "ALL") {
      return `/atletas/${athleteId}/performance/gps`;
    }

    return `/atletas/${athleteId}/performance/gps?context=${context}`;
  }

  function pageHref(page: number) {
    const base = `/atletas/${athleteId}/performance/gps?page=${page}`;
    return requestedContext === "ALL"
      ? base
      : `${base}&context=${requestedContext}`;
  }

  return (
    <main className="athlete-performance-page athlete-performance-v4 athlete-gps-performance-v7">
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
              <span>{athlete.category?.name || "Sem categoria"}</span>
              <span>{athlete.position || "Posição não informada"}</span>
            </p>

            <p className="athlete-performance-hero-description">
              Carga física, intensidade e métricas individuais de GPS em treino e jogo.
            </p>
          </div>
        </div>

        <div className="athlete-performance-hero-actions">
          <a className="athlete-performance-hero-primary" href="#novo-gps">
            + Lançar GPS
          </a>

          <Link
            className="athlete-performance-hero-secondary"
            href={`/atletas/${athlete.id}`}
          >
            Voltar ao atleta
          </Link>
        </div>
      </section>

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
          },
          {
            label: "Jogo",
            href: `/atletas/${athlete.id}/performance/jogo`,
          },
          {
            label: "GPS",
            href: `/atletas/${athleteId}/performance/gps`,
            active: true,
          },
          {
            label: "Avaliações",
            href: `/atletas/${athlete.id}/performance/avaliacoes`,
          },
          {
            label: "Relatórios",
            href: `/atletas/${athlete.id}/performance/relatorios`,
          },
        ]}
      />

      <section className="athlete-performance-v4-heading">
        <div>
          <span className="page-eyebrow">GPS</span>
          <h2>Carga física</h2>
          <p className="muted">
            Métricas separadas entre treino e jogo para acompanhamento individual da
            carga física do atleta.
          </p>
        </div>
      </section>

      <section className="athlete-performance-v4-kpis athlete-gps-v7-kpis">
        <article>
          <span className="athlete-gps-v7-kpi-icon">
            <GpsIcon name="sessions" />
          </span>
          <div className="athlete-gps-v7-kpi-copy">
            <small>SESSÕES</small>
            <strong>{totals.sessions || "—"}</strong>
            <span>registros monitorados</span>
          </div>
        </article>

        <article>
          <span className="athlete-gps-v7-kpi-icon">
            <GpsIcon name="distance" />
          </span>
          <div className="athlete-gps-v7-kpi-copy">
            <small>DISTÂNCIA TOTAL</small>
            <strong>{formatMetric(totals.totalDistance, { suffix: " m" })}</strong>
            <span>soma dos registros</span>
          </div>
        </article>

        <article>
          <span className="athlete-gps-v7-kpi-icon">
            <GpsIcon name="speed" />
          </span>
          <div className="athlete-gps-v7-kpi-copy">
            <small>VEL. MÁXIMA</small>
            <strong>{formatMetric(totals.maxSpeed || null, { suffix: " km/h", digits: 1 })}</strong>
            <span>maior velocidade registrada</span>
          </div>
        </article>

        <article>
          <span className="athlete-gps-v7-kpi-icon">
            <GpsIcon name="intensity" />
          </span>
          <div className="athlete-gps-v7-kpi-copy">
            <small>ALTA INTENSIDADE</small>
            <strong>
              {formatMetric(totals.totalHighIntensity, { suffix: " m" })}
            </strong>
            <span>distância em alta intensidade</span>
          </div>
        </article>

        <article>
          <span className="athlete-gps-v7-kpi-icon">
            <GpsIcon name="load" />
          </span>
          <div className="athlete-gps-v7-kpi-copy">
            <small>PLAYER LOAD</small>
            <strong>
              {averagePlayerLoad !== null
                ? averagePlayerLoad.toFixed(1)
                : "—"}
            </strong>
            <span>carga média por registro</span>
          </div>
        </article>
      </section>

      <section className="athlete-gps-v7-summary-grid">
        <article className="card athlete-gps-v7-summary-card">
          <div className="athlete-gps-v7-summary-head">
            <span className="athlete-gps-v7-summary-icon">
              <GpsIcon name="training" />
            </span>

            <div>
              <span className="page-eyebrow">GPS DE TREINO</span>
              <h3>Treinos monitorados</h3>
              <p className="muted">
                {trainingRecords.length
                  ? `Último registro em ${formatDateTime(latestTraining!.activityAt)}`
                  : "Nenhum registro de treino lançado ainda."}
              </p>
            </div>
          </div>

          <div className="athlete-gps-v7-summary-metrics">
            <div>
              <small>SESSÕES</small>
              <strong>{trainingRecords.length || "—"}</strong>
            </div>

            <div>
              <small>DISTÂNCIA</small>
              <strong>
                {formatMetric(latestTraining?.distanceMeters, { suffix: " m" })}
              </strong>
            </div>

            <div>
              <small>VEL. MÁX.</small>
              <strong>
                {formatMetric(latestTraining?.maxSpeedKmh, {
                  suffix: " km/h",
                  digits: 1,
                })}
              </strong>
            </div>

            <div>
              <small>CARGA</small>
              <strong>
                {formatMetric(latestTraining?.playerLoad, { digits: 1 })}
              </strong>
            </div>
          </div>
        </article>

        <article className="card athlete-gps-v7-summary-card">
          <div className="athlete-gps-v7-summary-head">
            <span className="athlete-gps-v7-summary-icon">
              <GpsIcon name="match" />
            </span>

            <div>
              <span className="page-eyebrow">GPS DE JOGO</span>
              <h3>Partidas monitoradas</h3>
              <p className="muted">
                {matchRecords.length
                  ? `Último registro em ${formatDateTime(latestMatch!.activityAt)}`
                  : "Nenhum registro de jogo lançado ainda."}
              </p>
            </div>
          </div>

          <div className="athlete-gps-v7-summary-metrics">
            <div>
              <small>SESSÕES</small>
              <strong>{matchRecords.length || "—"}</strong>
            </div>

            <div>
              <small>DISTÂNCIA</small>
              <strong>
                {formatMetric(latestMatch?.distanceMeters, { suffix: " m" })}
              </strong>
            </div>

            <div>
              <small>VEL. MÁX.</small>
              <strong>
                {formatMetric(latestMatch?.maxSpeedKmh, {
                  suffix: " km/h",
                  digits: 1,
                })}
              </strong>
            </div>

            <div>
              <small>CARGA</small>
              <strong>
                {formatMetric(latestMatch?.playerLoad, { digits: 1 })}
              </strong>
            </div>
          </div>
        </article>
      </section>

      <section id="novo-gps" className="card athlete-gps-v7-form-card">
        <div className="section-title-row athlete-gps-v7-form-head">
          <div>
            <span className="page-eyebrow">NOVO REGISTRO</span>
            <h2>Lançar GPS manualmente</h2>
            <p className="muted">
              Registre os dados fornecidos pelo equipamento de GPS com visual
              organizado por sessão, deslocamento e carga.
            </p>
          </div>
        </div>

        <form className="form athlete-gps-v7-form-grid" action={createManualGpsRecord}>
          <input type="hidden" name="athleteId" value={athlete.id} />

          <label>
            Tipo de atividade
            <select name="context" defaultValue="TRAINING" required>
              <option value="TRAINING">Treino</option>
              <option value="MATCH">Jogo</option>
            </select>
          </label>

          <label>
            Data
            <input name="activityAt" type="date" required />
          </label>

          <label>
            Duração
            <input
              name="durationMinutes"
              type="number"
              min="0"
              placeholder="Ex.: 75"
            />
            <span className="help">Minutos</span>
          </label>

          <label>
            Distância total
            <input
              name="distanceMeters"
              type="number"
              min="0"
              step="0.01"
              placeholder="Ex.: 4250"
            />
            <span className="help">Metros</span>
          </label>

          <label>
            Distância em alta intensidade
            <input
              name="highIntensityDistanceMeters"
              type="number"
              min="0"
              step="0.01"
              placeholder="Ex.: 580"
            />
            <span className="help">Metros</span>
          </label>

          <label>
            Sprints
            <input
              name="sprintCount"
              type="number"
              min="0"
              placeholder="Ex.: 12"
            />
          </label>

          <label>
            Velocidade máxima
            <input
              name="maxSpeedKmh"
              type="number"
              min="0"
              step="0.01"
              placeholder="Ex.: 24.8"
            />
            <span className="help">km/h</span>
          </label>

          <label>
            Velocidade média
            <input
              name="averageSpeedKmh"
              type="number"
              min="0"
              step="0.01"
              placeholder="Ex.: 8.5"
            />
            <span className="help">km/h</span>
          </label>

          <label>
            Acelerações
            <input
              name="accelerations"
              type="number"
              min="0"
              placeholder="Ex.: 22"
            />
          </label>

          <label>
            Desacelerações
            <input
              name="decelerations"
              type="number"
              min="0"
              placeholder="Ex.: 18"
            />
          </label>

          <label>
            Player Load / carga
            <input
              name="playerLoad"
              type="number"
              min="0"
              step="0.01"
              placeholder="Ex.: 385"
            />
          </label>

          <label className="athlete-gps-v7-form-notes">
            Observações
            <textarea
              name="notes"
              rows={4}
              placeholder="Observações do treino, jogo ou equipamento."
            />
          </label>

          <div className="athlete-gps-v7-form-actions">
            <button className="btn" type="submit">
              Salvar GPS
            </button>
          </div>
        </form>
      </section>

      <section className="card athlete-gps-v7-history">
        <div className="section-title-row athlete-gps-v7-history-head">
          <div>
            <span className="page-eyebrow">HISTÓRICO</span>
            <h2>Registros de GPS</h2>
            <p className="muted">
              Histórico completo organizado em páginas de {pageSize} registros.
            </p>
          </div>

          <span className="badge">{totalRecords} registro(s)</span>
        </div>

        <div className="athlete-gps-v7-filter-tabs" aria-label="Filtro do histórico de GPS">
          <Link
            className={requestedContext === "ALL" ? "active" : ""}
            href={contextHref("ALL")}
          >
            Todos
          </Link>
          <Link
            className={requestedContext === "TRAINING" ? "active" : ""}
            href={contextHref("TRAINING")}
          >
            Treino
          </Link>
          <Link
            className={requestedContext === "MATCH" ? "active" : ""}
            href={contextHref("MATCH")}
          >
            Jogo
          </Link>
        </div>

        {paginatedRecords.length ? (
          <>
            <div className="table-wrap athlete-gps-v7-table-wrap">
              <table className="table athlete-gps-v7-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Duração</th>
                    <th>Distância</th>
                    <th>Alta intens.</th>
                    <th>Vel. máx.</th>
                    <th>Sprints</th>
                    <th>Carga</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedRecords.map((record) => (
                    <tr key={record.id}>
                      <td>{formatDateOnly(record.activityAt)}</td>

                      <td>
                        <span className="badge">
                          {record.context === "TRAINING" ? "Treino" : "Jogo"}
                        </span>
                      </td>

                      <td>
                        {record.durationMinutes
                          ? `${record.durationMinutes} min`
                          : "—"}
                      </td>

                      <td>
                        {formatMetric(record.distanceMeters, { suffix: " m" })}
                      </td>

                      <td>
                        {formatMetric(record.highIntensityDistanceMeters, {
                          suffix: " m",
                        })}
                      </td>

                      <td>
                        {formatMetric(record.maxSpeedKmh, {
                          suffix: " km/h",
                          digits: 1,
                        })}
                      </td>

                      <td>{record.sprintCount ?? "—"}</td>

                      <td>{formatMetric(record.playerLoad, { digits: 1 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="athlete-gps-v7-pagination">
              <span className="athlete-gps-v7-range">
                {firstVisible}–{lastVisible} de {totalRecords}
              </span>

              {totalPages > 1 ? (
                <nav aria-label="Paginação do histórico de GPS">
                  <Link
                    className={`athlete-gps-v7-page-nav ${currentPage === 1 ? "disabled" : ""}`}
                    href={pageHref(Math.max(1, currentPage - 1))}
                    aria-disabled={currentPage === 1}
                  >
                    ‹
                  </Link>

                  {pages.map((item, index) =>
                    item === "ellipsis" ? (
                      <span
                        className="athlete-gps-v7-page-ellipsis"
                        key={`ellipsis-${index}`}
                      >
                        …
                      </span>
                    ) : (
                      <Link
                        className={`athlete-gps-v7-page-number ${item === currentPage ? "active" : ""}`}
                        href={pageHref(item)}
                        key={item}
                        aria-current={item === currentPage ? "page" : undefined}
                      >
                        {item}
                      </Link>
                    ),
                  )}

                  <Link
                    className={`athlete-gps-v7-page-nav ${currentPage === totalPages ? "disabled" : ""}`}
                    href={pageHref(Math.min(totalPages, currentPage + 1))}
                    aria-disabled={currentPage === totalPages}
                  >
                    ›
                  </Link>
                </nav>
              ) : null}
            </div>
          </>
        ) : (
          <p className="muted athlete-gps-v7-empty">
            Nenhum registro individual de GPS foi lançado para este atleta.
          </p>
        )}
      </section>

      <style>{`
        .athlete-gps-performance-v7 {
          --gps-v7-ink: #07131d;
          --gps-v7-muted: #70808b;
          --gps-v7-line: #dfe6ea;
          --gps-v7-lime: #99e600;
          --gps-v7-lime-dark: #719f00;
          --gps-v7-lime-soft: #eff9d8;
        }

        .athlete-gps-performance-v7 .athlete-gps-v7-kpis {
          gap: 14px;
          grid-template-columns: repeat(5, minmax(0, 1fr));
        }

        .athlete-gps-performance-v7 .athlete-gps-v7-kpis article {
          min-height: 118px;
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          overflow: hidden;
          padding: 17px;
          border: 1px solid var(--gps-v7-line);
          border-radius: 19px;
          background: #fff;
          box-shadow: 0 10px 30px rgba(8, 26, 38, 0.04);
        }

        .athlete-gps-performance-v7 .athlete-gps-v7-kpis article::before,
        .athlete-gps-performance-v7 .athlete-gps-v7-kpis article::after {
          display: none !important;
          content: none !important;
        }

        .athlete-gps-v7-kpi-icon,
        .athlete-gps-v7-summary-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          flex: 0 0 42px;
          border-radius: 12px;
          color: var(--gps-v7-lime-dark);
          background: var(--gps-v7-lime-soft);
        }

        .athlete-gps-v7-kpi-copy {
          min-width: 0;
          display: grid;
          align-content: center;
        }

        .athlete-gps-v7-kpi-copy small,
        .athlete-gps-v7-summary-metrics small {
          color: #74838d;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.1em;
        }

        .athlete-gps-v7-kpi-copy strong {
          margin-top: 2px;
          color: var(--gps-v7-ink);
          font-size: 27px;
          line-height: 1.05;
          letter-spacing: -0.04em;
        }

        .athlete-gps-v7-kpi-copy > span {
          margin-top: 4px;
          color: var(--gps-v7-muted);
          font-size: 10px;
          font-weight: 700;
          line-height: 1.35;
        }

        .athlete-gps-v7-summary-grid {
          margin-top: 18px;
          display: grid;
          gap: 18px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .athlete-gps-v7-summary-card {
          padding: 22px;
          border: 1px solid var(--gps-v7-line);
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 10px 30px rgba(8, 26, 38, 0.04);
        }

        .athlete-gps-v7-summary-head {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 16px;
        }

        .athlete-gps-v7-summary-head h3 {
          margin: 4px 0 2px;
          color: var(--gps-v7-ink);
          font-size: 24px;
          line-height: 1.1;
          letter-spacing: -0.03em;
        }

        .athlete-gps-v7-summary-head .muted {
          margin: 0;
          font-size: 11px;
          color: var(--gps-v7-muted);
        }

        .athlete-gps-v7-summary-metrics {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .athlete-gps-v7-summary-metrics div {
          min-height: 74px;
          display: grid;
          align-content: start;
          gap: 4px;
          padding: 12px 12px 10px;
          border: 1px solid #e9eef1;
          border-radius: 14px;
          background: #fbfcfc;
        }

        .athlete-gps-v7-summary-metrics strong {
          color: var(--gps-v7-ink);
          font-size: 22px;
          line-height: 1.05;
          letter-spacing: -0.03em;
        }

        .athlete-gps-v7-form-card,
        .athlete-gps-v7-history {
          margin-top: 22px;
          padding: 22px 24px 18px;
          border: 1px solid var(--gps-v7-line);
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 10px 30px rgba(8, 26, 38, 0.04);
        }

        .athlete-gps-v7-form-head,
        .athlete-gps-v7-history-head {
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .athlete-gps-v7-form-head h2,
        .athlete-gps-v7-history-head h2 {
          margin: 4px 0 2px;
          color: var(--gps-v7-ink);
        }

        .athlete-gps-v7-form-head .muted,
        .athlete-gps-v7-history-head .muted {
          margin: 0;
          color: var(--gps-v7-muted);
          font-size: 11px;
        }

        .athlete-gps-v7-form-grid {
          width: 100%;
          max-width: none;
          display: grid;
          gap: 16px 18px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          margin-top: 0;
        }

        .athlete-gps-v7-form-grid label {
          display: grid;
          gap: 8px;
          color: #24323b;
          font-size: 13px;
          font-weight: 800;
        }

        .athlete-gps-v7-form-grid .help {
          margin-top: -2px;
          color: var(--gps-v7-muted);
          font-size: 11px;
          font-weight: 700;
        }

        .athlete-gps-v7-form-notes {
          grid-column: 1 / -1;
        }

        .athlete-gps-v7-form-actions {
          grid-column: 1 / -1;
          display: flex;
          justify-content: flex-end;
          padding-top: 4px;
        }

        .athlete-gps-v7-filter-tabs {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 6px 0 18px;
          flex-wrap: wrap;
        }

        .athlete-gps-v7-filter-tabs a {
          min-width: 88px;
          height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 14px;
          border: 1px solid var(--gps-v7-line);
          border-radius: 12px;
          color: #596a75;
          background: #fff;
          font-size: 12px;
          font-weight: 800;
          text-decoration: none;
        }

        .athlete-gps-v7-filter-tabs a.active {
          border-color: var(--gps-v7-lime);
          color: #10200a;
          background: var(--gps-v7-lime);
        }

        .athlete-gps-v7-filter-tabs a:hover:not(.active) {
          color: var(--gps-v7-ink);
          background: #f4f7f8;
        }

        .athlete-gps-v7-table-wrap {
          overflow: hidden;
          border: 1px solid var(--gps-v7-line);
          border-radius: 14px;
        }

        .athlete-gps-v7-table {
          width: 100%;
          margin: 0;
          border-collapse: collapse;
        }

        .athlete-gps-v7-table thead th {
          height: 42px;
          padding: 0 14px;
          border-bottom: 1px solid var(--gps-v7-line);
          color: #71818c;
          background: #f5f8f9;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.08em;
          white-space: nowrap;
        }

        .athlete-gps-v7-table tbody td {
          height: 50px;
          padding: 10px 14px;
          border-bottom: 1px solid #e8edef;
          color: #24323b;
          font-size: 12px;
          vertical-align: middle;
        }

        .athlete-gps-v7-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .athlete-gps-v7-table tbody tr:hover {
          background: #fbfcfc;
        }

        .athlete-gps-v7-pagination {
          min-height: 54px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding-top: 14px;
        }

        .athlete-gps-v7-range {
          color: var(--gps-v7-muted);
          font-size: 11px;
          font-weight: 800;
        }

        .athlete-gps-v7-pagination nav {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .athlete-gps-v7-page-nav,
        .athlete-gps-v7-page-number,
        .athlete-gps-v7-page-ellipsis {
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          color: #596a75;
          font-size: 11px;
          font-weight: 900;
          text-decoration: none;
        }

        .athlete-gps-v7-page-nav,
        .athlete-gps-v7-page-number {
          border: 1px solid var(--gps-v7-line);
          background: #fff;
        }

        .athlete-gps-v7-page-number.active {
          border-color: var(--gps-v7-lime);
          color: #10200a;
          background: var(--gps-v7-lime);
        }

        .athlete-gps-v7-page-nav:hover:not(.disabled),
        .athlete-gps-v7-page-number:hover:not(.active) {
          color: var(--gps-v7-ink);
          background: #f4f7f8;
        }

        .athlete-gps-v7-page-nav.disabled {
          opacity: 0.38;
          pointer-events: none;
        }

        .athlete-gps-v7-empty {
          margin: 18px 0 4px;
        }

        @media (max-width: 1180px) {
          .athlete-gps-performance-v7 .athlete-gps-v7-kpis {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .athlete-gps-v7-summary-grid {
            grid-template-columns: 1fr;
          }

          .athlete-gps-v7-summary-metrics {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .athlete-gps-v7-form-grid {
          width: 100%;
          max-width: none;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .athlete-gps-performance-v7 .athlete-gps-v7-kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .athlete-gps-v7-form-card,
          .athlete-gps-v7-history {
            padding: 18px 14px 14px;
          }

          .athlete-gps-v7-summary-card {
            padding: 18px 14px;
          }

          .athlete-gps-v7-summary-metrics {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .athlete-gps-v7-form-grid {
          width: 100%;
          max-width: none;
            grid-template-columns: 1fr;
          }

          .athlete-gps-v7-table-wrap {
            overflow-x: auto;
          }

          .athlete-gps-v7-table {
            min-width: 860px;
          }

          .athlete-gps-v7-pagination {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 520px) {
          .athlete-gps-performance-v7 .athlete-gps-v7-kpis,
          .athlete-gps-v7-summary-metrics {
            grid-template-columns: 1fr;
          }

          .athlete-gps-v7-summary-head {
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}