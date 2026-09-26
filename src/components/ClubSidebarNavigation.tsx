"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

export type ClubSidebarItem = {
  href: string;
  label: string;
};

export type ClubSidebarGroup = {
  title: string;
  items: ClubSidebarItem[];
};

const iconByPath: Array<[string, string]> = [
  ["/dashboard", "/brand/11up/icons/dashboard.svg"],
  ["/agenda", "/brand/11up/icons/agenda.svg"],

  ["/atletas", "/brand/11up/icons/athletes.svg"],
  ["/categorias", "/brand/11up/icons/categories.svg"],
  ["/comissao", "/brand/11up/icons/staff.svg"],
  ["/performance", "/brand/11up/icons/performance.svg"],

  ["/treinos", "/brand/11up/icons/training.svg"],
  ["/jogos", "/brand/11up/icons/games.svg"],
  ["/convocacoes", "/brand/11up/icons/convocations.svg"],
  ["/qtr", "/brand/11up/icons/qtr.svg"],

  ["/comunicacao", "/brand/11up/icons/communication.svg"],
  ["/vinculos-player", "/brand/11up/icons/player-links.svg"],

  ["/financeiro", "/brand/11up/icons/finance.svg"],
  ["/acessos", "/brand/11up/icons/users.svg"],
  ["/integracoes", "/brand/11up/icons/connections.svg"],
  ["/organizacao", "/brand/11up/icons/settings.svg"],
  ["/planos", "/brand/11up/icons/subscription.svg"],
  ["/ajuda", "/brand/11up/icons/help.svg"],
];

function isCurrentPath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

function getIcon(href: string) {
  return iconByPath.find(([path]) =>
    href.startsWith(path)
  )?.[1];
}

function iconStyle(icon: string): CSSProperties {
  return {
    WebkitMaskImage: `url("${icon}")`,
    maskImage: `url("${icon}")`,
  };
}

export default function ClubSidebarNavigation({
  groups,
}: {
  groups: ClubSidebarGroup[];
}) {
  const pathname = usePathname();

  return (
    <div className="club-menu-groups">
      {groups.map((group) => (
        <section
          className="club-menu-group"
          key={group.title}
        >
          <h3>{group.title}</h3>

          <nav aria-label={group.title}>
            {group.items.map((item) => {
              const icon = getIcon(item.href);

              const active = isCurrentPath(
                pathname,
                item.href
              );

              return (
                <Link
                  href={item.href}
                  key={item.href}
                  className={
                    active ? "is-active" : undefined
                  }
                  aria-current={
                    active ? "page" : undefined
                  }
                  title={item.label}
                >
                  {icon ? (
                    <span
                      className="club-nav-icon"
                      style={iconStyle(icon)}
                      aria-hidden="true"
                    />
                  ) : (
                    <span
                      className="club-nav-icon-fallback"
                      aria-hidden="true"
                    >
                      ›
                    </span>
                  )}

                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </section>
      ))}
    </div>
  );
}