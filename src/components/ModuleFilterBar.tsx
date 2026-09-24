import type { ReactNode } from "react";

type ModuleFilterBarProps = {
  children: ReactNode;
  trailing?: ReactNode;
  className?: string;
  formClassName?: string;
  method?: "get" | "post";
  action?: string;
  ariaLabel?: string;
};

function joinClasses(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}

export default function ModuleFilterBar({
  children,
  trailing,
  className,
  formClassName,
  method = "get",
  action,
  ariaLabel = "Filtros do módulo",
}: ModuleFilterBarProps) {
  return (
    <section
      className={joinClasses("module-filter-bar", className)}
      aria-label={ariaLabel}
    >
      <form
        method={method}
        action={action}
        className={formClassName}
      >
        {children}
      </form>

      {trailing ? (
        <div className="module-filter-bar-trailing">
          {trailing}
        </div>
      ) : null}
    </section>
  );
}
