import type { ReactNode } from "react";

type ModuleHeroProps = {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  aside?: ReactNode;
  compact?: boolean;
  className?: string;
};

function joinClasses(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}

export default function ModuleHero({
  eyebrow,
  title,
  description,
  aside,
  compact = false,
  className,
}: ModuleHeroProps) {
  return (
    <header
      className={joinClasses(
        "module-hero",
        compact && "module-hero-compact",
        className,
      )}
    >
      <div className="module-hero-content">
        <span className="page-eyebrow">{eyebrow}</span>

        <h1>{title}</h1>

        {description ? (
          <div className="module-hero-description">
            {description}
          </div>
        ) : null}
      </div>

      {aside ? (
        <div className="module-hero-aside">
          {aside}
        </div>
      ) : null}
    </header>
  );
}
