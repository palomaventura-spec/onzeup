import Link from "next/link";
import { notFound } from "next/navigation";

import SafeAvatar from "@/components/SafeAvatar";
import { requireClubPermission } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

function sportLabel(value: string) {
  if (value === "FOOTBALL") return "Futebol";
  if (value === "FUTSAL") return "Futsal";
  return "Futebol + Futsal";
}

export default async function AthleteCategoryPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const user = await requireClubPermission("ATHLETES_VIEW");
  const { id } = await params;

  const category = await prisma.category.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    select: {
      id: true,
      name: true,
      sport: true,
      type: true,
      active: true,
      accentColor: true,
    },
  });

  if (!category) {
    notFound();
  }

  const categoryAccent =
    category.accentColor || "#9DDB16";

  const memberships = await prisma.athleteMembership.findMany({
    where: {
      organizationId: user.organizationId,
      categoryId: category.id,
      status: "ACTIVE",
    },
    select: {
      id: true,
      athlete: {
        select: {
          id: true,
          name: true,
          nickname: true,
          photoUrl: true,
          position: true,
          birthYear: true,
          currentStatus: true,
          eligibilityIssues: {
            where: {
              blocking: true,
              resolvedAt: null,
            },
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  const athletes = memberships
    .map((membership) => ({
      membershipId: membership.id,
      ...membership.athlete,
    }))
    .sort((a, b) =>
      (a.nickname || a.name).localeCompare(
        b.nickname || b.name,
        "pt-BR",
      ),
    );

  const aptCount = athletes.filter(
    (athlete) => athlete.eligibilityIssues.length === 0,
  ).length;

  const unfitCount = athletes.length - aptCount;

  return (
    <main
      style={{
        display: "grid",
        gap: 24,
      }}
    >
      <section
        style={{
          borderRadius: 24,
          padding: 28,
          background:
            "linear-gradient(135deg, #111815 0%, #0d130f 100%)",
          color: "#ffffff",
          borderTop: `4px solid ${categoryAccent}`,
          display: "grid",
          gap: 20,
        }}
      >
        <div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.14em",
              color: categoryAccent,
            }}
          >
            11UP CLUB · CATEGORIA
          </span>

          <h1
            style={{
              margin: "8px 0 4px",
              fontSize: "clamp(30px, 4vw, 44px)",
              color: "#ffffff",
            }}
          >
            {category.name}
          </h1>

          <p
            style={{
              margin: 0,
              opacity: 0.76,
              color: "#ffffff",
            }}
          >
            {sportLabel(category.sport)}
          </p>
        </div>


      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
        }}
      >
        <article
          style={{
            background: "#ffffff",
            border: "1px solid #e3e9e5",
            borderRadius: 18,
            padding: 20,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.08em",
            }}
          >
            ATLETAS
          </span>

          <strong
            style={{
              display: "block",
              fontSize: 30,
              marginTop: 4,
            }}
          >
            {athletes.length}
          </strong>
        </article>

        <article
          style={{
            background: "#ffffff",
            border: "1px solid #e3e9e5",
            borderRadius: 18,
            padding: 20,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.08em",
            }}
          >
            APTOS
          </span>

          <strong
            style={{
              display: "block",
              fontSize: 30,
              marginTop: 4,
            }}
          >
            {aptCount}
          </strong>
        </article>

        <article
          style={{
            background: "#ffffff",
            border: "1px solid #e3e9e5",
            borderRadius: 18,
            padding: 20,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.08em",
            }}
          >
            INAPTOS
          </span>

          <strong
            style={{
              display: "block",
              fontSize: 30,
              marginTop: 4,
            }}
          >
            {unfitCount}
          </strong>
        </article>
      </section>

      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e3e9e5",
          borderRadius: 22,
          overflow: "hidden",
        }}
      >
        <header
          style={{
            padding: "22px 24px",
            borderBottom: "1px solid #edf0ed",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.12em",
                color: categoryAccent,
              }}
            >
              ELENCO DA CATEGORIA
            </span>

            <h2
              style={{
                margin: "5px 0 0",
                fontSize: 26,
              }}
            >
              Atletas
            </h2>
          </div>

          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#68736b",
            }}
          >
            {athletes.length} atleta(s)
          </span>
        </header>

        {athletes.length ? (
          <div
            style={{
              overflowX: "auto",
            }}
          >
            <div
              style={{
                minWidth: 820,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(260px, 2fr) minmax(130px, 1fr) 100px minmax(190px, 1fr) 110px",
                  gap: 16,
                  alignItems: "center",
                  padding: "13px 24px",
                  background: "#f6f8f7",
                  borderBottom: "1px solid #e8ece9",
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  color: "#657168",
                }}
              >
                <span>ATLETA</span>
                <span>POSIÇÃO</span>
                <span>IDADE</span>
                <span>STATUS</span>
                <span>AÇÃO</span>
              </div>

              {athletes.map((athlete) => {
                const age = athlete.birthYear
                  ? new Date().getFullYear() - athlete.birthYear
                  : null;

                const issueCount =
                  athlete.eligibilityIssues.length;

                return (
                  <div
                    key={athlete.membershipId}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(260px, 2fr) minmax(130px, 1fr) 100px minmax(190px, 1fr) 110px",
                      gap: 16,
                      alignItems: "center",
                      padding: "16px 24px",
                      borderBottom: "1px solid #edf0ed",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          overflow: "hidden",
                          flex: "0 0 auto",
                          border: `2px solid ${categoryAccent}`,
                          background: "#eef3f0",
                        }}
                      >
                        <SafeAvatar
                          src={athlete.photoUrl}
                          name={athlete.nickname || athlete.name}
                          alt={athlete.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "block",
                            objectFit: "cover",
                          }}
                        />
                      </div>

                      <div
                        style={{
                          minWidth: 0,
                        }}
                      >
                        <strong
                          style={{
                            display: "block",
                            fontSize: 15,
                          }}
                        >
                          {athlete.nickname || athlete.name}
                        </strong>

                        {athlete.nickname ? (
                          <small
                            style={{
                              display: "block",
                              marginTop: 2,
                              color: "#737d76",
                            }}
                          >
                            {athlete.name}
                          </small>
                        ) : (
                          <small
                            style={{
                              display: "block",
                              marginTop: 2,
                              color: "#737d76",
                            }}
                          >
                            Ficha do clube
                          </small>
                        )}
                      </div>
                    </div>

                    <strong>
                      {athlete.position || "—"}
                    </strong>

                    <strong>
                      {age ? `${age} anos` : "—"}
                    </strong>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          borderRadius: 999,
                          padding: "6px 10px",
                          background: "#eef9d7",
                          color: "#507500",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        Ativo
                      </span>

                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          borderRadius: 999,
                          padding: "6px 10px",
                          background:
                            issueCount > 0
                              ? "#fff0d6"
                              : "#eef9d7",
                          color:
                            issueCount > 0
                              ? "#9a6200"
                              : "#507500",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {issueCount > 0
                          ? `Inapto · ${issueCount} ${
                              issueCount === 1
                                ? "pendência"
                                : "pendências"
                            }`
                          : "Apto"}
                      </span>
                    </div>

                    <Link
                      href={`/atletas/${athlete.id}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        minHeight: 42,
                        padding: "8px 13px",
                        borderRadius: 12,
                        background: "#effbd5",
                        color: "#4d7600",
                        textDecoration: "none",
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Abrir →
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: 28,
              color: "#707871",
            }}
          >
            Nenhum atleta com vínculo ativo nesta categoria.
          </div>
        )}
      </section>
    </main>
  );
}