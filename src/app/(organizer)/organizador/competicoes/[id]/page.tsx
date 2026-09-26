import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

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

const FORMAT_LABELS = {
  GROUP_STAGE_KNOCKOUT: "Grupos + eliminatórias",
  ROUND_ROBIN: "Pontos corridos",
  KNOCKOUT: "Eliminatória",
  CUSTOM: "Personalizado",
} as const;

function dateLabel(value: Date | null) {
  if (!value) return "A definir";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

export default async function CompetitionPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const user = await requireOrganizationUser();

  if (!user.organizationId) {
    notFound();
  }

  const { id } = await params;

  const competition = await prisma.competition.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },

    include: {
      categories: {
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            name: "asc",
          },
        ],
      },

      venues: {
        orderBy: {
          name: "asc",
        },
      },

      _count: {
        select: {
          categories: true,
          teams: true,
          venues: true,
        },
      },
    },
  });

  if (!competition) {
    notFound();
  }

  return (
    <div className="od-dashboard">
      <header className="od-header">
        <div>
          <span className="od-eyebrow">
            ORGANIZAÇÃO · COMPETIÇÃO
          </span>

          <h1>{competition.name}</h1>

          <p className="od-date">
            {SPORT_LABELS[competition.sport]}
            {" · "}
            {competition.season || "Temporada não informada"}
            {" · "}
            {STATUS_LABELS[competition.status]}
          </p>
        </div>

        <Link
          href="/organizador/competicoes"
          className="card"
          style={{
            padding: "11px 16px",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          ← Competições
        </Link>
      </header>

      <nav
        className="od-quick-actions"
        aria-label="Gestão da competição"
      >
        <Link
          className="od-action-primary"
          href={`/organizador/competicoes/${competition.id}/categorias`}
        >
          ＋ Categoria
        </Link>

        <Link
          href={`/organizador/competicoes/${competition.id}/equipes`}
        >
          ＋ Equipe
        </Link>

        <Link
          href={`/organizador/competicoes/${competition.id}/campos`}
        >
          ＋ Campo
        </Link>

        <Link
          href={`/organizador/competicoes/${competition.id}/configuracoes`}
        >
          Configurações
        </Link>
      </nav>

      <section
        className="od-kpis"
        aria-label="Indicadores da competição"
      >
        <Link
          href={`/organizador/competicoes/${competition.id}/categorias`}
        >
          <span className="od-kpi-icon">◎</span>

          <small>CATEGORIAS</small>

          <strong>
            {competition._count.categories}
          </strong>

          <em>Faixas da competição</em>
        </Link>

        <Link
          href={`/organizador/competicoes/${competition.id}/equipes`}
        >
          <span className="od-kpi-icon">◉</span>

          <small>EQUIPES</small>

          <strong>
            {competition._count.teams}
          </strong>

          <em>
            {competition.maxTeams
              ? `Limite de ${competition.maxTeams}`
              : "Sem limite definido"}
          </em>
        </Link>

        <Link
          href={`/organizador/competicoes/${competition.id}/campos`}
        >
          <span className="od-kpi-icon">◇</span>

          <small>CAMPOS / LOCAIS</small>

          <strong>
            {competition._count.venues}
          </strong>

          <em>Locais cadastrados</em>
        </Link>

        <Link href="/organizador/jogos">
          <span className="od-kpi-icon">◈</span>

          <small>JOGOS</small>

          <strong>0</strong>

          <em>Tabela ainda não gerada</em>
        </Link>
      </section>

      <section className="od-main-grid">
        <article className="card od-panel">
          <div className="od-panel-head">
            <div>
              <span className="od-eyebrow">
                VISÃO GERAL
              </span>

              <h2>Informações da competição</h2>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 20,
              marginTop: 22,
            }}
          >
            <div>
              <small className="muted">
                MODALIDADE
              </small>

              <strong
                style={{
                  display: "block",
                  marginTop: 5,
                }}
              >
                {SPORT_LABELS[competition.sport]}
              </strong>
            </div>

            <div>
              <small className="muted">
                FORMATO
              </small>

              <strong
                style={{
                  display: "block",
                  marginTop: 5,
                }}
              >
                {FORMAT_LABELS[competition.format]}
              </strong>
            </div>

            <div>
              <small className="muted">
                STATUS
              </small>

              <strong
                style={{
                  display: "block",
                  marginTop: 5,
                }}
              >
                {STATUS_LABELS[competition.status]}
              </strong>
            </div>

            <div>
              <small className="muted">
                TEMPORADA
              </small>

              <strong
                style={{
                  display: "block",
                  marginTop: 5,
                }}
              >
                {competition.season || "A definir"}
              </strong>
            </div>

            <div>
              <small className="muted">
                INÍCIO
              </small>

              <strong
                style={{
                  display: "block",
                  marginTop: 5,
                }}
              >
                {dateLabel(competition.startDate)}
              </strong>
            </div>

            <div>
              <small className="muted">
                ENCERRAMENTO
              </small>

              <strong
                style={{
                  display: "block",
                  marginTop: 5,
                }}
              >
                {dateLabel(competition.endDate)}
              </strong>
            </div>
          </div>

          {competition.description ? (
            <div
              style={{
                borderTop: "1px solid var(--line)",
                marginTop: 22,
                paddingTop: 20,
              }}
            >
              <small className="muted">
                DESCRIÇÃO
              </small>

              <p
                style={{
                  marginTop: 7,
                  lineHeight: 1.6,
                }}
              >
                {competition.description}
              </p>
            </div>
          ) : null}
        </article>

        <article className="card od-panel od-alerts">
          <div className="od-panel-head">
            <div>
              <span className="od-eyebrow">
                ESTRUTURA
              </span>

              <h2>Preparação</h2>
            </div>
          </div>

          <Link
            href={`/organizador/competicoes/${competition.id}/categorias`}
          >
            <i
              className={
                competition._count.categories
                  ? "green"
                  : "amber"
              }
            >
              {competition._count.categories ? "✓" : "!"}
            </i>

            <div>
              <strong>
                Categorias
              </strong>

              <span>
                {competition._count.categories
                  ? `${competition._count.categories} cadastrada${
                      competition._count.categories === 1
                        ? ""
                        : "s"
                    }.`
                  : "Cadastre as categorias da competição."}
              </span>
            </div>

            <b>
              {competition._count.categories}
            </b>
          </Link>

          <Link
            href={`/organizador/competicoes/${competition.id}/equipes`}
          >
            <i
              className={
                competition._count.teams
                  ? "green"
                  : "amber"
              }
            >
              {competition._count.teams ? "✓" : "!"}
            </i>

            <div>
              <strong>
                Equipes
              </strong>

              <span>
                {competition._count.teams
                  ? `${competition._count.teams} inscrita${
                      competition._count.teams === 1
                        ? ""
                        : "s"
                    }.`
                  : "Nenhuma equipe cadastrada ainda."}
              </span>
            </div>

            <b>
              {competition._count.teams}
            </b>
          </Link>

          <Link
            href={`/organizador/competicoes/${competition.id}/campos`}
          >
            <i
              className={
                competition._count.venues
                  ? "green"
                  : "amber"
              }
            >
              {competition._count.venues ? "✓" : "!"}
            </i>

            <div>
              <strong>
                Campos e locais
              </strong>

              <span>
                {competition._count.venues
                  ? `${competition._count.venues} local${
                      competition._count.venues === 1
                        ? ""
                        : "is"
                    } cadastrado${
                      competition._count.venues === 1
                        ? ""
                        : "s"
                    }.`
                  : "Defina onde os jogos serão realizados."}
              </span>
            </div>

            <b>
              {competition._count.venues}
            </b>
          </Link>
        </article>

        <article className="card od-panel">
          <div className="od-panel-head">
            <div>
              <span className="od-eyebrow">
                INSCRIÇÕES
              </span>

              <h2>Período de inscrições</h2>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 18,
              marginTop: 22,
            }}
          >
            <div>
              <small className="muted">
                ABERTURA
              </small>

              <strong
                style={{
                  display: "block",
                  fontSize: 20,
                  marginTop: 5,
                }}
              >
                {dateLabel(
                  competition.registrationStart
                )}
              </strong>
            </div>

            <div>
              <small className="muted">
                ENCERRAMENTO
              </small>

              <strong
                style={{
                  display: "block",
                  fontSize: 20,
                  marginTop: 5,
                }}
              >
                {dateLabel(
                  competition.registrationEnd
                )}
              </strong>
            </div>

            <div
              style={{
                borderTop: "1px solid var(--line)",
                paddingTop: 18,
              }}
            >
              <small className="muted">
                VISIBILIDADE
              </small>

              <strong
                style={{
                  display: "block",
                  marginTop: 5,
                }}
              >
                {competition.isPublic
                  ? "Página pública habilitada"
                  : "Competição privada"}
              </strong>
            </div>
          </div>
        </article>
      </section>

      <section className="od-bottom-grid">
        <article className="card od-panel">
          <div className="od-panel-head">
            <div>
              <span className="od-eyebrow">
                CATEGORIAS
              </span>

              <h2>Estrutura esportiva</h2>
            </div>

            <Link
              href={`/organizador/competicoes/${competition.id}/categorias`}
            >
              Gerenciar →
            </Link>
          </div>

          {competition.categories.length ? (
            <div
              style={{
                display: "grid",
                gap: 10,
                marginTop: 18,
              }}
            >
              {competition.categories
                .slice(0, 6)
                .map((category) => (
                  <div
                    key={category.id}
                    className="card"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 15,
                      alignItems: "center",
                      padding: 14,
                    }}
                  >
                    <div>
                      <strong>
                        {category.name}
                      </strong>

                      <span
                        className="muted"
                        style={{
                          display: "block",
                          marginTop: 3,
                        }}
                      >
                        {category.matchDurationMinutes} min
                        de jogo ·{" "}
                        {category.transitionMinutes} min
                        de intervalo operacional
                      </span>
                    </div>

                    <strong>
                      {category.maxTeams
                        ? `${category.maxTeams} equipes`
                        : "Sem limite"}
                    </strong>
                  </div>
                ))}
            </div>
          ) : (
            <div className="od-empty">
              <strong>
                Nenhuma categoria criada
              </strong>

              <span>
                Configure Sub-6, Sub-7, Sub-8 ou as
                categorias adequadas à sua competição.
              </span>

              <Link
                href={`/organizador/competicoes/${competition.id}/categorias`}
              >
                Criar primeira categoria
              </Link>
            </div>
          )}
        </article>

        <article className="card od-panel">
          <div className="od-panel-head">
            <div>
              <span className="od-eyebrow">
                LOCAIS
              </span>

              <h2>Campos da competição</h2>
            </div>

            <Link
              href={`/organizador/competicoes/${competition.id}/campos`}
            >
              Gerenciar →
            </Link>
          </div>

          {competition.venues.length ? (
            <div
              style={{
                display: "grid",
                gap: 10,
                marginTop: 18,
              }}
            >
              {competition.venues
                .slice(0, 5)
                .map((venue) => (
                  <div
                    key={venue.id}
                    className="card"
                    style={{
                      padding: 14,
                    }}
                  >
                    <strong>
                      {venue.name}
                    </strong>

                    <span
                      className="muted"
                      style={{
                        display: "block",
                        marginTop: 3,
                      }}
                    >
                      {venue.city || "Cidade não informada"}
                      {venue.state
                        ? ` · ${venue.state}`
                        : ""}
                      {" · "}
                      {venue.fieldCount} campo
                      {venue.fieldCount === 1 ? "" : "s"}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <div className="od-empty">
              <strong>
                Nenhum campo cadastrado
              </strong>

              <span>
                Cadastre os locais utilizados pela competição.
              </span>

              <Link
                href={`/organizador/competicoes/${competition.id}/campos`}
              >
                Cadastrar campo
              </Link>
            </div>
          )}
        </article>
      </section>

      <footer className="od-footer">
        <Image
          src="/brand/11up/logos/11up-logo-transparent-dark.svg"
          alt="11UP"
          width={82}
          height={32}
        />

        <small>
          Central de gestão da competição.
        </small>
      </footer>
    </div>
  );
}