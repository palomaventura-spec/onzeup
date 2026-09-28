"use client";

import {
  type FormEvent,
  useState,
} from "react";

import { useRouter } from "next/navigation";

export default function AthletePreRegistrationForm({
  token,
  recipientName,
  recipientPhone,
  recipientEmail,
}: {
  token: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
}) {
  const router = useRouter();

  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [photoUrl, setPhotoUrl] = useState("");
  const [photoUploading, setPhotoUploading] =
    useState(false);
  const [photoMessage, setPhotoMessage] =
    useState("");

  async function uploadPhoto(
    file?: File,
  ) {
    if (!file) return;

    setPhotoMessage("");
    setError("");

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.type)
    ) {
      setPhotoMessage(
        "Use uma foto JPG, PNG ou WEBP.",
      );
      return;
    }

    if (
      file.size <= 0 ||
      file.size > 4 * 1024 * 1024
    ) {
      setPhotoMessage(
        "A foto deve ter no máximo 4 MB.",
      );
      return;
    }

    setPhotoUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `/api/athlete-pre-registrations/${token}/photo`,
        {
          method: "POST",
          body: formData,
        },
      );

      const result = (await response.json()) as {
        error?: string;
        url?: string;
      };

      if (
        !response.ok ||
        !result.url
      ) {
        throw new Error(
          result.error ||
            "Não foi possível enviar a foto.",
        );
      }

      setPhotoUrl(result.url);

      setPhotoMessage(
        "Foto adicionada com sucesso.",
      );
    } catch (cause) {
      setPhotoMessage(
        cause instanceof Error
          ? cause.message
          : "Não foi possível enviar a foto.",
      );
    } finally {
      setPhotoUploading(false);
    }
  }
  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (photoUploading) {
      setError(
        "Aguarde o término do envio da foto.",
      );
      return;
    }

    setSending(true);
    setMessage("");
    setError("");

    try {
      const form = new FormData(event.currentTarget);

      const payload = {
        athlete: {
          photoUrl: photoUrl || null,

          name: String(
            form.get("name") || "",
          ).trim(),

          identity: String(
            form.get("identity") || "",
          ).trim(),

          cpf: String(
            form.get("cpf") || "",
          ).trim(),

          birthDate: String(
            form.get("birthDate") || "",
          ).trim(),

          height: String(
            form.get("height") || "",
          ).trim(),

          weight: String(
            form.get("weight") || "",
          ).trim(),

          category: String(
            form.get("category") || "",
          ).trim(),

          position1: String(
            form.get("position1") || "",
          ).trim(),

          position2: String(
            form.get("position2") || "",
          ).trim(),
        },

        family: {
          fatherName: String(
            form.get("fatherName") || "",
          ).trim(),

          motherName: String(
            form.get("motherName") || "",
          ).trim(),

          address: String(
            form.get("address") || "",
          ).trim(),

          email: String(
            form.get("email") || "",
          ).trim(),

          phone1: String(
            form.get("phone1") || "",
          ).trim(),

          phone2: String(
            form.get("phone2") || "",
          ).trim(),
        },

        health: {
          hasHealthPlan:
            String(
              form.get("hasHealthPlan") || "",
            ) === "YES",

          healthPlanName: String(
            form.get("healthPlanName") || "",
          ).trim(),

          susCard: String(
            form.get("susCard") || "",
          ).trim(),
        },

        sportsHistory: {
          lastClub: String(
            form.get("lastClub") || "",
          ).trim(),

          registeredClubs: String(
            form.get("registeredClubs") || "",
          ).trim(),

          amateurBond:
            form.get("amateurBond") === "on",

          referral: String(
            form.get("referral") || "",
          ).trim(),

          intermediary: String(
            form.get("intermediary") || "",
          ).trim(),

          arrivalDate: String(
            form.get("arrivalDate") || "",
          ).trim(),
        },

        guardian: {
          name: String(
            form.get("guardianName") || "",
          ).trim(),

          phone: String(
            form.get("guardianPhone") || "",
          ).trim(),

          email: String(
            form.get("guardianEmail") || "",
          ).trim(),

          accepted:
            form.get("guardianAccepted") === "on",
        },
      };

      if (!payload.athlete.name) {
        throw new Error(
          "Informe o nome completo do atleta.",
        );
      }

      if (!payload.athlete.birthDate) {
        throw new Error(
          "Informe a data de nascimento.",
        );
      }

      if (!payload.guardian.name) {
        throw new Error(
          "Informe o responsável pelo cadastro.",
        );
      }

      if (
        !payload.guardian.phone &&
        !payload.guardian.email
      ) {
        throw new Error(
          "Informe WhatsApp ou e-mail do responsável.",
        );
      }

      if (!payload.guardian.accepted) {
        throw new Error(
          "É necessário confirmar a responsabilidade pelas informações.",
        );
      }

      const response = await fetch(
        `/api/athlete-pre-registrations/${token}/submit`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Não foi possível enviar o cadastro.",
        );
      }

      setMessage(
        "Cadastro enviado com sucesso.",
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar o cadastro.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit}>
      {/* IDENTIFICAÇÃO */}

      <section
        className="card"
        style={{ marginTop: 18 }}
      >
        <span className="page-eyebrow">
          DADOS DO ATLETA
        </span>

        <h2>Identificação</h2>

        <div
          className="form-grid"
          style={{ marginTop: 18 }}
        >
          <div
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              alignItems: "center",
              gap: 18,
              padding: 16,
              border: "1px solid var(--line)",
              borderRadius: 14,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: 104,
                height: 104,
                borderRadius: "50%",
                overflow: "hidden",
                border: "1px solid var(--line)",
                background: "var(--surface, #f4f4f4)",
                display: "grid",
                placeItems: "center",
                flex: "0 0 auto",
              }}
            >
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Foto do atleta"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <span
                  style={{
                    fontSize: 12,
                    textAlign: "center",
                    padding: 8,
                    opacity: 0.6,
                  }}
                >
                  Sem foto
                </span>
              )}
            </div>

            <div
              style={{
                flex: "1 1 240px",
              }}
            >
              <strong
                style={{
                  display: "block",
                  marginBottom: 5,
                }}
              >
                Foto do atleta
              </strong>

              <p
                className="muted"
                style={{
                  margin: "0 0 10px",
                }}
              >
                Opcional. Envie uma foto atual para
                identificação do atleta.
              </p>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={photoUploading}
                onChange={(event) =>
                  uploadPhoto(
                    event.target.files?.[0],
                  )
                }
              />

              {photoUploading ? (
                <small
                  style={{
                    display: "block",
                    marginTop: 7,
                  }}
                >
                  Enviando foto...
                </small>
              ) : null}

              {photoMessage ? (
                <small
                  style={{
                    display: "block",
                    marginTop: 7,
                  }}
                >
                  {photoMessage}
                </small>
              ) : null}

              <small
                className="muted"
                style={{
                  display: "block",
                  marginTop: 7,
                }}
              >
                JPG, PNG ou WEBP · máximo 4 MB
              </small>
            </div>
          </div>

          <label style={{ gridColumn: "1 / -1" }}>
            Nome completo *
            <input
              name="name"
              required
              autoComplete="name"
            />
          </label>

          <label>
            Identidade
            <input
              name="identity"
              placeholder="RG / documento de identidade"
            />
          </label>

          <label>
            CPF
            <input
              name="cpf"
              inputMode="numeric"
              placeholder="000.000.000-00"
            />
          </label>

          <label>
            Data de nascimento *
            <input
              type="date"
              name="birthDate"
              required
            />
          </label>

          <label>
            Categoria
            <input
              name="category"
              placeholder="Ex.: Sub-9"
            />
          </label>

          <label>
            Altura
            <input
              name="height"
              inputMode="decimal"
              placeholder="Ex.: 1,35 m"
            />
          </label>

          <label>
            Peso
            <input
              name="weight"
              inputMode="decimal"
              placeholder="Ex.: 29 kg"
            />
          </label>

          <label>
            Posição 1
            <input
              name="position1"
              placeholder="Posição principal"
            />
          </label>

          <label>
            Posição 2
            <input
              name="position2"
              placeholder="Posição secundária"
            />
          </label>
        </div>
      </section>

      {/* FAMÍLIA */}

      <section
        className="card"
        style={{ marginTop: 18 }}
      >
        <span className="page-eyebrow">
          FAMÍLIA E CONTATO
        </span>

        <h2>Dados familiares</h2>

        <div
          className="form-grid"
          style={{ marginTop: 18 }}
        >
          <label>
            Nome do pai
            <input name="fatherName" />
          </label>

          <label>
            Nome da mãe
            <input name="motherName" />
          </label>

          <label style={{ gridColumn: "1 / -1" }}>
            Endereço
            <input
              name="address"
              autoComplete="street-address"
            />
          </label>

          <label>
            E-mail
            <input
              type="email"
              name="email"
              defaultValue={recipientEmail}
            />
          </label>

          <label>
            Telefone 1
            <input
              type="tel"
              name="phone1"
              defaultValue={recipientPhone}
            />
          </label>

          <label>
            Telefone 2
            <input
              type="tel"
              name="phone2"
            />
          </label>
        </div>
      </section>

      {/* SAÚDE */}

      <section
        className="card"
        style={{ marginTop: 18 }}
      >
        <span className="page-eyebrow">
          SAÚDE
        </span>

        <h2>Informações de saúde</h2>

        <div
          className="form-grid"
          style={{ marginTop: 18 }}
        >
          <label>
            Plano de saúde
            <select
              name="hasHealthPlan"
              defaultValue=""
            >
              <option value="">
                Selecione
              </option>

              <option value="YES">
                Sim
              </option>

              <option value="NO">
                Não
              </option>
            </select>
          </label>

          <label>
            Qual plano?
            <input
              name="healthPlanName"
              placeholder="Nome do plano"
            />
          </label>

          <label>
            Cartão Nacional de Saúde (SUS)
            <input
              name="susCard"
              inputMode="numeric"
            />
          </label>
        </div>
      </section>

      {/* HISTÓRICO ESPORTIVO */}

      <section
        className="card"
        style={{ marginTop: 18 }}
      >
        <span className="page-eyebrow">
          HISTÓRICO ESPORTIVO
        </span>

        <h2>Experiência anterior</h2>

        <div
          className="form-grid"
          style={{ marginTop: 18 }}
        >
          <label>
            Último clube
            <input name="lastClub" />
          </label>

          <label>
            Data de chegada
            <input
              type="date"
              name="arrivalDate"
            />
          </label>

          <label style={{ gridColumn: "1 / -1" }}>
            Clubes em que já foi registrado
            <textarea
              name="registeredClubs"
              rows={3}
              placeholder="Informe os clubes anteriores"
            />
          </label>

          <label>
            Indicação
            <input
              name="referral"
              placeholder="Nome de quem indicou"
            />
          </label>

          <label>
            Intermediário / Representante
            <input
              name="intermediary"
              placeholder="Nome, se houver"
            />
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <input
              type="checkbox"
              name="amateurBond"
            />

            Possui vínculo amador
          </label>
        </div>
      </section>

      {/* RESPONSÁVEL */}

      <section
        className="card"
        style={{ marginTop: 18 }}
      >
        <span className="page-eyebrow">
          RESPONSÁVEL PELO ATLETA
        </span>

        <h2>Confirmação do cadastro</h2>

        <div
          className="form-grid"
          style={{ marginTop: 18 }}
        >
          <label>
            Nome do responsável *
            <input
              name="guardianName"
              required
              defaultValue={recipientName}
            />
          </label>

          <label>
            WhatsApp
            <input
              type="tel"
              name="guardianPhone"
              defaultValue={recipientPhone}
            />
          </label>

          <label>
            E-mail
            <input
              type="email"
              name="guardianEmail"
              defaultValue={recipientEmail}
            />
          </label>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            marginTop: 20,
          }}
        >
          <input
            type="checkbox"
            name="guardianAccepted"
            required
            style={{
              marginTop: 4,
              width: 18,
              height: 18,
            }}
          />

          <span>
            Confirmo que sou responsável pelo atleta e
            declaro que as informações fornecidas neste
            cadastro são verdadeiras.
          </span>
        </label>
      </section>

      {/* ENVIO */}

      <section
        className="card"
        style={{ marginTop: 18 }}
      >
        <h2>Enviar ficha ao clube</h2>

        <p className="muted">
          Após o envio, a ficha seguirá para conferência
          da gestão do clube. Documentos e exames serão
          solicitados separadamente pelo sistema.
        </p>

        {message ? (
          <p
            className="form-success"
            role="status"
          >
            {message}
          </p>
        ) : null}

        {error ? (
          <p
            className="form-error"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={sending || Boolean(message)}
          style={{ marginTop: 12 }}
        >
          {sending
            ? "Enviando..."
            : message
              ? "Ficha enviada"
              : "Enviar ficha ao clube"}
        </button>
      </section>
    </form>
  );
}