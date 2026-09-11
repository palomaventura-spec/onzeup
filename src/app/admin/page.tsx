import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";
import { adminEmail } from "@/lib/admin-notifications";

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function dateTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(value);
}

function roleLabel(role: string) {
  if (role === "GUARDIAN") return "Player / Responsável";
  if (role === "COACH") return "Coach";
  if (role === "COORDINATOR") return "Club";
  return role;
}

export default async function AdminHome() {
  await requireSuperAdmin();

  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const [
    organizations,
    activeSubs,
    complimentary,
    athletes,
    charges,
    pendingPix,
    todayPlayers,
    todayCoaches,
    todayClubs,
    recentUsers,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.organization.count({ where: { accessStatus: "COMPLIMENTARY" } }),
    prisma.athlete.count(),
    prisma.charge.aggregate({ where: { status: "PAID" }, _sum: { amountCents: true } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { role: "GUARDIAN", createdAt: { gte: since } } }),
    prisma.user.count({ where: { role: "COACH", createdAt: { gte: since } } }),
    prisma.user.count({ where: { role: "COORDINATOR", createdAt: { gte: since } } }),
    prisma.user.findMany({
      where: { role: { in: ["GUARDIAN", "COACH", "COORDINATOR"] } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        accountStatus: true,
        emailVerifiedAt: true,
        createdAt: true,
        organizationId: true,
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  return (
    <main className="admin-home-v134">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">SUPER ADMIN</span>
          <h1>Central ONZEUP</h1>
          <p className="muted">Visão geral administrativa da plataforma.</p>
          <p className="admin-email-note">Admin central: {adminEmail()}</p>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="players-secondary-cta">Sair</button>
        </form>
      </div>

      <div className="grid">
        <div className="card"><h2>{organizations}</h2><span className="muted">Organizações</span></div>
        <div className="card"><h2>{activeSubs}</h2><span className="muted">Assinaturas ativas</span></div>
        <div className="card"><h2>{complimentary}</h2><span className="muted">Cortesias</span></div>
        <div className="card"><h2>{athletes}</h2><span className="muted">Atletas cadastrados</span></div>
        <div className="card"><h2>{money(charges._sum.amountCents ?? 0)}</h2><span className="muted">Pagamentos registrados</span></div>
      </div>

      <section className="card admin-new-signups">
        <div className="admin-section-head">
          <div>
            <span className="page-eyebrow">NOVOS CADASTROS</span>
            <h2>Acompanhamento dos testes</h2>
            <p className="muted">Os cadastros também geram aviso para o e-mail administrativo.</p>
          </div>
          <div className="admin-today-counts">
            <span><b>{todayPlayers}</b> Player(s) hoje</span>
            <span><b>{todayCoaches}</b> Coach(es) hoje</span>
            <span><b>{todayClubs}</b> Club(s) hoje</span>
          </div>
        </div>

        <div className="admin-registration-list">
          {recentUsers.map((item) => (
            <article key={item.id}>
              <div>
                <small>{roleLabel(item.role)}</small>
                <strong>{item.name}</strong>
                <p>{item.email}</p>
              </div>
              <div className="admin-registration-status">
                <span>{item.emailVerifiedAt ? "E-mail verificado" : item.role === "GUARDIAN" ? "Aguardando verificação" : item.accountStatus}</span>
                <small>{dateTime(item.createdAt)}</small>
              </div>
              {item.role === "COORDINATOR" && item.organizationId ? (
                <Link href={`/admin/organizacoes/${item.organizationId}`}>Gerenciar →</Link>
              ) : item.role === "GUARDIAN" ? (
                <Link href="/admin/players">Ver Players →</Link>
              ) : (
                <span className="muted">Coach</span>
              )}
            </article>
          ))}
          {!recentUsers.length ? <p className="muted">Nenhum cadastro recente.</p> : null}
        </div>
      </section>

      <section className="admin-shortcuts-v134">
        <Link href="/admin/organizacoes" className="card"><span className="page-eyebrow">CLUBES</span><h2>Organizações</h2><p className="muted">Planos, cortesias, suspensão e reativação.</p><strong>Gerenciar organizações →</strong></Link>
        <Link href="/admin/players" className="card"><span className="page-eyebrow">PLAYERS</span><h2>Players</h2><p className="muted">Cadastros, status e administração dos atletas.</p><strong>Gerenciar Players →</strong></Link>
        <Link href="/admin/pagamentos" className="card"><span className="page-eyebrow">PAGAMENTOS</span><h2>Pagamentos</h2><p className="muted">{pendingPix} pagamento(s) aguardando confirmação.</p><strong>Abrir pagamentos →</strong></Link>
        <Link href="/" className="card"><span className="page-eyebrow">PLATAFORMA</span><h2>Portal ONZEUP</h2><p className="muted">Abrir a experiência pública da plataforma.</p><strong>Abrir portal →</strong></Link>
      </section>
    </main>
  );
}
