import Link from "next/link";

import MobileClubNavigation, {
  type MobileClubNavItem,
} from "@/components/MobileClubNavigation";
import NotificationBell from "@/components/NotificationBell";
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

type MobileMenuItem =
  MobileClubNavItem & {
    permission?: ClubPermission;
  };

const groups: MenuGroup[] = [
  {
    title: "GESTÃO",

    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        permission: "DASHBOARD_VIEW",
      },
      {
        href: "/agenda",
        label: "Agenda",
        permission: "AGENDA_VIEW",
      },
      {
        href: "/categorias",
        label: "Categorias",
        permission: "CATEGORIES_VIEW",
      },
      {
        href: "/comissao",
        label: "Comissão",
        permission: "STAFF_VIEW",
      },
      {
        href: "/atletas",
        label: "Atletas",
        permission: "ATHLETES_VIEW",
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
        label: "Jogos",
        permission: "MATCHES_VIEW",
      },
      {
        href: "/qtr",
        label: "QTR",
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
    title: "ADMINISTRAÇÃO",

    items: [
      {
        href: "/financeiro",
        label: "Financeiro",
        permission: "FINANCE_VIEW",
      },
      {
        href: "/acessos",
        label: "Usuários e Acessos",
        permission: "USERS_MANAGE",
      },
      {
        href: "/organizacao",
        label: "Site e Configurações",
        permission: "ORGANIZATION_MANAGE",
      },
      {
        href: "/planos",
        label: "Assinatura",
        permission: "PLAN_MANAGE",
      },
      {
        href: "/integracoes",
        label: "Conexões",
        permission: "INTEGRATIONS_MANAGE",
      },
      {
        href: "/ajuda",
        label: "Ajuda",
      },
    ],
  },
];

const mobilePrimaryItems:
  MobileMenuItem[] = [
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
      href: "/jogos",
      label: "Jogos",
      icon: "matches",
      permission: "MATCHES_VIEW",
    },
    {
      href: "/qtr",
      label: "QTR",
      icon: "qtr",
      permission: "QTR_VIEW",
    },
  ];

const mobileMoreItems:
  MobileMenuItem[] = [
    {
      href: "/treinos",
      label: "Treinos",
      icon: "training",
      permission: "TRAININGS_VIEW",
    },
    {
      href: "/atletas",
      label: "Atletas",
      icon: "athletes",
      permission: "ATHLETES_VIEW",
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
      href: "/comunicacao",
      label: "Comunicação",
      icon: "communication",
      permission: "COMMUNICATION_VIEW",
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
      href: "/planos",
      label: "Plano",
      icon: "plan",
      permission: "PLAN_MANAGE",
    },
    {
      href: "/organizacao",
      label: "Configurações",
      icon: "settings",
      permission: "ORGANIZATION_MANAGE",
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

  const canSee = (
    item: {
      permission?: ClubPermission;
    }
  ) => {
    if (!user) {
      return false;
    }

    if (!item.permission) {
      return true;
    }

    return hasClubPermission(
      user,
      item.permission
    );
  };

  const visibleGroups = user
    ? groups
        .map((group) => ({
          ...group,

          items:
            group.items.filter(canSee),
        }))
        .filter(
          (group) =>
            group.items.length > 0
        )
    : [];

  const visibleMobilePrimary =
    mobilePrimaryItems
      .filter(canSee)
      .map(
        ({
          permission: _permission,
          ...item
        }) => item
      );

  const visibleMobileMore =
    mobileMoreItems
      .filter(canSee)
      .map(
        ({
          permission: _permission,
          ...item
        }) => item
      );

  return (
    <div className="shell club-app-light">
      <aside className="sidebar club-sidebar-final">
        <div className="club-sidebar-head">
          <div className="brand">
            ONZE<span>UP</span>
          </div>

          <p>
            O futuro do futebol começa
            na base.
          </p>
        </div>

        <div className="club-menu-groups">
          {visibleGroups.map(
            (group) => (
              <section
                className="club-menu-group"
                key={group.title}
              >
                <h3>{group.title}</h3>

                <nav>
                  {group.items.map(
                    (item) => (
                      <Link
                        href={item.href}
                        key={item.href}
                      >
                        {item.label}
                      </Link>
                    )
                  )}
                </nav>
              </section>
            )
          )}
        </div>

        <form
          className="club-sidebar-logout"
          action="/api/auth/logout"
          method="post"
        >
          <button
            className="btn-secondary"
            type="submit"
          >
            Sair
          </button>
        </form>
      </aside>

      <main className="main">
        {user?.organizationId ? (
          <div className="club-system-topbar">
            <NotificationBell
              organizationId={
                user.organizationId
              }
            />
          </div>
        ) : null}

        {children}
      </main>

      <MobileClubNavigation
        primaryItems={
          visibleMobilePrimary
        }
        moreItems={
          visibleMobileMore
        }
      />
    </div>
  );
}
