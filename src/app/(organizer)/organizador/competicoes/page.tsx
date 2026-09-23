import Link from "next/link";

import { requireOrganizationUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUS_LABELS = {
  DRAFT: "Rascunho",
  REGISTRATION_OPEN: "Inscrições abertas",
  REGISTRATION_CLOSED: "Inscrições encerradas",
  IN_PROGRESS: "Em andamento",
  FINISHED: "Finalizada",
  ARCHIVED: "Arquivada",
} as const;

const SPORT_LABELS = {
  FOOTBALL: "Futebol",
  FUTSAL: "Futsal",
  BOTH: "Futebol + Futsal",
} as const;

function dateLabel(value: Date | null) {
  if (!value) return "A definir";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

export default async function CompetitionsPage() {
  const user = await requireOrganizationUser();

  if (!user.organizationId) {
    return null;
  }

  const competitions = await prisma.competition.findMany({
    where: {
      organizationId: user.organizationId,
    },

    include: {
      _count: {
        select: {
          categories: true,
          teams: true,
          venues: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  const inProgress = competitions.filter(
    (item) => item.status === "IN_PROGRESS"
  ).length;

  const registrationOpen = competitions.filter(
    (item) => item.status === "REGISTRATION_OPEN"
  ).length;

  const totalTeams = competitions.reduce(
    (total, item) => total + item._count.teams,
    0
  );

  return (
    <div className="od-dashboard">
      <header className="od-header">
        <div>
          <span className="od-eyebrow">
            ONZEUP ORGANIZAÇÃO
          </span>

          <h1>Competições</h1>

          <p className="od-date">
            Crie e gerencie campeonatos, torneios e eventos esportivos.
          </p>
        </div>
      </header>

      <nav
        className="od-quick-actions"
        aria-label="Ações da competição"
      >
        <Link
          className="od-action-primary"
          href="/organizador/competicoes/nova"
        >
          ＋ Nova competição
        </Link>
      </nav>

      <section
        className="od-kpis"
        aria-label="Indicadores das competições"
      >
        <Link href="/organizador/competicoes">
          <span className="od-kpi-icon">◎</span>

          <small>TOTAL</small>

          <strong>{competitions.length}</strong>

          <em>
            Competições cadastradas
          </em>
        </Link>

        <Link href="/organizador/competicoes">
          <span className="od-kpi-icon">◉</span>

          <small>EM ANDAMENTO</small>

          <strong>{inProgress}</strong>

          <em>
            Competições ativas
          </em>
        </Link>

        <Link href="/organizador/competicoes">
          <span className="od-kpi-icon">◇</span>

          <small>INSCRIÇÕES ABERTAS</small>

          <strong>{registrationOpen}</strong>

          <em>
            Recebendo equipes
          </em>
        </Link>

        <Link href="/organizador/equipes">
          <span className="od-kpi-icon">◈</span>

          <small>EQUIPES</small>

          <strong>{totalTeams}</strong>

          <em>
            Nas competições
          </em>
        </Link>
      </section>

      <section
        className="card od-panel"
        style={{
          marginTop: 24,
        }}
      >
        <div className="od-panel-head">
          <div>
            <span className="od-eyebrow">
              GESTÃO
            </span>

            <h2>Suas competições</h2>
          </div>

          <span className="muted">
            {competitions.length} cadastrada
            {competitions.length === 1 ? "" : "s"}
          </span>
        </div>

        {competitions.length ? (
          <div
            style={{
              display: "grid",
              gap: 14,
              marginTop: 20,
            }}
          >
            {competitions.map((competition) => (
              <Link
                key={competition.id}
                href={`/organizador/competicoes/${competition.id}`}
                className="card"
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(220px, 1.5fr) repeat(4, minmax(100px, .6fr)) auto",
                  gap: 18,
                  alignItems: "center",
                  padding: 18,
                  textDecoration: "none",
                }}
              >
                <div>
                  <small
                    className="od-eyebrow"
                    style={{
                      display: "block",
                      marginBottom: 5,
                    }}
                  >
                    {SPORT_LABELS[competition.sport]}
                  </small>

                  <strong
                    style={{
                      display: "block",
                      fontSize: 18,
                    }}
                  >
                    {competition.name}
                  </strong>

                  <span
                    className="muted"
                    style={{
                      display: "block",
                      marginTop: 4,
                    }}
                  >
                    {competition.season ||
                      "Temporada não informada"}
                  </span>
                </div>

                <div>
                  <small className="muted">
                    STATUS
                  </small>

                  <strong
                    style={{
                      display: "block",
                      marginTop: 4,
                    }}
                  >
                    {STATUS_LABELS[competition.status]}
                  </strong>
                </div>

                <div>
                  <small className="muted">
                    PERÍODO
                  </small>

                  <strong
                    style={{
                      display: "block",
                      marginTop: 4,
                    }}
                  >
                    {dateLabel(
                      competition.startDate
                    )}
                  </strong>

                  <span className="muted">
                    até{" "}
                    {dateLabel(
                      competition.endDate
                    )}
                  </span>
                </div>

                <div>
                  <small className="muted">
                    CATEGORIAS
                  </small>

                  <strong
                    style={{
                      display: "block",
                      fontSize: 20,
                      marginTop: 4,
                    }}
                  >
                    {competition._count.categories}
                  </strong>
                </div>

                <div>
                  <small className="muted">
                    EQUIPES
                  </small>

                  <strong
                    style={{
                      display: "block",
                      fontSize: 20,
                      marginTop: 4,
                    }}
                  >
                    {competition._count.teams}
                  </strong>
                </div>

                <div
                  style={{
                    textAlign: "right",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  Abrir →
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="od-empty">
            <strong>
              Nenhuma competição cadastrada
            </strong>

            <span>
              Crie sua primeira competição para começar
              a organizar categorias, equipes, campos e
              jogos.
            </span>

            <Link href="/organizador/competicoes/nova">
              Criar primeira competição
            </Link>
          </div>
        )}
      </section>

      <footer className="od-footer">
        <span>ONZEUP ORGANIZAÇÃO</span>

        <small>
          Gestão completa de competições esportivas.
        </small>
      </footer>
    </div>
  );
}