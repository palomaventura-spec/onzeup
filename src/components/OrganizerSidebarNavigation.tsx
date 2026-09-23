"use client";

import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FolderKanban,
  Gauge,
  LayoutDashboard,
  Link2,
  MessageSquareText,
  Settings,
  ShieldCheck,
  Trophy,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type OrganizerSidebarItem = {
  href: string;
  label: string;
};

export type OrganizerSidebarGroup = {
  title: string;
  items: OrganizerSidebarItem[];
};

const iconByPath: Array<[string, React.ElementType]> = [
  ["/organizador/dashboard", LayoutDashboard],
  ["/organizador/competicoes", FolderKanban],
  ["/organizador/equipes", UsersRound],
  ["/organizador/inscricoes", ClipboardList],
  ["/organizador/atletas", UsersRound],
  ["/organizador/jogos", Trophy],
  ["/organizador/sumulas", ClipboardList],
  ["/organizador/classificacao", BarChart3],
  ["/organizador/arbitragem", ShieldCheck],
  ["/organizador/campos", CalendarDays],
  ["/organizador/fornecedores", Link2],
  ["/organizador/staff", UserRoundCog],
  ["/organizador/financeiro", CircleDollarSign],
  ["/organizador/patrocinadores", MessageSquareText],
  ["/organizador/operacional", Gauge],
  ["/organizador/relatorios", BarChart3],
  ["/organizador/configuracoes", Settings],
];

function isCurrentPath(pathname: string, href: string) {
  if (href === "/organizador/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function OrganizerSidebarNavigation({
  groups,
}: {
  groups: OrganizerSidebarGroup[];
}) {
  const pathname = usePathname();

  return (
    <div className="club-menu-groups">
      {groups.map((group) => (
        <section className="club-menu-group" key={group.title}>
          <h3>{group.title}</h3>

          <nav aria-label={group.title}>
            {group.items.map((item) => {
              const Icon =
                iconByPath.find(([path]) =>
                  item.href.startsWith(path)
                )?.[1] ?? ChevronRight;

              const active = isCurrentPath(pathname, item.href);

              return (
                <Link
                  href={item.href}
                  key={item.href}
                  className={active ? "is-active" : undefined}
                  aria-current={active ? "page" : undefined}
                  title={item.label}
                >
                  <Icon
                    aria-hidden="true"
                    size={19}
                    strokeWidth={1.8}
                  />

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