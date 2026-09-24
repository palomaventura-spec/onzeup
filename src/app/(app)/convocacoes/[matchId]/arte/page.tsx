import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import {
  getClubCallUpCategoryAccess,
  requireClubPermission,
} from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

import ConvocationPrintActions from "../../ConvocationPrintActions";
import SafeConvocationImage from "../../SafeConvocationImage";

function dateParts(date: Date) {
  const dateText = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);

  const timeText = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return { dateText, timeText };
}

function safeImageUrl(value: string | null) {
  if (!value) return null;
  if (value.startsWith("/") || value.startsWith("data:")) return value;
  return `/api/image-proxy?url=${encodeURIComponent(value)}`;
}

async function embeddedImageUrl(value: string | null) {
  if (!value) return null;
  if (value.startsWith("data:") || value.startsWith("/")) return value;

  try {
    const response = await fetch(value, { cache: "force-cache" });

    if (!response.ok) {
      return safeImageUrl(value);
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.startsWith("image/")) {
      return safeImageUrl(value);
    }

    const bytes = Buffer.from(await response.arrayBuffer());

    // Evita transformar arquivos muito grandes em base64 dentro do HTML.
    if (bytes.length > 8 * 1024 * 1024) {
      return safeImageUrl(value);
    }

    return `data:${contentType};base64,${bytes.toString("base64")}`;
  } catch {
    return safeImageUrl(value);
  }
}

function AthleteBadge({
  athlete,
  photoUrl,
  number,
  captain,
}: {
  athlete: {
    name: string;
    nickname: string | null;
    photoUrl: string | null;
  };
  photoUrl?: string | null;
  number: number | null;
  captain: boolean;
}) {
  const name = athlete.nickname || athlete.name;

  return (
    <div className="art-athlete">
      <div className="art-photo">
        <div className="art-photo-crop">
          <SafeConvocationImage
            src={photoUrl ?? safeImageUrl(athlete.photoUrl)}
            alt={name}
            fallback={name.slice(0, 2).toUpperCase()}
            className="art-athlete-image"
          />
        </div>

        {captain ? <i>C</i> : null}
      </div>

      <div className="art-nameplate">
        {number != null ? <b>{number}</b> : null}
        <strong>{name}</strong>
      </div>
    </div>
  );
}

