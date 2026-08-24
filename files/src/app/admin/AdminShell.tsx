"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/admin", label: "Visão geral", icon: "▦" },
  { href: "/admin/organizacoes", label: "Organizações", icon: "▣" },
  { href: "/admin/players", label: "Players", icon: "⚽" },
  { href: "/admin/pagamentos", label: "Pagamentos", icon: "R$" },
  { href: "/admin/planos", label: "Planos", icon: "★" },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isAuthPage =
    pathname === "/admin/login" ||
    pathname.startsWith("/admin/recuperar-senha");

  if (isAuthPage) {
    return <div className="admin-app-light">{children}</div>;
  }

  return (
    <div className="admin-app-light admin-shell-v171">
      <aside className="admin-sidebar-v171">
        <div className="admin-sidebar-brand-v171">
          <Link href="/admin" className="admin-brand-v171">
            ONZE<span>UP</span>
          </Link>
          <small>SUPER ADMIN</small>
        </div>

        <nav className="admin-nav-v171" aria-label="Navegação administrativa">
          <span className="admin-nav-group-v171">PLATAFORMA</span>

          {NAV_ITEMS.slice(0, 3).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(pathname, item.href) ? "active" : ""}
            >
              <i aria-hidden="true">{item.icon}</i>
              <span>{item.label}</span>
            </Link>
          ))}

          <span className="admin-nav-group-v171">FINANCEIRO</span>

          {NAV_ITEMS.slice(3).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(pathname, item.href) ? "active" : ""}
            >
              <i aria-hidden="true">{item.icon}</i>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar-bottom-v171">
          <Link href="/" className="admin-portal-link-v171">
            <i aria-hidden="true">↗</i>
            <span>Abrir ONZEUP</span>
          </Link>

          <form action="/api/auth/logout" method="post">
            <button type="submit" className="admin-logout-v171">
              <i aria-hidden="true">⇥</i>
              <span>Sair</span>
            </button>
          </form>
        </div>
      </aside>

      <div className="admin-main-v171">
        <header className="admin-mobile-bar-v171">
          <Link href="/admin" className="admin-brand-v171">
            ONZE<span>UP</span>
          </Link>
          <span>SUPER ADMIN</span>
        </header>

        <div className="admin-mobile-nav-v171">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(pathname, item.href) ? "active" : ""}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="admin-content-v171">{children}</div>
      </div>
    </div>
  );
}
