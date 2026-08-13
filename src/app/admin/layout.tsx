import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">ONZE<span>UP</span></div>
        <div className="muted">Super Admin</div>
        <nav className="nav">
          <Link href="/admin">Visão geral</Link>
          <Link href="/admin/organizacoes">Organizações</Link>
          <Link href="/admin/planos">Planos</Link>
          <Link href="/dashboard">Voltar ao app</Link>
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
