import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";
import QtrAutoPrint from "./QtrAutoPrint";

const DAYS = [
  ["mon", "SEG"],
  ["tue", "TER"],
  ["wed", "QUA"],
  ["thu", "QUI"],
  ["fri", "SEX"],
  ["sat", "SÁB"],
  ["sun", "DOM"],
] as const;

type QtrEvent = {
  type?: string;
  title?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  notes?: string;
};

type QtrRow = {
  category?: string;
  birthYear?: number | null;
  mon?: QtrEvent[];
  tue?: QtrEvent[];
  wed?: QtrEvent[];
  thu?: QtrEvent[];
  fri?: QtrEvent[];
  sat?: QtrEvent[];
  sun?: QtrEvent[];
};

function mondayOf(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() + (day === 0 ? -6 : 1 - day));
  result.setHours(12, 0, 0, 0);
  return result;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function shortDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function readRows(raw?: string | null): QtrRow[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function typeLabel(type?: string) {
  if (type === "TRAINING") return "Treino";
  if (type === "MATCH") return "Jogo";
  if (type === "FRIENDLY") return "Amistoso";
  if (type === "EVENT") return "Evento";
  return "Atividade";
}

export default async function QtrPdfPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await requireOrganizationUser();
  const query = await searchParams;
  const requested = query.week && /^\d{4}-\d{2}-\d{2}$/.test(query.week)
    ? new Date(`${query.week}T12:00:00`)
    : new Date();
  const weekStart = mondayOf(requested);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const qtr = await prisma.qtr.findUnique({
    where: {
      organizationId_weekStart: {
        organizationId: user.organizationId,
        weekStart,
      },
    },
  });

  const rows = readRows(qtr?.dataJson);
  const org = user.organization!;

  return (
    <main className="qtr-print-page">
      <style>{`
        html,body{background:#fff!important;color:#101820!important;margin:0!important;padding:0!important;font-family:Arial,Helvetica,sans-serif}
        .qtr-print-page{padding:24px;max-width:1400px;margin:0 auto;background:#fff;color:#101820}
        .qtr-print-header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;border-bottom:2px solid #101820;padding-bottom:14px;margin-bottom:18px}
        .qtr-print-brand{font-size:24px;font-weight:900;letter-spacing:.03em}.qtr-print-brand span{color:#8fd400}
        .qtr-print-header h1{font-size:28px;margin:4px 0 0}.qtr-print-meta{text-align:right;color:#5f6d75;font-size:13px;line-height:1.5}
        .qtr-print-table{width:100%;border-collapse:separate;border-spacing:5px;table-layout:fixed}
        .qtr-print-table th{font-size:11px;letter-spacing:.06em;text-align:center;padding:6px 3px;color:#34434c}.qtr-print-table th:first-child{text-align:left;width:150px}
        .qtr-print-table td{vertical-align:top;border:1px solid #dce4e8;border-radius:8px;padding:8px;min-height:80px;height:80px;font-size:11px;background:#fbfcfd}
        .qtr-print-category{font-weight:900!important;background:#f4f7f8!important;font-size:13px!important}.qtr-print-category small{display:block;margin-top:5px;color:#687780;font-weight:700}
        .qtr-print-event{border-left:4px solid #8fd400;padding-left:7px;margin-bottom:6px}.qtr-print-event strong{display:block;font-size:11px}.qtr-print-event span,.qtr-print-event small{display:block;color:#5f6d75;margin-top:2px;font-size:9px}
        .qtr-print-empty{display:grid;place-items:center;color:#a3afb6;height:100%;font-size:20px}
        .qtr-print-actions{display:flex;gap:10px;justify-content:flex-end;margin-bottom:16px}.qtr-print-actions button{border:0;border-radius:8px;padding:10px 14px;font-weight:800;background:#8fd400;color:#101820;cursor:pointer}.qtr-print-actions button.secondary{background:#eef2f4}
        .qtr-print-footer{margin-top:14px;border-top:1px solid #dce4e8;padding-top:8px;color:#71808a;font-size:9px;display:flex;justify-content:space-between}
        @page{size:landscape;margin:10mm}
        @media print{.no-print{display:none!important}.qtr-print-page{padding:0;max-width:none}.qtr-print-table td{height:72px}.qtr-print-header{margin-bottom:10px}.qtr-print-footer{position:fixed;bottom:0;left:0;right:0}}
      `}</style>

      <QtrAutoPrint />

      <header className="qtr-print-header">
        <div>
          <div className="qtr-print-brand">ONZE<span>UP</span></div>
          <h1>QTR semanal</h1>
        </div>
        <div className="qtr-print-meta">
          <strong>{org.publicName || org.name}</strong><br />
          Semana: {formatDate(weekStart)} a {formatDate(weekEnd)}
        </div>
      </header>

      <table className="qtr-print-table">
        <thead>
          <tr>
            <th>CATEGORIA</th>
            {DAYS.map(([key, label], index) => {
              const date = new Date(weekStart);
              date.setDate(date.getDate() + index);
              return <th key={key}>{label}<br /><span>{shortDate(date)}</span></th>;
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, rowIndex) => (
            <tr key={`${row.category}-${rowIndex}`}>
              <td className="qtr-print-category">
                {row.category || "Categoria"}
                {row.birthYear ? <small>Ano-base: {row.birthYear}</small> : null}
              </td>
              {DAYS.map(([key]) => {
                const events = Array.isArray(row[key]) ? row[key]! : [];
                return (
                  <td key={key}>
                    {events.length ? events.map((event, eventIndex) => (
                      <div className="qtr-print-event" key={eventIndex}>
                        <strong>{event.title || typeLabel(event.type)}</strong>
                        {(event.startTime || event.endTime) ? <span>{event.startTime || ""}{event.endTime ? ` – ${event.endTime}` : ""}</span> : null}
                        {event.location ? <span>{event.location}</span> : null}
                        {event.notes ? <small>{event.notes}</small> : null}
                      </div>
                    )) : <div className="qtr-print-empty">—</div>}
                  </td>
                );
              })}
            </tr>
          )) : (
            <tr><td colSpan={8}>Nenhum QTR salvo para esta semana.</td></tr>
          )}
        </tbody>
      </table>

      <footer className="qtr-print-footer">
        <span>ONZEUP • Gestão de futebol e futsal de base</span>
        <span>QTR gerado em {new Intl.DateTimeFormat("pt-BR").format(new Date())}</span>
      </footer>
    </main>
  );
}
