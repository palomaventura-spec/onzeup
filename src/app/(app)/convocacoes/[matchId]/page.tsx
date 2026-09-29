import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import CopyButton from "@/components/CopyButton";
import {
  getClubCallUpCategoryAccess,
  requireClubPermission,
} from "@/lib/club-access";
import { googleCalendarUrl } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";

import CallUpConfigurationForm from "../CallUpConfigurationForm";
import CallUpLineupEditor from "../CallUpLineupEditor";
import CallUpSelectionForm from "../CallUpSelectionForm";
import CallUpSubmitButton from "../CallUpSubmitButton";
import {
  deleteCallUp,
  markCallUpsSent,
  updateCallUpStatus,
} from "../actions";

type CallUpIcon =
  | "calendar"
  | "clock"
  | "shirt"
  | "shield"
  | "users"
  | "formation"
  | "art"
  | "arrow";

function Icon({
  name,
  size = 18,
}: {
  name: CallUpIcon;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "calendar") {
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5l3 2" />
      </svg>
    );
  }

  if (name === "shirt") {
    return (
      <svg {...common}>
        <path d="M8 4 5 6 3 10l3 2v8h12v-8l3-2-2-4-3-2c-.8 1.2-2.2 2-4 2s-3.2-.8-4-2Z" />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg {...common}>
        <path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6l-7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }

  if (name === "users") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M4 18c0-3 2.2-5 5-5s5 2 5 5" />
        <path d="M16 7a2.5 2.5 0 0 1 0 5M16 14c2.4.2 4 1.8 4 4" />
      </svg>
    );
  }

  if (name === "formation") {
    return (
      <svg {...common}>
        <circle cx="12" cy="5" r="2" />
        <circle cx="6" cy="12" r="2" />
        <circle cx="18" cy="12" r="2" />
        <circle cx="12" cy="19" r="2" />
        <path d="M12 7v3M8 12h8M12 14v3" />
      </svg>
    );
  }

  if (name === "art") {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <circle cx="9" cy="9" r="1.5" />
        <path d="m6 17 4-4 3 3 2-2 3 3" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M5 12h14" />
      <path d="m14 7 5 5-5 5" />
    </svg>
  );
}

