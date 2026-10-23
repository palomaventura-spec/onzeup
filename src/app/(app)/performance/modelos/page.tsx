import PendingSubmitButton from "@/components/PendingSubmitButton";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClubPermission } from "@/lib/club-access";
import { hasEffectiveClubElite } from "@/lib/billing-entitlements";
import { prisma } from "@/lib/prisma";
import { format11UPName, parsePerformanceClassification } from "@/lib/performance-model-catalog";
import { prepareClubEvaluationModels } from "./actions";
import styles from "./ModelosPage.module.css";

const expectedFamilies = [
  "ONZEUP_LINHA",
  "ONZEUP_GOLEIRO",
  "PLANILHA_LINHA",
  "PLANILHA_GOLEIRO",
] as const;

const MODEL_GROUPS = [
  {
    id: "ONZEUP",
    number: "01",
    eyebrow: "MODELO 1 · 11UP",
    name: "Avaliação Profissional 11UP",
    description:
      "Modelo original do 11UP, com classificação por notas de 1 a 4.",
  },
  {
    id: "PLANILHA",
    number: "02",
    eyebrow: "MODELO 2 · PLANILHA",
    name: "Avaliação Técnico-Tática",
    description:
      "Modelo complementar com classificação por estágios e acompanhamento percentual.",
  },
] as const;

function formatClassification(raw: string | null) {
  const stages = parsePerformanceClassification(raw);
  if (!stages) return "Notas de 1 a 4";

  return `Até ${stages.urgencyMax}% · Acima de ${stages.urgencyMax}% até ${stages.attentionMax}% · Acima de ${stages.attentionMax}%`;
}

export default async function PerformanceModelosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireClubPermission("PERFORMANCE_MANAGE");
  if (user.role === "SUPER_ADMIN") redirect("/performance?erro=permissao");

  const [subscription, organization, models, query] = await Promise.all([
    prisma.subscription.findUnique({
      where: { organizationId: user.organizationId },
    }),
    prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { accessStatus: true, complimentaryUntil: true },
    }),
    prisma.performanceTemplate.findMany({
      where: {
        organizationId: user.organizationId,
        modelFamilyKey: { in: [...expectedFamilies] },
      },
      orderBy: [{ name: "asc" }, { version: "desc" }],
      include: { criteria: { where: { active: true }, select: { id: true } } },
    }),
    searchParams,
  ]);

  if (
    !hasEffectiveClubElite({
      plan: subscription?.plan,
      status: subscription?.status,
      trialEnds: subscription?.trialEnds,
      currentPeriodEnd: subscription?.currentPeriodEnd,
      accessStatus: organization?.accessStatus,
      complimentaryUntil: organization?.complimentaryUntil,
    })
  ) {
    redirect("/performance?erro=elite");
  }

  const missing = expectedFamilies.some(
    (family) => !models.some((model) => model.modelFamilyKey === family),
  );
  const activeModels = models.filter((model) => model.active);
  const archivedModels = models.filter((model) => !model.active);

  const notice =
    query.status === "preparado"
      ? "Modelos disponibilizados para este clube."
      : query.status === "restaurado"
        ? "Padrão restaurado em uma nova versão. Histórico preservado."
        : query.status
          ? "Nova versão salva. Histórico preservado."
          : null;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <span className={styles.kicker}>11UP PERFORMANCE · CLUB ELITE</span>
          <h1>Modelos de avaliação</h1>
          <p>
            Escolha um modelo para personalizar os critérios, as notas e as
            classificações do seu clube.
          </p>
        </div>
        <Link className={styles.backLink} href="/performance">
          <span aria-hidden="true">←</span> Voltar ao Performance
        </Link>
      </header>

      {notice ? (
        <div className={styles.notice} role="status">
          <span className={styles.noticeCheck} aria-hidden="true">✓</span>
          {notice}
        </div>
      ) : null}

      {missing ? (
        <section className={styles.setupCard}>
          <div>
            <h2>Preparar os modelos do clube</h2>
            <p>
              Disponibilize os dois métodos nas versões de linha e goleiro, sem
              alterar os modelos globais ou avaliações anteriores.
            </p>
          </div>
          <form action={prepareClubEvaluationModels}>
            <PendingSubmitButton pendingText="Gerando…" className={styles.setupButton} type="submit">
              Preparar modelos
            </PendingSubmitButton>
          </form>
        </section>
      ) : null}

      {!activeModels.length ? (
        <section className={styles.emptyState}>
          Nenhum modelo específico do clube foi preparado ainda.
        </section>
      ) : null}

      <div className={styles.groups}>
        {MODEL_GROUPS.map((group) => {
          const groupModels = activeModels
            .filter((model) => model.modelFamilyKey?.startsWith(group.id))
            .sort((first, second) =>
              first.athleteRole === second.athleteRole
                ? 0
                : first.athleteRole === "LINE_PLAYER"
                  ? -1
                  : 1,
            );
          if (!groupModels.length) return null;

          return (
            <section className={styles.group} key={group.id}>
              <div className={styles.groupHeader}>
                <div className={styles.groupTitle}>
                  <span className={styles.sectionNumber} aria-hidden="true">
                    {group.number}
                  </span>
                  <div>
                    <span className={styles.kicker}>{group.eyebrow}</span>
                    <h2>{group.name}</h2>
                    <p>{group.description}</p>
                  </div>
                </div>
                <span className={styles.groupCount}>
                  {groupModels.length} {groupModels.length === 1 ? "versão ativa" : "versões ativas"}
                </span>
              </div>

              <div className={styles.cards}>
                {groupModels.map((model) => {
                  const goalkeeper = model.athleteRole === "GOALKEEPER";
                  const roleName = goalkeeper ? "Goleiro" : "Jogador de linha";
                  return (
                    <article className={styles.card} key={model.id}>
                      <div className={styles.cardTop}>
                        <span className={styles.roleSymbol} aria-hidden="true">
                          {goalkeeper ? "G" : "L"}
                        </span>
                        <span className={styles.cardModel}>
                          {group.id === "ONZEUP" ? "MODELO 11UP" : "MODELO TÉCNICO-TÁTICO"}
                        </span>
                      </div>

                      <h3>{roleName}</h3>
                      <p className={styles.cardDescription}>
                        {goalkeeper
                          ? "Critérios específicos para observar o desenvolvimento dos goleiros."
                          : "Critérios específicos para observar o desenvolvimento dos jogadores de linha."}
                      </p>

                      <div className={styles.metaRow}>
                        <span>{model.criteria.length} critérios ativos</span>
                        <span>Versão {model.version}</span>
                      </div>

                      <div className={styles.classification}>
                        <span>CLASSIFICAÇÃO</span>
                        <p>{formatClassification(model.classificationJson)}</p>
                      </div>

                      <Link
                        className={styles.editButton}
                        href={`/performance/modelos/${model.id}`}
                        aria-label={`Personalizar ${group.name} — ${roleName}`}
                      >
                        <span>Personalizar modelo</span>
                        <span aria-hidden="true">→</span>
                      </Link>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {archivedModels.length ? (
        <section className={styles.history}>
          <div className={styles.historyHeader}>
            <h2>Histórico de versões</h2>
            <p>Versões anteriores continuam disponíveis para referência e relatórios.</p>
          </div>
          <div className={styles.historyRows}>
            {archivedModels.map((model) => (
              <div className={styles.historyRow} key={model.id}>
                <span>{format11UPName(model.name)} · Versão {model.version}</span>
                <span>Arquivada para novas avaliações</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
