import Link from "next/link";
import { notFound } from "next/navigation";
import TrainingAttendanceForm from "../TrainingAttendanceForm";
import { prisma } from "@/lib/prisma";
import { requireClubPermission } from "@/lib/club-access";
import { hasClubPermission } from "@/lib/club-permissions";
import { updateTraining } from "../actions";

function dateInputValue(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

function arrivalTime(value: Date | null) {
  return value ? `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}` : "";
}

export default async function EditTrainingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireClubPermission("TRAININGS_VIEW");
  const canEdit = hasClubPermission(user, "TRAININGS_EDIT");
  const { id } = await params;

  const training = await prisma.trainingSchedule.findFirst({
    where: { id, organizationId: user.organizationId },
    include: { category: true },
  });
  if (!training) notFound();

  const [categories, athletes, session] = await Promise.all([
    prisma.category.findMany({ where: { organizationId: user.organizationId }, orderBy: { name: "asc" } }),
    prisma.athlete.findMany({
      where: { organizationId: user.organizationId, categoryId: training.categoryId, active: true },
      select: { id: true, name: true, nickname: true, jerseyNumber: true, photoUrl: true },
      orderBy: { name: "asc" },
    }),
    prisma.trainingSession.findFirst({
      where: { organizationId: user.organizationId, scheduleId: training.id },
      include: { attendances: true }, orderBy: { startsAt: "desc" },
    }),
  ]);
  const attendanceByAthlete = new Map(session?.attendances.map((item) => [item.athleteId, item]) ?? []);
  const attendanceRows = athletes.map((athlete) => {
    const attendance = attendanceByAthlete.get(athlete.id);
    const status: "PRESENT" | "ABSENT" | "LATE" | null = attendance?.status === "ABSENT" ? "ABSENT" : attendance?.status === "LATE" ? "LATE" : attendance?.status === "PRESENT" ? "PRESENT" : null;
    return { ...athlete, status, arrivalTime: arrivalTime(attendance?.arrivedAt ?? null) };
  });

  return (
    <>
      <div className="page-head">
        <div><span className="page-eyebrow">TREINO · {training.category.name}</span><h1>{canEdit ? "Treino e lista de presença" : "Detalhes do treino"}</h1><p className="muted">Registre quem esteve presente, ausente ou chegou atrasado.</p></div>
        <Link className="btn btn-secondary" href="/treinos">Voltar</Link>
      </div>

      {!canEdit ? <div className="notice" role="status" style={{ marginBottom: 16 }}><strong>Somente visualização</strong> — alterações são feitas por usuários autorizados.</div> : null}
      {!training.date ? <div className="notice" role="status">Este é um treino antigo. {canEdit ? "Escolha uma data para habilitar a lista de presença." : ""}</div> : null}

      <div className="training-detail-grid">
        <section className="card training-data-card">
          <div className="section-title-row"><div><span className="page-eyebrow">PROGRAMAÇÃO</span><h2>Dados do treino</h2></div></div>
          {canEdit ? <form className="form" action={updateTraining}>
            <input type="hidden" name="id" value={training.id} />
            <label>Categoria<select name="categoryId" defaultValue={training.categoryId} required>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label>Data<input name="date" type="date" defaultValue={dateInputValue(training.date)} required /></label>
            <div className="two-field-row"><label>Início<input name="startTime" type="time" defaultValue={training.startTime} required /></label><label>Fim<input name="endTime" type="time" defaultValue={training.endTime} required /></label></div>
            <label>Local<input name="location" defaultValue={training.location ?? ""} /></label>
            <label>Observações<textarea name="notes" rows={4} defaultValue={training.notes ?? ""} /></label>
            <button type="submit">Salvar alterações</button>
          </form> : <div className="training-readonly"><div><strong>Categoria</strong><p>{training.category.name}</p></div><div><strong>Data</strong><p>{training.date ? new Intl.DateTimeFormat("pt-BR").format(training.date) : "Treino legado"}</p></div><div><strong>Horário</strong><p>{training.startTime} – {training.endTime}</p></div><div><strong>Local</strong><p>{training.location ?? "—"}</p></div></div>}
        </section>

        <section className="card training-attendance-card">
          <div className="section-title-row"><div><span className="page-eyebrow">{training.category.name}</span><h2>Lista de presença</h2><p className="muted">{athletes.length} atleta(s) ativo(s) nesta categoria</p></div></div>
          {!training.date ? <div className="empty">Defina uma data para o treino antes de realizar a chamada.</div> : athletes.length ? <TrainingAttendanceForm scheduleId={training.id} athletes={attendanceRows} canEdit={canEdit} /> : <div className="empty">Nenhum atleta ativo vinculado a {training.category.name}.</div>}
        </section>
      </div>
    </>
  );
}
