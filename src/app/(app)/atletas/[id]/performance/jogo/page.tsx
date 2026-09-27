import Link from "next/link";
import { notFound } from "next/navigation";

import SafeAvatar from "@/components/SafeAvatar";
import ModuleTabs from "@/components/ModuleTabs";

import { requireClubPermission } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

export default async function AthleteMatchPerformancePage({
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
      matchStats: {
        orderBy: {
          match: {
            startsAt: "desc",
          },
        },
        take: 30,
        include: {
          match: true,
        },
      },
    },
  });

  if (!athlete) notFound();

  const totals = athlete.matchStats.reduce(
    (acc, item) => ({
      matches:
        acc.matches +
        (item.minutesPlayed || item.goals || item.assists ? 1 : 0),
      minutes: acc.minutes + (item.minutesPlayed || 0),
      goals: acc.goals + item.goals,
      assists: acc.assists + item.assists,
      yellowCards: acc.yellowCards + item.yellowCards,
      redCards: acc.redCards + item.redCards,
    }),
    {
      matches: 0,
      minutes: 0,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
    },
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
              Participação competitiva, minutagem e produção em jogo.
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
          },
          {
            label: "Jogo",
            href: `/atletas/${athlete.id}/performance/jogo`,
            active: true,
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
          <span className="page-eyebrow">JOGO</span>

          <h2>Rendimento em partidas</h2>

          <p className="muted">
            Minutagem, gols, assistências e participação competitiva
            registrada nas súmulas.
          </p>
        </div>
      </section>

      <section className="athlete-performance-v4-kpis">
        <article>
          <small>JOGOS</small>
          <strong>{totals.matches || "—"}</strong>
          <span>participações registradas</span>
        </article>

        <article>
          <small>MINUTOS</small>
          <strong>{totals.minutes || "—"}</strong>
          <span>minutos em jogo</span>
        </article>

        <article>
          <small>GOLS</small>
          <strong>{totals.goals}</strong>
          <span>gols registrados</span>
        </article>

        <article>
          <small>ASSISTÊNCIAS</small>
          <strong>{totals.assists}</strong>
          <span>assistências registradas</span>
        </article>

        <article>
          <small>CARTÕES</small>
          <strong>
            {totals.yellowCards + totals.redCards}
          </strong>
          <span>
            {totals.yellowCards} amarelo(s) ·{" "}
            {totals.redCards} vermelho(s)
          </span>
        </article>
      </section>

      <section className="card">
        <div className="section-title-row">
          <div>
            <span className="page-eyebrow">
              HISTÓRICO
            </span>

            <h2>Últimos jogos</h2>
          </div>

          <span className="badge">
            {athlete.matchStats.length} registro(s)
          </span>
        </div>

        {athlete.matchStats.length ? (
          <div
            className="table-wrap"
            style={{ marginTop: 18 }}
          >
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Adversário</th>
                  <th>Minutos</th>
                  <th>Gols</th>
                  <th>Assist.</th>
                  <th>Cartões</th>
                </tr>
              </thead>

              <tbody>
                {athlete.matchStats.map((stat) => (
                  <tr key={stat.id}>
                    <td>
                      {stat.match.startsAt.toLocaleDateString(
                        "pt-BR",
                      )}
                    </td>

                    <td>
                      {stat.match.opponent ||
                        "Adversário não informado"}
                    </td>

                    <td>{stat.minutesPlayed || "—"}</td>
                    <td>{stat.goals}</td>
                    <td>{stat.assists}</td>

                    <td>
                      {stat.yellowCards || stat.redCards
                        ? `${stat.yellowCards}A · ${stat.redCards}V`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">
            Nenhum jogo registrado para este atleta.
          </p>
        )}
      </section>
    </main>
  );
}