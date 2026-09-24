import Link from "next/link";

export type ModuleTabItem = {
  label: string;
  href: string;
  active?: boolean;
  badge?: string | number;
};

type ModuleTabsProps = {
  items: ModuleTabItem[];
  ariaLabel?: string;
  className?: string;
};

function joinClasses(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}

export default function ModuleTabs({
  items,
  ariaLabel = "Navegação do módulo",
  className,
}: ModuleTabsProps) {
  return (
    <nav
      className={joinClasses("module-tabs", className)}
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <Link
          key={`${item.href}-${item.label}`}
          href={item.href}
          className={item.active ? "active" : undefined}
          aria-current={item.active ? "page" : undefined}
        >
          {item.label}

          {item.badge !== undefined ? (
            <span className="module-tab-badge">{item.badge}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
