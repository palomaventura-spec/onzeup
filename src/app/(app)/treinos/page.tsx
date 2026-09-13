import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireClubPermission } from "@/lib/club-access";
import { hasClubPermission } from "@/lib/club-permissions";
import { createTraining, deleteTraining } from "./actions";

const WEEKDAYS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(
  date: Date | null,
  weekday: number
) {
  if (!date) {
    return `Legado • ${WEEKDAYS[weekday]}`;
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(date);
}

export default async function TrainingPage() {
  const user =
    await requireClubPermission(
      "TRAININGS_VIEW"
    );

  const canEdit = hasClubPermission(
    user,
    "TRAININGS_EDIT"
  );

  const [trainings, categories] =
    await Promise.all([
      prisma.trainingSchedule.findMany({
        where: {
          organizationId:
            user.organizationId,
        },
        include: {
          category: true,
        },
        orderBy: [
          {
            date: "asc",
          },
          {
            startTime: "asc",
          },
        ],
      }),

      prisma.category.findMany({
        where: {
          organizationId:
            user.organizationId,
        },
        orderBy: {
          name: "asc",
        },
      }),
    ]);

  const today =
    dateInputValue(new Date());

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Treinos</h1>

          <p className="muted">
            Cadastre cada treino em uma data
            real do calendário para alimentar
            Agenda, QTR e Google Agenda.
          </p>
        </div>

        <span className="badge">
          {trainings.length} treino(s)
        </span>
      </div>

      {!canEdit ? (
        <div
          className="notice"
          role="status"
          style={{
            marginBottom: 16,
          }}
        >
          <strong>
            Somente visualização
          </strong>
          {" — "}
          alterações de treino são feitas pelo
          Gestor ou Coordenador.
        </div>
      ) : null}

      <div className="two-col">
        {canEdit ? (
          <section
            className="card"
            id="novo-treino"
          >
            <h2>Novo treino</h2>

            {categories.length === 0 ? (
              <div className="empty">
                Cadastre pelo menos uma categoria
                antes de criar treinos.
              </div>
            ) : (
              <form
                className="form"
                action={createTraining}
              >
                <label>
                  Categoria

                  <select
                    name="categoryId"
                    required
                    defaultValue=""
                  >
                    <option
                      value=""
                      disabled
                    >
                      Selecione
                    </option>

                    {categories.map(
                      (category) => (
                        <option
                          key={
                            category.id
                          }
                          value={
                            category.id
                          }
                        >
                          {
                            category.name
                          }
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label>
                  Data

                  <input
                    name="date"
                    type="date"
                    min={today}
                    required
                  />
                </label>

                <label>
                  Início

                  <input
                    name="startTime"
                    type="time"
                    required
                  />
                </label>

                <label>
                  Fim

                  <input
                    name="endTime"
                    type="time"
                    required
                  />
                </label>

                <label>
                  Local

                  <input
                    name="location"
                    placeholder="Ex.: Campo 1 / Ginásio"
                  />
                </label>

                <label>
                  Observações

                  <textarea
                    name="notes"
                    rows={4}
                    placeholder="Ex.: levar colete branco"
                  />
                </label>

                <button type="submit">
                  Adicionar treino
                </button>
              </form>
            )}
          </section>
        ) : null}

        <section className="card">
          <h2>Agenda de treinos</h2>

          {trainings.length === 0 ? (
            <div className="empty">
              Nenhum treino cadastrado.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Data</th>
                    <th>Horário</th>
                    <th>Local</th>
                    {canEdit ? (
                      <th>Ações</th>
                    ) : null}
                  </tr>
                </thead>

                <tbody>
                  {trainings.map(
                    (training) => (
                      <tr
                        key={
                          training.id
                        }
                      >
                        <td>
                          <strong>
                            {
                              training
                                .category
                                .name
                            }
                          </strong>
                        </td>

                        <td>
                          {formatDate(
                            training.date,
                            training.weekday
                          )}
                        </td>

                        <td>
                          {
                            training.startTime
                          }{" "}
                          –{" "}
                          {
                            training.endTime
                          }
                        </td>

                        <td>
                          {training.location ??
                            "—"}
                        </td>

                        {canEdit ? (
                          <td>
                            <div className="actions">
                              <Link
                                className="btn btn-secondary btn-small"
                                href={`/treinos/${training.id}`}
                              >
                                Editar
                              </Link>

                              <form
                                className="inline-form"
                                action={
                                  deleteTraining
                                }
                              >
                                <input
                                  type="hidden"
                                  name="id"
                                  value={
                                    training.id
                                  }
                                />

                                <button
                                  className="btn-danger btn-small"
                                  type="submit"
                                >
                                  Excluir
                                </button>
                              </form>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}

          {trainings.some(
            (training) =>
              !training.date
          ) ? (
            <p
              className="muted"
              style={{
                marginTop: 12,
              }}
            >
              Treinos marcados como
              “Legado” foram criados
              antes desta atualização.
              Abra “Editar” e escolha
              uma data para convertê-los
              ao novo calendário.
            </p>
          ) : null}
        </section>
      </div>
    </>
  );
}