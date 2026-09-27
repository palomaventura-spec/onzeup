import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireClubPermission } from "@/lib/club-access";
import { hasClubPermission } from "@/lib/club-permissions";
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
  return `/qtr?week=${encodeURIComponent(week)}&category=${encodeURIComponent(
    category,
  )}`;
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
  const user = await requireClubPermission("QTR_VIEW");

  const canEdit = hasClubPermission(user, "QTR_EDIT");

  const params = await searchParams;

  const requested = params.week
    ? new Date(`${params.week}T12:00:00`)
    : new Date();

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
      where: {
        organizationId: user.organizationId,
      },

      select: {
        id: true,
        name: true,
        birthYear: true,
      },

      orderBy: [
        {
          birthYear: "desc",
        },
        {
          name: "asc",
        },
      ],
    }),
  ]);

  const validCategory =
    params.category &&
    (params.category === "__all__" ||
      categories.some((category) => category.name === params.category))
      ? params.category
      : null;

  const selectedCategory = validCategory || categories[0]?.name || "__all__";

  /*
   * Se ainda não existe QTS para a semana,
   * somente Gestor/Coordenador podem gerar.
   *
   * Coach continua apenas visualizando.
   */
  if (!qtr && categories.length > 0 && canEdit) {
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
    <main className="page-shell qts-premium">
      <section
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
          marginBottom: 18,
          padding: "22px 24px",
          border: "1px solid #dfe6ec",
          borderRadius: 18,
          background:
            "linear-gradient(135deg, #ffffff 0%, #f8fbf5 100%)",
          boxShadow: "0 10px 28px rgba(15, 23, 32, 0.06)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: "0 0 7px",
              color: "#79b800",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: "0.14em",
            }}
          >
            PLANEJAMENTO SEMANAL
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h1
              style={{
                margin: 0,
                color: "#0c1720",
                fontSize: "clamp(30px, 3vw, 42px)",
                lineHeight: 1,
                letterSpacing: "-0.04em",
              }}
            >
              QTS
            </h1>

            <span
              style={{
                color: "#75828d",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {formatDate(weekStart)} a {formatDate(weekEnd)}
            </span>
          </div>

          <p
            style={{
              maxWidth: 620,
              margin: "10px 0 0",
              color: "#61707c",
              fontSize: 14,
              lineHeight: 1.55,
            }}
          >
            Programação semanal de treinos e jogos organizada por categoria.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <Link
            href={qtrHref(isoDate(previous), selectedCategory)}
            style={navButtonStyle}
          >
            ← Semana anterior
          </Link>

          <Link
            href={qtrHref(isoDate(next), selectedCategory)}
            style={{
              ...navButtonStyle,
              borderColor: "#c9e983",
              background: "#f5fbe8",
              color: "#284000",
            }}
          >
            Próxima semana →
          </Link>
        </div>
      </section>

      {params.gerado === "1" || params.salvo === "1" ? (
        <div
          role="status"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 14,
            padding: "9px 12px",
            border: "1px solid #d7eadf",
            borderRadius: 10,
            background: "#f3fbf6",
            color: "#21643b",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          <span aria-hidden="true">✓</span>

          {params.gerado === "1"
            ? "QTS atualizado com a agenda"
            : "Alterações salvas com sucesso"}
        </div>
      ) : null}

      {canEdit ? (
        <section
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
            flexWrap: "wrap",
            marginBottom: 18,
            padding: "16px 18px",
            border: "1px solid #e2e8ef",
            borderRadius: 14,
            background: "#ffffff",
            boxShadow: "0 4px 14px rgba(15, 23, 32, 0.04)",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 17,
                color: "#111923",
              }}
            >
              Atualizar com a agenda
            </h2>

            <p
              style={{
                margin: "5px 0 0",
                color: "#6b7785",
                fontSize: 14,
              }}
            >
              Use somente quando quiser sincronizar novamente os treinos e jogos
              desta semana.
            </p>
          </div>

          <form action={generateQtr}>
            <input type="hidden" name="weekStart" value={isoDate(weekStart)} />

            <input type="hidden" name="category" value={selectedCategory} />

            <QtrGenerateButton />
          </form>
        </section>
      ) : (
        <div
          style={{
            marginBottom: 18,
            padding: "12px 14px",
            border: "1px solid #e2e8ef",
            borderRadius: 12,
            background: "#ffffff",
            color: "#667585",
            fontSize: 14,
          }}
        >
          <strong
            style={{
              color: "#14202b",
            }}
          >
            Somente visualização
          </strong>
          {" — "}O QTS é atualizado pelo Gestor ou Coordenador.
        </div>
      )}

      {!qtr && !canEdit ? (
        <div
          className="card"
          style={{
            marginBottom: 18,
          }}
        >
          <strong>QTS ainda não disponível</strong>

          <p
            className="muted"
            style={{
              marginBottom: 0,
            }}
          >
            O Gestor ou Coordenador ainda não gerou o QTS desta semana.
          </p>
        </div>
      ) : null}

      <QtrEditor
        key={`${isoDate(weekStart)}-${
          qtr?.updatedAt?.getTime() ?? 0
        }-${selectedCategory}`}
        weekStart={isoDate(weekStart)}
        qtrId={qtr?.id ?? null}
        initialRows={initialRows}
        categories={categories}
        initialCategory={selectedCategory}
        saveAction={saveQtr}
        canEdit={canEdit}
      />
    </main>
  );
}
