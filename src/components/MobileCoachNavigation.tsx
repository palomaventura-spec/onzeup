"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./MobileCoachNavigation.module.css";

type NavigationItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  matches: (pathname: string) => boolean;
};

function HomeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={styles.icon}
    >
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9h13v-9" />
      <path d="M9.5 19v-5h5v5" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={styles.icon}
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20c.5-4.2 2.7-6.3 6.5-6.3s6 2.1 6.5 6.3" />
    </svg>
  );
}

function SiteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={styles.icon}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 12h17" />
      <path d="M12 3c2.3 2.4 3.5 5.4 3.5 9S14.3 18.6 12 21" />
      <path d="M12 3c-2.3 2.4-3.5 5.4-3.5 9S9.7 18.6 12 21" />
    </svg>
  );
}

function MatchesIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={styles.icon}
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4M17 3v4M3 10h18" />
      <path d="M8 14h3M13 14h3M8 17h3" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={styles.icon}
    >
      <path d="M14 5V3H5v18h9v-2" />
      <path d="M10 12h11" />
      <path d="m17 8 4 4-4 4" />
    </svg>
  );
}

const navigationItems: NavigationItem[] = [
  {
    href: "/coach/dashboard",
    label: "Início",
    icon: <HomeIcon />,
    matches: (pathname) =>
      pathname === "/coach/dashboard",
  },
  {
    href: "/coach/editar",
    label: "Perfil",
    icon: <ProfileIcon />,
    matches: (pathname) =>
      pathname.startsWith("/coach/editar"),
  },
  {
    href: "/coach/meu-site",
    label: "Meu site",
    icon: <SiteIcon />,
    matches: (pathname) =>
      pathname.startsWith("/coach/meu-site"),
  },
  {
    href: "/coach/dashboard#convocacoes",
    label: "Jogos",
    icon: <MatchesIcon />,
    matches: (pathname) =>
      pathname.startsWith("/coach/convocacoes"),
  },
];

export default function MobileCoachNavigation() {
  const pathname = usePathname();

  /*
   * A página /coach é pública ou redireciona para outra área.
   * O menu aparece somente nas páginas internas do treinador.
   */
  const isInternalCoachPage =
    pathname.startsWith("/coach/dashboard") ||
    pathname.startsWith("/coach/editar") ||
    pathname.startsWith("/coach/meu-site") ||
    pathname.startsWith("/coach/convocacoes");

  if (!isInternalCoachPage) {
    return null;
  }

  return (
    <nav
      className={styles.navigation}
      aria-label="Navegação do 11UP Coach"
    >
      <div className={styles.navigationInner}>
        {navigationItems.map((item) => {
          const active = item.matches(pathname);

          return (
            <Link
              href={item.href}
              key={item.href}
              className={`${styles.item} ${
                active ? styles.active : ""
              }`}
              aria-current={active ? "page" : undefined}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}

        <form
          className={styles.logoutForm}
          action="/api/auth/logout"
          method="post"
        >
          <button
            type="submit"
            className={styles.item}
            aria-label="Sair da conta"
          >
            <LogoutIcon />
            <span>Sair</span>
          </button>
        </form>
      </div>
    </nav>
  );
}