export default async function ConvocationArtworkPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const user = await requireClubPermission("CALLUPS_VIEW");
  const { matchId } = await params;

  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      organizationId: user.organizationId,
    },
    include: {
      organization: true,
      category: {
        include: {
          staffMembers: {
            orderBy: {
              createdAt: "asc",
            },
            take: 1,
          },
        },
      },
      callUps: {
        include: {
          athlete: true,
        },
      },
      athleteStats: {
        include: {
          athlete: true,
        },
        orderBy: [
          {
            lineupOrder: "asc",
          },
          {
            athlete: {
              name: "asc",
            },
          },
        ],
      },
      staffAssignments: {
        include: {
          staffMember: true,
        },
      },
      formationTemplate: {
        include: {
          slots: {
            where: { active: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!match) notFound();

  const access = await getClubCallUpCategoryAccess(
    user,
    match.categoryId,
  );

  if (!access.canView) notFound();

  const isFutsal = match.sport === "FUTSAL";

  const legacySlots = isFutsal
    ? [
        {
          code: "GOALKEEPER",
          label: "Goleiro",
          slotType: "GOALKEEPER",
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
          label: "Ala esquerdo",
          slotType: "OUTFIELD",
          x: 24,
          y: 43,
          sortOrder: 2,
        },
        {
          code: "ALA_RIGHT",
          label: "Ala direito",
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
          slotType: "GOALKEEPER",
          x: 50,
          y: 88,
          sortOrder: 0,
        },
        {
          code: "DEFENDER_LEFT",
          label: "Defensor esquerdo",
          slotType: "OUTFIELD",
          x: 22,
          y: 69,
          sortOrder: 1,
        },
        {
          code: "DEFENDER_CENTER",
          label: "Defensor central",
          slotType: "OUTFIELD",
          x: 50,
          y: 66,
          sortOrder: 2,
        },
        {
          code: "DEFENDER_RIGHT",
          label: "Defensor direito",
          slotType: "OUTFIELD",
          x: 78,
          y: 69,
          sortOrder: 3,
        },
        {
          code: "MIDFIELDER_LEFT",
          label: "Meia esquerdo",
          slotType: "OUTFIELD",
          x: 19,
          y: 45,
          sortOrder: 4,
        },
        {
          code: "MIDFIELDER_CENTER",
          label: "Meia central",
          slotType: "OUTFIELD",
          x: 50,
          y: 49,
          sortOrder: 5,
        },
        {
          code: "MIDFIELDER_RIGHT",
          label: "Meia direito",
          slotType: "OUTFIELD",
          x: 81,
          y: 45,
          sortOrder: 6,
        },
        {
          code: "FORWARD_LEFT",
          label: "Atacante esquerdo",
          slotType: "OUTFIELD",
          x: 34,
          y: 18,
          sortOrder: 7,
        },
        {
          code: "FORWARD_RIGHT",
          label: "Atacante direito",
          slotType: "OUTFIELD",
          x: 66,
          y: 18,
          sortOrder: 8,
        },
      ];

  const formationSlots = match.formationTemplate?.slots.length
    ? match.formationTemplate.slots.map((slot) => ({
        code: slot.code,
        label: slot.label,
        slotType: slot.slotType,
        x: slot.x,
        y: slot.y,
        sortOrder: slot.sortOrder,
      }))
    : legacySlots;

  const requiredSlots = formationSlots.map((slot) => slot.code);

  const configuredGoalkeepers =
    match.starterGoalkeeperCount ?? 1;

  const configuredOutfield =
    match.starterOutfieldCount ??
    Math.max(0, formationSlots.length - configuredGoalkeepers);

  const configuredStarters =
    configuredGoalkeepers + configuredOutfield;

  const reserveLimit =
    match.reserveCount ??
    Math.max(0, match.callUpLimit - configuredStarters);

  const squadLimit =
    match.starterGoalkeeperCount != null &&
    match.starterOutfieldCount != null &&
    match.reserveCount != null
      ? configuredStarters + reserveLimit
      : match.callUpLimit;

  const formationName =
    match.formationTemplate?.name ||
    match.formation ||
    (isFutsal ? "1-2-1" : "3-3-2");

  const starterStats = match.athleteStats.filter(
    (stat) =>
      stat.lineupRole === "STARTER" &&
      stat.positionPlayed &&
      requiredSlots.includes(stat.positionPlayed),
  );

  const substituteStats = match.athleteStats
    .filter((stat) => stat.lineupRole === "SUBSTITUTE")
    .slice(0, reserveLimit);

  if (
    !requiredSlots.every((slot) =>
      starterStats.some(
        (stat) => stat.positionPlayed === slot,
      ),
    )
  ) {
    notFound();
  }

  const isComplete =
    match.callUps.length === squadLimit &&
    starterStats.length === formationSlots.length;

  const { dateText, timeText } = dateParts(match.startsAt);

  const clubName =
    match.organization.publicName || match.organization.name;

  const accent =
    match.organization.accentColor || "#9DDB16";

  const selectedStaff =
    match.staffAssignments.map(
      (item) => item.staffMember,
    );

  const coach =
    selectedStaff[0] ||
    match.category.staffMembers[0];

  const athletePhotoPairs = await Promise.all(
    match.athleteStats.map(async (stat) => [
      stat.athleteId,
      await embeddedImageUrl(stat.athlete.photoUrl),
    ] as const),
  );

  const athletePhotoById = new Map(athletePhotoPairs);

  const [logoUrl, coverUrl] = await Promise.all([
    embeddedImageUrl(match.organization.logoUrl),
    embeddedImageUrl(match.organization.coverUrl),
  ]);

  const cover = coverUrl
    ? `url("${coverUrl}")`
    : "none";

  const sportLabel = isFutsal ? "Futsal" : "Futebol";

  const fieldDensityClass =
    formationSlots.length >= 13
      ? "poster-field-dense"
      : formationSlots.length >= 10
        ? "poster-field-compact"
        : "";

  const benchDensityClass =
    substituteStats.length > 8
      ? "poster-bench poster-bench-dense"
      : "poster-bench";

  return (
    <div
      className="convocation-art-page"
      style={
        {
          "--club-accent": accent,
          "--club-cover": cover,
        } as CSSProperties
      }
    >
      <style>{`
        .convocation-poster.convocation-poster-v2 {
          width: 940px;
          height: 1329px;
          min-height: 1329px;
          overflow: hidden;
          position: relative;
          border: 1px solid rgba(255,255,255,.16);
          color: #fff;
          background:
            linear-gradient(180deg, rgba(4,10,15,.90), rgba(2,7,10,.97)),
            var(--club-cover),
            radial-gradient(circle at 50% 8%, #25323c 0, #071018 58%, #020609 100%);
          background-size: cover;
          background-position: center;
          box-shadow: 0 30px 80px rgba(0,0,0,.28);
          font-family: Arial, Helvetica, sans-serif;
          isolation: isolate;
        }

        .convocation-poster-v2::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: -1;
          background:
            radial-gradient(circle at 88% 5%, color-mix(in srgb, var(--club-accent) 16%, transparent), transparent 27%),
            linear-gradient(115deg, rgba(255,255,255,.035), transparent 35%, rgba(0,0,0,.08));
        }

        .convocation-poster-v2 .poster-preview-label {
          position: absolute;
          z-index: 20;
          left: 0;
          right: 0;
          top: 0;
          height: 25px;
          display: flex;
          align-items: center;
          padding: 0 14px;
          border-radius: 0;
          background: #f4c84a;
          color: #11171b !important;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .06em;
        }

        .convocation-poster-v2 .poster-header-v2 {
          position: relative;
          padding: 42px 38px 12px;
        }

        .convocation-poster-v2 .poster-institutional-v2 {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          min-height: 78px;
        }

        .convocation-poster-v2 .poster-brand-v2 {
          display: flex;
          align-items: center;
          min-width: 0;
          gap: 16px;
        }

        .convocation-poster-v2 .poster-club-logo {
          display: block;
          width: 72px !important;
          height: 72px !important;
          flex: 0 0 72px;
          padding: 7px;
          border-radius: 16px !important;
          object-fit: contain;
          object-position: center;
          background: #fff !important;
          color: #07121a !important;
          box-shadow: 0 8px 22px rgba(0,0,0,.28);
        }

        .convocation-poster-v2 .poster-brand-copy-v2 {
          min-width: 0;
        }

        .convocation-poster-v2 .poster-brand-copy-v2 h2 {
          margin: 0 0 5px;
          color: #fff !important;
          font-size: 27px;
          line-height: 1;
          text-transform: uppercase;
          letter-spacing: .015em;
        }

        .convocation-poster-v2 .poster-brand-copy-v2 p {
          margin: 0;
          color: #aebcc6;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .19em;
        }

        .convocation-poster-v2 .poster-brand-copy-v2 small {
          display: block;
          margin-top: 9px;
          color: #d9e0e4;
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: .19em;
        }

        .convocation-poster-v2 .poster-onzeup-signature-v2 {
          flex: 0 0 auto;
          text-align: right;
        }

        .convocation-poster-v2 .poster-onzeup-signature-v2 small {
          display: block;
          margin-bottom: 5px;
          color: #84939d;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .22em;
          text-transform: uppercase;
        }

        .convocation-poster-v2 .poster-onzeup-signature-v2 strong {
          display: block;
          color: #fff !important;
          font-size: 23px;
          font-style: italic;
          letter-spacing: -.05em;
        }

        .convocation-poster-v2 .poster-onzeup-signature-v2 strong span {
          color: var(--club-accent);
        }

        .convocation-poster-v2 .poster-title-block-v2 {
          margin: 18px 0 14px;
          text-align: center;
        }

        .convocation-poster-v2 .poster-title-block-v2 small {
          display: block;
          margin-bottom: 5px;
          color: var(--club-accent);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .30em;
          text-transform: uppercase;
        }

        .convocation-poster-v2 .poster-main-title {
          margin: 0;
          color: #f8fafb !important;
          -webkit-text-fill-color: #f8fafb;
          -webkit-text-stroke: 0;
          font-family: Impact, "Arial Black", sans-serif;
          font-size: 54px;
          line-height: 1;
          letter-spacing: .025em;
          text-transform: uppercase;
          text-shadow: 0 5px 14px rgba(0,0,0,.50);
        }

        .convocation-poster-v2 .poster-match-card-v2 {
          overflow: hidden;
          border: 1px solid rgba(209,219,225,.50);
          border-radius: 16px;
          background: linear-gradient(180deg, rgba(8,17,23,.93), rgba(3,9,13,.93));
          box-shadow: 0 10px 28px rgba(0,0,0,.18);
        }

        .convocation-poster-v2 .poster-match-meta-v2 {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 12px;
          padding: 8px 14px;
          border-bottom: 1px solid rgba(255,255,255,.10);
        }

        .convocation-poster-v2 .poster-category-v2 {
          padding: 5px 9px;
          border-radius: 7px;
          background: var(--club-accent);
          color: #08110a;
          font-family: Impact, "Arial Black", sans-serif;
          font-size: 17px;
          line-height: 1;
          text-transform: uppercase;
        }

        .convocation-poster-v2 .poster-competition-v2 {
          overflow: hidden;
          color: #aab8c1;
          font-size: 10px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .convocation-poster-v2 .poster-status-v2 {
          color: var(--club-accent);
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .10em;
        }

        .convocation-poster-v2 .poster-versus-v2 {
          display: grid;
          grid-template-columns: 1fr 42px 1fr;
          align-items: center;
          gap: 12px;
          padding: 13px 20px;
        }

        .convocation-poster-v2 .poster-versus-v2 strong {
          overflow: hidden;
          color: #fff !important;
          font-size: 19px;
          text-transform: uppercase;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .convocation-poster-v2 .poster-versus-v2 strong:first-child {
          text-align: right;
        }

        .convocation-poster-v2 .poster-versus-v2 b {
          display: grid;
          place-items: center;
          width: 32px;
          height: 32px;
          margin: auto;
          border: 1px solid color-mix(in srgb, var(--club-accent) 66%, #fff);
          border-radius: 50%;
          color: var(--club-accent);
          font-size: 18px;
        }

        .convocation-poster-v2 .poster-details-v2 {
          display: grid;
          grid-template-columns: .9fr .9fr 1.55fr 1.05fr;
          margin-top: 9px;
          overflow: hidden;
          border: 1px solid rgba(209,219,225,.42);
          border-radius: 13px;
          background: rgba(4,10,14,.78);
        }

        .convocation-poster-v2 .poster-details-v2 span {
          min-height: 53px;
          padding: 9px 13px;
          border-left: 1px solid rgba(255,255,255,.13);
          background: transparent;
          font-size: 14px;
          font-weight: 800;
        }

        .convocation-poster-v2 .poster-details-v2 span:first-child {
          border-left: 0;
        }

        .convocation-poster-v2 .poster-details-v2 small {
          display: block;
          margin-bottom: 4px;
          color: #82929d;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: .13em;
          text-transform: uppercase;
        }

        .convocation-poster-v2 .poster-lineup-v2 {
          margin: 5px 38px 0;
        }

        .convocation-poster-v2 .poster-lineup-head-v2 {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 0 2px 8px;
        }

        .convocation-poster-v2 .poster-lineup-head-v2 strong {
          color: #f2f6f8 !important;
          font-size: 11px;
          letter-spacing: .18em;
          text-transform: uppercase;
        }

        .convocation-poster-v2 .poster-lineup-head-v2 span {
          color: #7f909b;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .12em;
        }

        .convocation-poster-v2 .poster-field {
          position: relative;
          width: 100%;
          height: 600px;
          margin: 0 auto;
          overflow: hidden;
          isolation: isolate;
          border: 2px solid rgba(238,244,247,.68);
          border-radius: 18px;
          transform: none;
          background:
            linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px),
            linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px),
            repeating-linear-gradient(
              90deg,
              #154b2e 0,
              #154b2e 100px,
              #195b35 100px,
              #195b35 200px
            );
          background-size: 50px 50px, 50px 50px, auto;
          box-shadow:
            inset 0 0 70px rgba(0,0,0,.30),
            0 18px 40px rgba(0,0,0,.25);
        }

        .convocation-poster-v2 .poster-field::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background:
            radial-gradient(
              circle at 50% 50%,
              transparent 0 67px,
              rgba(255,255,255,.58) 68px 70px,
              transparent 71px
            ),
            linear-gradient(
              transparent calc(50% - 1px),
              rgba(255,255,255,.58) 50%,
              transparent calc(50% + 2px)
            );
          opacity: .82;
        }

        .convocation-poster-v2 .poster-field::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background:
            linear-gradient(
              90deg,
              transparent calc(50% - 1px),
              rgba(255,255,255,.06) 50%,
              transparent calc(50% + 1px)
            ),
            radial-gradient(circle at 50% 20%, rgba(157,219,22,.08), transparent 38%);
        }

        .convocation-poster-v2 .field-mark {
          z-index: 1;
          border-color: rgba(255,255,255,.48);
        }

        .convocation-poster-v2 .field-center {
          width: 128px;
          height: 128px;
        }

        .convocation-poster-v2 .field-area-top,
        .convocation-poster-v2 .field-area-bottom {
          width: 265px;
          height: 92px;
        }

        .convocation-poster-v2 .poster-field > [class^="art-"] {
          position: absolute;
          z-index: 4;
          transform: translate(-50%, -50%);
        }

        .convocation-poster-v2 .poster-field-compact .art-athlete {
          width: 100px;
        }

        .convocation-poster-v2 .poster-field-compact .art-photo {
          width: 64px;
          height: 64px;
        }

        .convocation-poster-v2 .poster-field-compact .art-nameplate {
          width: 92px;
        }

        .convocation-poster-v2 .poster-field-dense .art-athlete {
          width: 88px;
        }

        .convocation-poster-v2 .poster-field-dense .art-photo {
          width: 56px;
          height: 56px;
        }

        .convocation-poster-v2 .poster-field-dense .art-nameplate {
          width: 80px;
          min-height: 21px;
        }

        .convocation-poster-v2 .poster-field-dense .art-nameplate strong {
          max-width: 58px;
          font-size: 8px;
        }

        .convocation-poster-v2 .art-athlete {
          width: 112px;
          text-align: center;
        }

        .convocation-poster-v2 .art-photo {
          position: relative;
          width: 72px;
          height: 72px;
          margin: auto;
          padding: 3px;
          overflow: visible !important;
          border: 2px solid #fff;
          border-radius: 50% !important;
          background: #0a151d;
          box-shadow:
            0 0 0 3px var(--club-accent),
            0 7px 16px rgba(0,0,0,.55);
        }

        .convocation-poster-v2 .art-photo-crop {
          width: 100%;
          height: 100%;
          overflow: hidden !important;
          border-radius: 50% !important;
          background: #0a1720;
          display: grid;
          place-items: center;
        }

        .convocation-poster-v2 .art-photo-crop .art-athlete-image,
        .convocation-poster-v2 .art-photo-crop > img {
          display: block !important;
          width: 100% !important;
          height: 100% !important;
          max-width: none !important;
          object-fit: cover !important;
          object-position: 50% 22% !important;
          border-radius: 50% !important;
        }

        .convocation-poster-v2 .art-photo-crop > span {
          display: grid;
          place-items: center;
          width: 100%;
          height: 100%;
          color: #fff;
          font-size: 20px;
          font-weight: 900;
          background: linear-gradient(145deg, #173044, #07121a);
        }

        .convocation-poster-v2 .art-photo i {
          position: absolute;
          right: -10px;
          top: 38px;
          width: 25px;
          height: 25px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: var(--club-accent);
          color: #071008;
          font-style: normal;
          font-weight: 1000;
          box-shadow: 0 2px 7px #000;
        }

        .convocation-poster-v2 .art-nameplate {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          width: 104px;
          min-height: 24px;
          margin: -1px auto 0;
          padding: 3px 7px;
          overflow: hidden;
          border: 1px solid rgba(230,237,241,.82);
          border-radius: 6px;
          background: rgba(3,8,11,.96);
          box-shadow: 0 5px 11px rgba(0,0,0,.45);
        }

        .convocation-poster-v2 .art-nameplate b {
          color: var(--club-accent);
          font-size: 13px;
          line-height: 1;
        }

        .convocation-poster-v2 .art-nameplate strong {
          max-width: 75px;
          overflow: hidden;
          color: #fff !important;
          font-size: 10px;
          text-transform: uppercase;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .convocation-poster-v2 .poster-bench {
          margin: 16px 38px 10px;
          padding: 10px 16px 12px;
          border: 1px solid rgba(209,219,225,.42);
          border-radius: 14px;
          background: linear-gradient(180deg, rgba(8,17,23,.93), rgba(3,9,13,.93));
        }

        .convocation-poster-v2 .poster-section-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: auto;
          margin: 0 0 8px;
          padding: 0 2px 8px;
          border: 0;
          border-bottom: 1px solid rgba(255,255,255,.12);
          background: transparent;
          font-family: Arial, Helvetica, sans-serif;
        }

        .convocation-poster-v2 .poster-section-title::before,
        .convocation-poster-v2 .poster-section-title::after {
          display: none;
        }

        .convocation-poster-v2 .poster-section-title span {
          color: #fff;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .18em;
          text-transform: uppercase;
        }

        .convocation-poster-v2 .poster-section-title b {
          display: block;
          color: #7f909b;
          font-size: 9px;
          font-family: Arial, Helvetica, sans-serif;
          font-weight: 800;
          letter-spacing: .08em;
        }

        .convocation-poster-v2 .bench-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 8px;
          min-height: 77px;
        }

        .convocation-poster-v2 .bench-grid .art-athlete {
          width: auto;
        }

        .convocation-poster-v2 .bench-grid .art-photo {
          width: 52px;
          height: 52px;
        }

        .convocation-poster-v2 .bench-grid .art-photo i {
          top: 27px;
          width: 21px;
          height: 21px;
          font-size: 10px;
        }

        .convocation-poster-v2 .bench-grid .art-nameplate {
          width: 92px;
          min-height: 21px;
          padding: 2px 5px;
        }

        .convocation-poster-v2 .bench-grid .art-nameplate b {
          font-size: 11px;
        }

        .convocation-poster-v2 .bench-grid .art-nameplate strong {
          max-width: 65px;
          font-size: 9px;
        }

        .convocation-poster-v2 .poster-bench-dense .bench-grid {
          grid-template-columns: repeat(8, 1fr);
          gap: 7px 3px;
        }

        .convocation-poster-v2 .poster-bench-dense .art-photo {
          width: 44px;
          height: 44px;
        }

        .convocation-poster-v2 .poster-bench-dense .art-nameplate {
          width: 78px;
          min-height: 19px;
        }

        .convocation-poster-v2 .poster-bench-dense .art-nameplate strong {
          max-width: 54px;
          font-size: 8px;
        }

        .convocation-poster-v2 .poster-service-info {
          display: grid;
          grid-template-columns: .85fr 1.15fr 1.7fr;
          gap: 0;
          margin: 0 38px 58px;
          overflow: hidden;
          border: 1px solid rgba(209,219,225,.42);
          border-radius: 12px;
          background: rgba(4,10,14,.88);
        }

        .convocation-poster-v2 .poster-service-info div {
          min-width: 0;
          padding: 9px 12px;
          border-left: 1px solid rgba(255,255,255,.12);
        }

        .convocation-poster-v2 .poster-service-info div:first-child {
          border-left: 0;
        }

        .convocation-poster-v2 .poster-service-info small {
          display: block;
          margin-bottom: 3px;
          color: var(--club-accent);
          font-size: 7px;
          font-weight: 900;
          letter-spacing: .14em;
          text-transform: uppercase;
        }

        .convocation-poster-v2 .poster-service-info strong {
          display: block;
          overflow: hidden;
          color: #fff !important;
          font-size: 10px;
          line-height: 1.25;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .convocation-poster-v2 .poster-footer {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 20px;
          height: 44px;
          padding: 0 38px;
          border-top: 1px solid rgba(255,255,255,.13);
          background: rgba(2,7,10,.96);
          color: #7f8d96;
          font-size: 8px;
          letter-spacing: .10em;
          text-transform: uppercase;
        }

        .convocation-poster-v2 .poster-footer span:nth-child(2) {
          color: #d8e0e5;
          text-align: center;
        }

        .convocation-poster-v2 .poster-footer span:last-child {
          text-align: right;
        }

        .convocation-poster-v2 .poster-footer strong {
          color: #fff !important;
          font-style: italic;
        }

        @media (max-width: 980px) {
          .convocation-art-page {
            overflow-x: auto;
          }

          .convocation-poster.convocation-poster-v2 {
            width: 940px;
            max-width: none;
          }
        }

        @media print {
          .convocation-poster.convocation-poster-v2 {
            width: 210mm;
            height: 297mm;
            min-height: 297mm;
            box-shadow: none;
          }
        }
      `}</style>

      <div className="convocation-art-toolbar convocation-no-print">
        <Link
          className="btn btn-secondary"
          href={`/convocacoes/${match.id}`}
        >
          Voltar à convocação
        </Link>

        <ConvocationPrintActions />
      </div>

      <main
        className="convocation-poster convocation-poster-v2"
        id="convocation-poster"
      >
        {!isComplete ? (
          <div className="poster-preview-label">
            PRÉVIA • LISTA INCOMPLETA
          </div>
        ) : null}

        <header className="poster-header-v2">
          <div className="poster-institutional-v2">
            <div className="poster-brand-v2">
              <SafeConvocationImage
                src={logoUrl ?? safeImageUrl(match.organization.logoUrl)}
                alt={clubName}
                fallback={clubName.slice(0, 2).toUpperCase()}
                className="poster-club-logo"
              />

              <div className="poster-brand-copy-v2">
                <h2>{clubName}</h2>
                <p>Departamento de futebol de base</p>
                <small>
                  Formação • desenvolvimento • grandes histórias
                </small>
              </div>
            </div>

            <div className="poster-onzeup-signature-v2">
              <small>Gestão esportiva</small>
              <strong>
                ONZE<span>UP</span>
              </strong>
            </div>
          </div>

          <div className="poster-title-block-v2">
            <small>
              {sportLabel} • {match.category.name}
            </small>

            <h1 className="poster-main-title">
              CONVOCAÇÃO OFICIAL
            </h1>
          </div>

          <div className="poster-match-card-v2">
            <div className="poster-match-meta-v2">
              <span className="poster-category-v2">
                {match.category.name}
              </span>

              <span className="poster-competition-v2">
                {match.competition || "Jogo amistoso"}
              </span>

              <span className="poster-status-v2">
                Jogo confirmado
              </span>
            </div>

            <div className="poster-versus-v2">
              <strong>{clubName}</strong>
              <b>×</b>
              <strong>{match.opponent}</strong>
            </div>
          </div>

          <div className="poster-details-v2">
            <span>
              <small>DATA</small>
              {dateText}
            </span>

            <span>
              <small>HORÁRIO</small>
              {timeText}
            </span>

            <span>
              <small>LOCAL</small>
              {match.location || "A definir"}
            </span>

            <span>
              <small>CHEGADA</small>
              {match.presentationTime || "A definir"}
            </span>
          </div>
        </header>

        <section className="poster-lineup-v2">
          <div className="poster-lineup-head-v2">
            <strong>Formação inicial</strong>
            <span>
              {sportLabel} • {formationName} • {formationSlots.length} titulares
            </span>
          </div>

          <div
            className={`poster-field ${fieldDensityClass}`}
            aria-label={`Titulares no campo • formação ${formationName}`}
          >
            <div className="field-mark field-center" />
            <div className="field-mark field-area-top" />
            <div className="field-mark field-area-bottom" />

            {starterStats.map((stat) => {
              const slot = formationSlots.find(
                (item) => item.code === stat.positionPlayed,
              );

              if (!slot) return null;

              return (
                <div
                  className="art-dynamic-slot"
                  key={stat.id}
                  style={{
                    left: `${slot.x}%`,
                    top: `${slot.y}%`,
                  }}
                  title={slot.label}
                >
                  <AthleteBadge
                    athlete={stat.athlete}
                    photoUrl={athletePhotoById.get(stat.athleteId)}
                    number={stat.jerseyNumber}
                    captain={stat.isCaptain}
                  />
                </div>
              );
            })}
          </div>
        </section>

        <section className={benchDensityClass}>
          <div className="poster-section-title">
            <span>Reservas</span>
            <b>
              {substituteStats.length}{" "}
              {substituteStats.length === 1
                ? "atleta"
                : "atletas"}
            </b>
          </div>

          <div className="bench-grid">
            {substituteStats.map((stat) => (
              <AthleteBadge
                key={stat.id}
                athlete={stat.athlete}
                photoUrl={athletePhotoById.get(stat.athleteId)}
                number={stat.jerseyNumber}
                captain={false}
              />
            ))}
          </div>
        </section>

        <section className="poster-service-info">
          <div>
            <small>TÉCNICO</small>
            <strong>
              {coach?.name || "A definir"}
            </strong>
          </div>

          <div>
            <small>COMISSÃO</small>
            <strong>
              {selectedStaff.length
                ? selectedStaff
                    .map((member) => member.name)
                    .join(" • ")
                : coach?.roleTitle ||
                  "Comissão técnica"}
            </strong>
          </div>

          <div>
            <small>UNIFORME E EQUIPAMENTO</small>
            <strong>
              {match.arrivalAttire === "TRAINING_UNIFORM"
                ? "Treino • troca no local"
                : "Jogo • chegar uniformizado"}

              {match.uniform
                ? ` • ${match.uniform}`
                : ""}

              {match.sockRequirement
                ? ` • ${match.sockRequirement}`
                : ""}

              {match.shinGuardsRequired
                ? " • caneleira"
                : ""}
            </strong>
          </div>
        </section>

        <footer className="poster-footer">
          <span>
            Gerado pelo <strong>ONZEUP</strong>
          </span>

          <span>
            {isComplete
              ? "DOCUMENTO OFICIAL"
              : "MODELO DE PRÉVIA"}
          </span>

          <span>
            {match.category.name} • {dateText}
          </span>
        </footer>
      </main>
    </div>
  );
}
