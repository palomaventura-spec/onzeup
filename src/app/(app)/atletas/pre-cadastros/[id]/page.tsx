import Link from "next/link";
import { notFound } from "next/navigation";

import { requireClubPermission } from "@/lib/club-access";
import { safeDecryptPrivateData } from "@/lib/private-data-crypto";
import { prisma } from "@/lib/prisma";

import {
  approveAthletePreRegistration,
  rejectAthletePreRegistration,
} from "./actions";

type PreRegistrationPayload = {
  version?: number;

  athlete?: {
    name?: string | null;
    identity?: string | null;
    cpf?: string | null;
    birthDate?: string | null;
    birthYear?: number | null;
    height?: number | null;
    weight?: number | null;
    category?: string | null;
    position1?: string | null;
    position2?: string | null;

    // compatibilidade com a primeira versão
    nickname?: string | null;
    position?: string | null;
    dominantFoot?: string | null;
    jerseyNumber?: number | null;
  };

  family?: {
    fatherName?: string | null;
    motherName?: string | null;
    address?: string | null;
    email?: string | null;
    phone1?: string | null;
    phone2?: string | null;
  };

  health?: {
    hasHealthPlan?: boolean;
    healthPlanName?: string | null;
    susCard?: string | null;
  };

  sportsHistory?: {
    lastClub?: string | null;
    registeredClubs?: string | null;
    amateurBond?: boolean;
    referral?: string | null;
    intermediary?: string | null;
    arrivalDate?: string | null;
  };

  guardian?: {
    name?: string | null;
    relation?: string | null;
    phone?: string | null;
    email?: string | null;
    accepted?: boolean;
  };

  submittedAt?: string;
};

function parsePayload(
  payloadEncrypted: string | null,
): PreRegistrationPayload {
  try {
    const decrypted =
      safeDecryptPrivateData(payloadEncrypted);

    if (!decrypted) return {};

    return JSON.parse(
      decrypted,
    ) as PreRegistrationPayload;
  } catch {
    return {};
  }
}

function value(
  input: string | number | null | undefined,
) {
  if (
    input === null ||
    input === undefined ||
    input === ""
  ) {
    return "—";
  }

  return String(input);
}

function dateLabel(
  input: string | null | undefined,
) {
  if (!input) return "—";

  const date = new Date(
    input.length === 10
      ? `${input}T12:00:00`
      : input,
  );

  if (Number.isNaN(date.getTime())) {
    return input;
  }

  return date.toLocaleDateString("pt-BR");
}

function booleanLabel(
  input: boolean | null | undefined,
) {
  if (input === true) return "Sim";
  if (input === false) return "Não";
  return "—";
}

function statusLabel(status: string) {
  if (status === "SUBMITTED") {
    return "Recebido para análise";
  }

  if (status === "APPROVED") {
    return "Aprovado";
  }

  if (status === "REJECTED") {
    return "Rejeitado";
  }

  if (status === "PENDING") {
    return "Aguardando preenchimento";
  }

  if (status === "EXPIRED") {
    return "Expirado";
  }

  if (status === "REVOKED") {
    return "Revogado";
  }

  return status;
}

function DataItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pre-review-item">
      <small>{label}</small>
      <strong>{children}</strong>
    </div>
  );
}

