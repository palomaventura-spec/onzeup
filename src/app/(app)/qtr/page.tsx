import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";
import { generateQtr, saveQtr } from "./actions";
import QtrEditor from "@/components/qtr/QtrEditor";
import QtrGenerateButton from "@/components/qtr/QtrGenerateButton";

type SearchParams = {
  week?: string;
  category?: string;
  gerado?: string;
  salvo?: string;
  erro?: string;
};

function mondayOf(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(12, 0, 0, 0);
  return d;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function qtrHref(week: string, category: string) {
  return `/qtr?week=${encodeURIComponent(week)}&category=${encodeURIComponent(category)}`;
}

const navButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 38,
  padding: "0 14px",
  border: "1px solid #dbe2ea",
  borderRadius: 10,
  background: "#ffffff",
  color: "#14202b",
  fontSize: 14,
  fontWeight: 700,
  textDecoration: "none",
  whiteSpace: "nowrap" as const,
};

export default async function QtrPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireOrganizationUser();
  const params = await searchParams;

  const requested = params.week ? new Date(`${params.week}T12:00:00`) : new Date();
  const weekStart = mondayOf(requested);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const previous = new Date(weekStart);
  previous.setDate(previous.getDate() - 7);
  const next = new Date(weekStart);
  next.setDate(next.getDate() + 7);

  const [qtr, categories] = await Promise.all([
    prisma.qtr.findUnique({
      where: {
        organizationId_weekStart: {
          organizationId: user.organizationId,
          weekStart,
        },
      },
    }),
    prisma.category.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true, birthYear: true },
      orderBy: [{ birthYear: "desc" }, { name: "asc" }],
    }),
  ]);

  const validCategory =
    params.category &&
    (params.category === "__all__" || categories.some((category) => category.name === params.category))
      ? params.category
      : null;

  const selectedCategory = validCategory || categories[0]?.name || "__all__";

  if (!qtr && categories.length > 0) {
    const formData = new FormData();
    formData.set("weekStart", isoDate(weekStart));
    formData.set("category", selectedCategory);
    await generateQtr(formData);
  }

  let initialRows: any[] = [];
  if (qtr?.dataJson) {
    try {
      const parsed = JSON.parse(qtr.dataJson);
      initialRows = Array.isArray(parsed) ? parsed : [];
    } catch {
      initialRows = [];
    }
  }

  return (
    <main className="page-shell">
      <section style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#667585" }}>Planejamento semanal</p>
          <h1 style={{ margin: 0, fontSize: "clamp(28px, 3vw, 36px)", lineHeight: 1.05, letterSpacing: "-0.03em", color: "#0f1720" }}>QTR</h1>
          <p style={{ margin: "8px 0 0", color: "#53606d", fontSize: 15 }}>{formatDate(weekStart)} a {formatDate(weekEnd)}</p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href={qtrHref(isoDate(previous), selectedCategory)} style={navButtonStyle}>← Semana anterior</Link>
          <Link href={qtrHref(isoDate(next), selectedCategory)} style={navButtonStyle}>Próxima semana →</Link>
        </div>
      </section>

      {params.gerado === "1" || params.salvo === "1" ? (
        <div role="status" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "9px 12px", border: "1px solid #d7eadf", borderRadius: 10, background: "#f3fbf6", color: "#21643b", fontSize: 14, fontWeight: 700 }}>
          <span aria-hidden="true">✓</span>
          {params.gerado === "1" ? "QTR atualizado com a agenda" : "Alterações salvas com sucesso"}
        </div>
      ) : null}

      <section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap", marginBottom: 18, padding: "16px 18px", border: "1px solid #e2e8ef", borderRadius: 14, background: "#ffffff", boxShadow: "0 4px 14px rgba(15, 23, 32, 0.04)" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, color: "#111923" }}>Atualizar com a agenda</h2>
          <p style={{ margin: "5px 0 0", color: "#6b7785", fontSize: 14 }}>
            Use somente quando quiser sincronizar novamente os treinos e jogos desta semana.
          </p>
        </div>

        <form action={generateQtr}>
          <input type="hidden" name="weekStart" value={isoDate(weekStart)} />
          <input type="hidden" name="category" value={selectedCategory} />
          <QtrGenerateButton />
        </form>
      </section>

      <QtrEditor
        key={`${isoDate(weekStart)}-${qtr?.updatedAt?.getTime() ?? 0}-${selectedCategory}`}
        weekStart={isoDate(weekStart)}
        qtrId={qtr?.id ?? null}
        initialRows={initialRows}
        categories={categories}
        initialCategory={selectedCategory}
        saveAction={saveQtr}
      />
    </main>
  );
}
