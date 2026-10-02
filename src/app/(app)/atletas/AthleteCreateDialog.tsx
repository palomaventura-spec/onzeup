"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";

type Props = {
  trigger: ReactNode;
  children: ReactNode;
};

/** Abre o formulário já existente numa janela acessível, sem rolar a listagem. */
export default function AthleteCreateDialog({ trigger, children }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  function openDialog() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    setIsOpen(true);
  }

  function closeDialog() {
    dialogRef.current?.close();
    setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="athletes-v4-primary-button"
        onClick={openDialog}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        {trigger}
      </button>

      <dialog
        ref={dialogRef}
        className="athletes-v4-create-dialog"
        aria-labelledby="athletes-create-dialog-title"
        onClose={() => setIsOpen(false)}
      >
        <div className="athletes-v4-create-dialog-head">
          <div>
            <span className="athletes-v4-eyebrow">NOVO CADASTRO</span>
            <h2 id="athletes-create-dialog-title">Adicionar atleta</h2>
            <p>Cadastre no elenco ou em uma categoria de avaliação.</p>
          </div>
          <button
            type="button"
            className="athletes-v4-create-dialog-close"
            onClick={closeDialog}
            aria-label="Fechar cadastro"
          >
            ×
          </button>
        </div>

        <div className="athletes-v4-create-body">{children}</div>
      </dialog>
    </>
  );
}
