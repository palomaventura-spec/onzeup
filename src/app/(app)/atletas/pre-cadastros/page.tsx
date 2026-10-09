import Link from "next/link";

import { requireClubPermission } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

import AthletePreRegistrationPanel from "../AthletePreRegistrationPanel";

export default async function AthletePreRegistrationsPage() {
  const user = await requireClubPermission("ATHLETES_EDIT");

  const [categories, preRegistrations] = await Promise.all([
    prisma.category.findMany({
      where: {
        organizationId: user.organizationId,
        active: true,
      },
      orderBy: [
        {
          type: "asc",
        },
        {
          name: "asc",
        },
      ],
      select: {
        id: true,
        name: true,
        type: true,
        sport: true,
      },
    }),

    prisma.athletePreRegistrationRequest.findMany({
      where: {
        organizationId: user.organizationId,
      },
      include: {
        category: {
          select: {
            name: true,
            sport: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    }),
  ]);

  const invitations = preRegistrations.map((item) => ({
    id: item.id,
    recipientName: item.recipientName,
    recipientPhone: item.recipientPhone,
    recipientEmail: item.recipientEmail,
    status: item.status,
    expiresAt: item.expiresAt.toISOString(),
    createdAt: item.createdAt.toISOString(),
    categoryName: item.category?.name ?? null,
    categorySport: item.category?.sport ?? null,
  }));

  const pendingCount = preRegistrations.filter(
    (item) => item.status === "PENDING",
  ).length;

  const submittedCount = preRegistrations.filter(
    (item) => item.status === "SUBMITTED",
  ).length;

  const approvedCount = preRegistrations.filter(
    (item) => item.status === "APPROVED",
  ).length;

  return (
    <div
      style={{
        display: "grid",
        gap: 22,
        padding: "28px 34px 48px",
      }}
    >
      <section
        style={{
          minHeight: 190,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          padding: "30px 34px",
          borderRadius: 26,
          color: "white",
          background:
            "linear-gradient(105deg,#05141f,#071d26 60%,#154d20)",
        }}
      >
        <div>
          <span
            style={{
              display: "block",
              marginBottom: 10,
              color: "#99e600",
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: ".16em",
            }}
          >
            11UP CLUB · CADASTRO DIGITAL
          </span>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(32px,4vw,52px)",
              lineHeight: 1,
              color: "#ffffff",
            }}
          >
            Pré-cadastros
          </h1>

          <p
            style={{
              maxWidth: 720,
              margin: "12px 0 0",
              color: "rgba(255,255,255,.74)",
            }}
          >
            Gere links de cadastro e acompanhe o histórico de
            solicitações enviadas aos responsáveis.
          </p>
        </div>

        <Link
          href="/atletas"
          style={{
            minHeight: 44,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 16px",
            borderRadius: 12,
            textDecoration: "none",
            fontSize: 12,
            fontWeight: 900,
            color: "#07131d",
            background: "#ffffff",
          }}
        >
          ← Voltar para atletas
        </Link>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(3,minmax(0,1fr))",
          gap: 12,
        }}
      >
        <article
          style={{
            padding: 18,
            borderRadius: 18,
            border: "1px solid #dfe6ea",
            background: "#fff",
          }}
        >
          <small
            style={{
              color: "#71808b",
              fontWeight: 900,
              letterSpacing: ".08em",
            }}
          >
            AGUARDANDO PREENCHIMENTO
          </small>

          <strong
            style={{
              display: "block",
              marginTop: 8,
              fontSize: 30,
            }}
          >
            {pendingCount}
          </strong>
        </article>

        <article
          style={{
            padding: 18,
            borderRadius: 18,
            border: "1px solid #dfe6ea",
            background: "#fff",
          }}
        >
          <small
            style={{
              color: "#71808b",
              fontWeight: 900,
              letterSpacing: ".08em",
            }}
          >
            PARA ANÁLISE
          </small>

          <strong
            style={{
              display: "block",
              marginTop: 8,
              fontSize: 30,
            }}
          >
            {submittedCount}
          </strong>
        </article>

        <article
          style={{
            padding: 18,
            borderRadius: 18,
            border: "1px solid #dfe6ea",
            background: "#fff",
          }}
        >
          <small
            style={{
              color: "#71808b",
              fontWeight: 900,
              letterSpacing: ".08em",
            }}
          >
            APROVADOS
          </small>

          <strong
            style={{
              display: "block",
              marginTop: 8,
              fontSize: 30,
            }}
          >
            {approvedCount}
          </strong>
        </article>
      </section>

      <AthletePreRegistrationPanel
        categories={categories}
        invitations={invitations}
      />
    </div>
  );
}