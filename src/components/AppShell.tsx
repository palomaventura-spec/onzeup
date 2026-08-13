import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import DemoBanner from "@/components/DemoBanner";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const isDemo = user?.email === "admin@onzeup.com.br";

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">ONZE<span>UP</span></div>
        <div className="muted">O futuro do futebol começa na base.</div>

        <nav className="nav">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/agenda">Agenda</Link>
          <Link href="/organizacao">Organização</Link>
          <Link href="/categorias">Categorias</Link>
          <Link href="/comissao">Comissão</Link>
          <Link href="/atletas">Atletas</Link>
          <Link href="/treinos">Treinos</Link>
          <Link href="/jogos">Jogos</Link>
          <Link href="/qtr">QTR</Link>
          <Link href="/convocacoes">Convocações</Link>
          <Link href="/comunicacao">Comunicação</Link>
          <Link href="/responsaveis">Responsáveis</Link>
          <Link href="/vinculos-player">Vínculos Player</Link>
          <Link href="/notificacoes">Notificações</Link>
          <Link href="/financeiro">Financeiro</Link>
          <Link href="/integracoes">Integrações</Link>
          <Link href="/ajuda">Ajuda</Link>
          <Link href="/piloto">Piloto</Link>
          <Link href="/configuracoes">Configurações</Link>
        </nav>

        <form action="/api/auth/logout" method="post" style={{ marginTop: 28 }}>
          <button className="btn-secondary" type="submit">Sair</button>
        </form>
      </aside>

      <main className="main">{isDemo ? <DemoBanner kind="club" /> : null}{children}</main>
    </div>
  );
}
