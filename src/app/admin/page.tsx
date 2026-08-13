import { prisma } from "@/lib/prisma";

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {style:"currency",currency:"BRL"}).format(cents/100);
}

export default async function AdminHome() {
  const [organizations, activeSubs, athletes, charges] = await Promise.all([
    prisma.organization.count(),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.athlete.count(),
    prisma.charge.aggregate({ where: { status: "PAID" }, _sum: { amountCents: true } }),
  ]);

  return (
    <>
      <h1>Super Admin</h1>
      <p className="muted">Visão geral da plataforma OnzeUp.</p>

      <div className="grid">
        <div className="card"><h2>{organizations}</h2><span className="muted">Organizações</span></div>
        <div className="card"><h2>{activeSubs}</h2><span className="muted">Assinaturas ativas</span></div>
        <div className="card"><h2>{athletes}</h2><span className="muted">Atletas cadastrados</span></div>
        <div className="card"><h2>{money(charges._sum.amountCents ?? 0)}</h2><span className="muted">Pagamentos registrados</span></div>
      </div>
    </>
  );
}
