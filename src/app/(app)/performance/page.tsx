import Link from "next/link";

import { requireClubPermission } from "@/lib/club-access";
import { hasEffectiveClubElite } from "@/lib/billing-entitlements";
import { prisma } from "@/lib/prisma";

const PRESENT = new Set(["PRESENT", "LATE", "PARTIAL"]);
const COUNTED = new Set([
  "PRESENT",
  "LATE",
  "PARTIAL",
  "ABSENT",
  "JUSTIFIED_ABSENCE",
  "INJURED",
  "EXCUSED",
]);
const AREAS = [
  ["PHYSICAL", "Física"],
  ["TECHNICAL", "Técnica"],
  ["TACTICAL", "Tática"],
  ["COGNITIVE", "Cognitiva"],
  ["EMOTIONAL", "Emocional"],
] as const;

function dateLabel(date?: Date | null) {
  return date ? date.toLocaleDateString("pt-BR") : "Sem avaliação";
}

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const user = await requireClubPermission("ATHLETES_VIEW");
  const query = await searchParams;
  const search = String(query.q || "").trim();
  const categoryId = String(query.category || "").trim();

  const [subscription, organization, categories] = await Promise.all([
    prisma.subscription.findUnique({
      where: { organizationId: user.organizationId },
    }),
    prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { accessStatus: true, complimentaryUntil: true },
    }),
    prisma.category.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const elite = hasEffectiveClubElite({
    plan: subscription?.plan,
    status: subscription?.status,
    trialEnds: subscription?.trialEnds,
    currentPeriodEnd: subscription?.currentPeriodEnd,
    accessStatus: organization?.accessStatus,
    complimentaryUntil: organization?.complimentaryUntil,
  });

  if (!elite)
    return (
      <section className="performance-upgrade">
        <span className="page-eyebrow">ONZEUP PERFORMANCE</span>
        <h1>Inteligência para desenvolver o elenco</h1>
        <p>
          Avaliações profissionais, evolução, presença, metas, medições e
          relatórios em um único ambiente.
        </p>
        <Link className="btn" href="/planos">
          Conhecer o Club Elite
        </Link>
      </section>
    );

  const athletes = await prisma.athlete.findMany({
    where: {
      organizationId: user.organizationId,
      active: true,
      ...(categoryId ? { categoryId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { nickname: { contains: search, mode: "insensitive" as const } },
              { position: { contains: search, mode: "insensitive" as const } },
              {
                category: {
                  name: { contains: search, mode: "insensitive" as const },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      category: true,
      evaluations: {
        where: { status: "FINALIZED" },
        orderBy: { evaluatedAt: "desc" },
        take: 2,
        include: { scores: true },
      },
      trainingAttendances: {
        orderBy: { session: { startsAt: "desc" } },
        take: 30,
      },
      performanceGoals: {
        where: { status: { in: ["NOT_STARTED", "IN_PROGRESS", "REVIEW"] } },
        select: { id: true },
      },
      bodyMeasurements: {
        orderBy: { measuredAt: "desc" },
        take: 1,
        select: { measuredAt: true },
      },
    },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });

  const rows = athletes.map((athlete) => {
    const current = athlete.evaluations[0];
    const previous = athlete.evaluations[1];
    const average = current?.scores.length
      ? current.scores.reduce((n, s) => n + s.score, 0) / current.scores.length
      : null;
    const previousAverage = previous?.scores.length
      ? previous.scores.reduce((n, s) => n + s.score, 0) /
        previous.scores.length
      : null;
    const counted = athlete.trainingAttendances.filter((a) =>
      COUNTED.has(a.status),
    );
    const attendance = counted.length
      ? Math.round(
          (athlete.trainingAttendances.filter(
            (a) => COUNTED.has(a.status) && PRESENT.has(a.status),
          ).length /
            counted.length) *
            100,
        )
      : null;
    return {
      athlete,
      current,
      average,
      attendance,
      delta:
        average !== null && previousAverage !== null
          ? average - previousAverage
          : null,
    };
  });

  const evaluated = rows.filter((r) => r.average !== null);
  const squadAverage = evaluated.length
    ? evaluated.reduce((n, r) => n + (r.average || 0), 0) / evaluated.length
    : null;
  const attendanceRows = rows.filter((r) => r.attendance !== null);
  const attendanceAverage = attendanceRows.length
    ? Math.round(
        attendanceRows.reduce((n, r) => n + (r.attendance || 0), 0) /
          attendanceRows.length,
      )
    : null;
  const activeGoals = athletes.reduce(
    (n, a) => n + a.performanceGoals.length,
    0,
  );
  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - 90);
  const pendingEvaluation = rows.filter(
    (r) => !r.current || r.current.evaluatedAt < staleDate,
  ).length;
  const lowAttendance = rows.filter(
    (r) => r.attendance !== null && r.attendance < 75,
  ).length;
  const areaValues = AREAS.map(([key, label]) => {
    const values = rows.flatMap((r) => {
      const scores = r.current?.scores.filter((s) => s.area === key) || [];
      return scores.length
        ? [scores.reduce((n, s) => n + s.score, 0) / scores.length]
        : [];
    });
    return {
      key,
      label,
      value: values.length
        ? values.reduce((a, b) => a + b, 0) / values.length
        : null,
    };
  });

  return (
    <main className="performance-hub">
      <header className="performance-hero">
        <div>
          <span className="page-eyebrow">ONZEUP PERFORMANCE • CLUB ELITE</span>
          <h1>Performance do elenco</h1>
          <p>
            Visão geral do desenvolvimento esportivo e acompanhamento
            individual.
          </p>
        </div>
        <div className="performance-hero-score">
          <small>ÍNDICE DO ELENCO</small>
          <strong>
            {squadAverage === null
              ? "—"
              : `${Math.round((squadAverage / 4) * 100)}%`}
          </strong>
          <span>{evaluated.length} avaliados</span>
        </div>
      </header>

      <section className="performance-kpis">
        <article>
          <span>ATLETAS ATIVOS</span>
          <strong>{athletes.length}</strong>
          <small>{categories.length} categorias</small>
        </article>
        <article>
          <span>NOTA MÉDIA</span>
          <strong>
            {squadAverage === null ? "—" : `${squadAverage.toFixed(2)}/4`}
          </strong>
          <small>últimas avaliações</small>
        </article>
        <article>
          <span>PRESENÇA MÉDIA</span>
          <strong>
            {attendanceAverage === null ? "—" : `${attendanceAverage}%`}
          </strong>
          <small>últimos 30 registros</small>
        </article>
        <article>
          <span>METAS ATIVAS</span>
          <strong>{activeGoals}</strong>
          <small>em desenvolvimento</small>
        </article>
      </section>

      <section className="performance-overview-grid">
        <article className="performance-panel performance-areas">
          <div className="performance-title">
            <div>
              <span className="page-eyebrow">MAPA COLETIVO</span>
              <h2>Valências do elenco</h2>
            </div>
            <span className="badge">Escala 1–4</span>
          </div>
          <div className="performance-area-list">
            {areaValues.map((area) => (
              <div key={area.key}>
                <div>
                  <strong>{area.label}</strong>
                  <span>
                    {area.value === null ? "—" : area.value.toFixed(2)}
                  </span>
                </div>
                <div className="performance-track">
                  <i style={{ width: `${((area.value || 0) / 4) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
        <article className="performance-panel performance-attention">
          <span className="page-eyebrow">PRIORIDADES</span>
          <h2>Atenção necessária</h2>
          <Link href="/performance">
            <span>!</span>
            <div>
              <strong>{pendingEvaluation} avaliações pendentes</strong>
              <small>Sem avaliação ou há mais de 90 dias</small>
            </div>
            <b>→</b>
          </Link>
          <Link href="/treinos">
            <span>↓</span>
            <div>
              <strong>{lowAttendance} atletas abaixo de 75%</strong>
              <small>Acompanhar presença nos treinos</small>
            </div>
            <b>→</b>
          </Link>
          <Link href="/performance">
            <span>✓</span>
            <div>
              <strong>{activeGoals} metas ativas</strong>
              <small>Planos individuais em andamento</small>
            </div>
            <b>→</b>
          </Link>
        </article>
      </section>

      <section className="performance-filter-panel">
        <form method="get">
          <label>
            <span>Buscar atleta</span>
            <input
              name="q"
              defaultValue={search}
              placeholder="Nome, apelido ou posição"
            />
          </label>
          <label>
            <span>Categoria</span>
            <select name="category" defaultValue={categoryId}>
              <option value="">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Aplicar filtros</button>
          {search || categoryId ? (
            <Link className="btn btn-secondary" href="/performance">
              Limpar
            </Link>
          ) : null}
        </form>
      </section>

      <section className="performance-roster">
        <div className="performance-title">
          <div>
            <span className="page-eyebrow">ELENCO</span>
            <h2>Performance individual</h2>
          </div>
          <span className="badge">{rows.length} atleta(s)</span>
        </div>
        {rows.length ? (
          <div className="performance-athlete-grid">
            {rows.map(({ athlete, current, average, attendance, delta }) => (
              <article className="performance-athlete-card" key={athlete.id}>
                <div className="performance-athlete-cover">
                  <span>{athlete.category?.name || "Sem categoria"}</span>
                  {athlete.photoUrl ? (
                    <img src={athlete.photoUrl} alt={athlete.name} />
                  ) : (
                    <b>
                      {(athlete.nickname || athlete.name)
                        .slice(0, 2)
                        .toUpperCase()}
                    </b>
                  )}
                  <i>{athlete.position || "Atleta"}</i>
                </div>
                <div className="performance-athlete-content">
                  <h3>{athlete.nickname || athlete.name}</h3>
                  <p>
                    {athlete.nickname
                      ? athlete.name
                      : "Acompanhamento individual"}
                  </p>
                  <div className="performance-athlete-stats">
                    <div>
                      <span>NOTA</span>
                      <strong>
                        {average === null ? "—" : average.toFixed(1)}
                      </strong>
                      {delta !== null ? (
                        <small className={delta >= 0 ? "up" : "down"}>
                          {delta >= 0 ? "+" : ""}
                          {delta.toFixed(1)}
                        </small>
                      ) : null}
                    </div>
                    <div>
                      <span>PRESENÇA</span>
                      <strong>
                        {attendance === null ? "—" : `${attendance}%`}
                      </strong>
                    </div>
                    <div>
                      <span>METAS</span>
                      <strong>{athlete.performanceGoals.length}</strong>
                    </div>
                  </div>
                  <small className="performance-last">
                    Última avaliação: {dateLabel(current?.evaluatedAt)}
                  </small>
                  <Link href={`/atletas/${athlete.id}/performance`}>
                    Abrir painel do atleta <b>→</b>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty">Nenhum atleta encontrado.</div>
        )}
      </section>
    </main>
  );
}
