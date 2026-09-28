"use client";

import { useMemo, useState } from "react";

type CategoryOption = {
  id: string;
  name: string;
  type: string;
  sport: string;
};

type InvitationItem = {
  id: string;
  recipientName: string | null;
  recipientPhone: string | null;
  recipientEmail: string | null;
  status: string;
  expiresAt: string;
  createdAt: string;
  categoryName: string | null;
  categorySport: string | null;
};

type Props = {
  categories: CategoryOption[];
  invitations: InvitationItem[];
};

function sportLabel(sport: string | null) {
  if (sport === "FOOTBALL") return "Campo";
  if (sport === "FUTSAL") return "Futsal";
  return "Não definida";
}

function statusLabel(status: string) {
  if (status === "PENDING") return "Aguardando preenchimento";
  if (status === "SUBMITTED") return "Recebido para análise";
  if (status === "APPROVED") return "Aprovado";
  if (status === "REJECTED") return "Rejeitado";
  if (status === "EXPIRED") return "Expirado";
  if (status === "REVOKED") return "Revogado";
  return status;
}

export default function AthletePreRegistrationPanel({
  categories,
  invitations,
}: Props) {
  const [sport, setSport] = useState("ALL");
  const [categoryId, setCategoryId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [validityDays, setValidityDays] = useState("7");

  const [generatedLink, setGeneratedLink] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.type === "STANDARD" &&
          (sport === "ALL" || category.sport === sport),
      ),
    [categories, sport],
  );

  async function handleGenerate() {
    setMessage("");
    setGeneratedLink("");

    if (!recipientName.trim()) {
      setMessage("Informe o nome do responsável.");
      return;
    }

    if (!recipientPhone.trim() && !recipientEmail.trim()) {
      setMessage("Informe WhatsApp ou e-mail.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/athlete-pre-registrations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            categoryId: categoryId || null,
            recipientName,
            recipientPhone,
            recipientEmail,
            validityDays: Number(validityDays),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.error ||
            "Não foi possível gerar o link.",
        );
        return;
      }

      setGeneratedLink(data.link);
      setMessage("Link gerado com sucesso.");
    } catch {
      setMessage("Não foi possível gerar o link.");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!generatedLink) return;

    await navigator.clipboard.writeText(generatedLink);
    setMessage("Link copiado.");
  }

  return (
    <section className="athletes-v4-search-card">
      <header className="athletes-v4-section-head">
        <div>
          <span className="athletes-v4-eyebrow">
            CADASTRO DIGITAL
          </span>

          <h2>Gerar link de cadastro</h2>

          <p>
            Envie um link para o responsável preencher os
            dados do atleta. O cadastro só entra no elenco
            após aprovação do clube.
          </p>
        </div>
      </header>

      <div className="athletes-v4-filter-form">
        <label>
          <span>Modalidade</span>

          <select
            value={sport}
            onChange={(event) => {
              setSport(event.target.value);
              setCategoryId("");
            }}
          >
            <option value="ALL">Todas</option>
            <option value="FOOTBALL">Campo</option>
            <option value="FUTSAL">Futsal</option>
          </select>
        </label>

        <label>
          <span>Categoria</span>

          <select
            value={categoryId}
            onChange={(event) =>
              setCategoryId(event.target.value)
            }
          >
            <option value="">Definir depois</option>

            {filteredCategories.map((category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {sportLabel(category.sport)} ·{" "}
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Responsável</span>

          <input
            value={recipientName}
            onChange={(event) =>
              setRecipientName(event.target.value)
            }
            placeholder="Nome do responsável"
          />
        </label>

        <label>
          <span>WhatsApp</span>

          <input
            value={recipientPhone}
            onChange={(event) =>
              setRecipientPhone(event.target.value)
            }
            placeholder="Telefone com DDD"
          />
        </label>

        <label>
          <span>E-mail</span>

          <input
            type="email"
            value={recipientEmail}
            onChange={(event) =>
              setRecipientEmail(event.target.value)
            }
            placeholder="email@exemplo.com"
          />
        </label>

        <label>
          <span>Validade</span>

          <select
            value={validityDays}
            onChange={(event) =>
              setValidityDays(event.target.value)
            }
          >
            <option value="1">1 dia</option>
            <option value="3">3 dias</option>
            <option value="7">7 dias</option>
            <option value="15">15 dias</option>
            <option value="30">30 dias</option>
          </select>
        </label>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginTop: 18,
        }}
      >
        <button
          type="button"
          className="athletes-v4-filter-button"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? "Gerando..." : "Gerar link"}
        </button>

        {generatedLink ? (
          <button
            type="button"
            className="athletes-v4-clear"
            onClick={copyLink}
          >
            Copiar link
          </button>
        ) : null}
      </div>

      {generatedLink ? (
        <div
          style={{
            marginTop: 16,
            wordBreak: "break-all",
          }}
        >
          <strong>Link:</strong>
          <br />

          <a
            href={generatedLink}
            target="_blank"
            rel="noreferrer"
            style={{
              color: "#07131d",
              textDecoration: "underline",
            }}
          >
            {generatedLink}
          </a>
        </div>
      ) : null}

      {message ? (
        <p style={{ marginTop: 12 }}>{message}</p>
      ) : null}

      {invitations.length ? (
        <div style={{ marginTop: 28 }}>
          <span className="athletes-v4-eyebrow">
            LINKS RECENTES
          </span>

          <div
            style={{
              display: "grid",
              gap: 10,
              marginTop: 12,
            }}
          >
            {invitations.map((invitation) => (
              <article
                key={invitation.id}
                style={{
                  padding: 16,
                  border:
                    "1px solid rgba(148,163,184,.18)",
                  borderRadius: 16,
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 18,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <strong
                    style={{
                      display: "block",
                      fontSize: 15,
                      color: "#07131d",
                    }}
                  >
                    {invitation.recipientName ||
                      "Responsável"}
                  </strong>

                  <div
                    style={{
                      marginTop: 3,
                      color: "#334155",
                      fontSize: 13,
                    }}
                  >
                    {invitation.categoryName
                      ? `${sportLabel(
                          invitation.categorySport,
                        )} · ${invitation.categoryName}`
                      : "Categoria ainda não definida"}
                  </div>

                  <small
                    style={{
                      display: "block",
                      marginTop: 6,
                      color:
                        invitation.status ===
                        "SUBMITTED"
                          ? "#8a6200"
                          : "#64748b",
                      fontWeight:
                        invitation.status ===
                        "SUBMITTED"
                          ? 800
                          : 500,
                    }}
                  >
                    {statusLabel(invitation.status)} ·
                    expira em{" "}
                    {new Date(
                      invitation.expiresAt,
                    ).toLocaleDateString("pt-BR")}
                  </small>
                </div>

                {invitation.status ===
                "SUBMITTED" ? (
                  <a
                    href={`/atletas/pre-cadastros/${invitation.id}`}
                    style={{
                      minHeight: 42,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 16px",
                      borderRadius: 12,
                      textDecoration: "none",
                      fontSize: 12,
                      fontWeight: 900,
                      color: "#07131d",
                      background: "#99e600",
                      border: "1px solid #8bd000",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Analisar cadastro →
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
