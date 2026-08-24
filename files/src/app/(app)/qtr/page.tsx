import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";
import { duplicatePreviousQtr, generateQtr, saveQtr } from "./actions";
import QtrEditor from "@/components/qtr/QtrEditor";
import ModuleTour from "@/components/help/ModuleTour";
import HelpTip from "@/components/help/HelpTip";

function mondayOf(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(12, 0, 0, 0);
  return result;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function endOfWeekLabel(weekStart: string) {
  const start = new Date(`${weekStart}T12:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const format = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return `${format.format(start)} a ${format.format(end)}`;
}

function normalizeRows(raw: string | null) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const keys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

    return parsed.map((row: any) => {
      const normalized: any = {
        category: row?.category || "",
        birthYear: row?.birthYear ?? null,
      };

      for (const key of keys) {
        const value = row?.[key];
        normalized[key] = Array.isArray(value)
          ? value
          : typeof value === "string" && value.trim()
          ? [{ type: "OTHER", title: value.trim() }]
          : [];
      }

      return normalized;
    });
  } catch {
    return [];
  }
}

export default async function QtrPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await requireOrganizationUser();
  const query = await searchParams;

  const requestedWeek =
    query.week && /^\d{4}-\d{2}-\d{2}$/.test(query.week)
      ? new Date(`${query.week}T12:00:00`)
      : mondayOf(new Date());

  const weekStartDate = mondayOf(requestedWeek);
  const weekStart = isoDate(weekStartDate);

  const qtr = await prisma.qtr.findUnique({
    where: {
      organizationId_weekStart: {
        organizationId: user.organizationId,
        weekStart: weekStartDate,
      },
    },
  });

  const rows = normalizeRows(qtr?.dataJson ?? null);

  const categories = await prisma.category.findMany({
    where: { organizationId: user.organizationId },
    select: { id: true, name: true, birthYear: true },
    orderBy: [{ birthYear: "desc" }, { name: "asc" }],
  });

  const previous = new Date(weekStartDate);
  previous.setDate(previous.getDate() - 7);

  const next = new Date(weekStartDate);
  next.setDate(next.getDate() + 7);

  return (
    <>
      <div className="page-head">
        <ModuleTour module="qtr" />
        <div>
          <h1>QTR</h1>
          <p className="muted">Quadro semanal de treinos, jogos e eventos.</p>
        </div>
      </div>

      <section className="card qtr-toolbar">
        <div className="qtr-toolbar-block">
          <span className="qtr-toolbar-label">SEMANA</span>
          <div className="qtr-week-picker">
            <a className="btn-secondary" href={`/qtr?week=${isoDate(previous)}`}>
              ‹
            </a>
            <strong>{endOfWeekLabel(weekStart)}</strong>
            <a className="btn-secondary" href={`/qtr?week=${isoDate(next)}`}>
              ›
            </a>
          </div>
        </div>

        <div className="qtr-toolbar-block">
          <span className="qtr-toolbar-label">TIPO DE QTR <HelpTip title="Qual modo escolher?">Automático usa treinos e jogos cadastrados; Manual começa livre; Híbrido gera automaticamente e permite editar.</HelpTip></span>
          <div className="actions">
            <span className="qtr-mode active">Automático</span>
            <span className="qtr-mode">Manual</span>
            <span className="qtr-mode">Híbrido</span>
          </div>
        </div>

        <div className="qtr-toolbar-block qtr-toolbar-actions">
          <span className="qtr-toolbar-label">AÇÕES</span>
          <div className="actions">
            <form action={duplicatePreviousQtr}>
              <input type="hidden" name="weekStart" value={weekStart} />
              <button className="btn-secondary" type="submit">
                Duplicar semana
              </button>
            </form>
            <form action={generateQtr}>
              <input type="hidden" name="weekStart" value={weekStart} />
              <button type="submit">Gerar automático</button>
            </form>
          </div>
        </div>
      </section>

      <section className="card qtr-main-card">
        <QtrEditor initialRows={rows} weekStart={weekStart} categories={categories} saveAction={saveQtr} />
      </section>
    </>
  );
}
