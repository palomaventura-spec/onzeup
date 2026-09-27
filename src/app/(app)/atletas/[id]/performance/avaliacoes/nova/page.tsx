import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import SafeAvatar from "@/components/SafeAvatar";
import ModuleTabs from "@/components/ModuleTabs";
import EvaluationProgress from "./EvaluationProgress";

import { requireClubPermission } from "@/lib/club-access";
import { hasEffectiveClubElite } from "@/lib/billing-entitlements";
import { prisma } from "@/lib/prisma";

import { createPerformanceEvaluation } from "../../actions";

const AREA_ORDER = [
  "PHYSICAL",
  "TECHNICAL",
  "TACTICAL",
  "COGNITIVE",
  "EMOTIONAL",
] as const;

const AREA_LABELS: Record<(typeof AREA_ORDER)[number], string> = {
  PHYSICAL: "Área Física",
  TECHNICAL: "Área Técnica",
  TACTICAL: "Área Tática",
  COGNITIVE: "Área Cognitiva",
  EMOTIONAL: "Área Emocional",
};

type AreaName = (typeof AREA_ORDER)[number];

function AreaIcon({ area, size = 20 }: { area: AreaName; size?: number }) {
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

  if (area === "PHYSICAL") {
    return (
      <svg {...common}>
        <path d="M5 15h3l2-6 3 9 2-6h4" />
        <path d="M4 4h16v16H4z" />
      </svg>
    );
  }

  if (area === "TECHNICAL") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="m12 8 3 2.2-1.1 3.5h-3.8L9 10.2 12 8Z" />
      </svg>
    );
  }

  if (area === "TACTICAL") {
    return (
      <svg {...common}>
        <circle cx="7" cy="7" r="2" />
        <circle cx="17" cy="7" r="2" />
        <circle cx="12" cy="17" r="2" />
        <path d="M8.7 8.2 10.8 15M15.3 8.2 13.2 15M9 7h6" />
      </svg>
    );
  }

  if (area === "COGNITIVE") {
    return (
      <svg {...common}>
        <path d="M9 18c-2.8 0-5-2.2-5-5 0-1.8.9-3.4 2.4-4.3A5.5 5.5 0 0 1 17 7.2 4.7 4.7 0 0 1 20 12c0 2.8-2.2 5-5 5h-1" />
        <path d="M10 7v10M14 8v9M8 11h8" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M12 21s-7-4.6-7-10a4 4 0 0 1 7-2.7A4 4 0 0 1 19 11c0 5.4-7 10-7 10Z" />
    </svg>
  );
}

function inputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function errorMessage(error?: string) {
  switch (error) {
    case "dados":
      return "Informe o período e os dados obrigatórios da avaliação.";
    case "periodo":
      return "A data final não pode ser anterior à data inicial.";
    case "notas":
      return "Para finalizar, atribua uma nota a todos os critérios.";
    case "acesso":
      return "Atleta ou modelo de avaliação não encontrado.";
    default:
      return null;
  }
}

