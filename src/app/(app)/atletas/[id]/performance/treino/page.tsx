import Link from "next/link";
import { notFound } from "next/navigation";

import SafeAvatar from "@/components/SafeAvatar";
import ModuleTabs from "@/components/ModuleTabs";

import { requireClubPermission } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

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
    <main className="athlete-performance-page athlete-performance-v4">
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
          <Link
            className="athlete-performance-hero-primary"
            href={`/atletas/${athlete.id}/performance/relatorios`}
          >
            Gerar relatório
          </Link>

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

      <section className="athlete-performance-v4-kpis">
        <article>
          <small>PRESENÇA</small>

          <strong>
            {attendanceRate === null
              ? "—"
              : `${attendanceRate}%`}
          </strong>

          <span>percentual de participação</span>
        </article>

        <article>
          <small>TREINOS REGISTRADOS</small>

          <strong>
            {countedAttendances.length || "—"}
          </strong>

          <span>últimos registros disponíveis</span>
        </article>

        <article>
          <small>PRESENÇAS</small>

          <strong>
            {presentAttendances.length || "—"}
          </strong>

          <span>presenças contabilizadas</span>
        </article>

        <article>
          <small>FALTAS</small>

          <strong>
            {countedAttendances.length
              ? countedAttendances.length -
                presentAttendances.length
              : "—"}
          </strong>

          <span>incluindo faltas justificadas</span>
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
                          {attendance.status}
                        </span>
                      </td>

                      <td>
                        "Treino"
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
    </main>
  );
}