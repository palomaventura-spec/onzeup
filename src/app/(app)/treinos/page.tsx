import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";
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

export default async function TrainingPage() {
  const user = await requireOrganizationUser();

  const [trainings, categories] = await Promise.all([
    prisma.trainingSchedule.findMany({
      where: { organizationId: user.organizationId },
      include: { category: true },
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
    }),
    prisma.category.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Horários de treino</h1>
          <p className="muted">
            Organize dias, horários e locais de treinamento por categoria.
          </p>
        </div>
        <span className="badge">{trainings.length} horário(s)</span>
      </div>

      <div className="two-col">
        <section className="card">
          <h2>Novo horário</h2>

          {categories.length === 0 ? (
            <div className="empty">
              Cadastre pelo menos uma categoria antes de criar horários de treino.
            </div>
          ) : (
            <form className="form" action={createTraining}>
              <label>
                Categoria
                <select name="categoryId" required defaultValue="">
                  <option value="" disabled>Selecione</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Dia da semana
                <select name="weekday" required defaultValue="">
                  <option value="" disabled>Selecione</option>
                  {WEEKDAYS.map((day, index) => (
                    <option key={day} value={index}>{day}</option>
                  ))}
                </select>
              </label>

              <label>
                Início
                <input name="startTime" type="time" required />
              </label>

              <label>
                Fim
                <input name="endTime" type="time" required />
              </label>

              <label>
                Local
                <input name="location" placeholder="Ex.: Campo 1 / Ginásio" />
              </label>

              <label>
                Observações
                <textarea name="notes" rows={4} placeholder="Ex.: levar colete branco" />
              </label>

              <button type="submit">Adicionar horário</button>
            </form>
          )}
        </section>

        <section className="card">
          <h2>Agenda de treinos</h2>

          {trainings.length === 0 ? (
            <div className="empty">Nenhum horário de treino cadastrado.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Dia</th>
                    <th>Horário</th>
                    <th>Local</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {trainings.map((training) => (
                    <tr key={training.id}>
                      <td><strong>{training.category.name}</strong></td>
                      <td>{WEEKDAYS[training.weekday]}</td>
                      <td>{training.startTime} – {training.endTime}</td>
                      <td>{training.location ?? "—"}</td>
                      <td>
                        <div className="actions">
                          <Link className="btn btn-secondary btn-small" href={`/treinos/${training.id}`}>
                            Editar
                          </Link>
                          <form className="inline-form" action={deleteTraining}>
                            <input type="hidden" name="id" value={training.id} />
                            <button className="btn-danger btn-small" type="submit">Excluir</button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
