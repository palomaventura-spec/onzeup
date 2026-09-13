import ImageUpload from "@/components/ImageUpload";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireClubPermission } from "@/lib/club-access";
import { hasClubPermission } from "@/lib/club-permissions";

import {
  createAthlete,
  deleteAthlete,
  toggleAthleteStatus,
} from "./actions";

import ModuleTour from "@/components/help/ModuleTour";

export default async function AthletesPage() {
  const user = await requireClubPermission("ATHLETES_VIEW");

  const canEdit = hasClubPermission(
    user,
    "ATHLETES_EDIT"
  );

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
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  const activeCount = athletes.filter(
    (athlete) => athlete.active
  ).length;

  const athleteGroups = [
    ...categories.map((category) => ({
      id: category.id,
      name: category.name,

      athletes: athletes.filter(
        (athlete) =>
          athlete.categoryId === category.id
      ),
    })),

    {
      id: "uncategorized",
      name: "Sem categoria",

      athletes: athletes.filter(
        (athlete) => !athlete.categoryId
      ),
    },
  ].filter(
    (group) => group.athletes.length > 0
  );

  return (
    <>
      <div className="page-head">
        <div>
          <span className="page-eyebrow">
            ELENCO ADMINISTRATIVO
          </span>

          <h1>Atletas</h1>

          <p className="muted">
            {canEdit
              ? "Cadastre o atleta e o contato da família no mesmo fluxo. O ONZEUP Player continua pertencendo à família."
              : "Consulte o elenco esportivo do clube. Alterações cadastrais são realizadas pelo Gestor ou Coordenador."}
          </p>
        </div>

        <div className="actions">
          <span className="badge">
            {activeCount} ativo(s)
          </span>

          <ModuleTour module="atletas" />
        </div>
      </div>

      <div
        className={
          canEdit
            ? "athlete-management-layout"
            : ""
        }
      >
        {canEdit ? (
          <section className="card athlete-create-panel">
            <h2>Novo atleta</h2>

            <form
              className="form"
              action={createAthlete}
            >
              <label>
                Nome

                <input
                  name="name"
                  placeholder="Nome completo"
                  required
                />
              </label>

              <label>
                Nome esportivo / apelido

                <input
                  name="nickname"
                  placeholder="Ex.: G9"
                />
              </label>

              <label>
                Categoria

                <select
                  name="categoryId"
                  defaultValue=""
                >
                  <option value="">
                    Sem categoria
                  </option>

                  {categories.map(
                    (category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    )
                  )}
                </select>
              </label>

              <div className="two-field-row">
                <label>
                  Ano de nascimento

                  <input
                    name="birthYear"
                    type="number"
                    min="2000"
                    max="2035"
                    placeholder="2018"
                  />
                </label>

                <label>
                  Número

                  <input
                    name="jerseyNumber"
                    type="number"
                    min="0"
                    max="99"
                    placeholder="9"
                  />
                </label>
              </div>

              <label>
                Posição

                <input
                  name="position"
                  placeholder="Ex.: Atacante"
                />
              </label>

              <label>
                Pé dominante

                <select
                  name="dominantFoot"
                  defaultValue=""
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

              <ImageUpload
                name="photoUrl"
                label="Foto (JPEG/PNG/WEBP)"
              />

              <div className="form-divider">
                <span>
                  Família e responsável • dados privados
                </span>
              </div>

              <label>
                Nome do responsável principal

                <input
                  name="guardianName"
                  placeholder="Nome completo"
                />
              </label>

              <label>
                Parentesco / relação

                <input
                  name="guardianRelation"
                  placeholder="Ex.: Mãe, Pai, Avó, Tutor"
                />
              </label>

              <label>
                WhatsApp / telefone

                <input name="guardianPhone" />
              </label>

              <label>
                E-mail

                <input
                  name="guardianEmail"
                  type="email"
                />
              </label>

              <button type="submit">
                Cadastrar atleta
              </button>
            </form>
          </section>
        ) : null}

        <section className="athlete-category-blocks">
          {!canEdit ? (
            <div className="card">
              <span className="page-eyebrow">
                SOMENTE VISUALIZAÇÃO
              </span>

              <h2>Elenco do clube</h2>

              <p className="muted">
                Como Coach, você pode consultar os dados esportivos dos
                atletas. Dados privados dos responsáveis não são exibidos.
              </p>
            </div>
          ) : null}

          {athleteGroups.map((group) => (
            <div
              className="athlete-category-section"
              key={group.id}
            >
              <div className="athlete-category-heading">
                <h2>{group.name}</h2>

                <span>
                  {group.athletes.length} atleta(s)
                </span>
              </div>

              <div className="athlete-card-grid">
                {group.athletes.map((athlete) => {
                  const playerLinked =
                    athlete.playerLinks.some(
                      (link) => link.verified
                    );

                  return (
                    <article
                      className={`admin-athlete-card ${
                        !athlete.active
                          ? "inactive"
                          : ""
                      }`}
                      key={athlete.id}
                    >
                      <div className="admin-athlete-photo">
                        {athlete.photoUrl ? (
                          <img
                            src={athlete.photoUrl}
                            alt={athlete.name}
                          />
                        ) : (
                          <span>
                            {(
                              athlete.nickname ||
                              athlete.name
                            )
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                        )}

                        {athlete.jerseyNumber != null ? (
                          <b>
                            #{athlete.jerseyNumber}
                          </b>
                        ) : null}
                      </div>

                      <div className="admin-athlete-content">
                        <div className="admin-athlete-top">
                          <div>
                            <small>
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

                          <span
                            className={`status-dot-label ${
                              athlete.active
                                ? "active"
                                : ""
                            }`}
                          >
                            {athlete.active
                              ? "Ativo"
                              : "Inativo"}
                          </span>
                        </div>

                        <div className="athlete-data-strip">
                          <span>
                            <small>POSIÇÃO</small>

                            <strong>
                              {athlete.position || "—"}
                            </strong>
                          </span>

                          <span>
                            <small>NASC.</small>

                            <strong>
                              {athlete.birthYear || "—"}
                            </strong>
                          </span>

                          <span>
                            <small>PLAYER</small>

                            <strong>
                              {playerLinked
                                ? "Vinculado ✓"
                                : "—"}
                            </strong>
                          </span>
                        </div>

                        {canEdit &&
                        (athlete.callUps.length > 0 ||
                          athlete.charges.length > 0) ? (
                          <div className="athlete-alert-strip">
                            {athlete.callUps.length ? (
                              <span>
                                {athlete.callUps.length} confirmação pendente
                              </span>
                            ) : null}

                            {athlete.charges.length ? (
                              <span>
                                {athlete.charges.length} cobrança(s)
                              </span>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="actions">
                          <Link
                            className="btn btn-small"
                            href={`/atletas/${athlete.id}`}
                          >
                            {canEdit
                              ? "Abrir atleta"
                              : "Ver atleta"}
                          </Link>

                          {canEdit ? (
                            <>
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
                                    !athlete.active
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
                            </>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}

          {!athletes.length ? (
            <div className="card empty">
              Nenhum atleta cadastrado.
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}