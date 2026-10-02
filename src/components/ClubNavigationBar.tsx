"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavigationTarget = { href: string; label: string };

const MODULE_NAMES: Record<string, string> = {
  acessos: "Permissões",
  agenda: "Agenda",
  atletas: "Atletas",
  categorias: "Categorias",
  comissao: "Comissão técnica",
  comunicacao: "Comunicação",
  configuracoes: "Dados da conta",
  convocacoes: "Convocações",
  financeiro: "Financeiro",
  integracoes: "Integrações",
  jogos: "Jogos",
  notificacoes: "Notificações",
  organizacao: "Clube",
  organizador: "Organizador",
  performance: "Performance",
  planos: "Planos",
  qtr: "QTS",
  treinos: "Treinos",
  "vinculos-player": "Vínculos Player",
};

/**
 * Retorno por hierarquia: sempre aponta para uma página interna conhecida,
 * mesmo após abrir o 11UP diretamente de um favorito ou pela PWA.
 */
function resolveBack(pathname: string, homeHref: string): NavigationTarget | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === homeHref || path === "/dashboard" || path === "/") return null;

  const segments = path.split("/").filter(Boolean);
  const [module, id, section, detail] = segments;
  const home: NavigationTarget = { href: homeHref, label: "Início" };

  if (module === "atletas") {
    if (!id) return home;
    if (id === "pre-cadastros") return { href: "/atletas", label: "Atletas" };

    const athletePage = { href: `/atletas/${id}`, label: "Ficha do atleta" };
    if (!section) return { href: "/atletas", label: "Atletas" };
    if (section !== "performance") return athletePage;
    if (!detail) return athletePage;

    if (detail === "avaliacoes" && segments.length > 4) {
      return {
        href: `/atletas/${id}/performance/avaliacoes`,
        label: "Avaliações",
      };
    }

    return { href: `/atletas/${id}/performance`, label: "Performance" };
  }

  if (module === "jogos" && id === undefined) return home;
  if (module === "jogos" && section) {
    return { href: `/jogos/${id}`, label: "Jogo" };
  }

  if (module === "convocacoes" && section) {
    return { href: `/convocacoes/${id}`, label: "Convocação" };
  }

  if (module === "organizador" && id === "competicoes" && section) {
    if (detail) {
      return { href: `/organizador/competicoes/${section}`, label: "Competição" };
    }
    return { href: "/organizador/competicoes", label: "Competições" };
  }

  if (module === "agenda" && id) return { href: "/agenda", label: "Agenda" };
  if (module === "performance" && id) {
    return { href: "/performance", label: "Performance" };
  }
  if (module === "qtr-pdf" || module === "qtr-public") {
    return { href: "/qtr", label: "QTS" };
  }
  if (module === "performance-report" || module === "monthly-performance-report" || module === "performance-evolution-pdf") {
    return { href: "/performance", label: "Performance" };
  }
  if (module === "coach" || module === "player") return home;

  // Páginas de detalhe dos módulos habituais voltam para a listagem.
  if (id && MODULE_NAMES[module]) {
    return { href: `/${module}`, label: MODULE_NAMES[module] };
  }

  return home;
}

export default function ClubNavigationBar({ homeHref }: { homeHref: string }) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const back = resolveBack(pathname || "/", homeHref);
  if (!back) return null;

  const backPending = pendingHref === back.href;
  const homePending = pendingHref === homeHref;

  return (
    <nav className="club-route-nav" aria-label="Navegação da página">
      <Link
        href={back.href}
        className="club-route-nav-back"
        aria-label={`Voltar para ${back.label}`}
        aria-disabled={backPending}
        onClick={() => setPendingHref(back.href)}
      >
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m14 18-6-6 6-6M8 12h12" />
        </svg>
        <span>{backPending ? "Abrindo…" : "Voltar"}</span>
        {!backPending ? <small>para {back.label}</small> : null}
      </Link>
      {back.href !== homeHref ? <span className="club-route-nav-separator" aria-hidden="true" /> : null}
      {back.href !== homeHref ? (
        <Link
          href={homeHref}
          className="club-route-nav-home"
          aria-disabled={homePending}
          onClick={() => setPendingHref(homeHref)}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z" />
          </svg>
          <span>{homePending ? "Abrindo…" : "Início"}</span>
        </Link>
      ) : null}
      <style>{`
        .club-route-nav {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 9px;
          min-width: 0;
          width: 100%;
          padding: 10px 34px 12px;
          margin-bottom: 14px;
          background: #f4f7f8;
          box-sizing: border-box;
        }
        .club-route-nav *, .club-route-nav *::before, .club-route-nav *::after { box-sizing: border-box; }
        .club-route-nav-back, .club-route-nav-home {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 42px;
          padding: 8px 12px;
          border-radius: 11px;
          border: 1px solid #dce5e7;
          background: #fff;
          color: #17313d;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.2;
          text-decoration: none;
          white-space: nowrap;
          transition: background .15s ease, border-color .15s ease;
        }
        .club-route-nav-back:hover, .club-route-nav-home:hover {
          background: #eef9d5;
          border-color: #9fcb43;
          color: #13291e;
        }
        .club-route-nav-back:focus-visible, .club-route-nav-home:focus-visible {
          outline: 3px solid #81b51e;
          outline-offset: 2px;
        }
        .club-route-nav-back small {
          font-size: 12px;
          font-weight: 600;
          color: #607380;
        }
        .club-route-nav-separator {
          width: 1px;
          height: 20px;
          background: #d6e0e2;
        }
        @media (max-width: 768px) {
          .club-route-nav { padding: 8px 14px 10px; margin-bottom: 8px; gap: 8px; }
          .club-route-nav-back, .club-route-nav-home { min-height: 44px; }
          .club-route-nav-back small { display: none; }
        }
      `}</style>
    </nav>
  );
}
