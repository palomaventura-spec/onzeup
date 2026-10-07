import Link from "next/link";
import { notFound } from "next/navigation";

import AthleteSaveButton from "@/components/AthleteSaveButton";
import ImageUpload from "@/components/ImageUpload";
import SafeAvatar from "@/components/SafeAvatar";

import { requireClubPermission } from "@/lib/club-access";
import { hasClubPermission } from "@/lib/club-permissions";
import { prisma } from "@/lib/prisma";

import {
  allowAthleteEligibilityOverride,
  approveEvaluationAthlete,
  registerRetroactiveEvaluation,
  rejectEvaluationAthlete,
  releaseAthlete,
  releaseEvaluationAthlete,
  revokeAthleteEligibilityOverride,
  updateAthlete,
  withdrawEvaluationAthlete,
} from "../actions";

type EligibilityAuditMetadata = {
  event?: string;
  type?: string;
  source?: string;
  key?: string | null;
  issueReason?: string | null;
  reason?: string | null;
  notes?: string | null;
  changedAt?: string;
  blocking?: {
    from?: boolean;
    to?: boolean;
  };
  authorizedBy?: {
    userId?: string;
    name?: string;
  };
  revokedBy?: {
    userId?: string;
    name?: string;
  };
};

type CategoryAuditMetadata = {
  event?: string;
  reason?: string;
  fromCategory?: {
    id?: string;
    name?: string;
    type?: string;
  } | null;
  toCategory?: {
    id?: string;
    name?: string;
    type?: string;
  } | null;
};

function parseEligibilityAuditMetadata(
  value: string | null,
) {
  if (!value) return null;

  try {
    return JSON.parse(value) as EligibilityAuditMetadata;
  } catch {
    return null;
  }
}

function currentStatusLabel(value: string) {
  switch (value) {
    case "ACTIVE":
      return "Ativo";
    case "EVALUATION":
      return "Em avaliação";
    case "REJECTED":
      return "Reprovado";
    case "RELEASED":
      return "Dispensado";
    default:
      return value;
  }
}

function currentStatusClass(value: string) {
  switch (value) {
    case "ACTIVE":
      return "active";
    case "EVALUATION":
      return "evaluation";
    case "REJECTED":
      return "rejected";
    case "RELEASED":
      return "released";
    default:
      return "";
  }
}

function parseCategoryAuditMetadata(
  value: string | null,
) {
  if (!value) return null;

  try {
    return JSON.parse(value) as CategoryAuditMetadata;
  } catch {
    return null;
  }
}

function categoryAuditLabel(event?: string) {
  switch (event) {
    case "EVALUATION_ENTRY":
      return "Entrada em avaliação";
    case "EVALUATION_APPROVED":
      return "Aprovado para o elenco";
    case "EVALUATION_REJECTED":
      return "Não aprovado na avaliação";
    case "EVALUATION_TRANSFER":
      return "Transferência entre avaliações";
    case "CATEGORY_TRANSFER":
      return "Transferência de categoria";
    case "CATEGORY_REMOVAL":
      return "Retirado da categoria";
    case "CATEGORY_ASSIGNMENT":
      return "Vinculado à categoria";
    default:
      return "Alteração de categoria";
  }
}

function evaluationProcessLabel(value: string) {
  switch (value) {
    case "IN_EVALUATION":
      return "Em avaliação";
    case "APPROVED":
      return "Aprovado";
    case "REJECTED":
      return "Reprovado";
    case "RELEASED":
      return "Dispensado";
    case "WITHDRAWN":
      return "Desistiu";
    default:
      return value;
  }
}

function evaluationOutcomeStyle(value: string | null) {
  switch (value) {
    case "REJECTED":
      return {
        background: "#fee2e2",
        color: "#b91c1c",
      };
    case "RELEASED":
      return {
        background: "#ffedd5",
        color: "#c2410c",
      };
    case "WITHDRAWN":
      return {
        background: "#e2e8f0",
        color: "#475569",
      };
    default:
      return undefined;
  }
}

function formatEvaluationDate(value: Date | null) {
  if (!value) return "Em aberto";

  return value.toLocaleDateString("pt-BR");
}

function sportLabel(value: string) {
  switch (value) {
    case "FOOTBALL":
      return "Futebol de Campo";
    case "FUTSAL":
      return "Futsal";
    case "BOTH":
      return "Campo + Futsal";
    default:
      return value;
  }
}

function exitOriginLabel(value: string) {
  switch (value) {
    case "CLUB":
      return "Dispensa pelo clube";
    case "FAMILY":
      return "Saída solicitada pela família/atleta";
    default:
      return "Saída registrada";
  }
}

function eligibilityIssueLabel(value: string) {
  switch (value) {
    case "DOCUMENTATION":
      return "Documentação";
    case "MEDICAL_EXAM":
      return "Exame médico";
    case "FEDERATION_REGISTRATION":
      return "Inscrição na federação";
    case "COMPETITION_REGISTRATION":
      return "Inscrição em competição";
    case "OTHER":
      return "Outra pendência";
    default:
      return value;
  }
}

function eligibilitySourceLabel(value: string) {
  return value === "AUTOMATIC" ? "Automática" : "Manual";
}

function eligibilityScopeLabel(value: string) {
  switch (value) {
    case "FOOTBALL":
      return "Futebol de Campo";
    case "FUTSAL":
      return "Futsal";
    case "GLOBAL":
    default:
      return "Todas as modalidades";
  }
}

function dominantFootLabel(value: string | null) {
  switch (value) {
    case "RIGHT":
      return "Direito";

    case "LEFT":
      return "Esquerdo";

    case "BOTH":
      return "Ambidestro";

    default:
      return "Não informado";
  }
}

