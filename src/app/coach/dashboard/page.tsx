import Link from "next/link";
import CopyInviteLink from "@/components/CopyInviteLink";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

function fmt(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function sportLabel(sport: string) {
  if (sport === "FOOTBALL") return "Campo";
  if (sport === "FUTSAL") return "Futsal";
  return "Campo + Futsal";
}

export default async function CoachDashboard() {
  const user = await requireUser();
  if (user.role !== "COACH") redirect(user.role === "GUARDIAN" ? "/responsavel" : "/dashboard");

  const coach = await prisma.coachProfile.findUnique({
    where: { ownerUserId: user.id },
    include: {
      _count: { select: { referrals: true } },
      referrals: {
        include: { user: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      },
      organizationAccesses: {
        where: { active: true },
        include: { organization: true, category: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!coach) redirect("/cadastro-coach");

  const accessFilters = coach.organizationAccesses
    .filter(a => a.canViewCallUps)
    .map(a => ({
      organizationId: a.organizationId,
      ...(a.categoryId ? { categoryId: a.categoryId } : {}),
    }));

  const matches = accessFilters.length
    ? await prisma.match.findMany({
        where: {
          status: "SCHEDULED",
          OR: accessFilters,
        },
        include: {
          organization: true,
          category: true,
          callUps: { include: { athlete: true } },
        },
        orderBy: { startsAt: "asc" },
        take: 12,
      })
    : [];

  const invite = `https://onzeup.com.br/convite/${coach.slug}`;

  return (
    <main className="coach-partner-dashboard">
      <header>
        <div>
          <span className="page-eyebrow">ONZEUP COACH</span>
          <h1>Olá, {coach.professionalName || coach.name}.</h1>
          <p>Seu perfil profissional continua único, mesmo quando você trabalha em mais de uma equipe ou organização.</p>
        </div>
        <Link className="btn-secondary" href="/coach/editar">Editar meu perfil</Link>
      </header>

      <section className="coach-dashboard-stats">
        <article>
          <small>VÍNCULOS ATIVOS</small>
          <strong>{coach.organizationAccesses.length}</strong>
          <span>equipes/categorias conectadas</span>
        </article>
        <article>
          <small>PRÓXIMOS JOGOS</small>
          <strong>{matches.length}</strong>
          <span>das equipes às quais você tem acesso</span>
        </article>
        <article>
          <small>ATLETAS INDICADOS</small>
          <strong>{coach._count.referrals}</strong>
          <span>cadastros atribuídos ao seu link</span>
        </article>
      </section>

      <section className="card coach-access-card">
        <div className="section-title-row">
          <div>
            <span className="page-eyebrow">MINHAS EQUIPES</span>
            <h2>Vínculos profissionais</h2>
          </div>
        </div>

        {coach.organizationAccesses.length ? (
          <div className="coach-access-list">
            {coach.organizationAccesses.map(access => (
              <article key={access.id}>
                <div>
                  <strong>{access.organization.publicName || access.organization.name}</strong>
                  <p>
                    {access.category?.name || "Todas as categorias"} • {sportLabel(access.sport)}
                  </p>
                </div>
                <div>
                  <span>{access.roleTitle || "Comissão técnica"}</span>
                  {access.canViewCallUps ? <b>Convocações</b> : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">Nenhuma organização vinculou seu perfil Coach ainda.</p>
        )}
      </section>

      <section className="card coach-callups-card">
        <div className="section-title-row">
          <div>
            <span className="page-eyebrow">CONVOCAÇÕES</span>
            <h2>Próximos jogos das suas equipes</h2>
          </div>
        </div>

        {matches.length ? (
          <div className="coach-match-list">
            {matches.map(match => (
              <article key={match.id}>
                <div>
                  <small>{fmt(match.startsAt)}</small>
                  <strong>{match.organization.publicName || match.organization.name}</strong>
                  <p>{match.category.name} • x {match.opponent}</p>
                </div>
                <div>
                  <span>{match.callUps.length} convocado(s)</span>
                  <Link className="btn-secondary btn-small" href={`/coach/convocacoes/${match.id}`}>
                    Ver lista →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">Nenhum jogo agendado nas equipes vinculadas.</p>
        )}
      </section>

      <div className="coach-dashboard-grid">
        <section className="card coach-referral-box">
          <span className="page-eyebrow">INDIQUE UM ATLETA</span>
          <h2>Seu link de parceiro</h2>
          <p>Envie este link aos responsáveis. O Player começa grátis e o cadastro fica associado à sua indicação.</p>
          <CopyInviteLink value={invite}/>
          <a className="btn" href={invite} target="_blank">Abrir convite ↗</a>
        </section>

        <section className="card coach-club-lead">
          <span className="page-eyebrow">TAMBÉM GERE UMA ESCOLINHA OU CT?</span>
          <h2>Leve sua gestão para o ONZEUP Club.</h2>
          <p>Seu perfil Coach permanece o mesmo; a organização é um contexto separado.</p>
          <a className="btn" href="https://club.onzeup.com.br">Conhecer ONZEUP Club →</a>
        </section>
      </div>
    </main>
  );
}
