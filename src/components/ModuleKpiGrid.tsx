import Link from "next/link";
import type { ReactNode } from "react";

export type ModuleKpiItem = {
  label: string;
  value: ReactNode;
  description?: ReactNode;
  href?: string;
};

type ModuleKpiGridProps = {
  items: ModuleKpiItem[];
  className?: string;
  ariaLabel?: string;
};

function joinClasses(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}

export default function ModuleKpiGrid({
  items,
  className,
  ariaLabel = "Indicadores do módulo",
}: ModuleKpiGridProps) {
  return (
    <section
      className={joinClasses("module-kpi-grid", className)}
      aria-label={ariaLabel}
    >
      {items.map((item, index) => {
        const content = (
          <>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            {item.description ? (
              <small>{item.description}</small>
            ) : null}
          </>
        );

        if (item.href) {
          return (
            <Link
              key={`${item.label}-${index}`}
              href={item.href}
              className="module-kpi-card"
            >
              {content}
            </Link>
          );
        }

        return (
          <article
            key={`${item.label}-${index}`}
            className="module-kpi-card"
          >
            {content}
          </article>
        );
      })}
    </section>
  );
}
