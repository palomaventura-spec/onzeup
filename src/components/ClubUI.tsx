import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";

function cx(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(" ");
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="club-page-header">
      <div>
        {eyebrow ? <span className="club-eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="club-page-actions">{actions}</div> : null}
    </header>
  );
}

export function MetricCard({
  label,
  value,
  helper,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  icon?: ReactNode;
  tone?: "neutral" | "positive" | "warning" | "danger" | "info";
}) {
  return (
    <article className={cx("club-metric-card", `is-${tone}`)}>
      {icon ? <span className="club-metric-icon">{icon}</span> : null}
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {helper ? <small>{helper}</small> : null}
      </div>
    </article>
  );
}

export function SectionCard({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("club-section-card", className)}>
      {title || eyebrow || description || action ? (
        <header>
          <div>
            {eyebrow ? <span className="club-eyebrow">{eyebrow}</span> : null}
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {action ? <div className="club-section-action">{action}</div> : null}
        </header>
      ) : null}
      <div className="club-section-content">{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="club-empty-state">
      {icon ? <span className="club-empty-icon">{icon}</span> : null}
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("club-filter-bar", className)}>{children}</div>;
}

export function DataTable({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("club-data-table", className)} {...props}>
      {children}
    </div>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  return <span className={cx("club-status-badge", `is-${tone}`)}>{children}</span>;
}

type ActionLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

export function PrimaryButton({ href, children, className }: ActionLinkProps) {
  return <Link className={cx("club-button club-button-primary", className)} href={href}>{children}</Link>;
}

export function SecondaryButton({ href, children, className }: ActionLinkProps) {
  return <Link className={cx("club-button club-button-secondary", className)} href={href}>{children}</Link>;
}

export function DangerButton({ href, children, className }: ActionLinkProps) {
  return <Link className={cx("club-button club-button-danger", className)} href={href}>{children}</Link>;
}

export function PlayerCard({
  photo,
  name,
  meta,
  status,
  actions,
}: {
  photo: ReactNode;
  name: string;
  meta?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <article className="club-player-card">
      <div className="club-player-photo">{photo}</div>
      <div className="club-player-body">
        <div className="club-player-title"><h3>{name}</h3>{status}</div>
        {meta ? <div className="club-player-meta">{meta}</div> : null}
        {actions ? <div className="club-player-actions">{actions}</div> : null}
      </div>
    </article>
  );
}

export function EventCard({
  date,
  type,
  title,
  meta,
  action,
}: {
  date: ReactNode;
  type?: ReactNode;
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <article className="club-event-card">
      <div className="club-event-date">{date}</div>
      <div className="club-event-body">
        {type ? <span className="club-eyebrow">{type}</span> : null}
        <h3>{title}</h3>
        {meta ? <div className="club-event-meta">{meta}</div> : null}
      </div>
      {action ? <div className="club-event-action">{action}</div> : null}
    </article>
  );
}
