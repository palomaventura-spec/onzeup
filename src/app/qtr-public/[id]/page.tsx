import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import QtrPublicActions from "./QtrPublicActions";

const DAYS = [
  ["mon", "SEG"], ["tue", "TER"], ["wed", "QUA"], ["thu", "QUI"],
  ["fri", "SEX"], ["sat", "SÁB"], ["sun", "DOM"],
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

function readRows(raw?: string | null): QtrRow[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function shortDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
}

function typeLabel(type?: string) {
  if (type === "TRAINING") return "Treino";
  if (type === "MATCH") return "Jogo";
  if (type === "FRIENDLY") return "Amistoso";
  if (type === "EVENT") return "Evento";
  return "Atividade";
}

export default async function PublicQtrPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;

  const qtr = await prisma.qtr.findUnique({
    where: { id },
    include: {
      organization: {
        select: { name: true, publicName: true, logoUrl: true, active: true },
      },
    },
  });

  if (!qtr || !qtr.organization.active) notFound();

  const category = query.category?.trim();
  if (!category) notFound();

  const rows = readRows(qtr.dataJson).filter((row) => row.category === category);
  if (!rows.length) notFound();

  const weekStart = new Date(qtr.weekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const org = qtr.organization;

  return (
    <main className="qtr-public-page">
      <style>{`
        html,body{background:#f3f6f7!important;color:#101820!important;margin:0!important;padding:0!important;font-family:Arial,Helvetica,sans-serif}
        *{box-sizing:border-box}.qtr-public-page{padding:24px;max-width:1400px;margin:0 auto;color:#101820}
        .qtr-public-card{background:#fff;border:1px solid #e0e6e9;border-radius:18px;padding:24px;box-shadow:0 10px 30px rgba(15,23,32,.06)}
        .qtr-public-header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;border-bottom:2px solid #101820;padding-bottom:14px;margin-bottom:18px}
        .qtr-public-identity{display:flex;align-items:center;gap:12px}.qtr-public-logo{width:58px;height:58px;object-fit:contain;border-radius:10px}
        .qtr-public-club-name{font-size:24px;font-weight:900;line-height:1.1}.qtr-public-header h1{font-size:28px;margin:4px 0 0}
        .qtr-public-category-title{margin-top:5px;font-size:16px;font-weight:800;color:#5d6b73}.qtr-public-meta{text-align:right;color:#5f6d75;font-size:13px;line-height:1.5}
        .qtr-public-table-wrap{overflow-x:auto}.qtr-public-table{width:100%;border-collapse:separate;border-spacing:5px;table-layout:fixed;min-width:980px}
        .qtr-public-table th{font-size:11px;letter-spacing:.06em;text-align:center;padding:6px 3px;color:#34434c}.qtr-public-table th:first-child{text-align:left;width:150px}
        .qtr-public-table td{vertical-align:top;border:1px solid #dce4e8;border-radius:8px;padding:8px;height:80px;font-size:11px;background:#fbfcfd}
        .qtr-public-category{font-weight:900!important;background:#f4f7f8!important;font-size:13px!important}.qtr-public-category small{display:block;margin-top:5px;color:#687780;font-weight:700}
        .qtr-public-event{border-left:4px solid #8fd400;padding-left:7px;margin-bottom:6px}.qtr-public-event strong{display:block;font-size:11px}.qtr-public-event span,.qtr-public-event small{display:block;color:#5f6d75;margin-top:2px;font-size:9px}
        .qtr-public-empty{display:grid;place-items:center;color:#a3afb6;height:100%;font-size:20px}.qtr-public-footer{margin-top:14px;border-top:1px solid #dce4e8;padding-top:10px;color:#71808a;font-size:10px;display:flex;justify-content:space-between;gap:12px}
        @media(max-width:700px){.qtr-public-page{padding:12px}.qtr-public-card{padding:14px;border-radius:14px}.qtr-public-header{display:block}.qtr-public-meta{text-align:left;margin-top:12px}.qtr-public-club-name{font-size:20px}.qtr-public-header h1{font-size:24px}}
        @page{size:landscape;margin:10mm}@media print{html,body{background:#fff!important}.no-print{display:none!important}.qtr-public-page{padding:0;max-width:none}.qtr-public-card{border:0;box-shadow:none;padding:0}.qtr-public-table-wrap{overflow:visible}.qtr-public-table{min-width:0}}
      `}</style>

      <QtrPublicActions />

      <section className="qtr-public-card">
        <header className="qtr-public-header">
          <div>
            <div className="qtr-public-identity">
              {org.logoUrl ? <img className="qtr-public-logo" src={org.logoUrl} alt="" /> : null}
              <div className="qtr-public-club-name">{org.publicName || org.name}</div>
            </div>
            <h1>QTR semanal</h1>
            <div className="qtr-public-category-title">{category}</div>
          </div>
          <div className="qtr-public-meta">Semana: {formatDate(weekStart)} a {formatDate(weekEnd)}</div>
        </header>

        <div className="qtr-public-table-wrap">
          <table className="qtr-public-table">
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
              {rows.map((row, rowIndex) => (
                <tr key={`${row.category}-${rowIndex}`}>
                  <td className="qtr-public-category">
                    {row.category || "Categoria"}
                    {row.birthYear ? <small>Ano-base: {row.birthYear}</small> : null}
                  </td>
                  {DAYS.map(([key]) => {
                    const events = Array.isArray(row[key]) ? row[key]! : [];
                    return (
                      <td key={key}>
                        {events.length ? events.map((event, eventIndex) => (
                          <div className="qtr-public-event" key={eventIndex}>
                            <strong>{event.title || typeLabel(event.type)}</strong>
                            {(event.startTime || event.endTime) ? <span>{event.startTime || ""}{event.endTime ? ` – ${event.endTime}` : ""}</span> : null}
                            {event.location ? <span>{event.location}</span> : null}
                            {event.notes ? <small>{event.notes}</small> : null}
                          </div>
                        )) : <div className="qtr-public-empty">—</div>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="qtr-public-footer">
          <span>Gerado por ONZEUP • Gestão de futebol e futsal de base</span>
          <span>Compartilhamento público do QTR</span>
        </footer>
      </section>
    </main>
  );
}
