import Image from "next/image";
import Link from "next/link";

import ClubSidebarNavigation from "@/components/ClubSidebarNavigation";
import MobileClubNavigation, {
  type MobileClubNavItem,
} from "@/components/MobileClubNavigation";
import NotificationBell from "@/components/NotificationBell";
import { brand } from "@/config/brand";
import { getCurrentUser } from "@/lib/auth";
import {
  hasClubPermission,
  type ClubPermission,
} from "@/lib/club-permissions";

type MenuItem = {
  href: string;
  label: string;
  permission?: ClubPermission;
};

type MenuGroup = {
  title: string;
  items: MenuItem[];
};

type MobileMenuItem = MobileClubNavItem & {
  permission?: ClubPermission;
};

const groups: MenuGroup[] = [
  {
    title: "INÍCIO",
    items: [
      {
        href: "/dashboard",
        label: "Visão geral",
        permission: "DASHBOARD_VIEW",
      },
      {
        href: "/agenda",
        label: "Agenda",
        permission: "AGENDA_VIEW",
      },
    ],
  },
  {
    title: "ELENCO",
    items: [
      {
        href: "/atletas",
        label: "Atletas",
        permission: "ATHLETES_VIEW",
      },
      {
        href: "/categorias",
        label: "Categorias",
        permission: "CATEGORIES_VIEW",
      },
      {
        href: "/comissao",
        label: "Comissão técnica",
        permission: "STAFF_VIEW",
      },
      {
        href: "/performance",
        label: "Performance",
        permission: "ATHLETES_VIEW",
      },
    ],
  },
  {
    title: "FUTEBOL",
    items: [
      {
        href: "/treinos",
        label: "Treinos",
        permission: "TRAININGS_VIEW",
      },
      {
        href: "/jogos",
        label: "Jogos e Súmulas",
        permission: "MATCHES_VIEW",
      },
      {
        href: "/convocacoes",
        label: "Convocações",
        permission: "MATCHES_VIEW",
      },
      {
        href: "/qtr",
        label: "QTS",
        permission: "QTR_VIEW",
      },
    ],
  },
  {
    title: "RELACIONAMENTO",
    items: [
      {
        href: "/comunicacao",
        label: "Comunicação",
        permission: "COMMUNICATION_VIEW",
      },
      {
        href: "/vinculos-player",
        label: "Vínculos Player",
        permission: "PLAYER_LINKS_VIEW",
      },
    ],
  },
  {
    title: "GESTÃO",
    items: [
      {
        href: "/financeiro",
        label: "Financeiro",
        permission: "FINANCE_VIEW",
      },
      {
        href: "/acessos",
        label: "Usuários e acessos",
        permission: "USERS_MANAGE",
      },
      {
        href: "/integracoes",
        label: "Conexões",
        permission: "INTEGRATIONS_MANAGE",
      },
      {
        href: "/organizacao",
        label: "Configurações",
        permission: "ORGANIZATION_MANAGE",
      },
      {
        href: "/planos",
        label: "Dados da conta",
        permission: "PLAN_MANAGE",
      },
      {
        href: "/ajuda",
        label: "Ajuda",
      },
    ],
  },
];

const mobilePrimaryItems: MobileMenuItem[] = [
  {
    href: "/dashboard",
    label: "Início",
    icon: "home",
    permission: "DASHBOARD_VIEW",
  },
  {
    href: "/agenda",
    label: "Agenda",
    icon: "calendar",
    permission: "AGENDA_VIEW",
  },
  {
    href: "/atletas",
    label: "Elenco",
    icon: "athletes",
    permission: "ATHLETES_VIEW",
  },
  {
    href: "/comunicacao",
    label: "Comunicação",
    icon: "communication",
    permission: "COMMUNICATION_VIEW",
  },
];

const mobileMoreItems: MobileMenuItem[] = [
  {
    href: "/treinos",
    label: "Treinos",
    icon: "training",
    permission: "TRAININGS_VIEW",
  },
  {
    href: "/jogos",
    label: "Jogos",
    icon: "matches",
    permission: "MATCHES_VIEW",
  },
  {
    href: "/convocacoes",
    label: "Convocações",
    icon: "matches",
    permission: "MATCHES_VIEW",
  },
  {
    href: "/qtr",
    label: "QTS",
    icon: "qtr",
    permission: "QTR_VIEW",
  },
  {
    href: "/performance",
    label: "Performance",
    icon: "athletes",
    permission: "ATHLETES_VIEW",
  },
  {
    href: "/categorias",
    label: "Categorias",
    icon: "categories",
    permission: "CATEGORIES_VIEW",
  },
  {
    href: "/comissao",
    label: "Comissão",
    icon: "staff",
    permission: "STAFF_VIEW",
  },
  {
    href: "/vinculos-player",
    label: "Vínculos Player",
    icon: "players",
    permission: "PLAYER_LINKS_VIEW",
  },
  {
    href: "/financeiro",
    label: "Financeiro",
    icon: "finance",
    permission: "FINANCE_VIEW",
  },
  {
    href: "/acessos",
    label: "Usuários",
    icon: "users",
    permission: "USERS_MANAGE",
  },
  {
    href: "/integracoes",
    label: "Conexões",
    icon: "connections",
    permission: "INTEGRATIONS_MANAGE",
  },
  {
    href: "/organizacao",
    label: "Configurações",
    icon: "settings",
    permission: "ORGANIZATION_MANAGE",
  },
  {
    href: "/planos",
    label: "Conta",
    icon: "plan",
    permission: "PLAN_MANAGE",
  },
  {
    href: "/ajuda",
    label: "Ajuda",
    icon: "help",
  },
];

export default async function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  const canSee = (item: { permission?: ClubPermission }) => {
    if (!user) return false;

    return !item.permission || hasClubPermission(user, item.permission);
  };

  const visibleGroups = user
    ? groups
        .map((group) => ({
          ...group,
          items: group.items.filter(canSee),
        }))
        .filter((group) => group.items.length)
    : [];

  const visibleMobilePrimary = mobilePrimaryItems
    .filter(canSee)
    .map(({ permission: _, ...item }) => item);

  const visibleMobileMore = mobileMoreItems
    .filter(canSee)
    .map(({ permission: _, ...item }) => item);

  return (
    <div className="shell club-app-light">
      <aside className="sidebar club-sidebar-final">
        <div className="club-sidebar-head">
          <Link
            className="brand"
            href="/dashboard"
            aria-label={`${brand.name} ${brand.product}`}
          >
            <Image
              src={brand.logo}
              alt={brand.name}
              width={132}
              height={42}
              priority
            />
          </Link>

          <p>{brand.product} · Gestão esportiva</p>
        </div>

        <ClubSidebarNavigation groups={visibleGroups} />

        <div className="club-sidebar-signature">
          <small>TECNOLOGIA PARA O ESPORTE</small>
          <span>{brand.tagline}</span>
        </div>

        <form
          className="club-sidebar-logout"
          action="/api/auth/logout"
          method="post"
        >
          <button type="submit">
            Sair
          </button>
        </form>
      </aside>

      <div className="club-workspace">
        <header className="club-system-topbar">
          <div className="club-system-actions">
            {user?.organizationId ? (
              <NotificationBell
                organizationId={user.organizationId}
              />
            ) : null}
          </div>
        </header>

        <div className="main club-main-content">
          {children}
        </div>
      </div>

      <MobileClubNavigation
        primaryItems={visibleMobilePrimary}
        moreItems={visibleMobileMore}
      />
    </div>
  );
}