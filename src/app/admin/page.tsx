import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export default async function AdminHome() {
  await requireSuperAdmin();

  const [organizations, activeSubs, athletes, charges, pendingPix] =
    await Promise.all([
      prisma.organization.count(),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.athlete.count(),
      prisma.charge.aggregate({
        where: { status: "PAID" },
        _sum: { amountCents: true },
      }),
      prisma.payment.count({ where: { status: "PENDING" } }),
    ]);

  return (
    <main className="admin-home-v134">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">SUPER ADMIN</span>
          <h1>Central ONZEUP</h1>
          <p className="muted">Visão geral administrativa da plataforma.</p>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="players-secondary-cta">Sair</button>
        </form>
      </div>

      <div className="grid">
        <div className="card">
          <h2>{organizations}</h2>
          <span className="muted">Organizações</span>
        </div>
        <div className="card">
          <h2>{activeSubs}</h2>
          <span className="muted">Assinaturas ativas</span>
        </div>
        <div className="card">
          <h2>{athletes}</h2>
          <span className="muted">Atletas cadastrados</span>
        </div>
        <div className="card">
          <h2>{money(charges._sum.amountCents ?? 0)}</h2>
          <span className="muted">Pagamentos registrados</span>
        </div>
      </div>

      <section className="admin-shortcuts-v134">
        <Link href="/admin/pagamentos" className="card">
          <span className="page-eyebrow">PIX</span>
          <h2>Pagamentos</h2>
          <p className="muted">
            {pendingPix} pagamento(s) aguardando confirmação.
          </p>
          <strong>Abrir pagamentos →</strong>
        </Link>

        <Link href="/" className="card">
          <span className="page-eyebrow">PLATAFORMA</span>
          <h2>Portal ONZEUP</h2>
          <p className="muted">Abrir a experiência pública da plataforma.</p>
          <strong>Abrir portal →</strong>
        </Link>
      </section>
    </main>
  );
}
