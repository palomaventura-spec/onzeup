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

function formatDate(date: Date | null | undefined) {
  return date ? date.toLocaleDateString("pt-BR") : "Sem avaliação";
}

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireClubPermission("ATHLETES_VIEW");
  const query = await searchParams;
  const search = String(query.q || "").trim();

  const [subscription, organization] = await Promise.all([
    prisma.subscription.findUnique({
      where: { organizationId: user.organizationId },
    }),
    prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        accessStatus: true,
        complimentaryUntil: true,
      },
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

  if (!elite) {
    return (
      <>
        <div className="page-head">
          <div>
            <span className="page-eyebrow">ONZEUP PERFORMANCE</span>
            <h1>Performance</h1>
            <p className="muted">
              Acompanhamento individual e evolução do elenco.
            </p>
          </div>
        </div>

        <section
          className="card"
          style={{
            padding: 36,
            textAlign: "center",
          }}
        >
          <span className="page-eyebrow">EXCLUSIVO CLUB ELITE</span>
          <h2>Transforme registros em acompanhamento esportivo</h2>
          <p className="muted" style={{ maxWidth: 680, margin: "0 auto 22px" }}>
            Avaliações profissionais, gráficos de evolução, presença nos treinos,
            súmulas, estatísticas, medições físicas, bem-estar e relatórios por atleta.
          </p>
          <Link className="btn" href="/planos">
            Conhecer o Club Elite
          </Link>
        </section>
      </>
    );
  }

  const athletes = await prisma.athlete.findMany({
    where: {
      organizationId: user.organizationId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { nickname: { contains: search, mode: "insensitive" as const } },
              { position: { contains: search, mode: "insensitive" as const } },
              { category: { name: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    include: {
      category: true,
      evaluations: {
        where: { status: "FINALIZED" },
        orderBy: { evaluatedAt: "desc" },
        take: 1,
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
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <>
      <div className="page-head">
        <div>
          <span className="page-eyebrow">ONZEUP PERFORMANCE • CLUB ELITE</span>
          <h1>Performance</h1>
          <p className="muted">
            Acompanhe avaliações, presença, metas e evolução de cada atleta.
          </p>
        </div>
        <span className="badge">{athletes.length} atleta(s)</span>
      </div>

      <section className="card" style={{ marginBottom: 18 }}>
        <form
          method="get"
          style={{
            display: "flex",
            alignItems: "end",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <label style={{ flex: "1 1 260px" }}>
            Buscar atleta
            <input
              name="q"
              defaultValue={search}
              placeholder="Nome, apelido, posição ou categoria"
            />
          </label>
          <button type="submit">Buscar</button>
          {search ? (
            <Link className="btn btn-secondary" href="/performance">
              Limpar
            </Link>
          ) : null}
        </form>
      </section>

      {athletes.length ? (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 18,
          }}
        >
          {athletes.map((athlete) => {
            const evaluation = athlete.evaluations[0];
            const average = evaluation?.scores.length
              ? evaluation.scores.reduce((sum, score) => sum + score.score, 0) /
                evaluation.scores.length
              : null;
            const counted = athlete.trainingAttendances.filter((item) =>
              COUNTED.has(item.status)
            );
            const attended = counted.filter((item) => PRESENT.has(item.status));
            const attendance = counted.length
              ? Math.round((attended.length / counted.length) * 100)
              : null;

            return (
              <article
                className="card"
                key={athlete.id}
                style={{ opacity: athlete.active ? 1 : 0.68 }}
              >
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div className="admin-athlete-photo">
                    {athlete.photoUrl ? (
                      <img src={athlete.photoUrl} alt={athlete.name} />
                    ) : (
                      <span>
                        {(athlete.nickname || athlete.name).slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="page-eyebrow">
                      {athlete.category?.name || "SEM CATEGORIA"}
                    </span>
                    <h2 style={{ marginBottom: 2 }}>
                      {athlete.nickname || athlete.name}
                    </h2>
                    <p className="muted" style={{ margin: 0 }}>
                      {athlete.nickname ? athlete.name : athlete.position || "Atleta"}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 10,
                    margin: "20px 0",
                  }}
                >
                  <div>
                    <span className="help">NOTA</span>
                    <strong style={{ display: "block" }}>
                      {average === null ? "—" : `${average.toFixed(1)}/4`}
                    </strong>
                  </div>
                  <div>
                    <span className="help">PRESENÇA</span>
                    <strong style={{ display: "block" }}>
                      {attendance === null ? "—" : `${attendance}%`}
                    </strong>
                  </div>
                  <div>
                    <span className="help">METAS</span>
                    <strong style={{ display: "block" }}>
                      {athlete.performanceGoals.length}
                    </strong>
                  </div>
                </div>

                <p className="help">
                  Última avaliação: {formatDate(evaluation?.evaluatedAt)}
                  {athlete.bodyMeasurements[0]
                    ? ` • Medição: ${formatDate(athlete.bodyMeasurements[0].measuredAt)}`
                    : ""}
                </p>

                <Link
                  className="btn"
                  href={`/atletas/${athlete.id}/performance`}
                >
                  Abrir Performance
                </Link>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="card empty">
          {search
            ? "Nenhum atleta encontrado para esta busca."
            : "Nenhum atleta cadastrado."}
        </section>
      )}
    </>
  );
}
