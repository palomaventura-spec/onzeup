import Link from "next/link";
import { notFound } from "next/navigation";

import SafeAvatar from "@/components/SafeAvatar";
import ModuleTabs from "@/components/ModuleTabs";

import { requireClubPermission } from "@/lib/club-access";
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

export default async function AthleteTrainingPerformancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireClubPermission("ATHLETES_VIEW");
  const { id } = await params;

  const athlete = await prisma.athlete.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    include: {
      category: true,
      trainingAttendances: {
        orderBy: {
          session: {
            startsAt: "desc",
          },
        },
        take: 30,
        include: {
          session: true,
        },
      },
    },
  });

  if (!athlete) notFound();

  const countedStatuses = new Set([
    "PRESENT",
    "LATE",
    "PARTIAL",
    "ABSENT",
    "JUSTIFIED_ABSENCE",
    "INJURED",
    "EXCUSED",
  ]);

  const presentStatuses = new Set([
    "PRESENT",
    "LATE",
    "PARTIAL",
  ]);

  const countedAttendances =
    athlete.trainingAttendances.filter((item) =>
      countedStatuses.has(item.status),
    );

  const presentAttendances =
    countedAttendances.filter((item) =>
      presentStatuses.has(item.status),
    );

  const attendanceRate = countedAttendances.length
    ? Math.round(
        (presentAttendances.length /
          countedAttendances.length) *
          100,
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
              {attendanceRate === null ? "—" : `${attendanceRate}%`}
            </strong>
            <span>percentual de participação</span>
          </div>
        </article>

        <article>
          <span className="athlete-training-v5-kpi-icon">
            <TrainingIcon name="sessions" />
          </span>
          <div>
            <small>TREINOS REGISTRADOS</small>
            <strong>{countedAttendances.length || "—"}</strong>
            <span>últimos registros disponíveis</span>
          </div>
        </article>

        <article>
          <span className="athlete-training-v5-kpi-icon">
            <TrainingIcon name="present" />
          </span>
          <div>
            <small>PRESENÇAS</small>
            <strong>{presentAttendances.length || "—"}</strong>
            <span>presenças contabilizadas</span>
          </div>
        </article>

        <article>
          <span className="athlete-training-v5-kpi-icon">
            <TrainingIcon name="absent" />
          </span>
          <div>
            <small>FALTAS</small>
            <strong>
              {countedAttendances.length
                ? countedAttendances.length - presentAttendances.length
                : "—"}
            </strong>
            <span>incluindo faltas justificadas</span>
          </div>
        </article>
      </section>

      <section className="card">
        <div className="section-title-row">
          <div>
            <span className="page-eyebrow">
              HISTÓRICO
            </span>

            <h2>Últimos treinos</h2>
          </div>

          <span className="badge">
            {athlete.trainingAttendances.length} registro(s)
          </span>
        </div>

        {athlete.trainingAttendances.length ? (
          <div
            className="table-wrap"
            style={{ marginTop: 18 }}
          >
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Treino</th>
                </tr>
              </thead>

              <tbody>
                {athlete.trainingAttendances.map(
                  (attendance) => (
                    <tr key={attendance.id}>
                      <td>
                        {attendance.session.startsAt.toLocaleDateString(
                          "pt-BR",
                        )}
                      </td>

                      <td>
                        <span className="badge">
                          {attendance.status === "PRESENT"
                            ? "Presente"
                            : attendance.status === "LATE"
                              ? "Atraso"
                              : attendance.status === "PARTIAL"
                                ? "Parcial"
                                : attendance.status === "ABSENT"
                                  ? "Falta"
                                  : attendance.status === "JUSTIFIED_ABSENCE"
                                    ? "Falta justificada"
                                    : attendance.status === "INJURED"
                                      ? "Lesionado"
                                      : attendance.status === "EXCUSED"
                                        ? "Dispensado"
                                        : attendance.status}
                        </span>
                      </td>

                      <td>
                        Treino
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">
            Nenhum treino registrado para este atleta.
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