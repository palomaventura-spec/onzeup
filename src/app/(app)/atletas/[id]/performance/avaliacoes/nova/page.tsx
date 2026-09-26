import Link from "next/link";
import { notFound, redirect } from "next/navigation";

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

  return (
    <>
      <div className="page-head">
        <div>
          <span className="page-eyebrow">11UP PERFORMANCE • NOVA AVALIAÇÃO</span>
          <h1>{athlete.nickname || athlete.name}</h1>
          <p className="muted">
            {athlete.name} • {athlete.category?.name || "Sem categoria"} •{" "}
            {athlete.position || "Posição não informada"}
          </p>
        </div>
        <Link
          className="btn btn-secondary"
          href={`/atletas/${athlete.id}/performance`}
        >
          Cancelar e voltar
        </Link>
      </div>

      {message ? <div className="notice error">{message}</div> : null}

      <section className="card" style={{ marginBottom: 18 }}>
        <span className="page-eyebrow">TIPO DE AVALIAÇÃO</span>
        <h2>Selecione a função do atleta</h2>
        <div className="actions" style={{ marginTop: 14 }}>
          <Link
            className={requestedRole === "LINE_PLAYER" ? "btn" : "btn btn-secondary"}
            href={`/atletas/${athlete.id}/performance/avaliacoes/nova?role=LINE_PLAYER`}
          >
            Jogador de linha
          </Link>
          <Link
            className={requestedRole === "GOALKEEPER" ? "btn" : "btn btn-secondary"}
            href={`/atletas/${athlete.id}/performance/avaliacoes/nova?role=GOALKEEPER`}
          >
            Goleiro
          </Link>
        </div>

        {templates.length > 1 ? (
          <div style={{ marginTop: 20 }}>
            <span className="help">Modelo de avaliação</span>
            <div className="actions" style={{ marginTop: 8 }}>
              {templates.map((item) => (
                <Link
                  className={item.id === template?.id ? "btn" : "btn btn-secondary"}
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
        <form
          action={createPerformanceEvaluation}
          className="form"
          style={{ width: "100%", maxWidth: "none" }}
        >
          <input type="hidden" name="athleteId" value={athlete.id} />
          <input type="hidden" name="templateId" value={template.id} />

          <section className="card">
            <span className="page-eyebrow">IDENTIFICAÇÃO</span>
            <h2>{template.name}</h2>
            {template.description ? (
              <p className="muted">{template.description}</p>
            ) : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 14,
                marginTop: 18,
              }}
            >
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
              (criterion) => criterion.area === area
            );
            if (!criteria.length) return null;

            return (
              <section className="card" key={area}>
                <span className="page-eyebrow">{AREA_LABELS[area]}</span>
                <h2>{criteria.length} critérios</h2>

                <div className="stack" style={{ gap: 22, marginTop: 20 }}>
                  {criteria.map((criterion, index) => (
                    <fieldset
                      key={criterion.id}
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: 14,
                        padding: 18,
                        margin: 0,
                      }}
                    >
                      <legend style={{ padding: "0 8px", fontWeight: 800 }}>
                        {index + 1}. {criterion.label}
                      </legend>
                      {criterion.description ? (
                        <p className="muted">{criterion.description}</p>
                      ) : null}

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                          gap: 10,
                        }}
                      >
                        {criterion.levels.map((level) => (
                          <label
                            key={level.id}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 10,
                              padding: 12,
                              border: "1px solid var(--line)",
                              borderRadius: 10,
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="radio"
                              name={`score_${criterion.id}`}
                              value={level.score}
                              style={{ width: "auto", marginTop: 3 }}
                            />
                            <span>
                              <strong>
                                Nota {level.score} • {level.label}
                              </strong>
                              <small
                                className="help"
                                style={{ display: "block", marginTop: 5 }}
                              >
                                {level.description}
                              </small>
                            </span>
                          </label>
                        ))}
                      </div>

                      <label style={{ marginTop: 12 }}>
                        Observação deste critério
                        <textarea
                          name={`notes_${criterion.id}`}
                          rows={2}
                          placeholder="Opcional"
                        />
                      </label>
                    </fieldset>
                  ))}
                </div>
              </section>
            );
          })}

          <section className="card">
            <span className="page-eyebrow">PARECER DO AVALIADOR</span>
            <h2>Conclusão e próximos passos</h2>

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
              <textarea name="summary" rows={5} />
            </label>
            <label>
              Observações internas do clube
              <textarea
                name="internalNotes"
                rows={4}
                placeholder="Este conteúdo não entra no relatório compartilhável."
              />
            </label>
          </section>

          <section className="card">
            <div className="actions">
              <button
                className="btn btn-secondary"
                name="intent"
                value="DRAFT"
                type="submit"
              >
                Salvar rascunho
              </button>
              <button name="intent" value="FINALIZED" type="submit">
                Finalizar avaliação
              </button>
            </div>
            <p className="help" style={{ marginTop: 12 }}>
              O rascunho aceita notas incompletas. Para finalizar, os 25 critérios
              precisam estar preenchidos.
            </p>
          </section>
        </form>
      )}
    </>
  );
}
