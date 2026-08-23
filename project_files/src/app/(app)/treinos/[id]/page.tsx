import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";
import { updateTraining } from "../actions";

const WEEKDAYS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export default async function EditTrainingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrganizationUser();
  const { id } = await params;

  const [training, categories] = await Promise.all([
    prisma.trainingSchedule.findFirst({
      where: { id, organizationId: user.organizationId },
    }),
    prisma.category.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!training) notFound();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Editar horário</h1>
          <p className="muted">Atualize categoria, dia, horário e local do treino.</p>
        </div>
        <Link className="btn btn-secondary" href="/treinos">Voltar</Link>
      </div>

      <section className="card">
        <form className="form" action={updateTraining}>
          <input type="hidden" name="id" value={training.id} />

          <label>
            Categoria
            <select name="categoryId" defaultValue={training.categoryId} required>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>

          <label>
            Dia da semana
            <select name="weekday" defaultValue={String(training.weekday)} required>
              {WEEKDAYS.map((day, index) => (
                <option key={day} value={index}>{day}</option>
              ))}
            </select>
          </label>

          <label>
            Início
            <input name="startTime" type="time" defaultValue={training.startTime} required />
          </label>

          <label>
            Fim
            <input name="endTime" type="time" defaultValue={training.endTime} required />
          </label>

          <label>
            Local
            <input name="location" defaultValue={training.location ?? ""} />
          </label>

          <label>
            Observações
            <textarea name="notes" rows={5} defaultValue={training.notes ?? ""} />
          </label>

          <button type="submit">Salvar alterações</button>
        </form>
      </section>
    </>
  );
}
