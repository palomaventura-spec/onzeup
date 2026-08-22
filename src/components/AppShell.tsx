import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import NotificationBell from "@/components/NotificationBell";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">ONZE<span>UP</span></div>
        <div className="muted">O futuro do futebol começa na base.</div>

        <nav className="nav club-nav">
          <span className="nav-section">GESTÃO</span>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/agenda">Agenda</Link>
          <Link href="/categorias">Categorias</Link>
          <Link href="/comissao">Comissão</Link>
          <Link href="/atletas">Atletas</Link>

          <span className="nav-section">FUTEBOL</span>
          <Link href="/treinos">Treinos</Link>
          <Link href="/jogos">Jogos</Link>
          <Link href="/qtr">QTR</Link>

          <span className="nav-section">RELACIONAMENTO</span>
          <Link href="/comunicacao">Comunicação</Link>
          <Link href="/vinculos-player">Vínculos Player</Link>

          <span className="nav-section">ADMINISTRAÇÃO</span>
          <Link href="/financeiro">Financeiro</Link>
          <Link href="/organizacao">Site e Configurações</Link>
          <Link href="/planos">Plano e assinatura</Link>
          <Link href="/integracoes">Integrações</Link>
          <Link href="/ajuda">Ajuda</Link>
        </nav>

        <form action="/api/auth/logout" method="post" style={{ marginTop: 28 }}>
          <button className="btn-secondary" type="submit">Sair</button>
        </form>
      </aside>

      <main className="main">
        {user?.organizationId ? (
          <div className="club-top-actions">
            <NotificationBell organizationId={user.organizationId} />
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
