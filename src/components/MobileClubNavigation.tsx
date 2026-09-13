"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import styles from "./MobileClubNavigation.module.css";

export type MobileClubNavItem = {
  href: string;
  label: string;
  icon:
    | "home"
    | "calendar"
    | "matches"
    | "qtr"
    | "training"
    | "athletes"
    | "categories"
    | "staff"
    | "communication"
    | "finance"
    | "players"
    | "users"
    | "connections"
    | "plan"
    | "settings"
    | "help";
};

type MobileClubNavigationProps = {
  primaryItems: MobileClubNavItem[];
  moreItems: MobileClubNavItem[];
};

function NavIcon({
  name,
}: {
  name: MobileClubNavItem["icon"];
}) {
  const common = {
    width: 21,
    height: 21,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5.5 10v10h13V10" />
          <path d="M9.5 20v-6h5v6" />
        </svg>
      );

    case "calendar":
      return (
        <svg {...common}>
          <rect
            x="3"
            y="5"
            width="18"
            height="16"
            rx="2"
          />
          <path d="M7 3v4M17 3v4M3 10h18" />
        </svg>
      );

    case "matches":
      return (
        <svg {...common}>
          <circle
            cx="12"
            cy="12"
            r="9"
          />
          <path d="m12 8 3 2.2-1.1 3.5h-3.8L9 10.2 12 8Z" />
          <path d="m6.8 6.8 2.2 3.4M15 10.2l2.2-3.4M10.1 13.7 8 17.4M13.9 13.7l2.1 3.7" />
        </svg>
      );

    case "qtr":
      return (
        <svg {...common}>
          <rect
            x="3"
            y="4"
            width="18"
            height="16"
            rx="2"
          />
          <path d="M3 9h18M9 9v11M15 9v11" />
        </svg>
      );

    case "training":
      return (
        <svg {...common}>
          <path d="M5 8v8M19 8v8M2.5 10v4M21.5 10v4M5 12h14" />
        </svg>
      );

    case "athletes":
      return (
        <svg {...common}>
          <circle
            cx="12"
            cy="7"
            r="3"
          />
          <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
        </svg>
      );

    case "categories":
      return (
        <svg {...common}>
          <rect
            x="3"
            y="3"
            width="7"
            height="7"
            rx="1"
          />
          <rect
            x="14"
            y="3"
            width="7"
            height="7"
            rx="1"
          />
          <rect
            x="3"
            y="14"
            width="7"
            height="7"
            rx="1"
          />
          <rect
            x="14"
            y="14"
            width="7"
            height="7"
            rx="1"
          />
        </svg>
      );

    case "staff":
      return (
        <svg {...common}>
          <circle
            cx="9"
            cy="8"
            r="3"
          />
          <circle
            cx="17"
            cy="10"
            r="2.5"
          />
          <path d="M3 20a6 6 0 0 1 12 0M14 16a5 5 0 0 1 7 4" />
        </svg>
      );

    case "communication":
      return (
        <svg {...common}>
          <path d="M4 5h16v11H8l-4 4V5Z" />
          <path d="M8 9h8M8 12h5" />
        </svg>
      );

    case "finance":
      return (
        <svg {...common}>
          <rect
            x="3"
            y="5"
            width="18"
            height="15"
            rx="2"
          />
          <path d="M3 9h18M16 14h2" />
        </svg>
      );

    case "players":
      return (
        <svg {...common}>
          <path d="M8 4h8l3 4-2 12H7L5 8l3-4Z" />
          <path d="M9 4c.5 2 1.5 3 3 3s2.5-1 3-3M9 12h6" />
        </svg>
      );

    case "users":
      return (
        <svg {...common}>
          <circle
            cx="8"
            cy="8"
            r="3"
          />
          <circle
            cx="17"
            cy="9"
            r="2"
          />
          <path d="M2.5 20a5.5 5.5 0 0 1 11 0M14 16a4.5 4.5 0 0 1 7.5 4" />
        </svg>
      );

    case "connections":
      return (
        <svg {...common}>
          <path d="M9 15 15 9" />
          <path d="M7.5 17.5 5 20a3.5 3.5 0 0 1-5-5l4-4a3.5 3.5 0 0 1 5 0" />
          <path d="m16.5 6.5 2.5-2.5a3.5 3.5 0 0 1 5 5l-4 4a3.5 3.5 0 0 1-5 0" />
        </svg>
      );

    case "plan":
      return (
        <svg {...common}>
          <path d="M5 3h14v18H5z" />
          <path d="M8 7h8M8 11h8M8 15h5" />
        </svg>
      );

    case "settings":
      return (
        <svg {...common}>
          <circle
            cx="12"
            cy="12"
            r="3"
          />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
        </svg>
      );

    case "help":
      return (
        <svg {...common}>
          <circle
            cx="12"
            cy="12"
            r="9"
          />
          <path d="M9.8 9a2.4 2.4 0 1 1 3.5 2.1c-.9.5-1.3 1-1.3 1.9M12 17h.01" />
        </svg>
      );
  }
}

function isCurrentPath(
  pathname: string,
  href: string
) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

export default function MobileClubNavigation({
  primaryItems,
  moreItems,
}: MobileClubNavigationProps) {
  const pathname = usePathname();

  const [moreOpen, setMoreOpen] =
    useState(false);

  return (
    <>
      {moreOpen ? (
        <div
          className={styles.backdrop}
          onClick={() =>
            setMoreOpen(false)
          }
        >
          <section
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-label="Mais opções"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className={styles.head}>
              <div>
                <span>ONZEUP CLUB</span>
                <h2>Mais opções</h2>
              </div>

              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() =>
                  setMoreOpen(false)
                }
              >
                ×
              </button>
            </div>

            <nav className={styles.grid}>
              {moreItems.map((item) => {
                const active =
                  isCurrentPath(
                    pathname,
                    item.href
                  );

                return (
                  <Link
                    href={item.href}
                    key={item.href}
                    className={
                      active
                        ? styles.active
                        : undefined
                    }
                    onClick={() =>
                      setMoreOpen(false)
                    }
                  >
                    <NavIcon
                      name={item.icon}
                    />

                    <span>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>

            <form
              className={styles.logout}
              action="/api/auth/logout"
              method="post"
            >
              <button type="submit">
                Sair da conta
              </button>
            </form>
          </section>
        </div>
      ) : null}

      <nav
        className={styles.bottomNav}
        aria-label="Navegação principal"
      >
        {primaryItems.map((item) => {
          const active =
            isCurrentPath(
              pathname,
              item.href
            );

          return (
            <Link
              href={item.href}
              key={item.href}
              className={
                active
                  ? styles.active
                  : undefined
              }
            >
              <NavIcon
                name={item.icon}
              />

              <span>
                {item.label}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          className={
            moreOpen
              ? styles.active
              : undefined
          }
          aria-expanded={moreOpen}
          aria-label="Abrir mais opções"
          onClick={() =>
            setMoreOpen(true)
          }
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