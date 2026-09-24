import type { CSSProperties } from "react";
import Link from "next/link";

import SafeAvatar from "@/components/SafeAvatar";
import ModuleTour from "@/components/help/ModuleTour";

import { requireClubPermission } from "@/lib/club-access";
import { hasClubPermission } from "@/lib/club-permissions";
import { prisma } from "@/lib/prisma";

import { deleteAthlete, toggleAthleteStatus } from "./actions";
import AthleteCreateForm from "./AthleteCreateForm";

type AthleteFilters = {
  q?: string;
  category?: string;
  position?: string;
  status?: string;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function ageFromYear(year: number | null) {
  return year ? new Date().getFullYear() - year : null;
}

export default async function AthletesPage({
  searchParams,
}: {
  searchParams: Promise<AthleteFilters>;
}) {
  const user = await requireClubPermission("ATHLETES_VIEW");
  const canEdit = hasClubPermission(user, "ATHLETES_EDIT");
  const filters = await searchParams;

  const query = (filters.q || "")
    .trim()
    .toLocaleLowerCase("pt-BR");

  const categoryFilter = filters.category || "ALL";
  const positionFilter = filters.position || "ALL";

  const statusFilter = ["ACTIVE", "INACTIVE"].includes(
    filters.status || "",
  )
    ? filters.status!
    : "ALL";

  const [athletes, categories] = await Promise.all([
    prisma.athlete.findMany({
      where: {
        organizationId: user.organizationId,
      },
      include: {
        category: true,
        callUps: {
          where: {
            status: "PENDING",
          },
        },
        charges: {
          where: {
            status: "PENDING",
          },
        },
        playerLinks: {
          include: {
            player: true,
          },
        },
        documents: {
          select: {
            id: true,
            status: true,
            expiresAt: true,
            category: true,
          },
        },
        evaluations: {
          where: {
            status: "FINALIZED",
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: [
        {
          active: "desc",
        },
        {
          name: "asc",
        },
      ],
    }),

    prisma.category.findMany({
      where: {
        organizationId: user.organizationId,
      },
      orderBy: [
        {
          type: "asc",
        },
        {
          name: "asc",
        },
      ],
    }),
  ]);

  const positions = [
    ...new Set(
      athletes
        .map((item) => item.position)
        .filter(Boolean),
    ),
  ].sort((a, b) =>
    a!.localeCompare(b!, "pt-BR"),
  ) as string[];

  const activeCount = athletes.filter(
    (athlete) => athlete.active,
  ).length;

  const evaluationCount = athletes.filter(
    (athlete) =>
      athlete.active &&
      athlete.category?.type === "EVALUATION",
  ).length;

  const linkedCount = athletes.filter((athlete) =>
    athlete.playerLinks.some((link) => link.verified),
  ).length;

  const missingDataCount = athletes.filter(
    (athlete) =>
      athlete.active &&
      (!athlete.photoUrl ||
        !athlete.position ||
        !athlete.birthYear),
  ).length;

  const now = new Date();

  const documentAlertCount = athletes.filter((athlete) =>
    athlete.documents.some(
      (document) =>
        document.status === "PENDING" ||
        document.status === "EXPIRED" ||
        (document.expiresAt && document.expiresAt < now),
    ),
  ).length;

  const filteredAthletes = athletes.filter((athlete) => {
    const searchable =
      `${athlete.name} ${athlete.nickname || ""}`.toLocaleLowerCase(
        "pt-BR",
      );

    return (
      (!query || searchable.includes(query)) &&
      (categoryFilter === "ALL" ||
        (categoryFilter === "UNCATEGORIZED"
          ? !athlete.categoryId
          : athlete.categoryId === categoryFilter)) &&
      (positionFilter === "ALL" ||
        athlete.position === positionFilter) &&
      (statusFilter === "ALL" ||
        (statusFilter === "ACTIVE"
          ? athlete.active
          : !athlete.active))
    );
  });

  const athleteGroups = [
    ...categories.map((category) => ({
      id: category.id,
      name: category.name,
      type: category.type,
      accentColor: category.accentColor,
      athletes: filteredAthletes.filter(
        (athlete) => athlete.categoryId === category.id,
      ),
    })),
    {
      id: "uncategorized",
      name: "Sem categoria",
      type: "STANDARD" as const,
      accentColor: "#9DDB16",
      athletes: filteredAthletes.filter(
        (athlete) => !athlete.categoryId,
      ),
    },
  ].filter((group) => group.athletes.length);

  const hasFilters = Boolean(
    query ||
      categoryFilter !== "ALL" ||
      positionFilter !== "ALL" ||
      statusFilter !== "ALL",
  );

  return (
    <>
      <div className="page-head athlete-premium-head">
        <div>
          <span className="page-eyebrow">
            GESTÃO DO ELENCO
          </span>

          <h1>Atletas</h1>

          <p className="muted">
            Visão completa do elenco, atletas em avaliação,
            documentação, desempenho e vínculo familiar.
          </p>
        </div>

        <div className="actions">
          {evaluationCount ? (
            <span className="badge">
              {evaluationCount} em avaliação
            </span>
          ) : null}

          <span className="badge">
            {activeCount} ativo(s)
          </span>

          <ModuleTour module="atletas" />
        </div>
      </div>

      <section className="athlete-kpis">
        <article>
          <small>ELENCO ATIVO</small>
          <strong>{activeCount}</strong>
          <span>de {athletes.length} cadastrados</span>
        </article>

        <article>
          <small>EM AVALIAÇÃO</small>
          <strong>{evaluationCount}</strong>
          <span>processo de entrada</span>
        </article>

        <article>
          <small>CATEGORIAS</small>
          <strong>{categories.length}</strong>
          <span>grupos esportivos</span>
        </article>

        <article className={documentAlertCount ? "attention" : ""}>
          <small>ATENÇÃO</small>
          <strong>
            {documentAlertCount + missingDataCount}
          </strong>
          <span>documentos ou cadastros</span>
        </article>
      </section>

      {canEdit ? (
        <details
          className="card athlete-create-drawer"
          open={!athletes.length}
        >
          <summary>
            <div>
              <span className="page-eyebrow">
                NOVO CADASTRO
              </span>

              <h2>Adicionar atleta</h2>

              <p>
                Cadastre diretamente no elenco ou em uma
                categoria de avaliação.
              </p>
            </div>

            <span className="btn">
              ＋ Novo atleta
            </span>
          </summary>

          <AthleteCreateForm categories={categories} />
        </details>
      ) : null}

      <section className="card athlete-filter-bar">
        <form method="get">
          <label className="athlete-search">
            Buscar atleta
            <input
              name="q"
              defaultValue={filters.q || ""}
              placeholder="Nome ou apelido"
            />
          </label>

          <label>
            Categoria
            <select
              name="category"
              defaultValue={categoryFilter}
            >
              <option value="ALL">Todas</option>

              {categories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.type === "EVALUATION"
                    ? `Avaliação · ${category.name}`
                    : category.name}
                </option>
              ))}

              <option value="UNCATEGORIZED">
                Sem categoria
              </option>
            </select>
          </label>

          <label>
            Posição
            <select
              name="position"
              defaultValue={positionFilter}
            >
              <option value="ALL">Todas</option>

              {positions.map((position) => (
                <option
                  key={position}
                  value={position}
                >
                  {position}
                </option>
              ))}
            </select>
          </label>

          <label>
            Status
            <select
              name="status"
              defaultValue={statusFilter}
            >
              <option value="ALL">Todos</option>
              <option value="ACTIVE">Ativos</option>
              <option value="INACTIVE">Inativos</option>
            </select>
          </label>

          <button
            className="btn-secondary"
            type="submit"
          >
            Filtrar
          </button>

          {hasFilters ? (
            <Link href="/atletas">
              Limpar
            </Link>
          ) : null}
        </form>

        <span>
          {filteredAthletes.length} resultado(s)
        </span>
      </section>

      {!canEdit ? (
        <section className="card">
          <span className="page-eyebrow">
            SOMENTE VISUALIZAÇÃO
          </span>

          <h2>Elenco do clube</h2>

          <p className="muted">
            Dados privados da família permanecem restritos à
            gestão autorizada.
          </p>
        </section>
      ) : null}

      <section className="athlete-premium-groups">
        {athleteGroups.map((group) => {
          const isEvaluation =
            group.type === "EVALUATION";

          return (
            <div
              className="athlete-premium-category"
              key={group.id}
              style={
                {
                  "--category-accent":
                    group.accentColor,
                  borderTop: `4px solid ${group.accentColor}`,
                  borderRadius: 12,
                  paddingTop: 12,
                } as CSSProperties
              }
            >
              <div className="athlete-premium-category-head">
                <div>
                  <span
                    className="page-eyebrow"
                    style={{
                      color: group.accentColor,
                    }}
                  >
                    {isEvaluation
                      ? "EM AVALIAÇÃO"
                      : "CATEGORIA"}
                  </span>

                  <h2>{group.name}</h2>
                </div>

                <span>
                  {group.athletes.length}{" "}
                  {isEvaluation
                    ? "em avaliação"
                    : "atleta(s)"}
                </span>
              </div>

              <div className="athlete-premium-grid">
                {group.athletes.map((athlete) => {
                  const playerLinked =
                    athlete.playerLinks.some(
                      (link) => link.verified,
                    );

                  const pendingDocuments =
                    athlete.documents.filter(
                      (document) =>
                        document.status === "PENDING" ||
                        document.status === "EXPIRED" ||
                        (document.expiresAt &&
                          document.expiresAt < now),
                    ).length;

                  const age = ageFromYear(
                    athlete.birthYear,
                  );

                  const athleteAccent =
                    athlete.category?.accentColor ||
                    "#9DDB16";

                  const athleteInEvaluation =
                    athlete.category?.type ===
                    "EVALUATION";

                  return (
                    <article
                      className={`athlete-profile-card ${
                        !athlete.active
                          ? "inactive"
                          : ""
                      }`}
                      key={athlete.id}
                      style={{
                        borderTop: `3px solid ${athleteAccent}`,
                      }}
                    >
                      <div
                        className="athlete-profile-visual"
                        style={{
                          color: athleteAccent,
                        }}
                      >
                        <SafeAvatar
                          src={athlete.photoUrl}
                          name={
                            athlete.nickname ||
                            athlete.name
                          }
                          alt={athlete.name}
                        />

                        {athlete.jerseyNumber != null ? (
                          <b>
                            #{athlete.jerseyNumber}
                          </b>
                        ) : null}

                        <i
                          className={
                            athlete.active
                              ? "active"
                              : ""
                          }
                        >
                          {athlete.active
                            ? "Ativo"
                            : "Inativo"}
                        </i>
                      </div>

                      <div className="athlete-profile-body">
                        <div className="athlete-profile-title">
                          <div>
                            <small
                              style={{
                                color: athleteAccent,
                              }}
                            >
                              {athlete.category?.name ||
                                "SEM CATEGORIA"}
                            </small>

                            <h3>
                              {athlete.nickname ||
                                athlete.name}
                            </h3>

                            {athlete.nickname ? (
                              <p>{athlete.name}</p>
                            ) : null}
                          </div>

                          {athleteInEvaluation ? (
                            <span
                              style={{
                                background:
                                  athleteAccent,
                                color: "#10200a",
                              }}
                            >
                              EM AVALIAÇÃO
                            </span>
                          ) : playerLinked ? (
                            <span>PLAYER ✓</span>
                          ) : null}
                        </div>

                        <div className="athlete-profile-data">
                          <span>
                            <small>POSIÇÃO</small>
                            <strong>
                              {athlete.position || "—"}
                            </strong>
                          </span>

                          <span>
                            <small>IDADE</small>
                            <strong>
                              {age
                                ? `${age} anos`
                                : "—"}
                            </strong>
                          </span>

                          <span>
                            <small>AVALIAÇÕES</small>
                            <strong>
                              {
                                athlete.evaluations
                                  .length
                              }
                            </strong>
                          </span>
                        </div>

                        {pendingDocuments ||
                        athlete.callUps.length ||
                        athlete.charges.length ? (
                          <div className="athlete-profile-alerts">
                            {pendingDocuments ? (
                              <span>
                                {pendingDocuments}{" "}
                                documento(s)
                              </span>
                            ) : null}

                            {athlete.callUps.length ? (
                              <span>
                                {
                                  athlete.callUps
                                    .length
                                }{" "}
                                confirmação(ões)
                              </span>
                            ) : null}

                            {athlete.charges.length ? (
                              <span>
                                {
                                  athlete.charges
                                    .length
                                }{" "}
                                cobrança(s)
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <div className="athlete-profile-ok">
                            {athleteInEvaluation
                              ? "Cadastro de avaliação ativo"
                              : "Cadastro sem pendências operacionais"}
                          </div>
                        )}

                        <div className="athlete-profile-actions">
                          <Link
                            className="btn"
                            href={`/atletas/${athlete.id}`}
                          >
                            {athleteInEvaluation &&
                            canEdit
                              ? "Avaliar / transferir"
                              : canEdit
                                ? "Editar atleta"
                                : "Abrir ficha"}
                          </Link>

                          <Link
                            href={`/atletas/${athlete.id}/dados`}
                          >
                            Documentos
                          </Link>

                          <Link
                            href={`/atletas/${athlete.id}/performance`}
                          >
                            Performance
                          </Link>
                        </div>

                        {canEdit ? (
                          <details className="athlete-manage">
                            <summary>
                              Gerenciar atleta
                            </summary>

                            <div>
                              <form
                                action={
                                  toggleAthleteStatus
                                }
                              >
                                <input
                                  type="hidden"
                                  name="id"
                                  value={athlete.id}
                                />

                                <input
                                  type="hidden"
                                  name="next"
                                  value={String(
                                    !athlete.active,
                                  )}
                                />

                                <button
                                  className="btn-secondary btn-small"
                                  type="submit"
                                >
                                  {athlete.active
                                    ? "Inativar"
                                    : "Ativar"}
                                </button>
                              </form>

                              <form
                                action={deleteAthlete}
                              >
                                <input
                                  type="hidden"
                                  name="id"
                                  value={athlete.id}
                                />

                                <button
                                  className="btn-danger btn-small"
                                  type="submit"
                                >
                                  Excluir
                                </button>
                              </form>
                            </div>
                          </details>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })}

        {!filteredAthletes.length ? (
          <div className="card empty">
            Nenhum atleta encontrado com esses filtros.
          </div>
        ) : null}
      </section>
    </>
  );
}