export default async function NewPerformanceEvaluationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    role?: string;
    template?: string;
    erro?: string;
  }>;
}) {
  const user = await requireClubPermission("ATHLETES_EDIT");
  const { id } = await params;
  const query = await searchParams;

  const requestedRole =
    query.role === "GOALKEEPER" ? "GOALKEEPER" : "LINE_PLAYER";

  const [athlete, subscription, organization, templates] = await Promise.all([
    prisma.athlete.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { category: true },
    }),
    prisma.subscription.findUnique({
      where: { organizationId: user.organizationId },
    }),
    prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { accessStatus: true, complimentaryUntil: true },
    }),
    prisma.performanceTemplate.findMany({
      where: {
        active: true,
        athleteRole: requestedRole,
        OR: [{ organizationId: null }, { organizationId: user.organizationId }],
      },
      orderBy: [{ systemDefault: "desc" }, { name: "asc" }],
      include: {
        criteria: {
          where: { active: true },
          orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
          include: { levels: { orderBy: { score: "asc" } } },
        },
      },
    }),
  ]);

  if (!athlete) notFound();

  const elite = hasEffectiveClubElite({
    plan: subscription?.plan,
    status: subscription?.status,
    trialEnds: subscription?.trialEnds,
    currentPeriodEnd: subscription?.currentPeriodEnd,
    accessStatus: organization?.accessStatus,
    complimentaryUntil: organization?.complimentaryUntil,
  });

  if (!elite) redirect("/performance?erro=elite");

  const template =
    templates.find((item) => item.id === query.template) || templates[0];
  const message = errorMessage(query.erro);
  const today = new Date();
  const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const totalCriteria = template?.criteria.length || 0;

  return (
    <main className="athlete-performance-page athlete-performance-v4 new-evaluation-v7">
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
              11UP PERFORMANCE · NOVA AVALIAÇÃO
            </span>
            <h1>{athlete.nickname || athlete.name}</h1>
            <p className="athlete-performance-hero-meta">
              <span>{athlete.name}</span>
              <span>{athlete.category?.name || "Sem categoria"}</span>
              <span>{athlete.position || "Posição não informada"}</span>
            </p>
            <p className="athlete-performance-hero-description">
              Avaliação profissional estruturada por valências e critérios de desempenho.
            </p>
          </div>
        </div>

        <div className="athlete-performance-hero-actions">
          <div className="new-evaluation-v7-hero-info">
            <span>{requestedRole === "GOALKEEPER" ? "Goleiro" : "Jogador de linha"}</span>
            <strong>{totalCriteria || "—"} critérios</strong>
          </div>
          <Link
            className="athlete-performance-hero-secondary"
            href={`/atletas/${athlete.id}/performance/avaliacoes`}
          >
            Cancelar e voltar
          </Link>
        </div>
      </section>

      <ModuleTabs
        className="performance-module-tabs athlete-performance-tabs"
        ariaLabel="Navegação da performance do atleta"
        items={[
          { label: "Visão geral", href: `/atletas/${athlete.id}/performance` },
          { label: "Treino", href: `/atletas/${athlete.id}/performance/treino` },
          { label: "Jogo", href: `/atletas/${athlete.id}/performance/jogo` },
          { label: "GPS", href: `/atletas/${athlete.id}/performance/gps` },
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

      {message ? <div className="notice error">{message}</div> : null}

      <section className="card new-evaluation-v7-role-card">
        <div>
          <span className="page-eyebrow">TIPO DE AVALIAÇÃO</span>
          <h2>Selecione a função do atleta</h2>
          <p className="muted">
            O modelo e os critérios são adaptados ao perfil avaliado.
          </p>
        </div>

        <div className="new-evaluation-v7-role-options">
          <Link
            className={requestedRole === "LINE_PLAYER" ? "active" : ""}
            href={`/atletas/${athlete.id}/performance/avaliacoes/nova?role=LINE_PLAYER`}
          >
            <strong>Jogador de linha</strong>
            <span>Critérios específicos para atletas de linha.</span>
          </Link>
          <Link
            className={requestedRole === "GOALKEEPER" ? "active" : ""}
            href={`/atletas/${athlete.id}/performance/avaliacoes/nova?role=GOALKEEPER`}
          >
            <strong>Goleiro</strong>
            <span>Critérios específicos para a posição de goleiro.</span>
          </Link>
        </div>

        {templates.length > 1 ? (
          <div className="new-evaluation-v7-template-row">
            <span className="help">Modelo de avaliação</span>
            <div>
              {templates.map((item) => (
                <Link
                  className={item.id === template?.id ? "active" : ""}
                  href={`/atletas/${athlete.id}/performance/avaliacoes/nova?role=${requestedRole}&template=${item.id}`}
                  key={item.id}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {!template ? (
        <section className="card empty">
          Nenhum modelo ativo encontrado. Execute novamente o seed do Performance.
        </section>
      ) : (
        <form action={createPerformanceEvaluation} className="form new-evaluation-v7-form">
          <input type="hidden" name="athleteId" value={athlete.id} />
          <input type="hidden" name="templateId" value={template.id} />

          <section className="card new-evaluation-v7-identification">
            <div className="new-evaluation-v7-section-head">
              <div>
                <span className="page-eyebrow">IDENTIFICAÇÃO</span>
                <h2>{template.name}</h2>
                {template.description ? (
                  <p className="muted">{template.description}</p>
                ) : null}
              </div>
              <EvaluationProgress totalCriteria={totalCriteria} />
            </div>

            <div className="new-evaluation-v7-identification-grid">
              <label>
                Título
                <input name="title" placeholder="Ex.: Avaliação do 1º trimestre" />
              </label>
              <label>
                Temporada
                <input name="season" defaultValue={String(today.getFullYear())} />
              </label>
              <label>
                Início do período
                <input
                  name="periodStart"
                  type="date"
                  defaultValue={inputDate(periodStart)}
                  required
                />
              </label>
              <label>
                Final do período
                <input
                  name="periodEnd"
                  type="date"
                  defaultValue={inputDate(today)}
                  required
                />
              </label>
            </div>
          </section>

          {AREA_ORDER.map((area) => {
            const criteria = template.criteria.filter(
              (criterion) => criterion.area === area,
            );
            if (!criteria.length) return null;

            return (
              <section className="card new-evaluation-v7-area" key={area}>
                <div className="new-evaluation-v7-area-head">
                  <span className="new-evaluation-v7-area-icon">
                    <AreaIcon area={area} />
                  </span>
                  <div>
                    <span className="page-eyebrow">{AREA_LABELS[area]}</span>
                    <h2>{criteria.length} critérios</h2>
                  </div>
                </div>

                <div className="new-evaluation-v7-criteria-list">
                  {criteria.map((criterion, index) => (
                    <fieldset className="new-evaluation-v7-criterion" key={criterion.id}>
                      <legend>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        {criterion.label}
                      </legend>

                      {criterion.description ? (
                        <p className="muted">{criterion.description}</p>
                      ) : null}

                      <div className="new-evaluation-v7-level-grid">
                        {criterion.levels.map((level) => (
                          <label className="new-evaluation-v7-level" key={level.id}>
                            <input
                              type="radio"
                              name={`score_${criterion.id}`}
                              value={level.score}
                            />
                            <span className="new-evaluation-v7-level-score">
                              {level.score}
                            </span>
                            <span className="new-evaluation-v7-level-copy">
                              <strong>{level.label}</strong>
                              <small>{level.description}</small>
                            </span>
                          </label>
                        ))}
                      </div>

                      <details className="new-evaluation-v7-note-details">
                        <summary>+ Adicionar observação</summary>
                        <label className="new-evaluation-v7-notes">
                          Observação deste critério
                          <textarea
                            name={`notes_${criterion.id}`}
                            rows={2}
                            placeholder="Opcional"
                          />
                        </label>
                      </details>
                    </fieldset>
                  ))}
                </div>
              </section>
            );
          })}

          <section className="card new-evaluation-v7-opinion">
            <div className="new-evaluation-v7-section-head">
              <div>
                <span className="page-eyebrow">PARECER DO AVALIADOR</span>
                <h2>Conclusão e próximos passos</h2>
                <p className="muted">
                  Consolide os principais pontos observados ao longo da avaliação.
                </p>
              </div>
            </div>

            <div className="new-evaluation-v7-opinion-grid">
              <label>
                Pontos fortes
                <textarea name="strengths" rows={4} />
              </label>
              <label>
                Pontos de desenvolvimento
                <textarea name="developmentPoints" rows={4} />
              </label>
              <label>
                Próximas metas
                <textarea name="nextGoals" rows={4} />
              </label>
              <label>
                Parecer geral
                <textarea name="summary" rows={4} />
              </label>
              <label className="new-evaluation-v7-internal">
                Observações internas do clube
                <textarea
                  name="internalNotes"
                  rows={4}
                  placeholder="Este conteúdo não entra no relatório compartilhável."
                />
              </label>
            </div>
          </section>

          <section className="card new-evaluation-v7-submit-card">
            <div>
              <strong>Finalização da avaliação</strong>
              <p>
                O rascunho aceita notas incompletas. Para finalizar, os {totalCriteria} critérios precisam estar preenchidos.
              </p>
            </div>
            <div className="new-evaluation-v7-submit-actions">
              <button
                className="btn btn-secondary"
                name="intent"
                value="DRAFT"
                type="submit"
              >
                Salvar rascunho
              </button>
              <button className="btn" name="intent" value="FINALIZED" type="submit">
                Finalizar avaliação
              </button>
            </div>
          </section>
        </form>
      )}

      <style>{`
        .new-evaluation-v7 {
          --new-eval-ink: #07131d;
          --new-eval-muted: #70808b;
          --new-eval-line: #dfe6ea;
          --new-eval-lime: #99e600;
          --new-eval-lime-dark: #719f00;
          --new-eval-lime-soft: #eff9d8;
          display: grid;
          gap: 18px;
        }

        .new-evaluation-v7-hero-info {
          min-height: 54px;
          display: grid;
          align-content: center;
          gap: 2px;
          padding: 8px 14px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 12px;
          background: rgba(255,255,255,.05);
        }

        .new-evaluation-v7-hero-info span {
          color: rgba(255,255,255,.72);
          font-size: 10px;
          font-weight: 800;
        }

        .new-evaluation-v7-hero-info strong {
          color: #fff;
          font-size: 14px;
        }

        .new-evaluation-v7-role-card,
        .new-evaluation-v7-identification,
        .new-evaluation-v7-area,
        .new-evaluation-v7-opinion,
        .new-evaluation-v7-submit-card {
          padding: 22px 24px;
          border: 1px solid var(--new-eval-line);
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 10px 30px rgba(8,26,38,.04);
        }

        .new-evaluation-v7-role-card h2,
        .new-evaluation-v7-identification h2,
        .new-evaluation-v7-area h2,
        .new-evaluation-v7-opinion h2 {
          margin: 4px 0 3px;
          color: var(--new-eval-ink);
        }

        .new-evaluation-v7-role-card .muted,
        .new-evaluation-v7-identification .muted,
        .new-evaluation-v7-area .muted,
        .new-evaluation-v7-opinion .muted {
          margin: 0;
          color: var(--new-eval-muted);
          font-size: 12px;
        }

        .new-evaluation-v7-role-options {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          margin-top: 18px;
        }

        .new-evaluation-v7-role-options > a {
          min-height: 88px;
          display: grid;
          align-content: center;
          gap: 5px;
          padding: 16px 18px;
          border: 1px solid var(--new-eval-line);
          border-radius: 15px;
          color: #5c6e78;
          background: #fbfcfc;
          text-decoration: none;
        }

        .new-evaluation-v7-role-options > a strong {
          color: var(--new-eval-ink);
          font-size: 15px;
        }

        .new-evaluation-v7-role-options > a span {
          font-size: 11px;
        }

        .new-evaluation-v7-role-options > a.active {
          border-color: var(--new-eval-lime);
          background: var(--new-eval-lime-soft);
          box-shadow: inset 0 0 0 1px var(--new-eval-lime);
        }

        .new-evaluation-v7-template-row {
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid #edf1f2;
        }

        .new-evaluation-v7-template-row > div {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }

        .new-evaluation-v7-template-row a {
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          padding: 0 12px;
          border: 1px solid var(--new-eval-line);
          border-radius: 10px;
          color: #5d6d77;
          background: #fff;
          font-size: 11px;
          font-weight: 850;
          text-decoration: none;
        }

        .new-evaluation-v7-template-row a.active {
          border-color: var(--new-eval-lime);
          color: #10200a;
          background: var(--new-eval-lime);
        }

        .new-evaluation-v7-form {
          width: 100%;
          max-width: none;
          display: grid;
          gap: 18px;
        }

        .new-evaluation-v7-section-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
        }

        .new-evaluation-v7-progress {
          min-width: 210px;
          display: grid;
          gap: 7px;
          padding: 10px 12px;
          border: 1px solid var(--new-eval-line);
          border-radius: 14px;
          background: #f7f9fa;
        }

        .new-evaluation-v7-progress-copy {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          color: #62737d;
          font-size: 10px;
          font-weight: 900;
        }

        .new-evaluation-v7-progress-copy strong {
          color: var(--new-eval-ink);
          font-size: 11px;
        }

        .new-evaluation-v7-progress-track {
          height: 6px;
          overflow: hidden;
          border-radius: 999px;
          background: #e7ecef;
        }

        .new-evaluation-v7-progress-track span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: var(--new-eval-lime);
          transition: width .18s ease;
        }

        .new-evaluation-v7-identification-grid {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          margin-top: 18px;
        }

        .new-evaluation-v7-identification-grid label,
        .new-evaluation-v7-opinion-grid label,
        .new-evaluation-v7-notes {
          display: grid;
          gap: 8px;
          color: #24323b;
          font-size: 12px;
          font-weight: 850;
        }

        .new-evaluation-v7-area-head {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-bottom: 18px;
        }

        .new-evaluation-v7-area-icon {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          flex: 0 0 44px;
          border-radius: 13px;
          color: var(--new-eval-lime-dark);
          background: var(--new-eval-lime-soft);
        }

        .new-evaluation-v7-criteria-list {
          display: grid;
          gap: 14px;
        }

        .new-evaluation-v7-criterion {
          margin: 0;
          padding: 18px;
          border: 1px solid #e4eaed;
          border-radius: 16px;
          background: #fbfcfc;
        }

        .new-evaluation-v7-criterion legend {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 0 8px;
          color: var(--new-eval-ink);
          font-size: 14px;
          font-weight: 900;
        }

        .new-evaluation-v7-criterion legend > span {
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          color: #5d8300;
          background: var(--new-eval-lime-soft);
          font-size: 10px;
        }

        .new-evaluation-v7-level-grid {
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          margin-top: 14px;
        }

        .new-evaluation-v7-level {
          min-height: 112px;
          display: grid;
          grid-template-columns: auto 32px 1fr;
          align-items: flex-start;
          gap: 9px;
          padding: 12px;
          border: 1px solid #dde5e8;
          border-radius: 13px;
          background: #fff;
          cursor: pointer;
          transition: .15s ease;
        }

        .new-evaluation-v7-level:hover {
          border-color: #c3d99a;
          background: #fcfff7;
        }

        .new-evaluation-v7-level:has(input:checked) {
          border-color: var(--new-eval-lime);
          background: var(--new-eval-lime-soft);
          box-shadow: inset 0 0 0 1px var(--new-eval-lime);
        }

        .new-evaluation-v7-level input {
          width: auto;
          margin: 6px 0 0;
        }

        .new-evaluation-v7-level-score {
          width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          color: #486c00;
          background: #f0f7df;
          font-size: 13px;
          font-weight: 950;
        }

        .new-evaluation-v7-level-copy {
          min-width: 0;
          display: grid;
          gap: 4px;
        }

        .new-evaluation-v7-level-copy strong {
          color: var(--new-eval-ink);
          font-size: 12px;
        }

        .new-evaluation-v7-level-copy small {
          color: var(--new-eval-muted);
          font-size: 10px;
          font-weight: 650;
          line-height: 1.4;
        }

        .new-evaluation-v7-note-details {
          margin-top: 12px;
          border-top: 1px solid #e9eef0;
          padding-top: 10px;
        }

        .new-evaluation-v7-note-details summary {
          width: fit-content;
          cursor: pointer;
          list-style: none;
          color: #5d8300;
          font-size: 11px;
          font-weight: 900;
          user-select: none;
        }

        .new-evaluation-v7-note-details summary::-webkit-details-marker {
          display: none;
        }

        .new-evaluation-v7-note-details[open] summary {
          margin-bottom: 10px;
        }

        .new-evaluation-v7-notes {
          margin-top: 14px;
        }

        .new-evaluation-v7-notes textarea {
          min-height: 72px;
        }

        .new-evaluation-v7-opinion-grid {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          margin-top: 18px;
        }

        .new-evaluation-v7-internal {
          grid-column: 1 / -1;
        }

        .new-evaluation-v7-submit-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .new-evaluation-v7-submit-card strong {
          color: var(--new-eval-ink);
          font-size: 15px;
        }

        .new-evaluation-v7-submit-card p {
          max-width: 700px;
          margin: 5px 0 0;
          color: var(--new-eval-muted);
          font-size: 11px;
        }

        .new-evaluation-v7-submit-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        @media (max-width: 1180px) {
          .new-evaluation-v7-identification-grid,
          .new-evaluation-v7-level-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .new-evaluation-v7-role-card,
          .new-evaluation-v7-identification,
          .new-evaluation-v7-area,
          .new-evaluation-v7-opinion,
          .new-evaluation-v7-submit-card {
            padding: 18px 14px;
          }

          .new-evaluation-v7-role-options,
          .new-evaluation-v7-identification-grid,
          .new-evaluation-v7-level-grid,
          .new-evaluation-v7-opinion-grid {
            grid-template-columns: 1fr;
          }

          .new-evaluation-v7-section-head,
          .new-evaluation-v7-submit-card {
            align-items: flex-start;
            flex-direction: column;
          }

          .new-evaluation-v7-internal {
            grid-column: auto;
          }

          .new-evaluation-v7-submit-actions {
            width: 100%;
            justify-content: stretch;
          }

          .new-evaluation-v7-submit-actions .btn {
            flex: 1;
          }
        }
      `}</style>
    </main>
  );
}
