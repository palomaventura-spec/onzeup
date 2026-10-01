import Image from "next/image";
import Link from "next/link";

import ClubSidebarNavigation from "@/components/ClubSidebarNavigation";
import MobileClubNavigation, {
  type MobileClubNavItem,
} from "@/components/MobileClubNavigation";
import NotificationBell from "@/components/NotificationBell";
import MobileCreateMenu from "@/components/MobileCreateMenu";
import { brand } from "@/config/brand";
import { getCurrentUser } from "@/lib/auth";
import { getAdminSupportSession } from "@/lib/admin-support";
import { endAdminSupportSession } from "@/app/admin/support/actions";
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
      {
        href: "/notificacoes",
        label: "Notificações",
        permission: "DASHBOARD_VIEW",
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
    ],
  },
  {
    title: "CONFIGURAÇÕES",
    items: [
      {
        href: "/organizacao",
        label: "Clube",
        permission: "ORGANIZATION_MANAGE",
      },
      {
        href: "/acessos",
        label: "Permissões",
        permission: "USERS_MANAGE",
      },
      {
        href: "/integracoes",
        label: "Integrações",
        permission: "INTEGRATIONS_MANAGE",
      },
      {
        href: "/configuracoes",
        label: "Dados da conta",
        permission: "PLAN_MANAGE",
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

  const supportSession =
    user?.role === "SUPER_ADMIN"
      ? await getAdminSupportSession(user.id)
      : null;

  const shellUser = user
    ? supportSession
      ? {
          ...user,
          organizationId: supportSession.organizationId,
          organization: supportSession.organization,
          isSupportMode: true,
        }
      : user
    : null;

  const canSee = (item: { permission?: ClubPermission }) => {
    if (!shellUser) return false;

    return (
      !item.permission ||
      hasClubPermission(shellUser, item.permission)
    );
  };

  const visibleGroups = shellUser
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

  const organizationName =
    shellUser?.organization?.publicName ||
    shellUser?.organization?.name ||
    "Meu Clube";

  const currentSeason = new Date().getFullYear();
  const canManagePlan =
    shellUser ? hasClubPermission(shellUser, "PLAN_MANAGE") : false;

  return (
    <div className="shell club-app-light">
      <aside className="sidebar club-sidebar-final club-sidebar-reference">
        <div className="club-sidebar-head club-sidebar-reference-head">
          <Link
            className="brand club-sidebar-reference-brand"
            href="/dashboard"
            aria-label={`${brand.name} ${brand.product}`}
          >
            <Image
              src={brand.logo}
              alt={brand.name}
              width={154}
              height={48}
              priority
            />
            <small>CLUB</small>
          </Link>

          <div className="club-sidebar-club-card" aria-label={`${organizationName} · Temporada ${currentSeason}`}>
            <span className="club-sidebar-club-mark">
              {shellUser?.organization?.logoUrl ? (
                <img
                  src={shellUser.organization.logoUrl}
                  alt=""
                />
              ) : (
                <Image
                  src="/brand/11up/logos/11up-symbol-transparent-light.svg"
                  alt=""
                  width={26}
                  height={26}
                />
              )}
            </span>

            <span className="club-sidebar-club-copy">
              <strong>{organizationName}</strong>
              <small>Temporada {currentSeason}</small>
            </span>
          </div>
        </div>

        <ClubSidebarNavigation groups={visibleGroups} />

        <div className="club-sidebar-reference-footer">
          {canManagePlan ? (
            <Link className="club-sidebar-elite-card" href="/planos">
              <span className="club-sidebar-elite-icon" aria-hidden="true">
                ♛
              </span>

              <span>
                <strong>Club Elite</strong>
                <small>Plano do clube</small>
              </span>

              <b aria-hidden="true">›</b>
            </Link>
          ) : null}

          <form
            className="club-sidebar-logout club-sidebar-reference-logout"
            action="/api/auth/logout"
            method="post"
          >
            <button type="submit">
              Sair
            </button>
          </form>
        </div>
      </aside>

      <div className="club-workspace">
        {supportSession ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
              padding: "10px 18px",
              background: "#facc15",
              color: "#111827",
              borderBottom: "1px solid #d4a900",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            <div>
              <strong>MODO SUPORTE 11UP</strong>
              <span style={{ marginLeft: "10px", fontWeight: 500 }}>
                Você está visualizando: {organizationName}
              </span>
            </div>

            <form action={endAdminSupportSession}>
              <button
                type="submit"
                style={{
                  border: "1px solid #111827",
                  borderRadius: "8px",
                  padding: "7px 12px",
                  background: "#111827",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Voltar ao Super Admin
              </button>
            </form>
          </div>
        ) : null}
        <header className="club-system-topbar">
          <div className="club-mobile-topbar-left">
            <Link
              className="club-mobile-topbar-brand"
              href="/dashboard"
              aria-label={`${brand.name} ${brand.product}`}
            >
              <Image
                src={brand.logo}
                alt={brand.name}
                width={104}
                height={34}
                priority
              />
              <small>CLUB</small>
            </Link>
          </div>

          <div className="club-system-actions">
            {shellUser?.organizationId ? (
              <NotificationBell
                organizationId={shellUser.organizationId}
              />
            ) : null}

            <MobileCreateMenu />
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