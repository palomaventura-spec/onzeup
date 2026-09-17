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

const SLOT_CLASS: Record<string, string> = {
  GOALKEEPER: "art-goalkeeper",
  DEFENDER_LEFT: "art-defender-left",
  DEFENDER_CENTER: "art-defender-center",
  DEFENDER_RIGHT: "art-defender-right",
  MIDFIELDER_LEFT: "art-midfielder-left",
  MIDFIELDER_CENTER: "art-midfielder-center",
  MIDFIELDER_RIGHT: "art-midfielder-right",
  FORWARD_LEFT: "art-forward-left",
  FORWARD_RIGHT: "art-forward-right",
  FIXO: "art-fixo",
  ALA_LEFT: "art-ala-left",
  ALA_RIGHT: "art-ala-right",
  PIVO: "art-pivo",
};

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

function AthleteBadge({
  athlete,
  number,
  captain,
}: {
  athlete: { name: string; nickname: string | null; photoUrl: string | null };
  number: number | null;
  captain: boolean;
}) {
  const name = athlete.nickname || athlete.name;
  return (
    <div className="art-athlete">
      <div className="art-photo">
        <div className="art-photo-crop">
          <SafeConvocationImage
            src={safeImageUrl(athlete.photoUrl)}
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
    where: { id: matchId, organizationId: user.organizationId },
    include: {
      organization: true,
      category: {
        include: {
          staffMembers: {
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      },
      callUps: { include: { athlete: true } },
      athleteStats: {
        include: { athlete: true },
        orderBy: [{ lineupOrder: "asc" }, { athlete: { name: "asc" } }],
      },
      staffAssignments: { include: { staffMember: true } },
    },
  });
  if (!match) notFound();
  const access = await getClubCallUpCategoryAccess(user, match.categoryId);
  if (!access.canView) notFound();

  const isFutsal = match.sport === "FUTSAL";
  const requiredSlots = isFutsal
    ? ["GOALKEEPER", "FIXO", "ALA_LEFT", "ALA_RIGHT", "PIVO"]
    : [
        "GOALKEEPER",
        "DEFENDER_LEFT",
        "DEFENDER_CENTER",
        "DEFENDER_RIGHT",
        "MIDFIELDER_LEFT",
        "MIDFIELDER_CENTER",
        "MIDFIELDER_RIGHT",
        "FORWARD_LEFT",
        "FORWARD_RIGHT",
      ];
  const squadLimit = match.callUpLimit;
  const starterStats = match.athleteStats.filter(
    (stat) =>
      stat.lineupRole === "STARTER" &&
      stat.positionPlayed &&
      requiredSlots.includes(stat.positionPlayed),
  );
  const reserveLimit = Math.max(0, squadLimit - requiredSlots.length);
  const substituteStats = match.athleteStats
    .filter((stat) => stat.lineupRole === "SUBSTITUTE")
    .slice(0, reserveLimit);
  if (
    !requiredSlots.every((slot) =>
      starterStats.some((stat) => stat.positionPlayed === slot),
    )
  )
    notFound();
  const isComplete = match.callUps.length === squadLimit;

  const { dateText, timeText } = dateParts(match.startsAt);
  const clubName = match.organization.publicName || match.organization.name;
  const accent = match.organization.accentColor || "#9DDB16";
  const selectedStaff = match.staffAssignments.map((item) => item.staffMember);
  const coach = selectedStaff[0] || match.category.staffMembers[0];
  const cover = match.organization.coverUrl
    ? `url("${match.organization.coverUrl}")`
    : "none";

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
      <div className="convocation-art-toolbar convocation-no-print">
        <Link className="btn btn-secondary" href={`/convocacoes/${match.id}`}>
          Voltar Ã  convocaÃ§Ã£o
        </Link>
        <ConvocationPrintActions />
      </div>

      <main className="convocation-poster" id="convocation-poster">
        {!isComplete ? (
          <div className="poster-preview-label">PRÃ‰VIA â€¢ LISTA INCOMPLETA</div>
        ) : null}
        <header className="poster-header poster-header-premium">
          <div className="poster-institutional">
            <div className="poster-brand">
              <SafeConvocationImage
                src={safeImageUrl(match.organization.logoUrl)}
                alt={clubName}
                fallback={clubName.slice(0, 2).toUpperCase()}
                className="poster-club-logo"
              />
              <div>
                <h2>{clubName}</h2>
                <p>Departamento de futebol de base</p>
                <small>FormaÃ§Ã£o â€¢ desenvolvimento â€¢ grandes histÃ³rias</small>
              </div>
            </div>
            <div className="poster-values">
              DISCIPLINA
              <br />
              RESPEITO
              <br />
              TRABALHO
              <br />
              EVOLUÃ‡ÃƒO
              <b>
                ONZE<span>UP</span>
              </b>
            </div>
          </div>
          <h1 className="poster-main-title">CONVOCAÃ‡ÃƒO OFICIAL</h1>

          <div className="poster-match">
            <span className="poster-category">{match.category.name}</span>
            <span className="poster-competition">
              {match.competition || "Jogo amistoso"}
            </span>
            <strong>{clubName}</strong>
            <b>Ã—</b>
            <strong>{match.opponent}</strong>
            <em>JOGO CONFIRMADO</em>
          </div>
          <div className="poster-details">
            <span>
              <small>â–£ DATA</small>
              {dateText}
            </span>
            <span>
              <small>â—· HORÃRIO DO JOGO</small>
              {timeText}
            </span>
            <span>
              <small>â— LOCAL</small>
              {match.location || "A definir"}
            </span>
            <span>
              <small>â—· CHEGADA</small>
              {match.presentationTime || "A definir"}
            </span>
          </div>
        </header>

        <aside className="poster-motto poster-motto-left">
          MAIS
          <br />
          QUE UM
          <br />
          CLUBE,
          <br />
          UMA
          <br />
          ESCOLA
          <br />
          DE VIDA
        </aside>
        <aside className="poster-motto poster-motto-right">
          AQUI
          <br />
          NASCEM
          <br />
          GRANDES
          <br />
          HISTÃ“RIAS
        </aside>

        <section className="poster-field" aria-label="Titulares no campo">
          <div className="field-mark field-center" />
          <div className="field-mark field-area-top" />
          <div className="field-mark field-area-bottom" />
          {starterStats.map((stat) => (
            <div className={SLOT_CLASS[stat.positionPlayed!]} key={stat.id}>
              <AthleteBadge
                athlete={stat.athlete}
                number={stat.jerseyNumber}
                captain={stat.isCaptain}
              />
            </div>
          ))}
        </section>

        <section className="poster-bench">
          <div className="poster-section-title">
            <span>RESERVAS</span>
            <b>{substituteStats.length} atletas</b>
          </div>
          <div className="bench-grid">
            {substituteStats.map((stat) => (
              <AthleteBadge
                key={stat.id}
                athlete={stat.athlete}
                number={stat.jerseyNumber}
                captain={false}
              />
            ))}
          </div>
        </section>

        <section className="poster-service-info">
          <div>
            <small>TÃ‰CNICO</small>
            <strong>{coach?.name || "A definir"}</strong>
          </div>
          <div>
            <small>COMISSÃƒO</small>
            <strong>
              {selectedStaff.length
                ? selectedStaff.map((member) => member.name).join(" â€¢ ")
                : coach?.roleTitle || "ComissÃ£o tÃ©cnica"}
            </strong>
          </div>
          <div>
            <small>UNIFORME E EQUIPAMENTO</small>
            <strong>
              {match.arrivalAttire === "TRAINING_UNIFORM"
                ? "Treino â€¢ troca no local"
                : "Jogo â€¢ chegar uniformizado"}
              {match.uniform ? ` â€¢ ${match.uniform}` : ""}
              {match.sockRequirement ? ` â€¢ ${match.sockRequirement}` : ""}
              {match.shinGuardsRequired ? " â€¢ caneleira" : ""}
            </strong>
          </div>
        </section>

        <footer className="poster-footer">
          <span>
            ConvocaÃ§Ã£o gerada pelo <strong>ONZEUP</strong>
          </span>
          <span>{isComplete ? "DOCUMENTO OFICIAL" : "MODELO DE PRÃ‰VIA"}</span>
          <span>
            {match.category.name} â€¢ {dateText}
          </span>
        </footer>
      </main>
    </div>
  );
}


