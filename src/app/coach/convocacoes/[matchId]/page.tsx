import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

function fmt(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function CoachCallUpPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const user = await requireUser();
  if (user.role !== "COACH") redirect("/dashboard");

  const { matchId } = await params;

  const coach = await prisma.coachProfile.findUnique({
    where: { ownerUserId: user.id },
    select: { id: true },
  });
  if (!coach) redirect("/coach/dashboard");

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      organization: true,
      category: true,
      callUps: {
        include: { athlete: true },
        orderBy: { athlete: { name: "asc" } },
      },
    },
  });
  if (!match) notFound();

  const access = await prisma.coachOrganizationAccess.findFirst({
    where: {
      coachId: coach.id,
      organizationId: match.organizationId,
      active: true,
      canViewCallUps: true,
      OR: [{ categoryId: match.categoryId }, { categoryId: null }],
    },
  });

  if (!access) redirect("/coach/dashboard");

  return (
    <main className="coach-callup-detail">
      <Link href="/coach/dashboard" className="btn-secondary btn-small">← Voltar</Link>

      <header className="page-head">
        <div>
          <span className="page-eyebrow">CONVOCAÇÃO • {match.organization.publicName || match.organization.name}</span>
          <h1>{match.category.name} x {match.opponent}</h1>
          <p className="muted">{fmt(match.startsAt)} • {match.location || "Local a definir"}</p>
        </div>
      </header>

      <section className="card">
        <div className="section-title-row">
          <div>
            <span className="page-eyebrow">LISTA DA EQUIPE</span>
            <h2>{match.callUps.length} convocado(s)</h2>
          </div>
          <span className="badge">
            {access.canManageCallUps ? "Acesso de gestão" : "Somente visualização"}
          </span>
        </div>

        {match.callUps.length ? (
          <div className="coach-callup-athletes">
            {match.callUps.map(call => (
              <article key={call.id}>
                <div>
                  {call.athlete.photoUrl ? <img src={call.athlete.photoUrl} alt="" /> : <span>AT</span>}
                </div>
                <section>
                  <strong>{call.athlete.nickname || call.athlete.name}</strong>
                  <p>{call.athlete.position || "Atleta"}</p>
                </section>
                <b>{call.status === "CONFIRMED" ? "Confirmado" : call.status === "DECLINED" ? "Não poderá" : "Pendente"}</b>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">A organização ainda não adicionou atletas à convocação.</p>
        )}
      </section>
    </main>
  );
}
