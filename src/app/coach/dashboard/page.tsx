import Link from "next/link";
import CopyInviteLink from "@/components/CopyInviteLink";
import PendingSubmitButton from "@/components/PendingSubmitButton";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  acceptCoachOrganizationInvite,
  declineCoachOrganizationInvite,
  searchMatchingCoachLinks,
} from "./actions";

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

export default async function CoachDashboard({
  searchParams,
}: {
  searchParams: Promise<{ vinculo?: string }>;
}) {
  const query = await searchParams;
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
        include: { organization: true, category: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!coach) redirect("/cadastro-coach");

  const activeAccesses = coach.organizationAccesses.filter((access) => access.active);
  const clubInvites = coach.organizationAccesses.filter(
    (access) => !access.active && access.requestedBy === "CLUB"
  );
  const coachRequests = coach.organizationAccesses.filter(
    (access) => !access.active && access.requestedBy === "COACH"
  );

  const accessFilters = activeAccesses
    .filter((access) => access.canViewCallUps)
    .map((access) => ({
      organizationId: access.organizationId,
      ...(access.categoryId ? { categoryId: access.categoryId } : {}),
    }));

  const matches = accessFilters.length
    ? await prisma.match.findMany({
        where: { status: "SCHEDULED", OR: accessFilters },
        include: {
          organization: true,
          category: true,
          callUps: { include: { athlete: true } },
        },
        orderBy: { startsAt: "asc" },
        take: 12,
      })
    : [];

  const invite = `https://www.onzeup.com.br/convite/${coach.slug}`;

  const messages: Record<string, string> = {
    aceito: "Vínculo aceito. O acesso à equipe já está ativo.",
    recusado: "Convite de vínculo recusado.",
    solicitado: "Encontramos seu cadastro em uma ou mais organizações. A solicitação foi enviada para aprovação do clube.",
    "ja-solicitado": "Os vínculos encontrados já estão solicitados ou ativos.",
    "nenhum-cadastro": "Nenhum cadastro de comissão foi encontrado com o mesmo e-mail da sua conta Coach. Confirme com o clube qual e-mail foi informado.",
  };

  return (
    <main className="coach-partner-dashboard">
      <header>
        <div>
          <span className="page-eyebrow">ONZEUP COACH</span>
          <h1>Olá, {coach.professionalName || coach.name}.</h1>
          <p>Seu login é individual. Clubes liberam apenas os acessos das equipes e categorias em que você trabalha.</p>
        </div>
        <div className="actions">
          {coach.isPublic ? <Link className="btn-secondary" href={`/coach-profile/${coach.slug}`}>Ver meu site ↗</Link> : null}
          <Link className="btn-secondary" href="/coach/editar">Editar meu perfil</Link>
        </div>
      </header>

      {query.vinculo && messages[query.vinculo] ? <div className="notice">{messages[query.vinculo]}</div> : null}

      <section className="card coach-link-search">
        <div className="matching-copy">
          <span className="page-eyebrow">VÍNCULO COACH ↔ CLUB</span>
          <h2>Já foi cadastrado por uma equipe ONZEUP?</h2>
          <p className="muted">
            Se o clube cadastrou você na comissão usando o mesmo e-mail desta conta Coach, buscaremos as correspondências.
            O vínculo não é automático: você solicita e o clube confirma.
          </p>
        </div>
        <form action={searchMatchingCoachLinks}>
          <PendingSubmitButton className="btn" pendingText="Buscando vínculos...">
            Buscar vínculos com clubes
          </PendingSubmitButton>
        </form>
      </section>

      {clubInvites.length ? (
        <section className="card coach-pending-access-card">
          <div className="section-title-row">
            <div>
              <span className="page-eyebrow">CONVITES DE VÍNCULO</span>
              <h2>Clubes querem conectar seu ONZEUP Coach.</h2>
              <p className="muted">Aceite somente vínculos de organizações e equipes onde você realmente atua.</p>
            </div>
            <span className="badge">{clubInvites.length} pendente(s)</span>
          </div>

          <div className="coach-access-list">
            {clubInvites.map((access) => (
              <article key={access.id}>
                <div>
                  <strong>{access.organization.publicName || access.organization.name}</strong>
                  <p>{access.category?.name || "Todas as categorias"} • {sportLabel(access.sport)}</p>
                  <small>{access.roleTitle || "Comissão técnica"}</small>
                </div>
                <div className="coach-invite-actions">
                  <form action={acceptCoachOrganizationInvite}>
                    <input type="hidden" name="accessId" value={access.id} />
                    <PendingSubmitButton className="btn btn-small" pendingText="Aceitando...">Aceitar vínculo</PendingSubmitButton>
                  </form>
                  <form action={declineCoachOrganizationInvite}>
                    <input type="hidden" name="accessId" value={access.id} />
                    <PendingSubmitButton className="btn-secondary btn-small" pendingText="Recusando...">Recusar</PendingSubmitButton>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {coachRequests.length ? (
        <section className="card">
          <div className="section-title-row">
            <div>
              <span className="page-eyebrow">SOLICITAÇÕES ENVIADAS</span>
              <h2>Aguardando confirmação das equipes.</h2>
            </div>
            <span className="badge">{coachRequests.length}</span>
          </div>
          <div className="coach-access-list">
            {coachRequests.map((access) => (
              <article key={access.id}>
                <div>
                  <strong>{access.organization.publicName || access.organization.name}</strong>
                  <p>{access.category?.name || "Todas as categorias"} • {sportLabel(access.sport)}</p>
                </div>
                <span className="coach-request-status">Aguardando aprovação do clube</span>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="coach-dashboard-stats">
        <article><small>VÍNCULOS ATIVOS</small><strong>{activeAccesses.length}</strong><span>equipes/categorias conectadas</span></article>
        <article><small>PRÓXIMOS JOGOS</small><strong>{matches.length}</strong><span>das equipes às quais você tem acesso</span></article>
        <article><small>ATLETAS INDICADOS</small><strong>{coach._count.referrals}</strong><span>cadastros atribuídos ao seu link</span></article>
      </section>

      <section className="card coach-access-card">
        <div className="section-title-row">
          <div>
            <span className="page-eyebrow">MINHAS EQUIPES</span>
            <h2>Vínculos profissionais</h2>
            <p className="muted">Um único login Coach pode ter vínculos com vários clubes, CTs e categorias.</p>
          </div>
        </div>

        {activeAccesses.length ? (
          <div className="coach-access-list">
            {activeAccesses.map((access) => (
              <article key={access.id}>
                <div>
                  <strong>{access.organization.publicName || access.organization.name}</strong>
                  <p>{access.category?.name || "Todas as categorias"} • {sportLabel(access.sport)}</p>
                </div>
                <div>
                  <span>{access.roleTitle || "Comissão técnica"}</span>
                  {access.canViewRoster ? <b>Elenco</b> : null}
                  {access.canViewSchedule ? <b>Agenda</b> : null}
                  {access.canViewCallUps ? <b>Convocações</b> : null}
                  {access.canManageCallUps ? <b>Gerencia convocação</b> : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">Nenhuma organização vinculada ao seu perfil Coach ainda.</p>
        )}
      </section>

      <section className="card coach-callups-card">
        <div className="section-title-row">
          <div><span className="page-eyebrow">CONVOCAÇÕES</span><h2>Próximos jogos das suas equipes</h2></div>
        </div>
        {matches.length ? (
          <div className="coach-match-list">
            {matches.map((match) => (
              <article key={match.id}>
                <div>
                  <small>{fmt(match.startsAt)}</small>
                  <strong>{match.organization.publicName || match.organization.name}</strong>
                  <p>{match.category.name} • x {match.opponent}</p>
                </div>
                <div>
                  <span>{match.callUps.length} convocado(s)</span>
                  <Link className="btn-secondary btn-small" href={`/coach/convocacoes/${match.id}`}>Ver lista →</Link>
                </div>
              </article>
            ))}
          </div>
        ) : <p className="muted">Nenhum jogo agendado nas equipes vinculadas.</p>}
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
          <Link className="btn" href="/club">Conhecer ONZEUP Club →</Link>
        </section>
      </div>
    </main>
  );
}