export default async function AthletePreRegistrationReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user =
    await requireClubPermission("ATHLETES_EDIT");

  const { id } = await params;

  const registration =
    await prisma.athletePreRegistrationRequest.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },

      include: {
        category: {
          select: {
            id: true,
            name: true,
            sport: true,
          },
        },

        organization: {
          select: {
            name: true,
            publicName: true,
          },
        },
      },
    });

  if (!registration) {
    notFound();
  }

  const payload = parsePayload(
    registration.payloadEncrypted,
  );

  const athlete = payload.athlete || {};
  const family = payload.family || {};
  const health = payload.health || {};
  const sportsHistory =
    payload.sportsHistory || {};
  const guardian = payload.guardian || {};

  const athleteName =
    athlete.name ||
    registration.recipientName ||
    "Novo atleta";

  const organizationName =
    registration.organization.publicName ||
    registration.organization.name;

  const position1 =
    athlete.position1 ||
    athlete.position ||
    null;

  return (
    <div className="pre-review">
      <section className="pre-review-hero">
        <div>
          <span className="pre-review-eyebrow">
            11UP CLUB · PRÉ-CADASTRO
          </span>

          <h1>Análise de novo atleta</h1>

          <p>
            Confira os dados enviados pela família antes
            de incluir o atleta oficialmente no elenco.
          </p>
        </div>

        <div className="pre-review-hero-actions">
          <span
            className={`pre-review-status ${registration.status.toLowerCase()}`}
          >
            {statusLabel(registration.status)}
          </span>

          <Link
            href="/atletas"
            className="pre-review-back"
          >
            ← Voltar para atletas
          </Link>
        </div>
      </section>

      <section className="pre-review-summary">
        <div>
          <small>ATLETA</small>
          <strong>{athleteName}</strong>
        </div>

        <div>
          <small>CLUBE</small>
          <strong>{organizationName}</strong>
        </div>

        <div>
          <small>CATEGORIA DO CONVITE</small>
          <strong>
            {registration.category?.name ||
              "Não definida"}
          </strong>
        </div>

        <div>
          <small>RECEBIDO EM</small>
          <strong>
            {registration.submittedAt
              ? registration.submittedAt.toLocaleDateString(
                  "pt-BR",
                )
              : "—"}
          </strong>
        </div>
      </section>

      <section className="pre-review-card">
        <header>
          <span>01</span>
          <div>
            <small>DADOS DO ATLETA</small>
            <h2>Identificação</h2>
          </div>
        </header>

        <div className="pre-review-grid">
          <DataItem label="Nome completo">
            {value(athlete.name)}
          </DataItem>

          <DataItem label="Identidade">
            {value(athlete.identity)}
          </DataItem>

          <DataItem label="CPF">
            {value(athlete.cpf)}
          </DataItem>

          <DataItem label="Data de nascimento">
            {dateLabel(athlete.birthDate)}
          </DataItem>

          <DataItem label="Altura">
            {athlete.height
              ? `${athlete.height} m`
              : "—"}
          </DataItem>

          <DataItem label="Peso">
            {athlete.weight
              ? `${athlete.weight} kg`
              : "—"}
          </DataItem>

          <DataItem label="Categoria informada">
            {value(athlete.category)}
          </DataItem>

          <DataItem label="Posição 1">
            {value(position1)}
          </DataItem>

          <DataItem label="Posição 2">
            {value(athlete.position2)}
          </DataItem>
        </div>
      </section>

      <section className="pre-review-card">
        <header>
          <span>02</span>
          <div>
            <small>FAMÍLIA E CONTATO</small>
            <h2>Dados familiares</h2>
          </div>
        </header>

        <div className="pre-review-grid">
          <DataItem label="Nome do pai">
            {value(family.fatherName)}
          </DataItem>

          <DataItem label="Nome da mãe">
            {value(family.motherName)}
          </DataItem>

          <DataItem label="E-mail familiar">
            {value(family.email)}
          </DataItem>

          <DataItem label="Telefone 1">
            {value(family.phone1)}
          </DataItem>

          <DataItem label="Telefone 2">
            {value(family.phone2)}
          </DataItem>

          <div className="pre-review-item full">
            <small>ENDEREÇO</small>
            <strong>
              {value(family.address)}
            </strong>
          </div>
        </div>
      </section>

      <section className="pre-review-card">
        <header>
          <span>03</span>
          <div>
            <small>SAÚDE</small>
            <h2>Informações de saúde</h2>
          </div>
        </header>

        <div className="pre-review-grid">
          <DataItem label="Possui plano de saúde">
            {booleanLabel(
              health.hasHealthPlan,
            )}
          </DataItem>

          <DataItem label="Plano de saúde">
            {value(health.healthPlanName)}
          </DataItem>

          <DataItem label="Cartão SUS">
            {value(health.susCard)}
          </DataItem>
        </div>
      </section>

      <section className="pre-review-card">
        <header>
          <span>04</span>
          <div>
            <small>HISTÓRICO ESPORTIVO</small>
            <h2>Experiência anterior</h2>
          </div>
        </header>

        <div className="pre-review-grid">
          <DataItem label="Último clube">
            {value(sportsHistory.lastClub)}
          </DataItem>

          <DataItem label="Data de chegada">
            {dateLabel(
              sportsHistory.arrivalDate,
            )}
          </DataItem>

          <DataItem label="Vínculo amador">
            {booleanLabel(
              sportsHistory.amateurBond,
            )}
          </DataItem>

          <DataItem label="Indicação">
            {value(sportsHistory.referral)}
          </DataItem>

          <DataItem label="Intermediário / representante">
            {value(
              sportsHistory.intermediary,
            )}
          </DataItem>

          <div className="pre-review-item full">
            <small>
              CLUBES EM QUE JÁ FOI REGISTRADO
            </small>

            <strong>
              {value(
                sportsHistory.registeredClubs,
              )}
            </strong>
          </div>
        </div>
      </section>

      <section className="pre-review-card">
        <header>
          <span>05</span>
          <div>
            <small>RESPONSÁVEL</small>
            <h2>Responsável pelo envio</h2>
          </div>
        </header>

        <div className="pre-review-grid">
          <DataItem label="Nome">
            {value(
              guardian.name ||
                registration.recipientName,
            )}
          </DataItem>

          <DataItem label="WhatsApp">
            {value(
              guardian.phone ||
                registration.recipientPhone,
            )}
          </DataItem>

          <DataItem label="E-mail">
            {value(
              guardian.email ||
                registration.recipientEmail,
            )}
          </DataItem>

          <DataItem label="Declaração confirmada">
            {booleanLabel(
              guardian.accepted,
            )}
          </DataItem>
        </div>
      </section>

      <section className="pre-review-decision">
        <div>
          <span className="pre-review-eyebrow">
            DECISÃO DO CLUBE
          </span>

          <h2>Revisão do pré-cadastro</h2>

          <p>
            Após conferir os dados, a gestão poderá
            aprovar o atleta para o elenco ou rejeitar
            esta solicitação.
          </p>
        </div>

        {registration.status ===
        "SUBMITTED" ? (
          <div className="pre-review-decision-actions">
            <form
              action={rejectAthletePreRegistration}
              className="pre-review-reject-form"
            >
              <input
                type="hidden"
                name="registrationId"
                value={registration.id}
              />

              <input
                type="text"
                name="rejectionReason"
                placeholder="Motivo da rejeição (opcional)"
                className="pre-review-reason"
              />

              <button
                type="submit"
                className="reject"
              >
                Rejeitar cadastro
              </button>
            </form>

            <form
              action={approveAthletePreRegistration}
            >
              <input
                type="hidden"
                name="registrationId"
                value={registration.id}
              />

              <button
                type="submit"
                className="approve"
              >
                Aprovar e incluir no elenco →
              </button>
            </form>
          </div>
        ) : (
          <span className="pre-review-status">
            {statusLabel(
              registration.status,
            )}
          </span>
        )}
      </section>

      <style>{`
        .pre-review {
          --ink: #07131d;
          --muted: #71808b;
          --line: #dfe6ea;
          --lime: #99e600;
          --lime-dark: #679800;
          display: grid;
          gap: 18px;
          padding: 28px 34px 44px;
          background: #f4f7f8;
        }

        .pre-review * {
          box-sizing: border-box;
        }

        .pre-review-hero {
          min-height: 190px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
          padding: 30px 34px;
          border-radius: 26px;
          color: white;
          background:
            radial-gradient(
              circle at 92% 0%,
              rgba(153,230,0,.22),
              transparent 22rem
            ),
            linear-gradient(
              105deg,
              #05141f,
              #071d26 60%,
              #154d20
            );
          box-shadow:
            0 20px 45px
            rgba(7,19,29,.12);
        }

        .pre-review-eyebrow {
          display: block;
          margin-bottom: 9px;
          color: var(--lime);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .16em;
        }

        .pre-review-hero h1 {
          margin: 0;
          font-size:
            clamp(32px,4vw,54px);
          line-height: 1;
          letter-spacing: -.045em;
          color: white;
        }

        .pre-review-hero p {
          max-width: 720px;
          margin: 12px 0 0;
          color:
            rgba(255,255,255,.74);
        }

        .pre-review-hero-actions {
          min-width: 220px;
          display: grid;
          justify-items: end;
          gap: 12px;
        }

        .pre-review-back {
          color:
            rgba(255,255,255,.82);
          font-size: 12px;
          font-weight: 800;
          text-decoration: none;
        }

        .pre-review-status {
          display: inline-flex;
          align-items: center;
          min-height: 34px;
          padding: 0 12px;
          border-radius: 999px;
          color: #8a6200;
          background: #fff0c1;
          font-size: 11px;
          font-weight: 900;
        }

        .pre-review-status.approved {
          color: #3f6f00;
          background: #eaf8ca;
        }

        .pre-review-status.rejected {
          color: #a63131;
          background: #ffe3e3;
        }

        .pre-review-summary {
          display: grid;
          grid-template-columns:
            repeat(4,minmax(0,1fr));
          gap: 12px;
        }

        .pre-review-summary > div,
        .pre-review-card,
        .pre-review-decision {
          border: 1px solid var(--line);
          background: white;
          box-shadow:
            0 10px 30px
            rgba(8,26,38,.04);
        }

        .pre-review-summary > div {
          padding: 17px 18px;
          border-radius: 17px;
        }

        .pre-review-summary small,
        .pre-review-item small {
          display: block;
          margin-bottom: 5px;
          color: var(--muted);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .12em;
        }

        .pre-review-summary strong {
          color: var(--ink);
          font-size: 14px;
        }

        .pre-review-card {
          padding: 24px;
          border-radius: 20px;
        }

        .pre-review-card > header {
          display: flex;
          align-items: center;
          gap: 13px;
          padding-bottom: 18px;
          border-bottom:
            1px solid #edf1f3;
        }

        .pre-review-card > header > span {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          color: #648f00;
          background: #eff9d8;
          font-size: 11px;
          font-weight: 900;
        }

        .pre-review-card header small {
          color: #719f00;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .14em;
        }

        .pre-review-card h2,
        .pre-review-decision h2 {
          margin: 2px 0 0;
          color: var(--ink);
          font-size: 21px;
          letter-spacing: -.03em;
        }

        .pre-review-grid {
          display: grid;
          grid-template-columns:
            repeat(3,minmax(0,1fr));
          gap: 1px;
          margin-top: 18px;
          overflow: hidden;
          border: 1px solid #e8edef;
          border-radius: 14px;
          background: #e8edef;
        }

        .pre-review-item {
          min-height: 84px;
          padding: 15px 16px;
          background: #fff;
        }

        .pre-review-item.full {
          grid-column: 1 / -1;
        }

        .pre-review-item strong {
          display: block;
          color: var(--ink);
          font-size: 13px;
          line-height: 1.45;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .pre-review-decision {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 25px;
          border-radius: 20px;
          border-left:
            4px solid var(--lime);
        }

        .pre-review-decision p {
          max-width: 650px;
          margin: 7px 0 0;
          color: var(--muted);
          font-size: 13px;
        }

        .pre-review-decision-actions {
          display: flex;
          align-items: flex-end;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        .pre-review-decision-actions form {
          margin: 0;
        }

        .pre-review-reject-form {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        .pre-review-reason {
          width: 220px;
          min-height: 44px;
          padding: 0 13px;
          border: 1px solid #dfe6ea;
          border-radius: 12px;
          outline: none;
          color: #07131d;
          background: #fff;
          font-size: 12px;
        }

        .pre-review-reason:focus {
          border-color: #99e600;
          box-shadow: 0 0 0 3px rgba(153,230,0,.13);
        }

        .pre-review-decision-actions button {
          min-height: 44px;
          padding: 0 17px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 900;
        }

        .pre-review-decision-actions .reject {
          border:
            1px solid #efd0d0;
          color: #b34040;
          background: #fff5f5;
        }

        .pre-review-decision-actions .approve {
          border:
            1px solid #8bd000;
          color: #08120a;
          background: var(--lime);
        }

        .pre-review-decision-actions button:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        @media (max-width: 900px) {
          .pre-review {
            padding: 18px;
          }

          .pre-review-hero {
            align-items: flex-start;
            flex-direction: column;
          }

          .pre-review-hero-actions {
            min-width: 0;
            justify-items: start;
          }

          .pre-review-summary {
            grid-template-columns:
              repeat(2,minmax(0,1fr));
          }

          .pre-review-grid {
            grid-template-columns:
              repeat(2,minmax(0,1fr));
          }

          .pre-review-decision {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 620px) {
          .pre-review {
            padding: 12px;
          }

          .pre-review-hero {
            min-height: 0;
            padding: 24px 20px;
            border-radius: 20px;
          }

          .pre-review-summary,
          .pre-review-grid {
            grid-template-columns: 1fr;
          }

          .pre-review-item.full {
            grid-column: auto;
          }

          .pre-review-card {
            padding: 18px;
          }

          .pre-review-decision-actions,
          .pre-review-decision-actions form,
          .pre-review-reject-form,
          .pre-review-reason,
          .pre-review-decision-actions button {
            width: 100%;
          }

          .pre-review-reject-form {
            display: grid;
          }
        }
      `}</style>
    </div>
  );
}
