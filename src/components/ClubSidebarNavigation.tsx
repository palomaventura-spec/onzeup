"use client";

import {
  BarChart3,
  BellRing,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Dumbbell,
  FolderKanban,
  Gauge,
  HelpCircle,
  LayoutDashboard,
  Link2,
  LucideIcon,
  MessageSquareText,
  Settings,
  ShieldCheck,
  Trophy,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type ClubSidebarItem = {
  href: string;
  label: string;
};

export type ClubSidebarGroup = {
  title: string;
  items: ClubSidebarItem[];
};

const iconByPath: Array<[string, LucideIcon]> = [
  ["/dashboard", LayoutDashboard],
  ["/agenda", CalendarDays],
  ["/atletas", UsersRound],
  ["/categorias", FolderKanban],
  ["/comissao", UserRoundCog],
  ["/performance", BarChart3],
  ["/treinos", Dumbbell],
  ["/jogos", Trophy],
  ["/convocacoes", BellRing],
  ["/qtr", ClipboardList],
  ["/comunicacao", MessageSquareText],
  ["/vinculos-player", Link2],
  ["/financeiro", CircleDollarSign],
  ["/acessos", ShieldCheck],
  ["/integracoes", Link2],
  ["/organizacao", Settings],
  ["/planos", Gauge],
  ["/ajuda", HelpCircle],
];

function isCurrentPath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function ClubSidebarNavigation({ groups }: { groups: ClubSidebarGroup[] }) {
  const pathname = usePathname();

  return (
    <div className="club-menu-groups">
      {groups.map((group) => (
        <section className="club-menu-group" key={group.title}>
          <h3>{group.title}</h3>
          <nav aria-label={group.title}>
            {group.items.map((item) => {
              const Icon = iconByPath.find(([path]) => item.href.startsWith(path))?.[1] ?? ChevronRight;
              const active = isCurrentPath(pathname, item.href);

              return (
                <Link
                  href={item.href}
                  key={item.href}
                  className={active ? "is-active" : undefined}
                  aria-current={active ? "page" : undefined}
                  title={item.label}
                >
                  <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
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
