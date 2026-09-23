import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

function dateLabel(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(value);
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function OrganizerDashboard() {
  const user = await getCurrentUser();
  const now = new Date();

  /*
   * DADOS DEMONSTRATIVOS
   *
   * Nesta primeira versão não consultamos o Prisma porque os models
   * Competition, CompetitionTeam, Budget, Sponsor etc. ainda serão criados.
   *
   * Depois esses valores serão substituídos por consultas reais.
   */

  const demo = {
    competitionName: "Taça Edilson Silva · Ambiente demonstrativo",

    activeCompetitions: 1,
    registeredTeams: 56,
    teamCapacity: 64,
    registeredAthletes: 742,
    scheduledMatches: 105,

    projectedRevenue: 171600,
    receivedRevenue: 96600,

    projectedCosts: 140000,
    actualCosts: 78500,

    projectedResult: 31600,

    sponsorshipGoal: 60000,
    sponsorshipContracted: 49000,

    suppliersTotal: 21,
    suppliersContracted: 18,

    operationalPending: 6,
    registrationsPending: 8,
    paymentsPending: 11,
  };

  const occupancy = Math.round(
    (demo.registeredTeams / demo.teamCapacity) * 100
  );

  const sponsorshipProgress = Math.round(
    (demo.sponsorshipContracted / demo.sponsorshipGoal) * 100
  );

  const supplierProgress = Math.round(
    (demo.suppliersContracted / demo.suppliersTotal) * 100
  );

  const breakEvenTeams = 38;

  const upcomingMatches = [
    {
      id: "demo-1",
      date: "03 JAN",
      time: "09:00",
      category: "SUB-08",
      home: "Equipe Azul",
      away: "Equipe Verde",
      venue: "Campo Principal",
    },
    {
      id: "demo-2",
      date: "03 JAN",
      time: "09:25",
      category: "SUB-09",
      home: "Equipe Norte",
      away: "Equipe Sul",
      venue: "Campo Principal",
    },
    {
      id: "demo-3",
      date: "03 JAN",
      time: "09:50",
      category: "SUB-10",
      home: "Equipe A",
      away: "Equipe B",
      venue: "Campo Principal",
    },
  ];

  return (
    <div className="od-dashboard">
      <header className="od-header">
        <div>
          <span className="od-eyebrow">
            ONZEUP ORGANIZAÇÃO · PROPOSTA CONCEITUAL
          </span>

          <h1>Central da Organização</h1>

          <p className="od-date">{dateLabel(now)}</p>

          <p className="muted" style={{ marginTop: 8 }}>
            {demo.competitionName}
          </p>
        </div>

        <div
          className="card"
          style={{
            padding: "12px 16px",
            minWidth: 210,
          }}
        >
          <small className="muted">ACESSO ATUAL</small>

          <strong
            style={{
              display: "block",
              marginTop: 4,
            }}
          >
            {user?.name || "Organizador"}
          </strong>

          <span
            className="muted"
            style={{
              display: "block",
              marginTop: 3,
              fontSize: 13,
            }}
          >
            Ambiente Organização
          </span>
        </div>
      </header>

      <nav
        className="od-quick-actions"
        aria-label="Ações rápidas"
      >
        <Link
          className="od-action-primary"
          href="/organizador/competicoes/nova"
        >
          ＋ Nova competição
        </Link>

        <Link href="/organizador/equipes">
          ＋ Equipe
        </Link>

        <Link href="/organizador/jogos">
          ＋ Jogo
        </Link>

        <Link href="/organizador/financeiro">
          Lançamento financeiro
        </Link>
      </nav>

      <section
        className="od-kpis"
        aria-label="Indicadores principais"
      >
        <Link href="/organizador/competicoes">
          <span className="od-kpi-icon">◎</span>
          <small>COMPETIÇÕES ATIVAS</small>
          <strong>{demo.activeCompetitions}</strong>
          <em>Ver competições →</em>
        </Link>

        <Link href="/organizador/equipes">
          <span className="od-kpi-icon">◉</span>
          <small>EQUIPES INSCRITAS</small>
          <strong>{demo.registeredTeams}</strong>
          <em>
            {occupancy}% da capacidade
          </em>
        </Link>

        <Link href="/organizador/atletas">
          <span className="od-kpi-icon">◇</span>
          <small>ATLETAS INSCRITOS</small>
          <strong>{demo.registeredAthletes}</strong>
          <em>Ver participantes →</em>
        </Link>

        <Link href="/organizador/jogos">
          <span className="od-kpi-icon">◈</span>
          <small>JOGOS PROGRAMADOS</small>
          <strong>{demo.scheduledMatches}</strong>
          <em>Ver tabela →</em>
        </Link>
      </section>

      <section className="od-main-grid">
        <article className="card od-panel">
          <div className="od-panel-head">
            <div>
              <span className="od-eyebrow">
                NEGÓCIO
              </span>

              <h2>Visão financeira</h2>
            </div>

            <Link href="/organizador/financeiro">
              Abrir financeiro →
            </Link>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 14,
              marginTop: 18,
            }}
          >
            <div className="card">
              <small className="muted">
                RECEITA PROJETADA
              </small>

              <strong
                style={{
                  display: "block",
                  fontSize: 24,
                  marginTop: 6,
                }}
              >
                {money(demo.projectedRevenue)}
              </strong>
            </div>

            <div className="card">
              <small className="muted">
                RECEBIDO
              </small>

              <strong
                style={{
                  display: "block",
                  fontSize: 24,
                  marginTop: 6,
                }}
              >
                {money(demo.receivedRevenue)}
              </strong>
            </div>

            <div className="card">
              <small className="muted">
                CUSTO PROJETADO
              </small>

              <strong
                style={{
                  display: "block",
                  fontSize: 24,
                  marginTop: 6,
                }}
              >
                {money(demo.projectedCosts)}
              </strong>
            </div>

            <div className="card">
              <small className="muted">
                RESULTADO PROJETADO
              </small>

              <strong
                style={{
                  display: "block",
                  fontSize: 24,
                  marginTop: 6,
                }}
              >
                + {money(demo.projectedResult)}
              </strong>
            </div>
          </div>

          <div
            style={{
              marginTop: 20,
              paddingTop: 18,
              borderTop: "1px solid var(--line)",
            }}
          >
            <span className="od-eyebrow">
              PONTO DE EQUILÍBRIO
            </span>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 20,
                marginTop: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div>
                <strong
                  style={{
                    display: "block",
                    fontSize: 28,
                  }}
                >
                  {breakEvenTeams} equipes
                </strong>

                <span className="muted">
                  O evento atinge o equilíbrio financeiro
                  aproximadamente neste ponto.
                </span>
              </div>

              <strong>
                {demo.registeredTeams} confirmadas
              </strong>
            </div>
          </div>
        </article>

        <article className="card od-panel od-alerts">
          <div className="od-panel-head">
            <div>
              <span className="od-eyebrow">
                PRIORIDADES
              </span>

              <h2>Atenção necessária</h2>
            </div>
          </div>

          <Link href="/organizador/inscricoes">
            <i className="amber">!</i>

            <div>
              <strong>
                {demo.registrationsPending} inscrições pendentes
              </strong>

              <span>
                Documentos ou validação aguardando análise
              </span>
            </div>

            <b>{demo.registrationsPending}</b>
          </Link>

          <Link href="/organizador/financeiro">
            <i className="red">$</i>

            <div>
              <strong>
                {demo.paymentsPending} pagamentos pendentes
              </strong>

              <span>
                Inscrições, fornecedores ou contratos
              </span>
            </div>

            <b>{demo.paymentsPending}</b>
          </Link>

          <Link href="/organizador/operacional">
            <i className="red">!</i>

            <div>
              <strong>
                {demo.operationalPending} pendências operacionais
              </strong>

              <span>
                Itens necessários antes da competição
              </span>
            </div>

            <b>{demo.operationalPending}</b>
          </Link>

          <Link href="/organizador/fornecedores">
            <i className="blue">✓</i>

            <div>
              <strong>
                {demo.suppliersContracted}/{demo.suppliersTotal} fornecedores
              </strong>

              <span>
                {supplierProgress}% da operação contratada
              </span>
            </div>

            <b>{supplierProgress}%</b>
          </Link>
        </article>

        <article className="card od-panel">
          <div className="od-panel-head">
            <div>
              <span className="od-eyebrow">
                COMERCIAL
              </span>

              <h2>Patrocínios</h2>
            </div>

            <Link href="/organizador/patrocinadores">
              Ver gestão →
            </Link>
          </div>

          <div
            style={{
              marginTop: 18,
            }}
          >
            <small className="muted">
              META DE PATROCÍNIOS
            </small>

            <strong
              style={{
                display: "block",
                fontSize: 30,
                marginTop: 5,
              }}
            >
              {money(demo.sponsorshipGoal)}
            </strong>
          </div>

          <div
            style={{
              marginTop: 18,
            }}
          >
            <small className="muted">
              CONTRATADO
            </small>

            <strong
              style={{
                display: "block",
                fontSize: 24,
                marginTop: 5,
              }}
            >
              {money(demo.sponsorshipContracted)}
            </strong>
          </div>

          <div
            style={{
              marginTop: 18,
            }}
          >
            <strong>{sponsorshipProgress}% da meta</strong>

            <div
              style={{
                width: "100%",
                height: 8,
                background: "var(--line)",
                borderRadius: 999,
                marginTop: 8,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min(
                    sponsorshipProgress,
                    100
                  )}%`,
                  height: "100%",
                  background: "var(--accent)",
                }}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: 22,
              paddingTop: 18,
              borderTop: "1px solid var(--line)",
            }}
          >
            <Link href="/organizador/patrocinadores">
              Gerenciar cotas e contrapartidas →
            </Link>
          </div>
        </article>
      </section>

      <section className="od-bottom-grid">
        <article className="card od-panel od-games">
          <div className="od-panel-head">
            <div>
              <span className="od-eyebrow">
                COMPETIÇÃO
              </span>

              <h2>Próximos jogos</h2>
            </div>

            <Link href="/organizador/jogos">
              Ver tabela →
            </Link>
          </div>

          {upcomingMatches.map((match) => (
            <Link
              href="/organizador/jogos"
              key={match.id}
              className="od-game-row"
            >
              <time>
                <b>{match.date}</b>
                <span>{match.time}</span>
              </time>

              <div>
                <strong>
                  {match.home} × {match.away}
                </strong>

                <span>
                  {match.category} · {match.venue}
                </span>
              </div>

              <em>Programado</em>

              <b className="pending">
                Súmula pendente
              </b>
            </Link>
          ))}
        </article>

        <article className="card od-panel od-communication">
          <div className="od-panel-head">
            <div>
              <span className="od-eyebrow">
                OPERAÇÃO
              </span>

              <h2>Status da competição</h2>
            </div>

            <Link href="/organizador/operacional">
              Ver operação →
            </Link>
          </div>

          <Link href="/organizador/equipes">
            <i className="green" />

            <div>
              <strong>Equipes</strong>

              <span>
                {demo.registeredTeams} de{" "}
                {demo.teamCapacity} vagas preenchidas.
              </span>
            </div>
          </Link>

          <Link href="/organizador/fornecedores">
            <i className="amber" />

            <div>
              <strong>Fornecedores</strong>

              <span>
                {demo.suppliersContracted} de{" "}
                {demo.suppliersTotal} contratações concluídas.
              </span>
            </div>
          </Link>

          <Link href="/organizador/patrocinadores">
            <i className="blue" />

            <div>
              <strong>Patrocínios</strong>

              <span>
                {money(demo.sponsorshipContracted)} contratados
                de uma meta de {money(demo.sponsorshipGoal)}.
              </span>
            </div>
          </Link>
        </article>
      </section>

      <footer className="od-footer">
        <span>ONZEUP ORGANIZAÇÃO</span>

        <small>
          Planejamento, competição e gestão em um só lugar.
        </small>
      </footer>
    </div>
  );
}