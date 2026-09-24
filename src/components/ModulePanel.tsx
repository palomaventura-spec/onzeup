import type { ReactNode } from "react";

type ModulePanelProps = {
  eyebrow?: string;
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

function joinClasses(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}

export default function ModulePanel({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
}: ModulePanelProps) {
  const hasHeader = eyebrow || title || description || action;

  return (
    <section className={joinClasses("module-panel", className)}>
      {hasHeader ? (
        <div className="module-panel-head">
          <div className="module-panel-heading">
            {eyebrow ? (
              <span className="page-eyebrow">{eyebrow}</span>
            ) : null}

            {title ? <h2>{title}</h2> : null}

            {description ? (
              <div className="module-panel-description">
                {description}
              </div>
            ) : null}
          </div>

          {action ? (
            <div className="module-panel-action">{action}</div>
          ) : null}
        </div>
      ) : null}

      <div className="module-panel-content">{children}</div>
    </section>
  );
}
