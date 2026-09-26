import Image from "next/image";
import Link from "next/link";

import OrganizerSidebarNavigation, {
  type OrganizerSidebarGroup,
} from "@/components/OrganizerSidebarNavigation";

import MobileOrganizerNavigation, {
  type MobileOrganizerNavItem,
} from "@/components/MobileOrganizerNavigation";

import NotificationBell from "@/components/NotificationBell";
import { brand } from "@/config/brand";
import { getCurrentUser } from "@/lib/auth";

const groups: OrganizerSidebarGroup[] = [
  {
    title: "INÍCIO",
    items: [
      {
        href: "/organizador/dashboard",
        label: "Visão geral",
      },
    ],
  },
  {
    title: "COMPETIÇÕES",
    items: [
      {
        href: "/organizador/competicoes",
        label: "Competições",
      },
      {
        href: "/organizador/equipes",
        label: "Equipes",
      },
      {
        href: "/organizador/inscricoes",
        label: "Inscrições",
      },
      {
        href: "/organizador/atletas",
        label: "Atletas",
      },
    ],
  },
  {
    title: "ESPORTIVO",
    items: [
      {
        href: "/organizador/jogos",
        label: "Jogos",
      },
      {
        href: "/organizador/sumulas",
        label: "Súmulas",
      },
      {
        href: "/organizador/classificacao",
        label: "Classificação",
      },
      {
        href: "/organizador/arbitragem",
        label: "Arbitragem",
      },
      {
        href: "/organizador/campos",
        label: "Campos",
      },
    ],
  },
  {
    title: "GESTÃO",
    items: [
      {
        href: "/organizador/fornecedores",
        label: "Fornecedores",
      },
      {
        href: "/organizador/staff",
        label: "Staff",
      },
      {
        href: "/organizador/financeiro",
        label: "Financeiro",
      },
      {
        href: "/organizador/patrocinadores",
        label: "Patrocinadores",
      },
      {
        href: "/organizador/operacional",
        label: "Operacional",
      },
    ],
  },
  {
    title: "ANÁLISE",
    items: [
      {
        href: "/organizador/relatorios",
        label: "Relatórios",
      },
    ],
  },
  {
    title: "SISTEMA",
    items: [
      {
        href: "/organizador/configuracoes",
        label: "Configurações",
      },
    ],
  },
];

const mobilePrimaryItems: MobileOrganizerNavItem[] = [
  {
    href: "/organizador/dashboard",
    label: "Início",
    icon: "home",
  },
  {
    href: "/organizador/competicoes",
    label: "Competições",
    icon: "competitions",
  },
  {
    href: "/organizador/jogos",
    label: "Jogos",
    icon: "matches",
  },
  {
    href: "/organizador/financeiro",
    label: "Financeiro",
    icon: "finance",
  },
];

const mobileMoreItems: MobileOrganizerNavItem[] = [
  {
    href: "/organizador/equipes",
    label: "Equipes",
    icon: "teams",
  },
  {
    href: "/organizador/inscricoes",
    label: "Inscrições",
    icon: "registrations",
  },
  {
    href: "/organizador/atletas",
    label: "Atletas",
    icon: "athletes",
  },
  {
    href: "/organizador/sumulas",
    label: "Súmulas",
    icon: "sheets",
  },
  {
    href: "/organizador/classificacao",
    label: "Classificação",
    icon: "standings",
  },
  {
    href: "/organizador/arbitragem",
    label: "Arbitragem",
    icon: "referees",
  },
  {
    href: "/organizador/campos",
    label: "Campos",
    icon: "venues",
  },
  {
    href: "/organizador/fornecedores",
    label: "Fornecedores",
    icon: "suppliers",
  },
  {
    href: "/organizador/staff",
    label: "Staff",
    icon: "staff",
  },
  {
    href: "/organizador/patrocinadores",
    label: "Patrocinadores",
    icon: "sponsors",
  },
  {
    href: "/organizador/operacional",
    label: "Operacional",
    icon: "operations",
  },
  {
    href: "/organizador/relatorios",
    label: "Relatórios",
    icon: "reports",
  },
  {
    href: "/organizador/configuracoes",
    label: "Configurações",
    icon: "settings",
  },
];

export default async function OrganizerAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="shell club-app-light">
      <aside className="sidebar club-sidebar-final">
        <div className="club-sidebar-head">
          <Link
            className="brand"
            href="/organizador/dashboard"
            aria-label="11UP Organização"
          >
            <Image
              src={brand.logo}
              alt="11UP"
              width={150}
              height={42}
              priority
            />
          </Link>

          <p>Organização · Gestão de competições</p>
        </div>

        <OrganizerSidebarNavigation groups={groups} />

        <div className="club-sidebar-signature">
          <small>TECNOLOGIA PARA O ESPORTE</small>
          <span>{brand.tagline}</span>
        </div>

        <form
          className="club-sidebar-logout"
          action="/api/auth/logout"
          method="post"
        >
          <button type="submit">Sair</button>
        </form>
      </aside>

      <div className="club-workspace">
        <header className="club-system-topbar">
          <div />

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

      <MobileOrganizerNavigation
        primaryItems={mobilePrimaryItems}
        moreItems={mobileMoreItems}
      />
    </div>
  );
}