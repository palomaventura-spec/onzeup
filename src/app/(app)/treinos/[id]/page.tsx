import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireClubPermission } from "@/lib/club-access";
import { hasClubPermission } from "@/lib/club-permissions";
import { updateTraining } from "../actions";

function dateInputValue(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function EditTrainingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user =
    await requireClubPermission(
      "TRAININGS_VIEW"
    );

  const canEdit = hasClubPermission(
    user,
    "TRAININGS_EDIT"
  );

  const { id } = await params;

  const [training, categories] =
    await Promise.all([
      prisma.trainingSchedule.findFirst({
        where: {
          id,
          organizationId:
            user.organizationId,
        },
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

  if (!training) {
    notFound();
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>
            {canEdit
              ? "Editar treino"
              : "Detalhes do treino"}
          </h1>

          <p className="muted">
            {canEdit
              ? "Atualize categoria, data, horário e local do treino."
              : "Visualização dos dados do treino."}
          </p>
        </div>

        <Link
          className="btn btn-secondary"
          href="/treinos"
        >
          Voltar
        </Link>
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

      {!training.date ? (
        <div
          className="notice"
          role="status"
        >
          Este é um treino antigo baseado apenas
          em dia da semana.
          {canEdit
            ? " Escolha uma data abaixo para convertê-lo ao calendário."
            : ""}
        </div>
      ) : null}

      <section className="card">
        {canEdit ? (
          <form
            className="form"
            action={updateTraining}
          >
            <input
              type="hidden"
              name="id"
              value={training.id}
            />

            <label>
              Categoria

              <select
                name="categoryId"
                defaultValue={
                  training.categoryId
                }
                required
              >
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

            <label>
              Data

              <input
                name="date"
                type="date"
                defaultValue={dateInputValue(
                  training.date
                )}
                required
              />
            </label>

            <label>
              Início

              <input
                name="startTime"
                type="time"
                defaultValue={
                  training.startTime
                }
                required
              />
            </label>

            <label>
              Fim

              <input
                name="endTime"
                type="time"
                defaultValue={
                  training.endTime
                }
                required
              />
            </label>

            <label>
              Local

              <input
                name="location"
                defaultValue={
                  training.location ?? ""
                }
              />
            </label>

            <label>
              Observações

              <textarea
                name="notes"
                rows={5}
                defaultValue={
                  training.notes ?? ""
                }
              />
            </label>

            <button type="submit">
              Salvar alterações
            </button>
          </form>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 16,
            }}
          >
            <div>
              <strong>Categoria</strong>
              <p className="muted">
                {categories.find(
                  (category) =>
                    category.id ===
                    training.categoryId
                )?.name ?? "—"}
              </p>
            </div>

            <div>
              <strong>Data</strong>
              <p className="muted">
                {training.date
                  ? new Intl.DateTimeFormat(
                      "pt-BR",
                      {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      }
                    ).format(
                      training.date
                    )
                  : "Treino legado"}
              </p>
            </div>

            <div>
              <strong>Horário</strong>
              <p className="muted">
                {training.startTime} –{" "}
                {training.endTime}
              </p>
            </div>

            <div>
              <strong>Local</strong>
              <p className="muted">
                {training.location ?? "—"}
              </p>
            </div>

            <div>
              <strong>Observações</strong>
              <p className="muted">
                {training.notes ?? "—"}
              </p>
            </div>
          </div>
        )}
      </section>
    </>
  );
}