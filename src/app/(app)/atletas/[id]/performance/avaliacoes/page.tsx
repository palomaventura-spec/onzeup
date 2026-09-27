import Link from "next/link";
import { notFound } from "next/navigation";

import SafeAvatar from "@/components/SafeAvatar";
import ModuleTabs from "@/components/ModuleTabs";

import { requireClubPermission } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

function formatDate(date: Date | null | undefined) {
  return date ? date.toLocaleDateString("pt-BR") : "—";
}

export default async function AthleteEvaluationsPage({
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
      evaluations: {
        orderBy: {
          evaluatedAt: "desc",
        },
        include: {
          evaluator: {
            select: {
              name: true,
            },
          },
          scores: true,
        },
      },
    },
  });

  if (!athlete) notFound();

  const finalized = athlete.evaluations.filter(
    (evaluation) => evaluation.status === "FINALIZED",
  );

  const drafts = athlete.evaluations.filter(
    (evaluation) => evaluation.status === "DRAFT",
  );

  const archived = athlete.evaluations.filter(
    (evaluation) => evaluation.status === "ARCHIVED",
  );

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
                {athlete.position || "Posição não informada"}
              </span>
            </p>

            <p className="athlete-performance-hero-description">
              Avaliações profissionais, evolução e histórico individual
              do atleta.
            </p>
          </div>
        </div>

        <div className="athlete-performance-hero-actions">
          <Link
            className="athlete-performance-hero-primary"
            href={`/atletas/${athlete.id}/performance/avaliacoes/nova`}
          >
            + Nova avaliação
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
            active: true,
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
            AVALIAÇÕES
          </span>

          <h2>Acompanhamento profissional</h2>

          <p className="muted">
            Histórico de avaliações técnicas, físicas, táticas,
            cognitivas e emocionais.
          </p>
        </div>

        <Link
          className="btn"
          href={`/atletas/${athlete.id}/performance/avaliacoes/nova`}
        >
          + Nova avaliação
        </Link>
      </section>

      <section className="athlete-performance-v4-kpis">
        <article>
          <small>TOTAL</small>
          <strong>
            {athlete.evaluations.length || "—"}
          </strong>
          <span>avaliações cadastradas</span>
        </article>

        <article>
          <small>FINALIZADAS</small>
          <strong>{finalized.length || "—"}</strong>
          <span>avaliações concluídas</span>
        </article>

        <article>
          <small>RASCUNHOS</small>
          <strong>{drafts.length || "—"}</strong>
          <span>em preenchimento</span>
        </article>

        <article>
          <small>ARQUIVADAS</small>
          <strong>{archived.length || "—"}</strong>
          <span>registros arquivados</span>
        </article>
      </section>

      <section className="card athlete-performance-v4-history">
        <div className="section-title-row">
          <div>
            <span className="page-eyebrow">
              HISTÓRICO
            </span>

            <h2>Avaliações do atleta</h2>
          </div>

          <span className="badge">
            {athlete.evaluations.length} registro(s)
          </span>
        </div>

        {athlete.evaluations.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Avaliação</th>
                  <th>Tipo</th>
                  <th>Data</th>
                  <th>Avaliador</th>
                  <th>Preenchimento</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {athlete.evaluations.map((evaluation) => (
                  <tr key={evaluation.id}>
                    <td>
                      <strong>
                        {evaluation.title || "Avaliação"}
                      </strong>
                    </td>

                    <td>
                      {evaluation.athleteRole === "GOALKEEPER"
                        ? "Goleiro"
                        : "Jogador de linha"}
                    </td>

                    <td>
                      {formatDate(evaluation.evaluatedAt)}
                    </td>

                    <td>
                      {evaluation.evaluator?.name || "—"}
                    </td>

                    <td>
                      {evaluation.scores.length}/25
                    </td>

                    <td>
                      <span className="badge">
                        {evaluation.status === "FINALIZED"
                          ? "Finalizada"
                          : evaluation.status === "DRAFT"
                            ? "Rascunho"
                            : "Arquivada"}
                      </span>
                    </td>

                    <td>
                      {evaluation.status === "FINALIZED" ? (
                        <Link
                          className="btn btn-small"
                          href={`/atletas/${athlete.id}/performance/avaliacoes/${evaluation.id}`}
                        >
                          Ver avaliação
                        </Link>
                      ) : (
                        <span className="help">
                          Rascunho
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">
            Nenhuma avaliação cadastrada para este atleta.
          </p>
        )}
      </section>
    </main>
  );
}