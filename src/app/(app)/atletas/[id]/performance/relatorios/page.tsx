import Link from "next/link";
import { notFound } from "next/navigation";

import SafeAvatar from "@/components/SafeAvatar";
import ModuleTabs from "@/components/ModuleTabs";

import { requireClubPermission } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

export default async function AthleteReportsPage({
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
    },
  });

  if (!athlete) notFound();

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
              Geração, histórico e consulta dos relatórios individuais do atleta.
            </p>
          </div>
        </div>

        <div className="athlete-performance-hero-actions">
          <Link
            className="athlete-performance-hero-primary"
            href={`/atletas/${athlete.id}/performance`}
          >
            Ver visão geral
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
          },
          {
            label: "Relatórios",
            href: `/atletas/${athlete.id}/performance/relatorios`,
            active: true,
          },
        ]}
      />

      <section className="athlete-performance-v4-heading">
        <div>
          <span className="page-eyebrow">
            RELATÓRIOS
          </span>

          <h2>Relatórios do atleta</h2>

          <p className="muted">
            Gere relatórios específicos por área e mantenha o histórico
            individual organizado.
          </p>
        </div>
      </section>

      <section className="athlete-performance-v4-secondary-grid">
        <article className="card athlete-performance-v4-detail-card">
          <span className="page-eyebrow">
            TREINO
          </span>

          <h2>Relatório de treino</h2>

          <p className="muted">
            Frequência, presença, faltas e rendimento de treino.
          </p>

          <Link
            className="btn btn-secondary"
            href={`/atletas/${athlete.id}/performance/treino`}
          >
            Preparar relatório
          </Link>
        </article>

        <article className="card athlete-performance-v4-detail-card">
          <span className="page-eyebrow">
            JOGO
          </span>

          <h2>Relatório de jogo</h2>

          <p className="muted">
            Participação, minutagem, gols, assistências e súmulas.
          </p>

          <Link
            className="btn btn-secondary"
            href={`/atletas/${athlete.id}/performance/jogo`}
          >
            Preparar relatório
          </Link>
        </article>

        <article className="card athlete-performance-v4-detail-card">
          <span className="page-eyebrow">
            GPS
          </span>

          <h2>Relatório de GPS</h2>

          <p className="muted">
            Carga física e métricas de GPS separadas por treino e jogo.
          </p>

          <Link
            className="btn btn-secondary"
            href={`/atletas/${athlete.id}/performance/gps`}
          >
            Preparar relatório
          </Link>
        </article>

        <article className="card athlete-performance-v4-detail-card">
          <span className="page-eyebrow">
            AVALIAÇÕES
          </span>

          <h2>Relatório de avaliação</h2>

          <p className="muted">
            Resultados profissionais, evolução e histórico de avaliações.
          </p>

          <Link
            className="btn btn-secondary"
            href={`/atletas/${athlete.id}/performance/avaliacoes`}
          >
            Preparar relatório
          </Link>
        </article>
      </section>

      <section className="card">
        <div className="section-title-row">
          <div>
            <span className="page-eyebrow">
              HISTÓRICO
            </span>

            <h2>Relatórios gerados</h2>
          </div>

          <span className="badge">
            0 registro(s)
          </span>
        </div>

        <p className="muted">
          Nenhum relatório individual foi salvo para este atleta.
        </p>

        <p className="help">
          Na próxima etapa, esta área será conectada ao armazenamento
          real dos relatórios e aos PDFs gerados pelo 11UP.
        </p>
      </section>
    </main>
  );
}