export default async function EditAthletePage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const user =
    await requireClubPermission("ATHLETES_VIEW");

  const canEdit = hasClubPermission(
    user,
    "ATHLETES_EDIT",
  );

  const canManageEligibility = hasClubPermission(
    user,
    "ORGANIZATION_MANAGE",
  );

  const { id } = await params;

  const [athlete, categories] = await Promise.all([
    prisma.athlete.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      include: {
        category: {
          include: {
            evaluationTargets: {
              where: {
                targetCategory: {
                  organizationId: user.organizationId,
                  type: "STANDARD",
                  active: true,
                },
              },
              include: {
                targetCategory: true,
              },
            },
          },
        },
        sportRegistrations: true,
        memberships: {
          orderBy: [
            { status: "asc" },
            { startedAt: "asc" },
          ],
          include: {
            category: true,
          },
        },
        exitRecords: {
          orderBy: [
            {
              occurredAt: "desc",
            },
            {
              createdAt: "desc",
            },
          ],
          take: 20,
          select: {
            id: true,
            createdAt: true,
            sport: true,
            origin: true,
            occurredAt: true,
            reason: true,
            notes: true,
            previousCategoryNameSnapshot: true,
            seasonSnapshot: true,
            recordedByNameSnapshot: true,
          },
        },
        eligibilityIssues: {
          where: {
            resolvedAt: null,
          },
          orderBy: [
            {
              blocking: "desc",
            },
            {
              startedAt: "asc",
            },
          ],
          select: {
            id: true,
            type: true,
            source: true,
            scope: true,
            blocking: true,
            key: true,
            reason: true,
            notes: true,
            startedAt: true,
            createdByNameSnapshot: true,
          },
        },
        evaluationProcesses: {
          orderBy: {
            startedAt: "desc",
          },
          take: 50,
          include: {
            evaluationCategory: true,
            targetCategory: true,
            createdBy: {
              select: {
                name: true,
              },
            },
            decidedBy: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),

    canEdit
      ? prisma.category.findMany({
          where: {
            organizationId:
              user.organizationId,
            active: true,
          },
          orderBy: [
            {
              type: "asc",
            },
            {
              name: "asc",
            },
          ],
          include: {
            evaluationTargets: {
              include: {
                targetCategory: true,
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  if (!athlete) {
    notFound();
  }

  const [categoryHistory, eligibilityAuditHistory] =
    await Promise.all([
      prisma.athleteDataAuditLog.findMany({
        where: {
          organizationId: user.organizationId,
          athleteId: athlete.id,
          entityType: "ATHLETE_CATEGORY",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
        select: {
          id: true,
          metadataJson: true,
          createdAt: true,
          actor: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.athleteDataAuditLog.findMany({
        where: {
          organizationId: user.organizationId,
          athleteId: athlete.id,
          entityType: "ATHLETE_ELIGIBILITY",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 50,
        select: {
          id: true,
          metadataJson: true,
          createdAt: true,
          actor: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

  const eligibilityOverrideHistory =
    eligibilityAuditHistory
      .map((item) => ({
        ...item,
        metadata: parseEligibilityAuditMetadata(
          item.metadataJson,
        ),
      }))
      .filter(
        (item) =>
          item.metadata?.event ===
            "ATHLETE_ELIGIBILITY_OVERRIDE_ALLOWED" ||
          item.metadata?.event ===
            "ATHLETE_ELIGIBILITY_OVERRIDE_REVOKED",
      );

  const standardCategories = categories.filter(
    (category) => category.type === "STANDARD",
  );

  const footballCategories = standardCategories.filter(
    (category) =>
      category.sport === "FOOTBALL" ||
      category.sport === "BOTH",
  );

  const futsalCategories = standardCategories.filter(
    (category) =>
      category.sport === "FUTSAL" ||
      category.sport === "BOTH",
  );

  const evaluationCategories = categories.filter(
    (category) =>
      category.type === "EVALUATION",
  );

  const isEvaluation =
    athlete.currentStatus === "EVALUATION" &&
    athlete.category?.type === "EVALUATION";

  const isRejected =
    athlete.currentStatus === "REJECTED";

  const isReleased =
    athlete.currentStatus === "RELEASED";

  const currentEvaluationProcess =
    athlete.evaluationProcesses.find(
      (process) =>
        process.entryMode === "CURRENT" &&
        process.status === "IN_EVALUATION",
    ) ?? null;

  const latestClosedEvaluationProcess =
    athlete.evaluationProcesses.find(
      (process) => process.status !== "IN_EVALUATION",
    ) ?? null;

  const latestExitRecord =
    athlete.exitRecords[0] ?? null;

  const activeSportMemberships =
    athlete.memberships.filter(
      (membership) => membership.status === "ACTIVE",
    );

  const activeFootballMembership =
    activeSportMemberships.find(
      (membership) => membership.sport === "FOOTBALL",
    ) ?? null;

  const activeFutsalMembership =
    activeSportMemberships.find(
      (membership) => membership.sport === "FUTSAL",
    ) ?? null;

  const releasedSportMemberships =
    athlete.memberships.filter(
      (membership) => membership.status !== "ACTIVE",
    );


  const approvalTargets =
    isEvaluation
      ? (athlete.category?.evaluationTargets ?? [])
          .map((item) => item.targetCategory)
          .filter((category) => category.active)
      : [];

  const evaluationTargetPairs =
    evaluationCategories.flatMap((evaluationCategory) =>
      evaluationCategory.evaluationTargets
        .filter(
          (item) =>
            item.targetCategory.type === "STANDARD",
        )
        .map((item) => ({
          value: `${evaluationCategory.id}::${item.targetCategory.id}`,
          label: `${evaluationCategory.name} → ${item.targetCategory.name}`,
        })),
    );

  const todayInput = new Date()
    .toISOString()
    .slice(0, 10);

  const accentColor =
    athlete.category?.accentColor || "#9DDB16";

  const futsalFederation =
    athlete.sportRegistrations.find(
      (registration) =>
        registration.sport === "FUTSAL" &&
        registration.authorityType === "FEDERATION",
    );

  const footballFederation =
    athlete.sportRegistrations.find(
      (registration) =>
        registration.sport === "FOOTBALL" &&
        registration.authorityType === "FEDERATION",
    );

  const cbfRegistration =
    athlete.sportRegistrations.find(
      (registration) =>
        registration.sport === "FOOTBALL" &&
        registration.authorityType === "CBF",
    );

  const isActiveRosterAthlete =
    athlete.currentStatus === "ACTIVE" &&
    athlete.category?.type === "STANDARD";

  const blockingEligibilityIssues =
    athlete.eligibilityIssues.filter((issue) => issue.blocking);

  const footballBlockingEligibilityIssues =
    blockingEligibilityIssues.filter(
      (issue) =>
        issue.scope === "GLOBAL" ||
        issue.scope === "FOOTBALL",
    );

  const futsalBlockingEligibilityIssues =
    blockingEligibilityIssues.filter(
      (issue) =>
        issue.scope === "GLOBAL" ||
        issue.scope === "FUTSAL",
    );

  const eligibilityStatus =
    isActiveRosterAthlete
      ? blockingEligibilityIssues.length > 0
        ? "INAPTO"
        : "APTO"
      : null;

  return (
    <main className="athlete-profile-page athlete-edit-page-v3">
      <section
        className="athlete-profile-hero"
        style={{
          borderTop: `5px solid ${accentColor}`,
        }}
      >
        <div className="athlete-profile-avatar">
          <SafeAvatar
            src={athlete.photoUrl}
            name={
              athlete.nickname || athlete.name
            }
          />
        </div>

        <div>
          <span
            className="page-eyebrow"
            style={{
              color: accentColor,
            }}
          >
            {isEvaluation
              ? "ATLETA EM AVALIAÇÃO"
              : isRejected
                ? "ATLETA REPROVADO"
                : isReleased
                  ? "ATLETA DISPENSADO"
                  : "PERFIL DO ATLETA"}
          </span>

          <h1>
            {athlete.nickname || athlete.name}
          </h1>

          <p>
            {athlete.name} •{" "}
            {athlete.category?.name ||
              latestExitRecord?.previousCategoryNameSnapshot ||
              latestClosedEvaluationProcess?.evaluationCategoryNameSnapshot ||
              "Sem categoria"}{" "}
            •{" "}
            {athlete.position ||
              "Posição não informada"}
          </p>
        </div>

        <span
          className={`athlete-status ${currentStatusClass(
            athlete.currentStatus,
          )}`}
          style={
            athlete.currentStatus === "EVALUATION"
              ? {
                  background: accentColor,
                  color: "#10200a",
                }
              : undefined
          }
        >
          {currentStatusLabel(athlete.currentStatus)}
        </span>
      </section>

      <nav className="athlete-v3-tabs" aria-label="Navegação do atleta">
        <Link
          className="active"
          href={`/atletas/${athlete.id}`}
        >
          Ficha
        </Link>

        <Link
          href={`/atletas/${athlete.id}/dados#documentos`}
        >
          Documentos
        </Link>

        <Link
          href={`/atletas/${athlete.id}/performance`}
        >
          Performance
        </Link>

        <Link
          className="athlete-v3-back"
          href="/atletas"
        >
          ← Voltar aos atletas
        </Link>
      </nav>

      <div className="page-head athlete-v3-page-head">
        <div>
          <h1>
            {canEdit
              ? isEvaluation
                ? "Avaliação e transferência"
                : isRejected
                  ? "Atleta reprovado"
                  : isReleased
                    ? "Atleta dispensado"
                    : "Editar atleta"
              : athlete.nickname ||
                athlete.name}
          </h1>

          <p className="muted">
            {canEdit
              ? isEvaluation
                ? "Registre a decisão do processo abaixo. Aprovação, reprovação, dispensa e desistência preservam todo o histórico do atleta."
                : isRejected
                  ? "O atleta permanece com todo o histórico preservado. Uma nova passagem deve começar por uma categoria de avaliação."
                  : isReleased
                    ? "A saída permanece registrada com origem, data, motivo e responsável. O histórico do atleta continua preservado."
                    : "Dados esportivos públicos e dados privados do responsável ficam separados."
              : "Visualização dos dados esportivos do atleta."}
          </p>
        </div>


      </div>

      {athlete.memberships.length ? (
        <section
          className="card athlete-sport-memberships"
          style={{ marginBottom: 18 }}
        >
          <span className="page-eyebrow">MODALIDADES</span>
          <h2>Vínculos esportivos</h2>
          <p className="muted">
            Cada modalidade possui categoria e situação próprias.
          </p>

          <div className="athlete-sport-membership-grid">
            {athlete.memberships.map((membership) => {
              const active = membership.status === "ACTIVE";

              const relevantBlockingIssues =
                athlete.eligibilityIssues.filter(
                  (issue) =>
                    issue.blocking &&
                    (issue.scope === "GLOBAL" ||
                      issue.scope === membership.sport),
                );

              const eligibility =
                active
                  ? relevantBlockingIssues.length
                    ? "INAPTO"
                    : "APTO"
                  : null;

              return (
                <article
                  key={membership.id}
                  className={`athlete-sport-membership ${
                    active ? "active" : "released"
                  }`}
                >
                  <div>
                    <strong>{sportLabel(membership.sport)}</strong>
                    <span>
                      {membership.category?.name ||
                        "Categoria não informada"}
                    </span>
                  </div>

                  <div className="athlete-sport-membership-badges">
                    <span>
                      {active ? "Ativo" : "Dispensado"}
                    </span>

                    {eligibility ? (
                      <span
                        className={
                          eligibility === "APTO"
                            ? "eligible"
                            : "ineligible"
                        }
                      >
                        {eligibility === "APTO"
                          ? "Apto"
                          : "Inapto"}
                      </span>
                    ) : null}
                  </div>

                  {active &&
                  relevantBlockingIssues.length ? (
                    <small>
                      {relevantBlockingIssues.length} pendência
                      {relevantBlockingIssues.length > 1
                        ? "s"
                        : ""}{" "}
                      impeditiva
                      {relevantBlockingIssues.length > 1
                        ? "s"
                        : ""}
                    </small>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {isRejected ? (
        <section
          className="card athlete-current-state-card rejected"
          style={{ marginBottom: 18 }}
        >
          <span className="page-eyebrow">
            SITUAÇÃO ATUAL
          </span>
          <h2>Atleta reprovado</h2>
          <p className="muted">
            A reprovação encerrou a passagem atual pela avaliação, mas não
            apaga a ficha nem o histórico do atleta.
          </p>

          {latestClosedEvaluationProcess?.status === "REJECTED" ? (
            <div className="athlete-current-state-grid">
              <div>
                <span>Data da decisão</span>
                <strong>
                  {formatEvaluationDate(
                    latestClosedEvaluationProcess.decidedAt,
                  )}
                </strong>
              </div>

              <div>
                <span>Categoria de avaliação</span>
                <strong>
                  {latestClosedEvaluationProcess
                    .evaluationCategoryNameSnapshot ||
                    latestClosedEvaluationProcess
                      .evaluationCategory?.name ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>Responsável</span>
                <strong>
                  {latestClosedEvaluationProcess
                    .decidedByNameSnapshot ||
                    latestClosedEvaluationProcess
                      .decidedBy?.name ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>Motivo</span>
                <strong>
                  {latestClosedEvaluationProcess
                    .decisionReason || "—"}
                </strong>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {isReleased ? (
        <section
          className="card athlete-current-state-card released"
          style={{ marginBottom: 18 }}
        >
          <span className="page-eyebrow">
            SITUAÇÃO ATUAL
          </span>
          <h2>Atleta dispensado</h2>
          <p className="muted">
            O atleta não integra mais o elenco atual. O registro de saída e
            todo o histórico anterior permanecem preservados.
          </p>

          {latestExitRecord ? (
            <div className="athlete-current-state-grid">
              <div>
                <span>Modalidade</span>
                <strong>
                  {latestExitRecord.sport
                    ? sportLabel(latestExitRecord.sport)
                    : "Saída geral"}
                </strong>
              </div>

              <div>
                <span>Origem da saída</span>
                <strong>
                  {exitOriginLabel(latestExitRecord.origin)}
                </strong>
              </div>

              <div>
                <span>Data</span>
                <strong>
                  {latestExitRecord.occurredAt.toLocaleDateString(
                    "pt-BR",
                  )}
                </strong>
              </div>

              <div>
                <span>Categoria anterior</span>
                <strong>
                  {latestExitRecord
                    .previousCategoryNameSnapshot || "—"}
                </strong>
              </div>

              <div>
                <span>Temporada</span>
                <strong>
                  {latestExitRecord.seasonSnapshot || "—"}
                </strong>
              </div>

              <div>
                <span>Motivo</span>
                <strong>
                  {latestExitRecord.reason || "—"}
                </strong>
              </div>

              <div>
                <span>Registrado por</span>
                <strong>
                  {latestExitRecord
                    .recordedByNameSnapshot || "—"}
                </strong>
              </div>

              {latestExitRecord.notes ? (
                <div className="wide">
                  <span>Observações</span>
                  <strong>{latestExitRecord.notes}</strong>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="muted">
              Não há registro estruturado de saída para este atleta legado.
            </p>
          )}
        </section>
      ) : null}

      {isActiveRosterAthlete && canEdit ? (
        <details
          className="card athlete-release-card"
          style={{ marginBottom: 18 }}
        >
          <summary>Registrar saída de uma modalidade</summary>

          <p className="muted" style={{ marginTop: 12 }}>
            Encerre somente o vínculo escolhido. Se o atleta continuar ativo
            em outra modalidade, ele permanecerá no elenco.
          </p>

          <form
            action={releaseAthlete}
            className="form"
            style={{ marginTop: 16 }}
          >
            <input
              type="hidden"
              name="athleteId"
              value={athlete.id}
            />

            <label>
              Modalidade
              <select
                name="membershipId"
                defaultValue=""
                required
              >
                <option value="" disabled>
                  Selecione
                </option>
                {activeSportMemberships.map((membership) => (
                  <option
                    key={membership.id}
                    value={membership.id}
                  >
                    {sportLabel(membership.sport)}
                    {" · "}
                    {membership.category?.name ||
                      "Sem categoria"}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Origem da saída
              <select
                name="origin"
                defaultValue=""
                required
              >
                <option value="" disabled>
                  Selecione
                </option>
                <option value="CLUB">
                  Dispensa pelo clube
                </option>
                <option value="FAMILY">
                  Saída solicitada pela família/atleta
                </option>
              </select>
            </label>

            <label>
              Data da saída
              <input
                type="date"
                name="occurredAt"
                defaultValue={todayInput}
                required
              />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              Motivo
              <textarea
                name="reason"
                rows={3}
                required
                placeholder="Informe de forma objetiva o motivo da saída."
              />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              Observações
              <textarea
                name="notes"
                rows={2}
                placeholder="Opcional."
              />
            </label>

            <button
              type="submit"
              className="btn-secondary"
            >
              Confirmar saída do elenco
            </button>
          </form>
        </details>
      ) : null}

      {isActiveRosterAthlete ? (
        <section
          className="card athlete-eligibility-card"
          style={{ marginBottom: 18 }}
        >
          <div className="athlete-eligibility-head">
            <div>
              <span className="page-eyebrow">
                ELEGIBILIDADE
              </span>
              <h2>Situação para participação</h2>
              <p className="muted">
                A situação é calculada separadamente por modalidade. Pendências
                globais afetam Campo e Futsal; pendências específicas afetam
                apenas a modalidade correspondente.
              </p>
            </div>
          </div>

          <div className="athlete-eligibility-sport-grid">
            {activeFootballMembership ? (
              <article className="athlete-eligibility-sport-card">
                <div>
                  <strong>Futebol de Campo</strong>
                  <span>
                    {activeFootballMembership.category?.name ||
                      "Sem categoria"}
                  </span>
                </div>

                <span
                  className={`athlete-eligibility-badge ${
                    footballBlockingEligibilityIssues.length
                      ? "unfit"
                      : "apt"
                  }`}
                >
                  {footballBlockingEligibilityIssues.length
                    ? `Inapto · ${footballBlockingEligibilityIssues.length} ${
                        footballBlockingEligibilityIssues.length === 1
                          ? "pendência"
                          : "pendências"
                      }`
                    : "Apto"}
                </span>
              </article>
            ) : null}

            {activeFutsalMembership ? (
              <article className="athlete-eligibility-sport-card">
                <div>
                  <strong>Futsal</strong>
                  <span>
                    {activeFutsalMembership.category?.name ||
                      "Sem categoria"}
                  </span>
                </div>

                <span
                  className={`athlete-eligibility-badge ${
                    futsalBlockingEligibilityIssues.length
                      ? "unfit"
                      : "apt"
                  }`}
                >
                  {futsalBlockingEligibilityIssues.length
                    ? `Inapto · ${futsalBlockingEligibilityIssues.length} ${
                        futsalBlockingEligibilityIssues.length === 1
                          ? "pendência"
                          : "pendências"
                      }`
                    : "Apto"}
                </span>
              </article>
            ) : null}
          </div>

          {athlete.eligibilityIssues.length ? (
            <div className="athlete-eligibility-list">
              {athlete.eligibilityIssues.map((issue) => (
                <article
                  key={issue.id}
                  className={`athlete-eligibility-issue ${
                    issue.blocking ? "blocking" : "nonblocking"
                  }`}
                >
                  <div className="athlete-eligibility-issue-main">
                    <div>
                      <strong>
                        {eligibilityIssueLabel(issue.type)}
                      </strong>
                      <span className="athlete-eligibility-meta">
                        {eligibilitySourceLabel(issue.source)}
                        {" · "}
                        {eligibilityScopeLabel(issue.scope)}
                        {" · "}
                        desde {issue.startedAt.toLocaleDateString("pt-BR")}
                      </span>
                    </div>

                    <span
                      className={`athlete-eligibility-state ${
                        issue.blocking ? "blocking" : "nonblocking"
                      }`}
                    >
                      {issue.blocking
                        ? "Impeditiva"
                        : "Não impeditiva"}
                    </span>
                  </div>

                  <p>{issue.reason}</p>

                  {issue.notes ? (
                    <p className="muted">
                      Observação: {issue.notes}
                    </p>
                  ) : null}

                  {issue.createdByNameSnapshot ? (
                    <small className="muted">
                      Registrada por {issue.createdByNameSnapshot}
                    </small>
                  ) : null}

                  {canManageEligibility && issue.blocking ? (
                    <details className="athlete-eligibility-management">
                      <summary>
                        {issue.scope === "GLOBAL"
                          ? "Liberar esta pendência para Campo e Futsal"
                          : `Liberar esta pendência apenas para ${eligibilityScopeLabel(
                              issue.scope,
                            )}`}
                      </summary>

                      <form
                        action={allowAthleteEligibilityOverride}
                        className="form"
                      >
                        <input
                          type="hidden"
                          name="issueId"
                          value={issue.id}
                        />
                        <input
                          type="hidden"
                          name="athleteId"
                          value={athlete.id}
                        />

                        <label style={{ gridColumn: "1 / -1" }}>
                          Motivo da liberação
                          <textarea
                            name="reason"
                            rows={3}
                            required
                            placeholder="Obrigatório. Informe por que esta pendência pode deixar de impedir a participação."
                          />
                        </label>

                        <label style={{ gridColumn: "1 / -1" }}>
                          Observação
                          <textarea
                            name="notes"
                            rows={2}
                            placeholder="Opcional."
                          />
                        </label>

                        <button type="submit" className="btn">
                          Confirmar liberação pelo gestor
                        </button>
                      </form>
                    </details>
                  ) : null}

                  {canManageEligibility && !issue.blocking ? (
                    <details className="athlete-eligibility-management">
                      <summary>
                        Tornar impeditiva novamente
                      </summary>

                      <form
                        action={revokeAthleteEligibilityOverride}
                        className="form"
                      >
                        <input
                          type="hidden"
                          name="issueId"
                          value={issue.id}
                        />
                        <input
                          type="hidden"
                          name="athleteId"
                          value={athlete.id}
                        />

                        <label style={{ gridColumn: "1 / -1" }}>
                          Motivo
                          <textarea
                            name="reason"
                            rows={2}
                            placeholder="Opcional. Informe o motivo da revogação da liberação."
                          />
                        </label>

                        <button
                          type="submit"
                          className="btn-secondary"
                        >
                          Tornar pendência impeditiva
                        </button>
                      </form>
                    </details>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="athlete-eligibility-empty">
              Nenhuma pendência de elegibilidade aberta.
            </div>
          )}

          {!canManageEligibility &&
          athlete.eligibilityIssues.some((issue) => issue.blocking) ? (
            <p className="muted athlete-eligibility-restricted">
              A liberação excepcional de uma pendência impeditiva é exclusiva
              do Gestor do clube.
            </p>
          ) : null}
        </section>
      ) : null}

      {eligibilityOverrideHistory.length ? (
        <section
          className="card athlete-eligibility-history"
          style={{ marginBottom: 18 }}
        >
          <span className="page-eyebrow">
            HISTÓRICO DE ELEGIBILIDADE
          </span>
          <h2>Liberações excepcionais</h2>
          <p className="muted">
            Registro das decisões do Gestor que alteraram uma pendência
            entre impeditiva e não impeditiva.
          </p>

          <div className="stack">
            {eligibilityOverrideHistory.map((item) => {
              const metadata = item.metadata;
              const wasAllowed =
                metadata?.event ===
                "ATHLETE_ELIGIBILITY_OVERRIDE_ALLOWED";

              const responsibleName =
                (wasAllowed
                  ? metadata?.authorizedBy?.name
                  : metadata?.revokedBy?.name) ||
                item.actor?.name ||
                "Gestor";

              return (
                <div key={item.id}>
                  <strong>
                    {wasAllowed
                      ? "Liberação excepcional concedida"
                      : "Liberação excepcional revogada"}
                    {metadata?.type
                      ? ` · ${eligibilityIssueLabel(metadata.type)}`
                      : ""}
                  </strong>

                  <p className="muted">
                    {item.createdAt.toLocaleString("pt-BR")}
                    {" · "}
                    {responsibleName}
                  </p>

                  {metadata?.issueReason ? (
                    <p className="muted" style={{ marginTop: 4 }}>
                      Pendência: {metadata.issueReason}
                    </p>
                  ) : null}

                  {metadata?.reason ? (
                    <p style={{ marginTop: 4 }}>
                      <strong>Motivo:</strong> {metadata.reason}
                    </p>
                  ) : null}

                  {metadata?.notes ? (
                    <p className="muted" style={{ marginTop: 4 }}>
                      Observação: {metadata.notes}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {isEvaluation && canEdit ? (
        <section
          className="card"
          style={{
            borderLeft: `5px solid ${accentColor}`,
            marginBottom: 18,
          }}
        >
          <span
            className="page-eyebrow"
            style={{
              color: accentColor,
            }}
          >
            PROCESSO DE AVALIAÇÃO
          </span>

          <h2>Decisão da avaliação</h2>

          <p className="muted">
            {currentEvaluationProcess
              ? `Processo iniciado em ${formatEvaluationDate(
                  currentEvaluationProcess.startedAt,
                )}.`
              : "Este atleta veio do fluxo anterior. Ao registrar a decisão, o 11UP formalizará o processo atual preservando o histórico já existente."}
          </p>

          {approvalTargets.length ? (
            <form
              action={approveEvaluationAthlete}
              className="form"
              style={{ marginTop: 16 }}
            >
              <input
                type="hidden"
                name="athleteId"
                value={athlete.id}
              />

              {approvalTargets.length === 1 ? (
                <input
                  type="hidden"
                  name="targetCategoryId"
                  value={approvalTargets[0].id}
                />
              ) : (
                <label>
                  Categoria de destino
                  <select
                    name="targetCategoryId"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Selecione
                    </option>
                    {approvalTargets.map((target) => (
                      <option
                        key={target.id}
                        value={target.id}
                      >
                        {target.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label>
                Data da aprovação
                <input
                  type="date"
                  name="decisionDate"
                  defaultValue={todayInput}
                  required
                />
              </label>

              <label style={{ gridColumn: "1 / -1" }}>
                Parecer / observação
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Opcional."
                />
              </label>

              <button
                type="submit"
                className="btn"
              >
                Aprovar atleta
              </button>
            </form>
          ) : (
            <div
              className="muted"
              style={{
                marginTop: 16,
                padding: 14,
                border: "1px solid #f59e0b",
                borderRadius: 12,
                background: "#fff7ed",
                color: "#9a3412",
              }}
            >
              Esta categoria de avaliação ainda não possui
              categoria-alvo ativa. Vincule uma categoria oficial
              em Categorias antes de aprovar o atleta.
            </div>
          )}

          <details style={{ marginTop: 18 }}>
            <summary
              style={{
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              Reprovar atleta
            </summary>

            <form
              action={rejectEvaluationAthlete}
              className="form"
              style={{ marginTop: 14 }}
            >
              <input
                type="hidden"
                name="athleteId"
                value={athlete.id}
              />

              <label>
                Data da decisão
                <input
                  type="date"
                  name="decisionDate"
                  defaultValue={todayInput}
                  required
                />
              </label>

              <label style={{ gridColumn: "1 / -1" }}>
                Motivo da reprovação
                <textarea
                  name="reason"
                  rows={4}
                  required
                  placeholder="Registre de forma objetiva o motivo da reprovação."
                />
              </label>

              <button
                type="submit"
                className="btn-secondary"
                style={{
                  borderColor: "#dc2626",
                  color: "#b91c1c",
                  background: "#fff",
                }}
              >
                Confirmar reprovação
              </button>
            </form>
          </details>

          <details style={{ marginTop: 14 }}>
            <summary
              style={{
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              Dispensar atleta
            </summary>

            <form
              action={releaseEvaluationAthlete}
              className="form"
              style={{ marginTop: 14 }}
            >
              <input
                type="hidden"
                name="athleteId"
                value={athlete.id}
              />

              <label>
                Data da dispensa
                <input
                  type="date"
                  name="decisionDate"
                  defaultValue={todayInput}
                  required
                />
              </label>

              <label style={{ gridColumn: "1 / -1" }}>
                Motivo da dispensa
                <textarea
                  name="reason"
                  rows={4}
                  required
                  placeholder="Informe o motivo da dispensa."
                />
              </label>

              <button
                type="submit"
                className="btn-secondary"
              >
                Confirmar dispensa
              </button>
            </form>
          </details>

          <details style={{ marginTop: 14 }}>
            <summary
              style={{
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              Registrar desistência
            </summary>

            <form
              action={withdrawEvaluationAthlete}
              className="form"
              style={{ marginTop: 14 }}
            >
              <input
                type="hidden"
                name="athleteId"
                value={athlete.id}
              />

              <label>
                Data da desistência
                <input
                  type="date"
                  name="decisionDate"
                  defaultValue={todayInput}
                  required
                />
              </label>

              <label style={{ gridColumn: "1 / -1" }}>
                Observação
                <textarea
                  name="reason"
                  rows={3}
                  placeholder="Opcional. Ex.: decisão da família."
                />
              </label>

              <button
                type="submit"
                className="btn-secondary"
              >
                Confirmar desistência
              </button>
            </form>
          </details>
        </section>
      ) : null}

      {athlete.evaluationProcesses.length ? (
        <section
          className="card"
          style={{ marginBottom: 18 }}
        >
          <span className="page-eyebrow">
            HISTÓRICO DE AVALIAÇÕES
          </span>

          <h2>Passagens pela avaliação</h2>

          <div className="stack">
            {athlete.evaluationProcesses.map((process) => (
              <div key={process.id}>
                <strong>
                  {process.evaluationCategoryNameSnapshot ||
                    process.evaluationCategory?.name ||
                    "Avaliação"}
                  {" · "}
                  {evaluationProcessLabel(process.status)}
                </strong>

                <p className="muted">
                  {formatEvaluationDate(process.startedAt)}
                  {" → "}
                  {formatEvaluationDate(process.decidedAt)}
                  {process.targetCategoryNameSnapshot ||
                  process.targetCategory?.name
                    ? ` · Destino: ${
                        process.targetCategoryNameSnapshot ||
                        process.targetCategory?.name
                      }`
                    : ""}
                  {process.entryMode === "RETROACTIVE"
                    ? " · Registro retroativo"
                    : ""}
                </p>

                {process.decisionReason ? (
                  <p
                    className="muted"
                    style={{ marginTop: 4 }}
                  >
                    Motivo: {process.decisionReason}
                  </p>
                ) : null}

                {process.notes ? (
                  <p
                    className="muted"
                    style={{ marginTop: 4 }}
                  >
                    Observações: {process.notes}
                  </p>
                ) : null}

                <p
                  className="muted"
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                  }}
                >
                  {process.decidedByNameSnapshot ||
                  process.decidedBy?.name
                    ? `Responsável: ${
                        process.decidedByNameSnapshot ||
                        process.decidedBy?.name
                      }`
                    : process.createdByNameSnapshot ||
                        process.createdBy?.name
                      ? `Registrado por: ${
                          process.createdByNameSnapshot ||
                          process.createdBy?.name
                        }`
                      : ""}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {canEdit && evaluationTargetPairs.length ? (
        <details
          className="card"
          style={{ marginBottom: 18 }}
        >
          <summary
            style={{
              cursor: "pointer",
              fontWeight: 900,
              fontSize: 16,
            }}
          >
            + Registrar avaliação passada
          </summary>

          <p
            className="muted"
            style={{ marginTop: 12 }}
          >
            Este registro cria somente o histórico. A categoria
            atual do atleta não será alterada.
          </p>

          <form
            action={registerRetroactiveEvaluation}
            className="form"
            style={{ marginTop: 16 }}
          >
            <input
              type="hidden"
              name="athleteId"
              value={athlete.id}
            />

            <label style={{ gridColumn: "1 / -1" }}>
              Avaliação e categoria-alvo
              <select
                name="evaluationTargetPair"
                required
                defaultValue=""
              >
                <option value="" disabled>
                  Selecione
                </option>

                {evaluationTargetPairs.map((pair) => (
                  <option
                    key={pair.value}
                    value={pair.value}
                  >
                    {pair.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Entrada na avaliação
              <input
                type="date"
                name="startedAt"
                required
              />
            </label>

            <label>
              Data da decisão
              <input
                type="date"
                name="decidedAt"
                required
              />
            </label>

            <label>
              Resultado
              <select
                name="status"
                defaultValue="APPROVED"
                required
              >
                <option value="APPROVED">
                  Aprovado
                </option>
                <option value="REJECTED">
                  Reprovado
                </option>
                <option value="RELEASED">
                  Dispensado
                </option>
                <option value="WITHDRAWN">
                  Desistiu
                </option>
              </select>
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              Motivo / parecer
              <textarea
                name="reason"
                rows={3}
                placeholder="Opcional. Preencha com o que estiver disponível no histórico."
              />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              Observações
              <textarea
                name="notes"
                rows={3}
                placeholder="Opcional."
              />
            </label>

            <button
              type="submit"
              className="btn"
            >
              Salvar avaliação passada
            </button>
          </form>
        </details>
      ) : null}

      {categoryHistory.length ? (
        <section
          className="card"
          style={{ marginBottom: 18 }}
        >
          <span className="page-eyebrow">
            HISTÓRICO DE CATEGORIA
          </span>

          <h2>Movimentações do atleta</h2>

          <div className="stack">
            {categoryHistory.map((item) => {
              const metadata =
                parseCategoryAuditMetadata(
                  item.metadataJson,
                );

              return (
                <div key={item.id}>
                  <strong>
                    {categoryAuditLabel(
                      metadata?.event,
                    )}
                  </strong>

                  <p className="muted">
                    {metadata?.fromCategory?.name
                      ? `${metadata.fromCategory.name} → `
                      : ""}
                    {metadata?.toCategory?.name ||
                      "Sem categoria"}
                    {" · "}
                    {item.createdAt.toLocaleString(
                      "pt-BR",
                    )}
                    {item.actor?.name
                      ? ` · ${item.actor.name}`
                      : ""}
                  </p>

                  {metadata?.reason ? (
                    <p className="muted" style={{ marginTop: 4 }}>
                      Motivo: {metadata.reason}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {canEdit ? (
        <section className="card">
          <form
            className="form"
            action={updateAthlete}
          >
            <input
              type="hidden"
              name="id"
              value={athlete.id}
            />

            <label>
              Nome
              <input
                name="name"
                defaultValue={athlete.name}
                required
              />
            </label>

            <label>
              Nome esportivo / apelido
              <input
                name="nickname"
                defaultValue={
                  athlete.nickname ?? ""
                }
              />
            </label>

            {isEvaluation ? (
              <>
                <input
                  type="hidden"
                  name="categoryId"
                  value={athlete.categoryId ?? ""}
                />

                <label>
                  Categoria / situação
                  <input
                    value={
                      athlete.category?.name ??
                      "Em avaliação"
                    }
                    disabled
                  />
                </label>

                <p
                  className="muted"
                  style={{
                    gridColumn: "1 / -1",
                  }}
                >
                  Enquanto o processo estiver aberto, a categoria
                  é controlada pelas ações de Aprovar, Reprovar,
                  Dispensar ou Desistência acima.
                </p>
              </>
            ) : athlete.currentStatus === "ACTIVE" ? (
              <>
                <div
                  style={{
                    gridColumn: "1 / -1",
                    marginTop: 4,
                  }}
                >
                  <h3 style={{ marginBottom: 4 }}>
                    Modalidades e categorias
                  </h3>
                  <p className="muted">
                    Você pode alterar a categoria de uma modalidade
                    ativa ou adicionar outra modalidade. Para encerrar
                    uma modalidade, use “Registrar saída de uma
                    modalidade” acima para preservar o histórico.
                  </p>
                </div>

                <label>
                  Futebol de Campo
                  <select
                    name="footballCategoryId"
                    defaultValue={
                      activeFootballMembership?.categoryId ??
                      ""
                    }
                  >
                    {!activeFootballMembership ? (
                      <option value="">
                        Não participa
                      </option>
                    ) : null}

                    {footballCategories.map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Futsal
                  <select
                    name="futsalCategoryId"
                    defaultValue={
                      activeFutsalMembership?.categoryId ??
                      ""
                    }
                  >
                    {!activeFutsalMembership ? (
                      <option value="">
                        Não participa
                      </option>
                    ) : null}

                    {futsalCategories.map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <input
                  type="hidden"
                  name="categoryId"
                  value=""
                />
              </>
            ) : (
              <label>
                Categoria / situação
                <select
                  name="categoryId"
                  defaultValue={
                    athlete.categoryId ?? ""
                  }
                >
                  <option value="">
                    Sem categoria
                  </option>

                  {evaluationCategories.length ? (
                    <optgroup label="Em avaliação">
                      {evaluationCategories.map(
                        (category) => (
                          <option
                            key={category.id}
                            value={category.id}
                          >
                            {category.name}
                          </option>
                        ),
                      )}
                    </optgroup>
                  ) : null}
                </select>
              </label>
            )}

            {!isEvaluation &&
            (isRejected || isReleased) ? (
              <p
                className="muted"
                style={{
                  gridColumn: "1 / -1",
                }}
              >
                {isRejected
                  ? "Para uma nova tentativa, selecione uma categoria em Em avaliação e salve. O histórico da reprovação continuará preservado."
                  : "Para um eventual retorno, selecione primeiro uma categoria em Em avaliação. A saída anterior continuará preservada no histórico."}
              </p>
            ) : null}

            <label>
              Ano de nascimento
              <input
                name="birthYear"
                type="number"
                defaultValue={
                  athlete.birthYear ?? ""
                }
              />
            </label>

            <label>
              Número
              <input
                name="jerseyNumber"
                type="number"
                min="0"
                max="99"
                defaultValue={
                  athlete.jerseyNumber ?? ""
                }
              />
            </label>

            <label>
              Posição
              <input
                name="position"
                defaultValue={
                  athlete.position ?? ""
                }
              />
            </label>

            <label style={{ alignSelf: "start" }}>
              Pé dominante
              <select
                name="dominantFoot"
                defaultValue={
                  athlete.dominantFoot ?? ""
                }
              >
                <option value="">
                  Não informado
                </option>

                <option value="RIGHT">
                  Direito
                </option>

                <option value="LEFT">
                  Esquerdo
                </option>

                <option value="BOTH">
                  Ambidestro
                </option>
              </select>
            </label>

            <div
              className="form-divider"
              style={{
                gridColumn: "1 / -1",
              }}
            >
              <span>REGISTROS ESPORTIVOS</span>
            </div>

            <p
              className="muted"
              style={{
                gridColumn: "1 / -1",
              }}
            >
              O mesmo atleta pode ter inscrição no futsal,
              no futebol e registro CBF.
            </p>

            <label>
              Futsal · Federação
              <input
                name="futsalFederationName"
                defaultValue={
                  futsalFederation?.authorityName ?? ""
                }
                placeholder="Ex.: Federação estadual"
              />
            </label>

            <label>
              Futsal · Nº de inscrição
              <input
                name="futsalFederationNumber"
                defaultValue={
                  futsalFederation?.registrationNumber ?? ""
                }
              />
            </label>

            <label>
              Futebol · Federação
              <input
                name="footballFederationName"
                defaultValue={
                  footballFederation?.authorityName ?? ""
                }
                placeholder="Ex.: Federação estadual"
              />
            </label>

            <label>
              Futebol · Nº de inscrição
              <input
                name="footballFederationNumber"
                defaultValue={
                  footballFederation?.registrationNumber ?? ""
                }
              />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              Futebol · Nº de registro CBF
              <input
                name="cbfRegistrationNumber"
                defaultValue={
                  cbfRegistration?.registrationNumber ?? ""
                }
              />
            </label>
            <ImageUpload
              name="photoUrl"
              defaultValue={athlete.photoUrl}
              label="Foto do atleta — incluir ou substituir"
              recommended="JPEG, PNG ou WEBP até 4 MB. Após enviar ou remover, clique em Salvar alterações."
            />

            <div
              className="athlete-current-status-field"
              style={{ alignSelf: "start" }}
            >
              <span>Status atual</span>
              <strong
                className={`athlete-current-status-value ${currentStatusClass(
                  athlete.currentStatus,
                )}`}
              >
                {currentStatusLabel(athlete.currentStatus)}
              </strong>
              <small>
                O status esportivo é definido pelos fluxos de elenco,
                avaliação, reprovação e dispensa.
              </small>
            </div>

            <hr
              style={{
                borderColor: "var(--line)",
                width: "100%",
              }}
            />

            <h3>Responsável — privado</h3>

            <label>
              Nome do responsável
              <input
                name="guardianName"
                defaultValue={
                  athlete.guardianName ?? ""
                }
              />
            </label>

            <label>
              Parentesco / relação
              <input
                name="guardianRelation"
                defaultValue={
                  athlete.guardianRelation ?? ""
                }
                placeholder="Ex.: Mãe, Pai, Avó, Tutor"
              />
            </label>

            <label>
              WhatsApp / telefone
              <input
                name="guardianPhone"
                defaultValue={
                  athlete.guardianPhone ?? ""
                }
              />
            </label>

            <label>
              E-mail
              <input
                name="guardianEmail"
                type="email"
                defaultValue={
                  athlete.guardianEmail ?? ""
                }
              />
            </label>

            <AthleteSaveButton />
          </form>
        </section>
      ) : (
        <section className="card">
          <span className="page-eyebrow">
            SOMENTE VISUALIZAÇÃO
          </span>

          <h2>Dados esportivos</h2>

          <div className="stack">
            {athlete.photoUrl ? (
              <div className="admin-athlete-photo">
                <SafeAvatar
                  src={athlete.photoUrl}
                  name={athlete.name}
                />
              </div>
            ) : null}

            <div>
              <span className="help">
                Nome
              </span>
              <strong>{athlete.name}</strong>
            </div>

            <div>
              <span className="help">
                Nome esportivo
              </span>
              <strong>
                {athlete.nickname || "—"}
              </strong>
            </div>

            <div>
              <span className="help">
                Categoria
              </span>
              <strong>
                {athlete.category?.name ||
                  "Sem categoria"}
              </strong>
            </div>

            <div>
              <span className="help">
                Situação
              </span>
              <strong>
                {athlete.currentStatus === "ACTIVE" &&
                athlete.category?.type === "STANDARD"
                  ? eligibilityStatus
                    ? `Elenco · ${
                        eligibilityStatus === "APTO"
                          ? "Apto"
                          : "Inapto"
                      }`
                    : "Elenco"
                  : currentStatusLabel(athlete.currentStatus)}
              </strong>
            </div>

            <div>
              <span className="help">
                Ano de nascimento
              </span>
              <strong>
                {athlete.birthYear || "—"}
              </strong>
            </div>

            <div>
              <span className="help">
                Número
              </span>
              <strong>
                {athlete.jerseyNumber ?? "—"}
              </strong>
            </div>

            <div>
              <span className="help">
                Posição
              </span>
              <strong>
                {athlete.position || "—"}
              </strong>
            </div>

            <div>
              <span className="help">
                Pé dominante
              </span>
              <strong>
                {dominantFootLabel(
                  athlete.dominantFoot,
                )}
              </strong>
            </div>

            <div>
              <span className="help">
                Futsal · Federação
              </span>
              <strong>
                {futsalFederation
                  ? `${futsalFederation.authorityName || "Federação"} · ${futsalFederation.registrationNumber}`
                  : "—"}
              </strong>
            </div>

            <div>
              <span className="help">
                Futebol · Federação
              </span>
              <strong>
                {footballFederation
                  ? `${footballFederation.authorityName || "Federação"} · ${footballFederation.registrationNumber}`
                  : "—"}
              </strong>
            </div>

            <div>
              <span className="help">
                Futebol · CBF
              </span>
              <strong>
                {cbfRegistration?.registrationNumber || "—"}
              </strong>
            </div>
            <div>
              <span className="help">
                Status
              </span>
              <strong>
                {currentStatusLabel(athlete.currentStatus)}
              </strong>
            </div>
          </div>

          <div
            className="form-divider"
            style={{
              marginTop: 24,
            }}
          >
            <span>
              PRIVACIDADE DA FAMÍLIA
            </span>
          </div>

          <p className="muted">
            Os dados pessoais e de contato do
            responsável são restritos à gestão
            autorizada do clube.
          </p>
        </section>
      )}

      <style>{`
        .athlete-edit-page-v3 {
          --athlete-v3-ink: #07131d;
          --athlete-v3-muted: #70808b;
          --athlete-v3-line: #dfe6ea;
          --athlete-v3-lime: #99e600;
          --athlete-v3-lime-soft: #eff9d8;
          display: grid;
          gap: 18px;
          padding: 28px 34px 44px;
          background:
            radial-gradient(circle at 92% 2%, rgba(153, 230, 0, .075), transparent 25rem),
            #f4f7f8;
        }

        .athlete-edit-page-v3 * {
          box-sizing: border-box;
        }

        .athlete-edit-page-v3 .athlete-profile-hero {
          min-height: 194px;
          display: flex;
          align-items: center;
          gap: 22px;
          position: relative;
          overflow: hidden;
          margin: 0;
          padding: 28px 34px;
          border: 1px solid rgba(255,255,255,.08) !important;
          border-top: 0 !important;
          border-radius: 26px;
          color: #fff;
          background:
            linear-gradient(
              104deg,
              rgba(5, 20, 31, .99) 0%,
              rgba(6, 29, 37, .98) 58%,
              rgba(20, 76, 30, .97) 100%
            );
          box-shadow: 0 20px 45px rgba(7, 19, 29, .12);
        }

        .athlete-edit-page-v3 .athlete-profile-hero::after {
          content: "";
          width: 360px;
          height: 360px;
          position: absolute;
          right: -105px;
          top: -175px;
          border: 1px solid rgba(153,230,0,.18);
          border-radius: 999px;
          box-shadow:
            0 0 0 42px rgba(153,230,0,.025),
            0 0 0 84px rgba(153,230,0,.018);
          pointer-events: none;
        }

        .athlete-edit-page-v3 .athlete-profile-avatar,
        .athlete-edit-page-v3 .athlete-profile-hero > div,
        .athlete-edit-page-v3 .athlete-status {
          position: relative;
          z-index: 1;
        }

        .athlete-edit-page-v3 .athlete-profile-avatar {
          width: 94px;
          height: 94px;
          flex: 0 0 94px;
          overflow: hidden;
          border: 3px solid var(--athlete-v3-lime);
          border-radius: 22px;
          background: #fff;
          box-shadow: 0 12px 26px rgba(0,0,0,.18);
        }

        .athlete-edit-page-v3 .athlete-profile-avatar img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .athlete-edit-page-v3 .athlete-profile-hero .page-eyebrow {
          display: block;
          margin-bottom: 6px;
          color: var(--athlete-v3-lime) !important;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .16em;
        }

        .athlete-edit-page-v3 .athlete-profile-hero h1 {
          margin: 0;
          color: #fff !important;
          font-size: clamp(34px, 4vw, 54px);
          line-height: 1;
          letter-spacing: -.045em;
        }

        .athlete-edit-page-v3 .athlete-profile-hero p {
          margin: 8px 0 0;
          color: rgba(255,255,255,.78);
          font-size: 14px;
          font-weight: 700;
        }

        .athlete-edit-page-v3 .athlete-status {
          margin-left: auto;
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          padding: 0 14px;
          border-radius: 999px;
          color: #66747d;
          background: #edf1f3;
          font-size: 10px;
          font-weight: 900;
        }

        .athlete-edit-page-v3 .athlete-status.active {
          color: #10200a;
          background: var(--athlete-v3-lime);
        }

        .athlete-edit-page-v3 .athlete-status.evaluation {
          color: #10200a;
          background: #f4b418;
        }

        .athlete-edit-page-v3 .athlete-status.rejected {
          color: #b91c1c;
          background: #fee2e2;
        }

        .athlete-edit-page-v3 .athlete-status.released {
          color: #c2410c;
          background: #ffedd5;
        }

        .athlete-v3-tabs {
          min-height: 64px;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px;
          border: 1px solid var(--athlete-v3-line);
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 8px 28px rgba(8,26,38,.035);
        }

        .athlete-v3-tabs > a {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 18px;
          border-radius: 11px;
          color: #5e6f7a;
          font-size: 12px;
          font-weight: 900;
          text-decoration: none;
          transition: background .16s ease, color .16s ease;
        }

        .athlete-v3-tabs > a:hover {
          color: var(--athlete-v3-ink);
          background: #f4f7f8;
        }

        .athlete-v3-tabs > a.active {
          color: #0b1806;
          background: var(--athlete-v3-lime);
          box-shadow: 0 7px 18px rgba(153,230,0,.16);
        }

        .athlete-v3-tabs > .athlete-v3-back {
          margin-left: auto;
          border: 1px solid #dfe6ea;
          background: #fafbfb;
          color: #5f6f7a;
        }

        .athlete-v3-page-head {
          margin: 0;
          padding: 4px 2px 0;
        }

        .athlete-v3-page-head h1 {
          margin: 0;
          color: var(--athlete-v3-ink);
          font-size: 25px;
          letter-spacing: -.03em;
        }

        .athlete-v3-page-head .muted {
          max-width: 850px;
          margin-top: 5px;
          color: var(--athlete-v3-muted);
          font-size: 12px;
        }

        .athlete-edit-page-v3 > .card {
          margin: 0 !important;
          border: 1px solid var(--athlete-v3-line);
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 10px 30px rgba(8,26,38,.04);
        }

        .athlete-edit-page-v3 .form {
          gap: 16px;
        }

        .athlete-edit-page-v3 .form label {
          color: #394a56;
          font-size: 11px;
          font-weight: 900;
        }

        .athlete-edit-page-v3 .form input,
        .athlete-edit-page-v3 .form select,
        .athlete-edit-page-v3 .form textarea {
          min-height: 46px;
          border: 1px solid #d9e2e7;
          border-radius: 12px;
          color: #101820;
          background: #fff;
          font-size: 13px;
        }

        .athlete-edit-page-v3 .form textarea {
          min-height: 104px;
          padding-top: 12px;
        }

        .athlete-edit-page-v3 .form input:focus,
        .athlete-edit-page-v3 .form select:focus,
        .athlete-edit-page-v3 .form textarea:focus {
          border-color: #94d700;
          box-shadow: 0 0 0 3px rgba(153,230,0,.12);
          outline: none;
        }

        .athlete-edit-page-v3 .form-divider {
          margin-top: 6px;
          padding-top: 18px;
          border-top: 1px solid #e8edef;
        }

        .athlete-edit-page-v3 .form-divider span,
        .athlete-edit-page-v3 .page-eyebrow {
          color: #719f00;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .14em;
        }

        .athlete-edit-page-v3 .stack > div {
          padding: 12px 0;
          border-bottom: 1px solid #edf1f3;
        }

        .athlete-edit-page-v3 .stack > div:last-child {
          border-bottom: 0;
        }


        .athlete-sport-memberships h2 {
          margin: 0;
          color: var(--athlete-v3-ink);
          font-size: 22px;
          letter-spacing: -.03em;
        }

        .athlete-sport-memberships > .muted {
          margin: 5px 0 12px;
          font-size: 12px;
        }

        .athlete-sport-membership-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .athlete-sport-membership {
          display: grid;
          gap: 10px;
          padding: 14px;
          border: 1px solid #e5eaed;
          border-radius: 14px;
          background: #fbfcfc;
        }

        .athlete-sport-membership.released {
          opacity: .72;
        }

        .athlete-sport-membership > div:first-child {
          display: grid;
          gap: 3px;
        }

        .athlete-sport-membership > div:first-child strong {
          color: var(--athlete-v3-ink);
          font-size: 14px;
        }

        .athlete-sport-membership > div:first-child span,
        .athlete-sport-membership small {
          color: var(--athlete-v3-muted);
          font-size: 11px;
        }

        .athlete-sport-membership-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .athlete-sport-membership-badges span {
          display: inline-flex;
          align-items: center;
          min-height: 25px;
          padding: 0 9px;
          border-radius: 999px;
          background: #edf1f3;
          color: #52636e;
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .05em;
        }

        .athlete-sport-membership-badges .eligible {
          background: #e8f7cf;
          color: #245c00;
        }

        .athlete-sport-membership-badges .ineligible {
          background: #fee2e2;
          color: #b91c1c;
        }

        .athlete-current-state-card {
          display: grid;
          gap: 12px;
          border-left: 5px solid #dfe6ea !important;
        }

        .athlete-current-state-card.rejected {
          border-left-color: #e34a4a !important;
        }

        .athlete-current-state-card.released {
          border-left-color: #f59e0b !important;
        }

        .athlete-current-state-card h2 {
          margin: 0;
          color: var(--athlete-v3-ink);
          font-size: 22px;
          letter-spacing: -.03em;
        }

        .athlete-current-state-card > .muted {
          margin: -5px 0 4px;
          font-size: 12px;
        }

        .athlete-current-state-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .athlete-current-state-grid > div {
          min-width: 0;
          display: grid;
          gap: 4px;
          padding: 12px;
          border: 1px solid #e5eaed;
          border-radius: 12px;
          background: #fbfcfc;
        }

        .athlete-current-state-grid > div.wide {
          grid-column: 1 / -1;
        }

        .athlete-current-state-grid span {
          color: var(--athlete-v3-muted);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .athlete-current-state-grid strong {
          color: var(--athlete-v3-ink);
          font-size: 12px;
          line-height: 1.45;
        }

        .athlete-release-card > summary {
          cursor: pointer;
          color: #9a3412;
          font-size: 13px;
          font-weight: 900;
        }

        .athlete-current-status-field {
          display: grid;
          gap: 7px;
          min-width: 0;
        }

        .athlete-current-status-field > span {
          color: #394a56;
          font-size: 11px;
          font-weight: 900;
        }

        .athlete-current-status-value {
          width: max-content;
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          padding: 0 11px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
          color: #586974;
          background: #edf1f3;
        }

        .athlete-current-status-value.active {
          color: #245c00;
          background: #e8f7cf;
        }

        .athlete-current-status-value.evaluation {
          color: #8a5a00;
          background: #fff0bf;
        }

        .athlete-current-status-value.rejected {
          color: #b91c1c;
          background: #fee2e2;
        }

        .athlete-current-status-value.released {
          color: #c2410c;
          background: #ffedd5;
        }

        .athlete-current-status-field small {
          max-width: 320px;
          color: var(--athlete-v3-muted);
          font-size: 10px;
          line-height: 1.45;
        }

        .athlete-eligibility-history h2 {
          margin: 0;
          color: var(--athlete-v3-ink);
          font-size: 22px;
          letter-spacing: -.03em;
        }

        .athlete-eligibility-history > .muted {
          margin: 5px 0 12px;
          font-size: 12px;
        }

        .athlete-eligibility-sport-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin: 14px 0 16px;
        }

        .athlete-eligibility-sport-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px;
          border: 1px solid #e5eaed;
          border-radius: 14px;
          background: #fbfcfc;
        }

        .athlete-eligibility-sport-card > div {
          display: grid;
          gap: 3px;
        }

        .athlete-eligibility-sport-card strong {
          color: var(--athlete-v3-ink);
          font-size: 14px;
        }

        .athlete-eligibility-sport-card > div span {
          color: var(--athlete-v3-muted);
          font-size: 11px;
        }

        .athlete-eligibility-card {
          display: grid;
          gap: 16px;
        }

        .athlete-eligibility-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
        }

        .athlete-eligibility-head h2 {
          margin: 0;
          color: var(--athlete-v3-ink);
          font-size: 22px;
          letter-spacing: -.03em;
        }

        .athlete-eligibility-head .muted {
          margin: 5px 0 0;
          max-width: 760px;
          font-size: 12px;
        }

        .athlete-eligibility-badge {
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          padding: 0 14px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
        }

        .athlete-eligibility-badge.apt {
          color: #245c00;
          background: #e8f7cf;
          border: 1px solid #b8df77;
        }

        .athlete-eligibility-badge.unfit {
          color: #a51d1d;
          background: #fee2e2;
          border: 1px solid #fecaca;
        }

        .athlete-eligibility-list {
          display: grid;
          gap: 10px;
        }

        .athlete-eligibility-issue {
          padding: 16px;
          border: 1px solid #e2e8ec;
          border-left-width: 4px;
          border-radius: 14px;
          background: #fbfcfc;
        }

        .athlete-eligibility-issue.blocking {
          border-left-color: #e34a4a;
        }

        .athlete-eligibility-issue.nonblocking {
          border-left-color: #f4b418;
          background: #fffdf6;
        }

        .athlete-eligibility-issue-main {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
        }

        .athlete-eligibility-issue-main > div {
          display: grid;
          gap: 3px;
        }

        .athlete-eligibility-issue-main strong {
          color: var(--athlete-v3-ink);
          font-size: 14px;
        }

        .athlete-eligibility-meta {
          color: var(--athlete-v3-muted);
          font-size: 10px;
          font-weight: 800;
        }

        .athlete-eligibility-state {
          flex: 0 0 auto;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 900;
        }

        .athlete-eligibility-state.blocking {
          color: #a51d1d;
          background: #fee2e2;
        }

        .athlete-eligibility-state.nonblocking {
          color: #8a5a00;
          background: #fff0bf;
        }

        .athlete-eligibility-issue > p {
          margin: 10px 0 0;
          color: #33444f;
          font-size: 12px;
        }

        .athlete-eligibility-issue > small {
          display: block;
          margin-top: 7px;
          font-size: 10px;
        }

        .athlete-eligibility-management {
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid #e5eaed;
        }

        .athlete-eligibility-management > summary {
          cursor: pointer;
          color: #5c7900;
          font-size: 11px;
          font-weight: 900;
        }

        .athlete-eligibility-management .form {
          margin-top: 12px;
        }

        .athlete-eligibility-empty {
          padding: 14px;
          border: 1px solid #d9e7c0;
          border-radius: 12px;
          color: #446700;
          background: #f5faeb;
          font-size: 12px;
          font-weight: 800;
        }

        .athlete-eligibility-restricted {
          margin: 0;
          padding: 10px 12px;
          border-radius: 10px;
          background: #f4f7f8;
          font-size: 11px;
        }

        @media (max-width: 980px) {
          .athlete-edit-page-v3 {
            padding: 24px;
          }

          .athlete-edit-page-v3 .athlete-profile-hero {
            min-height: auto;
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .athlete-edit-page-v3 .athlete-status {
            margin-left: 0;
          }
        }

        @media (max-width: 900px) {
          .athlete-current-state-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .athlete-edit-page-v3 {
            gap: 14px;
            padding: 16px 12px 32px;
          }

          .athlete-edit-page-v3 .athlete-profile-hero {
            padding: 22px 18px;
            border-radius: 20px;
          }

          .athlete-edit-page-v3 .athlete-profile-avatar {
            width: 72px;
            height: 72px;
            flex-basis: 72px;
            border-radius: 18px;
          }

          .athlete-edit-page-v3 .athlete-profile-hero h1 {
            font-size: 32px;
          }

          .athlete-v3-tabs {
            overflow-x: auto;
            justify-content: flex-start;
            white-space: nowrap;
          }

          .athlete-v3-tabs > a {
            flex: 0 0 auto;
            padding: 0 14px;
          }

          .athlete-v3-tabs > .athlete-v3-back {
            margin-left: 0;
          }

          .athlete-v3-page-head h1 {
            font-size: 22px;
          }

          .athlete-current-state-grid {
            grid-template-columns: 1fr;
          }

          .athlete-sport-membership-grid {
            grid-template-columns: 1fr;
          }

          .athlete-eligibility-sport-grid {
            grid-template-columns: 1fr;
          }

          .athlete-eligibility-sport-card {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 520px) {
          .athlete-edit-page-v3 .athlete-profile-hero {
            display: grid;
            grid-template-columns: 72px 1fr;
          }

          .athlete-edit-page-v3 .athlete-status {
            grid-column: 1 / -1;
            width: max-content;
          }
        }
      `}</style>
    </main>
  );
}
