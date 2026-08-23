"use client";

import { useState } from "react";

export default function HelpTip({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span className="help-tip-wrap">
      <button
        type="button"
        className="help-tip-trigger"
        aria-label={`Ajuda: ${title}`}
        onClick={() => setOpen((value) => !value)}
      >
        ?
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="help-tip-dismiss"
            aria-label="Fechar ajuda"
            onClick={() => setOpen(false)}
          />
          <span className="help-tip-popover">
            <strong>{title}</strong>
            <span>{children}</span>
          </span>
        </>
      ) : null}
    </span>
  );
}
