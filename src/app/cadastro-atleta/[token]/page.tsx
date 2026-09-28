import crypto from "node:crypto";

import { prisma } from "@/lib/prisma";

import AthletePreRegistrationForm from "./AthletePreRegistrationForm";

function hashToken(value: string) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

function sportLabel(value: string | null | undefined) {
  if (value === "FOOTBALL") return "Campo";
  if (value === "FUTSAL") return "Futsal";
  return null;
}

function Unavailable({
  message,
}: {
  message: string;
}) {
  return (
    <main
      style={{
        width: "min(760px, calc(100% - 32px))",
        margin: "48px auto",
      }}
    >
      <section className="card" style={{ textAlign: "center" }}>
        <span className="page-eyebrow">
          CADASTRO DE ATLETA
        </span>

        <h1>Link indisponível</h1>

        <p className="muted">{message}</p>
      </section>
    </main>
  );
}

export default async function AthletePreRegistrationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invitation =
    await prisma.athletePreRegistrationRequest.findUnique({
      where: {
        tokenHash: hashToken(token),
      },
      include: {
        organization: {
          select: {
            name: true,
            publicName: true,
            logoUrl: true,
          },
        },
        category: {
          select: {
            name: true,
            sport: true,
          },
        },
      },
    });

  if (!invitation) {
    return (
      <Unavailable message="Este link não existe ou não está mais disponível." />
    );
  }

  if (invitation.status === "REVOKED") {
    return (
      <Unavailable message="Este link foi cancelado pelo clube." />
    );
  }

  if (
    invitation.status === "EXPIRED" ||
    invitation.expiresAt < new Date()
  ) {
    return (
      <Unavailable message="Este link expirou. Solicite um novo link ao clube." />
    );
  }

  const organizationName =
    invitation.organization.publicName ||
    invitation.organization.name;

  if (invitation.status !== "PENDING") {
    return (
      <main
        style={{
          width: "min(760px, calc(100% - 32px))",
          margin: "48px auto",
        }}
      >
        <section className="card" style={{ textAlign: "center" }}>
          {invitation.organization.logoUrl ? (
            <img
              src={invitation.organization.logoUrl}
              alt={organizationName}
              style={{
                width: 72,
                height: 72,
                objectFit: "contain",
                marginBottom: 14,
              }}
            />
          ) : null}

          <span className="page-eyebrow">
            CADASTRO RECEBIDO
          </span>

          <h1>Formulário já enviado</h1>

          <p className="muted">
            Os dados já foram enviados ao clube e estão
            aguardando análise.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main
      style={{
        width: "min(920px, calc(100% - 32px))",
        margin: "34px auto 60px",
      }}
    >
      <section className="card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          {invitation.organization.logoUrl ? (
            <img
              src={invitation.organization.logoUrl}
              alt={organizationName}
              style={{
                width: 68,
                height: 68,
                objectFit: "contain",
              }}
            />
          ) : null}

          <div>
            <span className="page-eyebrow">
              11UP CLUB · CADASTRO DIGITAL
            </span>

            <h1 style={{ marginBottom: 6 }}>
              Cadastro de atleta
            </h1>

            <p className="muted" style={{ margin: 0 }}>
              {organizationName}
            </p>
          </div>
        </div>

        <div
          style={{
            marginTop: 22,
            padding: "16px 18px",
            borderRadius: 14,
            border: "1px solid var(--line)",
            background: "rgba(255,255,255,0.025)",
          }}
        >
          <span
            className="page-eyebrow"
            style={{
              display: "block",
              marginBottom: 12,
            }}
          >
            CONVITE PARA CADASTRO
          </span>

          <div
            style={{
              display: "flex",
              gap: "10px 28px",
              flexWrap: "wrap",
            }}
          >
            <p style={{ margin: 0 }}>
              <span className="muted">Responsável</span>
              <strong
                style={{
                  display: "block",
                  marginTop: 3,
                }}
              >
                {invitation.recipientName || "Não informado"}
              </strong>
            </p>

            {invitation.category ? (
              <p style={{ margin: 0 }}>
                <span className="muted">Categoria</span>
                <strong
                  style={{
                    display: "block",
                    marginTop: 3,
                  }}
                >
                  {sportLabel(invitation.category.sport)
                    ? `${sportLabel(
                        invitation.category.sport,
                      )} · `
                    : ""}
                  {invitation.category.name}
                </strong>
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <AthletePreRegistrationForm
        token={token}
        recipientName={invitation.recipientName || ""}
        recipientPhone={invitation.recipientPhone || ""}
        recipientEmail={invitation.recipientEmail || ""}
      />
    </main>
  );
}
