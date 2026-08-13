"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Item = {
  id: string;
  label: string;
  href: string;
  serverDone: boolean;
};

export default function GettingStartedChecklist({
  items,
}: {
  items: Item[];
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("onzeup:getting-started:collapsed") === "1");
    setDismissed(localStorage.getItem("onzeup:getting-started:dismissed") === "1");
  }, []);

  if (dismissed) {
    return (
      <button
        type="button"
        className="checklist-restore"
        onClick={() => {
          localStorage.removeItem("onzeup:getting-started:dismissed");
          setDismissed(false);
        }}
      >
        Mostrar primeiros passos
      </button>
    );
  }

  const done = items.filter((item) => item.serverDone).length;
  const progress = Math.round((done / Math.max(items.length, 1)) * 100);

  return (
    <section className="getting-started">
      <div className="getting-started-head">
        <div>
          <span className="public-kicker">PRIMEIROS PASSOS</span>
          <h2>Prepare sua organização</h2>
          <p>{done} de {items.length} etapas concluídas</p>
        </div>

        <div className="getting-started-head-actions">
          <strong>{progress}%</strong>
          <button
            type="button"
            className="btn-secondary btn-small"
            onClick={() => {
              const next = !collapsed;
              setCollapsed(next);
              localStorage.setItem("onzeup:getting-started:collapsed", next ? "1" : "0");
            }}
          >
            {collapsed ? "Abrir" : "Recolher"}
          </button>
        </div>
      </div>

      <div className="getting-started-progress">
        <span style={{ width: `${progress}%` }} />
      </div>

      {!collapsed ? (
        <>
          <div className="getting-started-list">
            {items.map((item, index) => (
              <Link href={item.href} key={item.id} className={item.serverDone ? "done" : ""}>
                <span className="check-state">{item.serverDone ? "✓" : index + 1}</span>
                <strong>{item.label}</strong>
                <b>→</b>
              </Link>
            ))}
          </div>

          <button
            type="button"
            className="checklist-dismiss"
            onClick={() => {
              localStorage.setItem("onzeup:getting-started:dismissed", "1");
              setDismissed(true);
            }}
          >
            Ocultar este checklist
          </button>
        </>
      ) : null}
    </section>
  );
}
