"use client";

import {
  useEffect,
  useState,
  useTransition,
} from "react";

import {
  saveAthleteTrainingHistoryEntry,
} from "./actions";

type HistoryTopic =
  | "TECHNICAL"
  | "TACTICAL"
  | "PHYSICAL"
  | "COGNITIVE"
  | "EMOTIONAL"
  | "BEHAVIORAL"
  | "OCCURRENCE"
  | "GENERAL";

type HistoryVisibility =
  | "TECHNICAL_STAFF"
  | "MANAGEMENT"
  | "SHAREABLE";

const topics: {
  value: HistoryTopic;
  label: string;
}[] = [
  {
    value: "TECHNICAL",
    label: "Técnico",
  },
  {
    value: "TACTICAL",
    label: "Tático",
  },
  {
    value: "PHYSICAL",
    label: "Físico",
  },
  {
    value: "COGNITIVE",
    label: "Cognitivo",
  },
  {
    value: "EMOTIONAL",
    label: "Emocional",
  },
  {
    value: "BEHAVIORAL",
    label: "Comportamental",
  },
  {
    value: "OCCURRENCE",
    label: "Ocorrência",
  },
  {
    value: "GENERAL",
    label: "Geral",
  },
];

export default function AthleteTrainingHistoryButton({
  scheduleId,
  athleteId,
  athleteName,
  canCreate = true,
}: {
  scheduleId: string;
  athleteId: string;
  athleteName: string;
  canCreate?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const [topic, setTopic] =
    useState<HistoryTopic>("TECHNICAL");

  const [visibility, setVisibility] =
    useState<HistoryVisibility>(
      "TECHNICAL_STAFF",
    );

  const [content, setContent] =
    useState("");

  const [followUpRequired, setFollowUpRequired] =
    useState(false);

  const [error, setError] =
    useState("");

  const [saved, setSaved] =
    useState(false);

  const [pending, startTransition] =
    useTransition();

  useEffect(() => {
    if (!open) return;

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [open]);

  function closePanel() {
    if (pending) return;

    setOpen(false);
    setError("");
  }

  function saveEntry() {
    const note = content.trim();

    if (note.length < 3) {
      setError(
        "Escreva uma observação antes de salvar.",
      );
      return;
    }

    setError("");
    setSaved(false);

    const formData = new FormData();

    formData.set(
      "scheduleId",
      scheduleId,
    );

    formData.set(
      "athleteId",
      athleteId,
    );

    formData.set(
      "topic",
      topic,
    );

    formData.set(
      "visibility",
      visibility,
    );

    formData.set(
      "content",
      note,
    );

    formData.set(
      "followUpRequired",
      String(followUpRequired),
    );

    startTransition(() => {
      void (async () => {
        try {
          await saveAthleteTrainingHistoryEntry(
            formData,
          );

          setSaved(true);
          setContent("");
          setFollowUpRequired(false);

          window.setTimeout(() => {
            setOpen(false);
            setSaved(false);
          }, 700);
        } catch (caughtError) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Não foi possível salvar o registro.",
          );
        }
      })();
    });
  }

  if (!canCreate) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="athlete-history-trigger"
        onClick={() => {
          setSaved(false);
          setError("");
          setOpen(true);
        }}
        title={`Registrar observação de ${athleteName}`}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z" />
          <path d="m13.5 6.5 4 4" />
        </svg>

        Registro
      </button>

      {open ? (
        <div
          className="athlete-history-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closePanel();
            }
          }}
        >
          <section
            className="athlete-history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="athlete-history-title"
          >
            <header className="athlete-history-head">
              <div>
                <span>
                  11UP · HISTÓRICO DO ATLETA
                </span>

                <h3 id="athlete-history-title">
                  Registrar observação
                </h3>

                <p>{athleteName}</p>
              </div>

              <button
                type="button"
                onClick={closePanel}
                disabled={pending}
                aria-label="Fechar"
              >
                ×
              </button>
            </header>

            <div className="athlete-history-body">
              <label>
                <span>
                  Tipo de observação
                </span>

                <select
                  value={topic}
                  onChange={(event) =>
                    setTopic(
                      event.target
                        .value as HistoryTopic,
                    )
                  }
                  disabled={pending}
                >
                  {topics.map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Observação</span>

                <textarea
                  value={content}
                  onChange={(event) =>
                    setContent(
                      event.target.value,
                    )
                  }
                  placeholder="Registre o que aconteceu neste treino, evolução percebida, ponto técnico, comportamento ou situação que mereça acompanhamento."
                  maxLength={3000}
                  rows={6}
                  disabled={pending}
                />

                <small>
                  {content.length}/3000
                </small>
              </label>

              <label>
                <span>Visibilidade</span>

                <select
                  value={visibility}
                  onChange={(event) =>
                    setVisibility(
                      event.target
                        .value as HistoryVisibility,
                    )
                  }
                  disabled={pending}
                >
                  <option value="TECHNICAL_STAFF">
                    Comissão técnica
                  </option>

                  <option value="MANAGEMENT">
                    Gestão
                  </option>

                  <option value="SHAREABLE">
                    Compartilhável
                  </option>
                </select>
              </label>

              <label className="athlete-history-follow">
                <input
                  type="checkbox"
                  checked={followUpRequired}
                  onChange={(event) =>
                    setFollowUpRequired(
                      event.target.checked,
                    )
                  }
                  disabled={pending}
                />

                <span>
                  <strong>
                    Destacar para acompanhamento
                  </strong>

                  <small>
                    Este ponto ficará marcado para
                    acompanhamento futuro do atleta.
                  </small>
                </span>
              </label>

              {error ? (
                <div className="athlete-history-error">
                  {error}
                </div>
              ) : null}

              {saved ? (
                <div className="athlete-history-success">
                  Registro salvo no histórico do atleta.
                </div>
              ) : null}
            </div>

            <footer className="athlete-history-footer">
              <button
                type="button"
                className="athlete-history-cancel"
                onClick={closePanel}
                disabled={pending}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="athlete-history-save"
                onClick={saveEntry}
                disabled={
                  pending ||
                  content.trim().length < 3
                }
              >
                {pending
                  ? "Salvando..."
                  : "Salvar no histórico"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      <style jsx>{`
        .athlete-history-trigger {
          margin-top: 7px;
          width: fit-content;
          border: 0;
          background: transparent;
          padding: 0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #52615c;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition:
            color 160ms ease,
            transform 160ms ease;
        }

        .athlete-history-trigger:hover {
          color: #17372d;
          transform: translateY(-1px);
        }

        .athlete-history-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(2, 12, 9, 0.58);
          backdrop-filter: blur(6px);
          overflow-y: auto;
        }

        .athlete-history-modal {
          width: min(620px, 100%);
          height: min(760px, calc(100vh - 40px));
          max-height: calc(100vh - 40px);
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid rgba(8, 34, 27, 0.12);
          border-radius: 24px;
          box-shadow:
            0 28px 80px rgba(3, 24, 18, 0.28);
        }

        .athlete-history-head {
          position: relative;
          padding: 26px 28px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          color: #ffffff;
          background:
            radial-gradient(
              circle at 90% 15%,
              rgba(157, 219, 22, 0.22),
              transparent 30%
            ),
            linear-gradient(
              135deg,
              #071b15,
              #0b2b21
            );
        }

        .athlete-history-head span {
          display: block;
          margin-bottom: 7px;
          color: #9ddb16;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.12em;
        }

        .athlete-history-head h3 {
          margin: 0;
          font-size: 24px;
          line-height: 1.15;
        }

        .athlete-history-head p {
          margin: 7px 0 0;
          color: rgba(255, 255, 255, 0.72);
          font-size: 14px;
        }

        .athlete-history-head > button {
          flex: 0 0 auto;
          width: 38px;
          height: 38px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          font-size: 25px;
          line-height: 1;
          cursor: pointer;
        }

        .athlete-history-body {
          padding: 26px 28px;
          display: grid;
          gap: 20px;
          overflow-y: auto;
          overscroll-behavior: contain;
        }

        .athlete-history-body > label {
          display: grid;
          gap: 8px;
        }

        .athlete-history-body > label > span {
          color: #15251f;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .athlete-history-body select,
        .athlete-history-body textarea {
          width: 100%;
          border: 1px solid #d9e0dd;
          border-radius: 14px;
          background: #f9fbfa;
          color: #14231e;
          font: inherit;
          outline: none;
        }

        .athlete-history-body select {
          min-height: 48px;
          padding: 0 14px;
        }

        .athlete-history-body textarea {
          padding: 14px;
          resize: vertical;
          line-height: 1.5;
        }

        .athlete-history-body select:focus,
        .athlete-history-body textarea:focus {
          border-color: #9ddb16;
          box-shadow: 0 0 0 3px rgba(157, 219, 22, 0.12);
        }

        .athlete-history-body label > small {
          justify-self: end;
          color: #7c8884;
          font-size: 11px;
        }

        .athlete-history-follow {
          display: flex !important;
          align-items: flex-start;
          gap: 12px !important;
          padding: 16px;
          border: 1px solid #dfe5e2;
          border-radius: 16px;
          background: #f8faf9;
        }

        .athlete-history-follow input {
          margin-top: 3px;
          width: 18px;
          height: 18px;
          accent-color: #9ddb16;
        }

        .athlete-history-follow > span {
          display: grid;
          gap: 4px;
          text-transform: none !important;
          letter-spacing: normal !important;
        }

        .athlete-history-follow strong {
          color: #16251f;
          font-size: 13px;
        }

        .athlete-history-follow small {
          color: #71807a;
          font-size: 12px;
          font-weight: 500;
          line-height: 1.4;
        }

        .athlete-history-error,
        .athlete-history-success {
          padding: 12px 14px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
        }

        .athlete-history-error {
          color: #9d1d1d;
          background: #fff1f1;
          border: 1px solid #ffd1d1;
        }

        .athlete-history-success {
          color: #24570f;
          background: #f1f9df;
          border: 1px solid #d7eba8;
        }

        .athlete-history-footer {
          padding: 18px 28px 24px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          border-top: 1px solid #edf0ee;
          background: #ffffff;
        }

        .athlete-history-footer button {
          min-height: 44px;
          padding: 0 18px;
          border-radius: 13px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .athlete-history-cancel {
          border: 1px solid #d9e0dd;
          background: #ffffff;
          color: #31423c;
        }

        .athlete-history-save {
          border: 1px solid #9ddb16;
          background: #9ddb16;
          color: #102111;
        }

        .athlete-history-footer button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .athlete-history-overlay {
            align-items: flex-start;
            padding: 12px;
          }

          .athlete-history-modal {
            margin-top: 12px;
            max-height: calc(100vh - 24px);
            border-radius: 20px;
          }

          .athlete-history-head,
          .athlete-history-body {
            padding-left: 20px;
            padding-right: 20px;
          }

          .athlete-history-footer {
            padding: 16px 20px 20px;
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .athlete-history-head h3 {
            font-size: 21px;
          }
        }
      `}</style>
    </>
  );
}