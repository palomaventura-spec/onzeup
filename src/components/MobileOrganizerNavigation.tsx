"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Gauge,
  Home,
  MapPinned,
  Medal,
  Settings,
  ShieldCheck,
  Store,
  Trophy,
  UserRoundCog,
  UsersRound,
} from "lucide-react";

import styles from "./MobileClubNavigation.module.css";

export type MobileOrganizerIcon =
  | "home"
  | "competitions"
  | "teams"
  | "registrations"
  | "athletes"
  | "matches"
  | "sheets"
  | "standings"
  | "referees"
  | "venues"
  | "suppliers"
  | "staff"
  | "finance"
  | "sponsors"
  | "operations"
  | "reports"
  | "settings";

export type MobileOrganizerNavItem = {
  href: string;
  label: string;
  icon: MobileOrganizerIcon;
};

type MobileOrganizerNavigationProps = {
  primaryItems: MobileOrganizerNavItem[];
  moreItems: MobileOrganizerNavItem[];
};

const iconMap = {
  home: Home,
  competitions: Trophy,
  teams: UsersRound,
  registrations: ClipboardList,
  athletes: UsersRound,
  matches: Medal,
  sheets: FileText,
  standings: BarChart3,
  referees: ShieldCheck,
  venues: MapPinned,
  suppliers: Store,
  staff: UserRoundCog,
  finance: CircleDollarSign,
  sponsors: Building2,
  operations: Gauge,
  reports: BarChart3,
  settings: Settings,
} satisfies Record<MobileOrganizerIcon, React.ElementType>;

function NavIcon({ name }: { name: MobileOrganizerIcon }) {
  const Icon = iconMap[name];

  return (
    <Icon
      aria-hidden="true"
      width={21}
      height={21}
      strokeWidth={1.8}
    />
  );
}

function isCurrentPath(pathname: string, href: string) {
  if (href === "/organizador/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MobileOrganizerNavigation({
  primaryItems,
  moreItems,
}: MobileOrganizerNavigationProps) {
  const pathname = usePathname();
  const bottomNavRef = useRef<HTMLElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const nav = bottomNavRef.current;
    const shell = nav?.closest<HTMLElement>(".club-app-light");

    if (!nav || !shell) return;

    const update = () => {
      shell.style.setProperty(
        "--club-bottom-nav-height",
        `${Math.ceil(nav.getBoundingClientRect().height)}px`
      );
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(nav);

    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      shell.style.removeProperty("--club-bottom-nav-height");
    };
  }, []);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  return (
    <>
      {moreOpen ? (
        <div
          className={styles.backdrop}
          onClick={() => setMoreOpen(false)}
        >
          <section
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-label="Mais opções"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.head}>
              <div>
                <span>11UP ORGANIZAÇÃO</span>
                <h2>Mais opções</h2>
              </div>

              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setMoreOpen(false)}
              >
                ×
              </button>
            </div>

            <nav className={styles.grid}>
              {moreItems.map((item) => {
                const active = isCurrentPath(pathname, item.href);

                return (
                  <Link
                    href={item.href}
                    key={item.href}
                    className={active ? styles.active : undefined}
                    onClick={() => setMoreOpen(false)}
                  >
                    <NavIcon name={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <form
              className={styles.logout}
              action="/api/auth/logout"
              method="post"
            >
              <button type="submit">Sair da conta</button>
            </form>
          </section>
        </div>
      ) : null}

      <nav
        className={styles.bottomNav}
        ref={bottomNavRef}
        aria-label="Navegação principal"
      >
        {primaryItems.map((item) => {
          const active = isCurrentPath(pathname, item.href);

          return (
            <Link
              href={item.href}
              key={item.href}
              className={active ? styles.active : undefined}
            >
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          className={moreOpen ? styles.active : undefined}
          aria-expanded={moreOpen}
          aria-label="Abrir mais opções"
          onClick={() => setMoreOpen(true)}
        >
          <span
            className={styles.moreIcon}
            aria-hidden="true"
          >
            •••
          </span>

          <span>Mais</span>
        </button>
      </nav>
    </>
  );
}