function fmt(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function whatsappUrl(
  phone: string | null,
  text: string,
) {
  if (!phone) return null;

  return `https://wa.me/${phone.replace(
    /\D/g,
    "",
  )}?text=${encodeURIComponent(text)}`;
}

export default async function MatchCallUpsPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const user =
    await requireClubPermission(
      "CALLUPS_VIEW",
    );

  const { matchId } = await params;

  const match =
    await prisma.match.findFirst({
      where: {
        id: matchId,
        organizationId:
          user.organizationId,
      },

      include: {
        category: true,

        callUps: {
          include: {
            athlete: true,
          },

          orderBy: {
            athlete: {
              name: "asc",
            },
          },
        },

        athleteStats: true,

        formationTemplate: {
          include: {
            slots: {
              where: {
                active: true,
              },

              orderBy: {
                sortOrder: "asc",
              },
            },
          },
        },
      },
    });

  if (!match) notFound();

  const categoryAccess =
    await getClubCallUpCategoryAccess(
      user,
      match.categoryId,
    );

  if (!categoryAccess.canView) {
    notFound();
  }

  const canManage =
    categoryAccess.canManage;

  const alreadyCalled =
    new Set(
      match.callUps.map(
        (item) => item.athleteId,
      ),
    );

  const athletes =
    await prisma.athlete.findMany({
      where: {
        organizationId:
          user.organizationId,

        active: true,

        id: {
          notIn:
            Array.from(alreadyCalled),
        },

        OR: [
          {
            categoryId:
              match.categoryId,
          },

          {
            memberships: {
              some: {
                organizationId:
                  user.organizationId,

                categoryId:
                  match.categoryId,

                status: "ACTIVE",

                sport: {
                  in: [
                    "BOTH",
                    match.sport,
                  ],
                },
              },
            },
          },
        ],
      },

      orderBy: {
        name: "asc",
      },

      select: {
        id: true,
        name: true,
        nickname: true,
        position: true,
        jerseyNumber: true,
      },
    });

  const statByAthlete =
    new Map(
      match.athleteStats.map(
        (stat) => [
          stat.athleteId,
          stat,
        ],
      ),
    );

  const lineupAthletes =
    match.callUps.map(
      (callUp) => {
        const stat =
          statByAthlete.get(
            callUp.athleteId,
          );

        return {
          id: callUp.athleteId,
          name:
            callUp.athlete.name,
          nickname:
            callUp.athlete
              .nickname,
          photoUrl:
            callUp.athlete
              .photoUrl,
          defaultNumber:
            callUp.athlete
              .jerseyNumber,
          slot:
            stat?.positionPlayed ||
            "SUBSTITUTE",
          jerseyNumber:
            stat?.jerseyNumber ??
            null,
          isCaptain:
            stat?.isCaptain ||
            false,
        };
      },
    );

  const isFutsal =
    match.sport === "FUTSAL";

  const legacySlots = isFutsal
    ? [
        {
          code: "GOALKEEPER",
          label: "Goleiro",
          slotType:
            "GOALKEEPER",
          x: 50,
          y: 88,
          sortOrder: 0,
        },
        {
          code: "FIXO",
          label: "Fixo",
          slotType: "OUTFIELD",
          x: 50,
          y: 65,
          sortOrder: 1,
        },
        {
          code: "ALA_LEFT",
          label:
            "Ala esquerdo",
          slotType: "OUTFIELD",
          x: 24,
          y: 43,
          sortOrder: 2,
        },
        {
          code: "ALA_RIGHT",
          label:
            "Ala direito",
          slotType: "OUTFIELD",
          x: 76,
          y: 43,
          sortOrder: 3,
        },
        {
          code: "PIVO",
          label: "Pivô",
          slotType: "OUTFIELD",
          x: 50,
          y: 18,
          sortOrder: 4,
        },
      ]
    : [
        {
          code: "GOALKEEPER",
          label: "Goleiro",
          slotType:
            "GOALKEEPER",
          x: 50,
          y: 88,
          sortOrder: 0,
        },
        {
          code:
            "DEFENDER_LEFT",
          label:
            "Defensor esquerdo",
          slotType: "OUTFIELD",
          x: 22,
          y: 69,
          sortOrder: 1,
        },
        {
          code:
            "DEFENDER_CENTER",
          label:
            "Defensor central",
          slotType: "OUTFIELD",
          x: 50,
          y: 66,
          sortOrder: 2,
        },
        {
          code:
            "DEFENDER_RIGHT",
          label:
            "Defensor direito",
          slotType: "OUTFIELD",
          x: 78,
          y: 69,
          sortOrder: 3,
        },
        {
          code:
            "MIDFIELDER_LEFT",
          label:
            "Meia esquerdo",
          slotType: "OUTFIELD",
          x: 19,
          y: 45,
          sortOrder: 4,
        },
        {
          code:
            "MIDFIELDER_CENTER",
          label: "Meia central",
          slotType: "OUTFIELD",
          x: 50,
          y: 49,
          sortOrder: 5,
        },
        {
          code:
            "MIDFIELDER_RIGHT",
          label:
            "Meia direito",
          slotType: "OUTFIELD",
          x: 81,
          y: 45,
          sortOrder: 6,
        },
        {
          code:
            "FORWARD_LEFT",
          label:
            "Atacante esquerdo",
          slotType: "OUTFIELD",
          x: 34,
          y: 18,
          sortOrder: 7,
        },
        {
          code:
            "FORWARD_RIGHT",
          label:
            "Atacante direito",
          slotType: "OUTFIELD",
          x: 66,
          y: 18,
          sortOrder: 8,
        },
      ];

  const activeFormationName =
    match.formationTemplate?.name ||
    match.formation ||
    (isFutsal ? "1-2-1" : "3-3-2");

  const normalizedFormationName =
    activeFormationName
      .replace(/[–—×xX]/g, "-")
      .replace(/\s+/g, "");

  function resolvedFormationLabel(
    slot: {
      code: string;
      label: string;
      slotType: string;
    },
  ) {
    if (slot.slotType === "GOALKEEPER") {
      return "Goleiro";
    }

    // Mantém nomes personalizados já existentes.
    if (!slot.label.startsWith("Linha ")) {
      return slot.label;
    }

    const parts =
      /^OUT_(\d+)_(\d+)$/.exec(slot.code);

    if (!parts) {
      return slot.label;
    }

    const line = Number(parts[1]);
    const position = Number(parts[2]);

    // FUTSAL 1-2-1
    if (
      isFutsal &&
      normalizedFormationName === "1-2-1"
    ) {
      if (line === 1) {
        return "Fixo";
      }

      if (line === 2) {
        return position === 1
          ? "Ala esquerdo"
          : position === 2
            ? "Ala direito"
            : slot.label;
      }

      if (line === 3) {
        return "Pivô";
      }
    }

    // CAMPO 3-3-2
    if (
      !isFutsal &&
      normalizedFormationName === "3-3-2"
    ) {
      if (line === 1) {
        return [
          "Defensor esquerdo",
          "Defensor central",
          "Defensor direito",
        ][position - 1] ?? slot.label;
      }

      if (line === 2) {
        return [
          "Meia esquerdo",
          "Meia central",
          "Meia direito",
        ][position - 1] ?? slot.label;
      }

      if (line === 3) {
        return [
          "Atacante esquerdo",
          "Atacante direito",
        ][position - 1] ?? slot.label;
      }
    }

    return slot.label;
  }
  const formationSlots =
    match.formationTemplate
      ?.slots.length
      ? match.formationTemplate
          .slots.map(
            (slot) => ({
              code: slot.code,
              label: resolvedFormationLabel(slot),
              slotType:
                slot.slotType,
              x: slot.x,
              y: slot.y,
              sortOrder:
                slot.sortOrder,
            }),
          )
      : legacySlots;

  const configuredGoalkeepers =
    match.starterGoalkeeperCount ??
    1;

  const configuredOutfield =
    match.starterOutfieldCount ??
    Math.max(
      0,
      formationSlots.length -
        configuredGoalkeepers,
    );

  const configuredStarters =
    configuredGoalkeepers +
    configuredOutfield;

  const configuredReserves =
    match.reserveCount ??
    Math.max(
      0,
      match.callUpLimit -
        configuredStarters,
    );

  const squadLimit =
    match.starterGoalkeeperCount !=
      null &&
    match.starterOutfieldCount !=
      null &&
    match.reserveCount != null
      ? configuredStarters +
        configuredReserves
      : match.callUpLimit;

  const formationName = activeFormationName;

  const requiredSlots =
    formationSlots.map(
      (slot) => slot.code,
    );

  const usedSlots =
    new Set(
      lineupAthletes.map(
        (item) => item.slot,
      ),
    );

  const startersReady =
    requiredSlots.every(
      (slot) =>
        usedSlots.has(slot),
    );

  const artworkComplete =
    match.callUps.length ===
      squadLimit &&
    startersReady;

  const defaultRule =
    await prisma.competitionCallUpRule.findFirst({
      where: {
        organizationId:
          user.organizationId,

        categoryId:
          match.categoryId,

        competitionName:
          match.competition,

        sport: match.sport,

        active: true,
      },

      include: {
        defaultFormation: true,
      },

      orderBy: {
        updatedAt: "desc",
      },
    });

  const formGoalkeepers =
    match.starterGoalkeeperCount ??
    defaultRule
      ?.goalkeeperStarterCount ??
    configuredGoalkeepers;

  const formOutfield =
    match.starterOutfieldCount ??
    defaultRule
      ?.outfieldStarterCount ??
    configuredOutfield;

  const formReserves =
    match.reserveCount ??
    defaultRule?.reserveCount ??
    configuredReserves;

  const formFormation =
    match.formationTemplate?.name ||
    match.formation ||
    defaultRule
      ?.defaultFormation?.name ||
    formationName;

  const orgName =
    user.organization
      ?.publicName ||
    user.organization?.name ||
    "11UP";

  const location =
    match.location ||
    "Local a definir";

  const requestHeaders =
    await headers();

  const requestHost =
    requestHeaders.get(
      "x-forwarded-host",
    ) ||
    requestHeaders.get("host");

  const requestProtocol =
    requestHeaders.get(
      "x-forwarded-proto",
    ) ||
    "https";

  const appBaseUrl = (
    process.env
      .NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    (requestHost
      ? `${requestProtocol}://${requestHost}`
      : "")
  ).replace(/\/$/, "");

  const calendarUrl =
    googleCalendarUrl({
      title: `${match.category.name} × ${match.opponent}`,
      start:
        match.startsAt,
      location:
        match.location,
      details: `Convocação • ${
        match.competition ||
        "Jogo"
      } • ${orgName}`,
    });

  const baseMessage = (
    name: string,
    token: string | null,
  ) => {
    const confirmationUrl =
      token && appBaseUrl
        ? `${appBaseUrl}/confirmar-convocacao/${token}`
        : null;

    const ending =
      match.callUpMode ===
      "INFORMATION_ONLY"
        ? "Esta convocação é somente informativa e não exige confirmação."
        : confirmationUrl
          ? `Confirme a presença ou informe a ausência:\n${confirmationUrl}`
          : "Por favor, confirme a presença com a comissão técnica.";

    const footwear =
      match.footwearType ===
      "SOCIETY_CLEATS"
        ? "Chuteira society"
        : match.footwearType ===
            "FUTSAL_SHOES"
          ? "Tênis/chuteira de futsal"
          : "Chuteira de trava";

    const staff =
      "A definir";

    return `⚽ CONVOCAÇÃO — ${match.category.name}\n\nOlá! ${name} está convocado(a) para a próxima partida.\n\n🆚 ${match.opponent}\n📅 ${fmt(match.startsAt)}\n⏰ Chegada: ${match.presentationTime || "A definir"}\n📍 ${location}\n🏆 ${match.competition || "Jogo"}\n👕 ${match.arrivalAttire === "TRAINING_UNIFORM" ? "Chegar com uniforme de treino; troca no local" : "Chegar uniformizado para o jogo"}\n🧦 ${match.sockRequirement || "Meião oficial"}\n🛡️ ${match.shinGuardsRequired ? "Caneleira obrigatória" : "Caneleira opcional"}\n👟 ${footwear}\n👥 Comissão: ${staff}\n${match.equipmentNotes ? `📌 ${match.equipmentNotes}\n` : ""}\n${ending}\n\n${orgName}`;
  };

  const confirmedCount =
    match.callUps.filter(
      (item) =>
        item.status ===
        "CONFIRMED",
    ).length;

  const declinedCount =
    match.callUps.filter(
      (item) =>
        item.status ===
        "DECLINED",
    ).length;

  const pendingCount =
    match.callUps.filter(
      (item) =>
        item.status !==
          "CONFIRMED" &&
        item.status !==
          "DECLINED",
    ).length;

  return (
    <main className="callup-v13">
      <section className="callup-v13-hero">
        <div>
          <span className="callup-v13-eyebrow">
            11UP CLUB · CONVOCAÇÃO ·{" "}
            {isFutsal
              ? "FUTSAL"
              : "FUTEBOL"}
          </span>

          <h1>
            {match.category.name} ×{" "}
            {match.opponent}
          </h1>

          <p>
            {formatDate(
              match.startsAt,
            )}{" "}
            ·{" "}
            {formatTime(
              match.startsAt,
            )}{" "}
            · {match.callUps.length}/
            {squadLimit} atletas
          </p>
        </div>

        <div className="callup-v13-hero-aside">
          <small>
            STATUS DA ESCALAÇÃO
          </small>

          <strong>
            {artworkComplete
              ? "Completa"
              : startersReady
                ? "Em revisão"
                : "Incompleta"}
          </strong>

          <span>
            {match.callUps.length}/
            {squadLimit} convocados ·{" "}
            {formationName}
          </span>
        </div>
      </section>

      <section className="callup-v13-actions">
        <div>
          <span className="callup-v13-mode">
            {match.callUpMode ===
            "INFORMATION_ONLY"
              ? "Somente informativa"
              : "Confirmação obrigatória"}
          </span>

          <span>
            {match.callUpMode ===
            "CONFIRMATION_REQUIRED"
              ? "As respostas não bloqueiam a lista nem a arte."
              : "Nenhuma confirmação é exigida."}
          </span>
        </div>

        <div>
          <a
            href={calendarUrl}
            target="_blank"
            rel="noreferrer"
          >
            Google Agenda
          </a>

          <Link
            href={`/jogos/${match.id}`}
          >
            Voltar ao jogo
          </Link>
        </div>
      </section>

      {!canManage ? (
        <div className="callup-v13-notice">
          <strong>
            Somente visualização.
          </strong>{" "}
          Você pode consultar esta
          convocação, mas não alterá-la.
        </div>
      ) : null}

      <section className="callup-v13-summary">
        <article>
          <span className="callup-v13-summary-icon">
            <Icon name="calendar" />
          </span>

          <div>
            <small>
              JOGO
            </small>

            <strong>
              {formatDate(
                match.startsAt,
              )}
            </strong>

            <span>
              {formatTime(
                match.startsAt,
              )}
            </span>
          </div>
        </article>

        <article>
          <span className="callup-v13-summary-icon">
            <Icon name="clock" />
          </span>

          <div>
            <small>
              APRESENTAÇÃO
            </small>

            <strong>
              {match.presentationTime ||
                "A definir"}
            </strong>

            <span>
              chegada dos atletas
            </span>
          </div>
        </article>

        <article>
          <span className="callup-v13-summary-icon">
            <Icon name="shirt" />
          </span>

          <div>
            <small>
              UNIFORME
            </small>

            <strong>
              {match.arrivalAttire ===
              "TRAINING_UNIFORM"
                ? "Uniforme de treino"
                : "Uniforme de jogo"}
            </strong>

            <span>
              {match.uniform ||
                "Padrão a definir"}
            </span>
          </div>
        </article>

        <article>
          <span className="callup-v13-summary-icon">
            <Icon name="shield" />
          </span>

          <div>
            <small>
              EQUIPAMENTOS
            </small>

            <strong>
              {match.sockRequirement ||
                "Meião oficial"}
            </strong>

            <span>
              {match.shinGuardsRequired
                ? "Caneleira obrigatória"
                : "Caneleira opcional"}
            </span>
          </div>
        </article>

        <article>
          <span className="callup-v13-summary-icon">
            <Icon name="users" />
          </span>

          <div>
            <small>
              RESPOSTAS
            </small>

            <strong>
              {confirmedCount} confirmados
            </strong>

            <span>
              {declinedCount} não poderão ·{" "}
              {pendingCount} pendentes
            </span>
          </div>
        </article>
      </section>

      <section className="callup-v13-flow">
        <article
          className={
            "is-complete"
          }
        >
          <span>01</span>
          <div>
            <strong>
              Configuração
            </strong>
            <small>
              titulares, reservas e formação
            </small>
          </div>
        </article>

        <article
          className={
            match.callUps.length
              ? "is-complete"
              : ""
          }
        >
          <span>02</span>
          <div>
            <strong>
              Atletas
            </strong>
            <small>
              seleção dos convocados
            </small>
          </div>
        </article>

        <article
          className={
            startersReady
              ? "is-complete"
              : ""
          }
        >
          <span>03</span>
          <div>
            <strong>
              Escalação
            </strong>
            <small>
              titulares e reservas
            </small>
          </div>
        </article>

        <article
          className={
            artworkComplete
              ? "is-complete"
              : ""
          }
        >
          <span>04</span>
          <div>
            <strong>
              Arte / PDF
            </strong>
            <small>
              revisão e publicação
            </small>
          </div>
        </article>
      </section>

      <section className="callup-v13-block">
        <header>
          <div>
            <span className="callup-v13-eyebrow">
              ETAPA 1
            </span>

            <h2>
              Configuração da convocação
            </h2>

            <p>
              Defina titulares, reservas e
              formação que também serão usados
              na arte em PDF.
            </p>
          </div>

          <span className="callup-v13-chip">
            {configuredStarters} titulares ·{" "}
            {configuredReserves} reservas
          </span>
        </header>

        {canManage ? (
          <CallUpConfigurationForm
            matchId={match.id}
            competitionLabel={
              match.competition
            }
            categoryName={
              match.category.name
            }
            initialGoalkeepers={
              formGoalkeepers
            }
            initialOutfield={
              formOutfield
            }
            initialReserves={
              formReserves
            }
            initialFormation={
              formFormation
            }
            currentCallUps={
              match.callUps.length
            }
            isActive={
              match.starterOutfieldCount !=
                null &&
              match.starterGoalkeeperCount !=
                null &&
              match.reserveCount !=
                null
            }
            defaultRuleSummary={
              defaultRule
                ? `${
                    defaultRule.goalkeeperStarterCount +
                    defaultRule.outfieldStarterCount
                  } titulares • ${
                    defaultRule.reserveCount
                  } reservas${
                    defaultRule.defaultFormation
                      ? ` • formação ${defaultRule.defaultFormation.name}`
                      : ""
                  }`
                : null
            }
          />
        ) : (
          <div className="callup-v13-readonly-rule">
            <div>
              <span>
                TITULARES
              </span>

              <strong>
                {configuredStarters}
              </strong>
            </div>

            <div>
              <span>
                RESERVAS
              </span>

              <strong>
                {configuredReserves}
              </strong>
            </div>

            <div>
              <span>
                FORMAÇÃO
              </span>

              <strong>
                {formationName}
              </strong>
            </div>
          </div>
        )}
      </section>

      <section className="callup-v13-block">
        <header>
          <div>
            <span className="callup-v13-eyebrow">
              ETAPA 2
            </span>

            <h2>
              Montar convocação
            </h2>

            <p>
              Selecione os atletas e acompanhe
              quem já faz parte da lista.
            </p>
          </div>

          <span className="callup-v13-chip">
            {match.callUps.length}/
            {squadLimit} atletas
          </span>
        </header>

        <div className="callup-v13-selection-grid">
          <section className="callup-v13-selection-panel">
            <div className="callup-v13-panel-head">
              <div>
                <span>
                  DISPONÍVEIS
                </span>

                <h3>
                  Selecionar atletas
                </h3>
              </div>

              <small>
                {Math.max(
                  0,
                  squadLimit -
                    match.callUps.length,
                )}{" "}
                vaga(s)
              </small>
            </div>

            {!canManage ? (
              <div className="callup-v13-empty">
                Sem permissão para gerenciar
                esta categoria.
              </div>
            ) : match.callUps.length >=
              squadLimit ? (
              <div className="callup-v13-empty">
                Lista completa com{" "}
                {squadLimit} atletas.
              </div>
            ) : athletes.length ===
              0 ? (
              <div className="callup-v13-empty">
                <strong>
                  Nenhum atleta disponível.
                </strong>

                <Link
                  href="/atletas"
                >
                  Ver atletas
                </Link>
              </div>
            ) : (
              <CallUpSelectionForm
                matchId={match.id}
                athletes={athletes}
                currentCount={
                  match.callUps.length
                }
                squadLimit={
                  squadLimit
                }
              />
            )}

            <div className="callup-v13-private-note">
              Lista privada do clube.
            </div>
          </section>

          <section className="callup-v13-selection-panel">
            <div className="callup-v13-panel-head">
              <div>
                <span>
                  SELECIONADOS
                </span>

                <h3>
                  Convocados
                </h3>
              </div>

              <small>
                {match.callUps.length} de{" "}
                {squadLimit}
              </small>
            </div>

            {canManage &&
            match.callUps.length ? (
              <form
                action={
                  markCallUpsSent
                }
                className="callup-v13-mark-sent"
              >
                <input
                  type="hidden"
                  name="matchId"
                  value={match.id}
                />

                <CallUpSubmitButton
                  className="btn-secondary"
                  pendingText="Marcando..."
                >
                  Marcar mensagens como enviadas
                </CallUpSubmitButton>
              </form>
            ) : null}

            {!match.callUps.length ? (
              <div className="callup-v13-empty">
                Nenhum atleta convocado ainda.
              </div>
            ) : (
              <div className="callup-v13-called-list">
                {match.callUps.map(
                  (callUp) => {
                    const name =
                      callUp.athlete
                        .nickname ||
                      callUp.athlete
                        .name;

                    const message =
                      baseMessage(
                        name,
                        callUp.responseToken,
                      );

                    const wa =
                      whatsappUrl(
                        callUp.athlete
                          .guardianPhone,
                        message,
                      );

                    return (
                      <article
                        className="callup-v13-called-card"
                        key={
                          callUp.id
                        }
                      >
                        <div className="callup-v13-called-main">
                          <div>
                            <strong>
                              {name}
                            </strong>

                            <small>
                              {callUp
                                .athlete
                                .position ||
                                "Atleta"}
                            </small>
                          </div>

                          <span
                            className={`callup-v13-status ${callUp.status.toLowerCase()}`}
                          >
                            {callUp.status ===
                            "CONFIRMED"
                              ? "Confirmado"
                              : callUp.status ===
                                  "DECLINED"
                                ? "Não poderá"
                                : callUp.status ===
                                    "INFORMED"
                                  ? "Informado"
                                  : "Aguardando"}
                          </span>
                        </div>

                        <div className="callup-v13-called-meta">
                          <span>
                            Responsável:{" "}
                            {callUp.athlete
                              .guardianName ||
                              "Não informado"}
                          </span>

                          <span>
                            Telefone:{" "}
                            {callUp.athlete
                              .guardianPhone ||
                              "Não informado"}
                          </span>
                        </div>

                        <div className="callup-v13-called-actions">
                          <CopyButton
                            text={message}
                          />

                          {wa ? (
                            <a
                              href={wa}
                              target="_blank"
                              rel="noreferrer"
                            >
                              WhatsApp
                            </a>
                          ) : null}

                          {canManage &&
                          match.callUpMode ===
                            "CONFIRMATION_REQUIRED" ? (
                            <>
                              <form
                                action={
                                  updateCallUpStatus
                                }
                              >
                                <input
                                  type="hidden"
                                  name="id"
                                  value={
                                    callUp.id
                                  }
                                />

                                <input
                                  type="hidden"
                                  name="status"
                                  value="CONFIRMED"
                                />

                                <CallUpSubmitButton
                                  className="btn-secondary btn-small"
                                  pendingText="Confirmando..."
                                >
                                  Confirmar
                                </CallUpSubmitButton>
                              </form>

                              <form
                                action={
                                  updateCallUpStatus
                                }
                              >
                                <input
                                  type="hidden"
                                  name="id"
                                  value={
                                    callUp.id
                                  }
                                />

                                <input
                                  type="hidden"
                                  name="status"
                                  value="DECLINED"
                                />

                                <CallUpSubmitButton
                                  className="btn-danger btn-small"
                                  pendingText="Salvando..."
                                >
                                  Não poderá
                                </CallUpSubmitButton>
                              </form>
                            </>
                          ) : null}

                          {canManage ? (
                            <form
                              action={
                                deleteCallUp
                              }
                            >
                              <input
                                type="hidden"
                                name="id"
                                value={
                                  callUp.id
                                }
                              />

                              <CallUpSubmitButton
                                className="btn-secondary btn-small"
                                pendingText="Removendo..."
                              >
                                Remover
                              </CallUpSubmitButton>
                            </form>
                          ) : null}
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            )}
          </section>
        </div>
      </section>

      {match.callUps.length ? (
        <section className="callup-v13-block">
          <header>
            <div>
              <span className="callup-v13-eyebrow">
                ETAPA 3
              </span>

              <h2>
                Escalação planejada
              </h2>

              <p>
                Posicione os titulares e
                organize os reservas antes de
                gerar a arte.
              </p>
            </div>

            <span className="callup-v13-chip">
              Formação {formationName}
            </span>
          </header>

          <CallUpLineupEditor
            matchId={match.id}
            athletes={
              lineupAthletes
            }
            canEdit={canManage}
            sport={
              isFutsal
                ? "FUTSAL"
                : "FOOTBALL"
            }
            squadLimit={
              squadLimit
            }
            formationName={
              formationName
            }
            starterCount={
              configuredStarters
            }
            reserveCount={
              configuredReserves
            }
            slots={
              formationSlots
            }
          />
        </section>
      ) : null}

      <section className="callup-v13-publish">
        <div className="callup-v13-publish-icon">
          <Icon
            name="art"
            size={24}
          />
        </div>

        <div>
          <span className="callup-v13-eyebrow">
            ETAPA 4 · PUBLICAÇÃO
          </span>

          <h2>
            Arte da convocação e PDF
          </h2>

          <p>
            A arte usa a configuração,
            escalação, atletas e informações
            do jogo já salvas no 11UP.
          </p>

          <div className="callup-v13-publish-summary">
            <span>
              <b>
                {match.callUps.length}
              </b>{" "}
              atletas
            </span>

            <span>
              <b>
                {configuredStarters}
              </b>{" "}
              titulares
            </span>

            <span>
              <b>
                {configuredReserves}
              </b>{" "}
              reservas
            </span>

            <span>
              <b>
                {formationName}
              </b>{" "}
              formação
            </span>
          </div>
        </div>

        <div className="callup-v13-publish-actions">
          {startersReady ? (
            <Link
              className="primary"
              href={`/convocacoes/${match.id}/arte`}
            >
              {artworkComplete
                ? "Abrir arte e PDF"
                : "Visualizar prévia"}
              <Icon
                name="arrow"
                size={16}
              />
            </Link>
          ) : (
            <span className="disabled">
              Complete a escalação
            </span>
          )}
        </div>
      </section>
    </main>
  );
}
