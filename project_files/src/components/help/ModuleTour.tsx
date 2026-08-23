"use client";

import { useEffect, useMemo, useState } from "react";

type TourStep = {
  title: string;
  text: string;
  target?: string;
};

const TOURS: Record<string, TourStep[]> = {
  dashboard: [
    {
      title: "Bem-vindo à ONZEUP",
      text: "Este painel resume sua organização. Comece pelo checklist para preparar categorias, atletas, treinos e jogos.",
    },
    {
      title: "Seu site se atualiza com o painel",
      text: "As informações cadastradas aqui alimentam automaticamente o site público da organização.",
    },
    {
      title: "Ajuda sempre disponível",
      text: "Você pode reabrir estes tutoriais pelo botão Ajuda no menu lateral.",
    },
  ],
  atletas: [
    {
      title: "Atletas do clube",
      text: "Este cadastro pertence à organização. Ele é usado em categorias, convocações, financeiro e QTR.",
    },
    {
      title: "Responsável",
      text: "Cadastre nome e telefone do responsável para facilitar convocações e mensagens pelo WhatsApp.",
    },
    {
      title: "Não confunda com OnzeUp Player",
      text: "O perfil Player é administrado pela família. O cadastro do clube continua sob controle exclusivo da organização.",
    },
  ],
  qtr: [
    {
      title: "QTR automático",
      text: "A ONZEUP busca treinos e jogos cadastrados e monta a programação da semana.",
    },
    {
      title: "QTR manual ou híbrido",
      text: "Clique em uma célula para incluir ou editar treino, jogo, amistoso ou outro evento.",
    },
    {
      title: "Compartilhamento",
      text: "Depois de revisar, salve o QTR e use PDF/Imprimir ou Compartilhar para enviar aos responsáveis e grupos.",
    },
  ],
  financeiro: [
    {
      title: "Controle financeiro",
      text: "Registre mensalidades, arbitragem e cobranças extras por atleta.",
    },
    {
      title: "Pix manual",
      text: "Você pode informar a chave Pix da organização e enviar a cobrança pelo WhatsApp. A baixa é feita manualmente nesta fase.",
    },
  ],
  convocacoes: [
    {
      title: "Convocação privada",
      text: "Selecione os atletas convocados. Esta lista não aparece no site público.",
    },
    {
      title: "WhatsApp básico",
      text: "O botão abre a conversa do responsável com a mensagem pronta. A ONZEUP não lê o WhatsApp e não exige Business nesta modalidade.",
    },
    {
      title: "Confirmação",
      text: "Após a resposta do responsável, marque o atleta como Confirmado ou Não poderá comparecer.",
    },
  ],
  organizacao: [
    {
      title: "Identidade da organização",
      text: "Configure nome, logo, capa, cores e informações que serão usadas no site público.",
    },
    {
      title: "Privacidade",
      text: "Você escolhe quais seções ficam públicas, como atletas, comissão, treinos e jogos.",
    },
  ],
};

export default function ModuleTour({
  module,
  forceOpen = false,
}: {
  module: keyof typeof TOURS;
  forceOpen?: boolean;
}) {
  const steps = useMemo(() => TOURS[module] || [], [module]);
  const storageKey = `onzeup:tour:${module}`;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      return;
    }
    const seen = window.localStorage.getItem(storageKey);
    if (!seen && steps.length) setOpen(true);
  }, [forceOpen, storageKey, steps.length]);

  function close(markSeen = true) {
    if (markSeen) window.localStorage.setItem(storageKey, "seen");
    setOpen(false);
    setStep(0);
  }

  if (!steps.length) return null;

  return (
    <>
      <button
        type="button"
        className="tour-reopen-btn"
        onClick={() => {
          setStep(0);
          setOpen(true);
        }}
      >
        ? Ajuda desta tela
      </button>

      {open ? (
        <div className="tour-backdrop">
          <div className="tour-card">
            <div className="tour-progress">
              {steps.map((_, index) => (
                <span key={index} className={index <= step ? "active" : ""} />
              ))}
            </div>

            <span className="tour-counter">
              PASSO {step + 1} DE {steps.length}
            </span>
            <h2>{steps[step].title}</h2>
            <p>{steps[step].text}</p>

            <div className="tour-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => close(true)}
              >
                Pular tutorial
              </button>

              {step > 0 ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setStep((value) => value - 1)}
                >
                  Voltar
                </button>
              ) : null}

              {step < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((value) => value + 1)}
                >
                  Próximo
                </button>
              ) : (
                <button type="button" onClick={() => close(true)}>
                  Concluir
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
