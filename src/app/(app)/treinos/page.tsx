import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireClubPermission } from "@/lib/club-access";
import { hasClubPermission } from "@/lib/club-permissions";
import { createTraining, deleteTraining } from "./actions";

const WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
function dateInputValue(date: Date) { return date.toISOString().slice(0, 10); }
function formatDate(date: Date | null, weekday: number) {
  return date ? new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }).format(date) : `Legado • ${WEEKDAYS[weekday]}`;
}

export default async function TrainingPage() {
  const user = await requireClubPermission("TRAININGS_VIEW");
  const canEdit = hasClubPermission(user, "TRAININGS_EDIT");
  const [trainings, categories] = await Promise.all([
    prisma.trainingSchedule.findMany({
      where: { organizationId: user.organizationId },
      include: { category: true, sessions: { select: { attendances: { select: { status: true } } }, take: 1, orderBy: { startsAt: "desc" } } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    prisma.category.findMany({ where: { organizationId: user.organizationId }, orderBy: { name: "asc" } }),
  ]);
  const today = dateInputValue(new Date());

  return (
    <>
      <div className="page-head"><div><span className="page-eyebrow">ROTINA ESPORTIVA</span><h1>Treinos</h1><p className="muted">Organize os treinos e faça a lista de presença de cada categoria.</p></div><span className="badge">{trainings.length} treino(s)</span></div>
      {!canEdit ? <div className="notice" role="status" style={{ marginBottom: 16 }}><strong>Somente visualização</strong> — alterações são feitas pelo Gestor ou Coordenador.</div> : null}
      <div className="two-col">
        {canEdit ? <section className="card" id="novo-treino"><h2>Novo treino</h2>{categories.length === 0 ? <div className="empty">Cadastre pelo menos uma categoria antes de criar treinos.</div> : <form className="form" action={createTraining}>
          <label>Categoria<select name="categoryId" required defaultValue=""><option value="" disabled>Selecione</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label>Data<input name="date" type="date" min={today} required /></label>
          <div className="two-field-row"><label>Início<input name="startTime" type="time" required /></label><label>Fim<input name="endTime" type="time" required /></label></div>
          <label>Local<input name="location" placeholder="Ex.: Campo 1 / Ginásio" /></label>
          <label>Observações<textarea name="notes" rows={4} placeholder="Ex.: levar colete branco" /></label>
          <button type="submit">Adicionar treino</button>
        </form>}</section> : null}

        <section className="card"><div className="section-title-row"><div><span className="page-eyebrow">POR CATEGORIA</span><h2>Agenda e chamadas</h2></div></div>
          {trainings.length === 0 ? <div className="empty">Nenhum treino cadastrado.</div> : <div className="table-wrap"><table className="table"><thead><tr><th>Categoria</th><th>Data</th><th>Horário</th><th>Presença</th><th>Ações</th></tr></thead><tbody>{trainings.map((training) => {
            const attendance = training.sessions[0]?.attendances ?? [];
            const present = attendance.filter((item) => item.status === "PRESENT" || item.status === "LATE").length;
            return <tr key={training.id}><td><strong>{training.category.name}</strong><small className="training-location">{training.location ?? "Local a definir"}</small></td><td>{formatDate(training.date, training.weekday)}</td><td>{training.startTime} – {training.endTime}</td><td>{attendance.length ? <span className="attendance-table-summary">{present}/{attendance.length} compareceram</span> : <span className="muted">Não realizada</span>}</td><td><div className="actions"><Link className="btn btn-secondary btn-small" href={`/treinos/${training.id}`}>{canEdit ? "Lista de presença" : "Visualizar"}</Link>{canEdit ? <form className="inline-form" action={deleteTraining}><input type="hidden" name="id" value={training.id} /><button className="btn-danger btn-small" type="submit">Excluir</button></form> : null}</div></td></tr>;
          })}</tbody></table></div>}
        </section>
      </div>
    </>
  );
}
