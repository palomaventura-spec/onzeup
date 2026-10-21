import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { hasEffectiveClubElite } from "@/lib/billing-entitlements";
import { requireClubPermission } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

type Role = "LINE_PLAYER" | "GOALKEEPER";
type Method = "11UP" | "TECNICO_TATICA";

function methodOf(input: {
  modelFamilyKey?: string | null;
  name?: string | null;
}): Method {
  if (input.modelFamilyKey?.startsWith("PLANILHA_")) return "TECNICO_TATICA";
  if (input.modelFamilyKey?.startsWith("ONZEUP_")) return "11UP";
  return /t[eé]cnic[oa][\s-]*t[aá]tic[oa]|planilha/i.test(input.name ?? "")
    ? "TECNICO_TATICA"
    : "11UP";
}

const METHODS: {
  key: Method;
  name: string;
  description: string;
}[] = [
  {
    key: "11UP",
    name: "Avaliação 11UP",
    description: "Modelo profissional de desenvolvimento esportivo.",
  },
  {
    key: "TECNICO_TATICA",
    name: "Avaliação Técnico-Tática",
    description: "Modelo complementar de observação com estágios percentuais.",
  },
];

export default async function ChooseTrainingEvaluationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ trainingScheduleId?: string; role?: string }>;
}) {
  const user = await requireClubPermission("ATHLETES_EDIT");
  const { id: athleteId } = await params;
  const query = await searchParams;
  const trainingScheduleId = String(query.trainingScheduleId ?? "").trim();
  if (!trainingScheduleId) notFound();

  const [athlete, training, subscription, organization] = await Promise.all([
    prisma.athlete.findFirst({
      where: { id: athleteId, organizationId: user.organizationId },
      select: { id: true, name: true, nickname: true, position: true },
    }),
    prisma.trainingSchedule.findFirst({
      where: { id: trainingScheduleId, organizationId: user.organizationId },
      select: { id: true, date: true, category: { select: { name: true } } },
    }),
    prisma.subscription.findUnique({ where: { organizationId: user.organizationId } }),
    prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { accessStatus: true, complimentaryUntil: true },
    }),
  ]);

  if (!athlete || !training) notFound();

  const elite = hasEffectiveClubElite({
    plan: subscription?.plan,
    status: subscription?.status,
    trialEnds: subscription?.trialEnds,
    currentPeriodEnd: subscription?.currentPeriodEnd,
    accessStatus: organization?.accessStatus,
    complimentaryUntil: organization?.complimentaryUntil,
  });
  if (!elite) redirect("/performance?erro=elite");

  const defaultRole = /gol(eir[oa])?/i.test(athlete.position ?? "")
    ? "GOALKEEPER"
    : "LINE_PLAYER";
  const role: Role = query.role === "GOALKEEPER" || query.role === "LINE_PLAYER"
    ? query.role
    : defaultRole;

  const session = await prisma.trainingSession.findFirst({
    where: { organizationId: user.organizationId, scheduleId: training.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, actualStartedAt: true },
  });

  const attendance = session
    ? await prisma.trainingAttendance.findUnique({
        where: { sessionId_athleteId: { sessionId: session.id, athleteId } },
        select: { status: true },
      })
    : null;

  const canEvaluate = Boolean(
    session &&
    (session.status === "IN_PROGRESS" || session.status === "COMPLETED") &&
    ["PRESENT", "LATE", "PARTIAL"].includes(attendance?.status ?? ""),
  );

  const [templates, completedEvaluations] = await Promise.all([
    prisma.performanceTemplate.findMany({
      where: {
        active: true,
        athleteRole: role,
        OR: [{ organizationId: null }, { organizationId: user.organizationId }],
      },
      select: {
        id: true,
        name: true,
        description: true,
        organizationId: true,
        modelFamilyKey: true,
        version: true,
        criteria: { where: { active: true }, select: { id: true } },
      },
      orderBy: [{ version: "desc" }, { name: "asc" }],
    }),
    session
      ? prisma.athleteEvaluation.findMany({
          where: {
            organizationId: user.organizationId,
            athleteId,
            trainingSessionId: session.id,
            status: "FINALIZED",
          },
          select: {
            id: true,
            template: { select: { modelFamilyKey: true, name: true } },
          },
          orderBy: { evaluatedAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const templateByMethod = new Map<Method, (typeof templates)[number]>();
  // Prefira modelos editáveis do clube, na versão ativa mais recente.
  for (const template of [...templates].sort((a, b) => {
    const aClub = a.organizationId === user.organizationId ? 1 : 0;
    const bClub = b.organizationId === user.organizationId ? 1 : 0;
    return bClub - aClub || b.version - a.version;
  })) {
    const method = methodOf(template);
    if (!templateByMethod.has(method)) templateByMethod.set(method, template);
  }

  const completedByMethod = new Map<Method, string>();
  for (const evaluation of completedEvaluations) {
    const method = methodOf(evaluation.template ?? {});
    if (!completedByMethod.has(method)) completedByMethod.set(method, evaluation.id);
  }

  const chooserBase = `/atletas/${athleteId}/performance/avaliacoes/escolher?trainingScheduleId=${encodeURIComponent(trainingScheduleId)}`;
  const returnTo = `/treinos/${trainingScheduleId}`;

  return (
    <main style={{ width: "100%", maxWidth: 1100, margin: "0 auto", padding: "clamp(16px, 3vw, 30px) 0", minWidth: 0 }}>
      <div style={{ marginBottom: 24 }}>
        <Link className="btn btn-secondary" href={returnTo}>
          ← Voltar à lista de presença
        </Link>
      </div>

      <section className="card" style={{ marginBottom: 18, padding: "clamp(20px, 3vw, 28px)" }}>
        <span className="page-eyebrow">11UP CLUB ELITE · AVALIAÇÃO NO TREINO</span>
        <h1 style={{ margin: "8px 0", fontSize: "clamp(25px, 3vw, 34px)" }}>
          Escolha o modelo de avaliação
        </h1>
        <p className="muted" style={{ margin: 0 }}>
          <strong>{athlete.nickname || athlete.name}</strong> · {training.category?.name || "Treino"}
          {training.date ? ` · ${training.date.toLocaleDateString("pt-BR")}` : ""}
        </p>
        <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
          A presença já registrada será preservada. Você pode usar apenas um modelo ou os dois no mesmo treino.
        </p>
      </section>

      <section className="card" style={{ marginBottom: 18, padding: "18px clamp(18px, 3vw, 26px)" }}>
        <strong style={{ display: "block", marginBottom: 10 }}>Função avaliada</strong>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className={role === "LINE_PLAYER" ? "btn" : "btn btn-secondary"} href={`${chooserBase}&role=LINE_PLAYER`}>
            Jogador de linha
          </Link>
          <Link className={role === "GOALKEEPER" ? "btn" : "btn btn-secondary"} href={`${chooserBase}&role=GOALKEEPER`}>
            Goleiro
          </Link>
        </div>
      </section>

      {!canEvaluate ? (
        <section className="card" role="status" style={{ padding: 20, borderColor: "#f4c674" }}>
          Para avaliar, inicie o treino e registre a presença do atleta como Presente, Atraso ou Parcial na lista de presença.
          A avaliação não altera automaticamente faltas nem justificativas.
        </section>
      ) : (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 16 }}>
          {METHODS.map((method) => {
            const template = templateByMethod.get(method.key);
            const completedId = completedByMethod.get(method.key);
            return (
              <article className="card" key={method.key} style={{ display: "flex", flexDirection: "column", gap: 14, padding: 24, minWidth: 0 }}>
                <span className="page-eyebrow">{method.key === "11UP" ? "MODELO 1 · 11UP" : "MODELO 2 · TÉCNICO-TÁTICA"}</span>
                <h2 style={{ margin: 0, fontSize: 22 }}>{method.name}</h2>
                <p className="muted" style={{ margin: 0, flexGrow: 1 }}>{method.description}</p>
                {template ? (
                  <span className="muted" style={{ fontSize: 12 }}>
                    {role === "GOALKEEPER" ? "Goleiro" : "Jogador de linha"} · {template.criteria.length} critérios · Versão {template.version}
                  </span>
                ) : (
                  <span className="muted">Modelo ainda não disponível para este clube.</span>
                )}
                {completedId ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <strong style={{ color: "#358018" }}>✓ Avaliação concluída neste treino</strong>
                    <Link className="btn btn-secondary" href={`/atletas/${athleteId}/performance/avaliacoes/${completedId}`}>
                      Ver avaliação
                    </Link>
                  </div>
                ) : template ? (
                  <Link
                    className="btn"
                    href={`/atletas/${athleteId}/performance/avaliacoes/nova?role=${role}&template=${encodeURIComponent(template.id)}&trainingScheduleId=${encodeURIComponent(trainingScheduleId)}&returnTo=${encodeURIComponent(returnTo)}`}
                    style={{ textAlign: "center" }}
                  >
                    Avaliar com este modelo →
                  </Link>
                ) : (
                  <Link className="btn btn-secondary" href="/performance/modelos">Gerenciar modelos</Link>
                )}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
