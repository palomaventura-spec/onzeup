import PendingSubmitButton from "@/components/PendingSubmitButton";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireClubPermission } from "@/lib/club-access";
import { hasClubPermission } from "@/lib/club-permissions";
import { prisma } from "@/lib/prisma";
import SumulaPrintButton from "./SumulaPrintButton";
import SumulaMinuteInputs from "./SumulaMinuteInputs";
import SumulaHalfMinuteInputs from "./SumulaHalfMinuteInputs";

import {
  addMatchEvent,
  deleteMatchEvent,
  finalizeMatchSheet,
  reopenMatchSheet,
  saveMatchSheet,
} from "./actions";

const participationOptions = [
  ["RELATED", "Relacionado"],
  ["PRESENT", "Presente"],
  ["ABSENT", "Ausente"],
  ["INJURED", "Lesionado"],
  ["SUSPENDED", "Suspenso"],
  ["NOT_RELATED", "Não relacionado"],
] as const;

const eventLabels: Record<string, string> = {
  GOAL: "Gol",
  ASSIST: "Assistência",
  YELLOW_CARD: "Cartão amarelo",
  RED_CARD: "Cartão vermelho",
  SUBSTITUTION: "Substituição",
  INJURY: "Lesão",
  PENALTY: "Pênalti",
  OWN_GOAL: "Gol contra",
  OTHER: "Outra ocorrência",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

export default async function MatchSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireClubPermission("MATCHES_VIEW");
  const canEdit = hasClubPermission(user, "MATCHES_EDIT");
  const { id } = await params;

  const match = await prisma.match.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      organization: { select: { name: true, publicName: true } },
      category: true,
      callUps: {
        include: { athlete: true },
        orderBy: { athlete: { name: "asc" } },
      },
      athleteStats: true,
      events: {
        include: { athlete: { select: { name: true, nickname: true } } },
        orderBy: [{ minute: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!match) notFound();

  const editable = canEdit && match.matchSheetStatus === "DRAFT";
  const stats = new Map(
    match.athleteStats.map((item) => [item.athleteId, item]),
  );

  return (
    <>
      {/* SUMULA_PDF_A4_LANDSCAPE_V1 */}
      <style>{`
        .sumula-print-report { display: none; }
        @page { size: A4 landscape; margin: 11mm; }
        @media print {
          html, body { background: #fff !important; color: #101820 !important; }
          .shell { display: block !important; width: 100% !important; min-height: 0 !important; }
          .shell > :not(.club-workspace) { display: none !important; }
          .club-workspace { display: block !important; width: 100% !important; min-height: 0 !important; padding: 0 !important; margin: 0 !important; }
          .club-workspace > :not(.club-main-content) { display: none !important; }
          .club-main-content { display: block !important; width: 100% !important; min-width: 0 !important; padding: 0 !important; margin: 0 !important; max-width: none !important; }
          .club-main-content > :not(.sumula-print-report):not(style) { display: none !important; }
          .sumula-print-report { display: block !important; position: static !important; width: 100% !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; color: #17222b !important; font: 8.5pt Arial, sans-serif !important; }
          .sumula-print-report * { box-sizing: border-box; }
          .sumula-print-report h1 { font-size: 16pt !important; margin: 0 0 4mm !important; color: #101a22 !important; }
          .sumula-print-report h2 { font-size: 10pt !important; margin: 5mm 0 2mm !important; color: #101a22 !important; }
          .sumula-print-report .sumula-print-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 3mm; border-bottom: 2px solid #a5df27; gap: 8mm; }
          .sumula-print-report .sumula-print-header small { font-weight: 800; letter-spacing: 1px; color: #45600b; }
          .sumula-print-report .sumula-print-header p { margin: 1mm 0 0; font-size: 8pt; }
          .sumula-print-report .sumula-print-score { font-weight: 800; font-size: 13pt; text-align: right; }
          .sumula-print-report .sumula-print-meta { display: flex; flex-wrap: wrap; gap: 3mm 7mm; margin-top: 3mm; font-size: 8pt; }
          .sumula-print-report .sumula-print-table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 7.3pt; }
          .sumula-print-report .sumula-print-table th { background: #eaf0e8; color: #233124; text-align: left; font-weight: 800; }
          .sumula-print-report .sumula-print-table th, .sumula-print-report .sumula-print-table td { border: 1px solid #cfd8d5; padding: 1.4mm 1.1mm; vertical-align: top; white-space: normal; overflow-wrap: anywhere; word-break: normal; }
          .sumula-print-report .sumula-print-table thead { display: table-header-group; }
          .sumula-print-report .sumula-print-table tr { break-inside: avoid; page-break-inside: avoid; }
          .sumula-print-report .sumula-print-table .num { text-align: center; }
          .sumula-print-report .sumula-print-notes { white-space: pre-wrap; font-size: 8pt; }
          .sumula-print-report .sumula-print-events { display: grid; gap: 1mm; font-size: 8pt; }
          .sumula-print-report .sumula-print-events div { break-inside: avoid; border-bottom: 1px solid #e1e5e8; padding: 1mm 0; }
          .sumula-print-report .sumula-print-foot { margin-top: 4mm; border-top: 1px solid #ced7d9; padding-top: 2mm; font-size: 7pt; color: #637079; }
        }
      `}</style>
      {/* 11UP_SUMULA_CAMPO_CARTOES_VISIVEIS_V1: adapta apenas a tela de edição do futebol de campo */}
      <style>{`
        @media screen {
          .sumula-campo-compacta.table { display: block; width: 100%; }
          .sumula-campo-compacta thead { display: none; }
          .sumula-campo-compacta tbody { display: grid; gap: 12px; width: 100%; }
          .sumula-campo-compacta tbody > tr {
            display: grid;
            grid-template-columns: repeat(14, minmax(0, 1fr));
            align-items: end;
            gap: 10px 12px;
            padding: 14px 16px;
            border: 1px solid #dce5ea;
            border-radius: 12px;
            background: #fff;
            min-width: 0;
          }
          .sumula-campo-compacta tbody > tr > td {
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            align-items: stretch;
            gap: 5px;
            min-width: 0;
            border: 0 !important;
            padding: 0 !important;
            vertical-align: top;
          }
          .sumula-campo-compacta tbody > tr > td::before {
            display: block;
            font-size: 10px;
            line-height: 1.35;
            font-weight: 800;
            letter-spacing: .04em;
            color: #61717d;
            text-transform: uppercase;
          }
          .sumula-campo-compacta td:nth-child(1) { grid-column: span 3; }
          .sumula-campo-compacta td:nth-child(2),
          .sumula-campo-compacta td:nth-child(3) { grid-column: span 2; }
          .sumula-campo-compacta td:nth-child(4) { grid-column: span 1; }
          .sumula-campo-compacta td:nth-child(5),
          .sumula-campo-compacta td:nth-child(6),
          .sumula-campo-compacta td:nth-child(7),
          .sumula-campo-compacta td:nth-child(8) { grid-column: span 1; }
          .sumula-campo-compacta td:nth-child(9) { grid-column: span 2; }
          .sumula-campo-compacta td:nth-child(10),
          .sumula-campo-compacta td:nth-child(11),
          .sumula-campo-compacta td:nth-child(12),
          .sumula-campo-compacta td:nth-child(13),
          .sumula-campo-compacta td:nth-child(14) { grid-column: span 2; }
          .sumula-campo-compacta td:nth-child(15) { grid-column: span 4; }
          .sumula-campo-compacta td:nth-child(1)::before { content: "ATLETA"; }
          .sumula-campo-compacta td:nth-child(2)::before { content: "PRESENÇA"; }
          .sumula-campo-compacta td:nth-child(3)::before { content: "FUNÇÃO"; }
          .sumula-campo-compacta td:nth-child(4)::before { content: "Nº"; }
          .sumula-campo-compacta td:nth-child(5)::before { content: "1º T · ENTRADA"; }
          .sumula-campo-compacta td:nth-child(6)::before { content: "1º T · SAÍDA"; }
          .sumula-campo-compacta td:nth-child(7)::before { content: "2º T · ENTRADA"; }
          .sumula-campo-compacta td:nth-child(8)::before { content: "2º T · SAÍDA"; }
          .sumula-campo-compacta td:nth-child(9)::before { content: "TOTAL JOGADO"; }
          .sumula-campo-compacta td:nth-child(10)::before { content: "GOLS"; }
          .sumula-campo-compacta td:nth-child(11)::before { content: "ASSISTÊNCIAS"; }
          .sumula-campo-compacta td:nth-child(12)::before { content: "CA · AMARELO"; }
          .sumula-campo-compacta td:nth-child(13)::before { content: "CV · VERMELHO"; }
          .sumula-campo-compacta td:nth-child(14)::before { content: "CAPITÃO"; }
          .sumula-campo-compacta td:nth-child(15)::before { content: "OBSERVAÇÕES"; }
          .sumula-campo-compacta select,
          .sumula-campo-compacta input[type="number"],
          .sumula-campo-compacta textarea { 
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            margin: 0 !important;
          }
          .sumula-campo-compacta textarea { min-height: 44px; height: 48px; resize: vertical; }
          .sumula-campo-compacta input[type="radio"] { align-self: flex-start; width: 22px; height: 22px; }
          .sumula-campo-compacta output { display: flex; align-items: center; min-height: 44px; }
          .sumula-campo-compacta tbody > tr > td:first-child strong { overflow-wrap: anywhere; font-size: 15px; }
        }
        @media screen and (max-width: 1180px) {
          .sumula-campo-compacta tbody > tr { grid-template-columns: repeat(12, minmax(0, 1fr)); }
          .sumula-campo-compacta td:nth-child(1) { grid-column: span 4; }
          .sumula-campo-compacta td:nth-child(2),
          .sumula-campo-compacta td:nth-child(3) { grid-column: span 3; }
          .sumula-campo-compacta td:nth-child(4) { grid-column: span 2; }
          .sumula-campo-compacta td:nth-child(5),
          .sumula-campo-compacta td:nth-child(6),
          .sumula-campo-compacta td:nth-child(7),
          .sumula-campo-compacta td:nth-child(8) { grid-column: span 2; }
          .sumula-campo-compacta td:nth-child(9) { grid-column: span 4; }
          .sumula-campo-compacta td:nth-child(10),
          .sumula-campo-compacta td:nth-child(11),
          .sumula-campo-compacta td:nth-child(12),
          .sumula-campo-compacta td:nth-child(13),
          .sumula-campo-compacta td:nth-child(14) { grid-column: span 2; }
          .sumula-campo-compacta td:nth-child(15) { grid-column: span 12; }
        }
        @media screen and (max-width: 700px) {
          .sumula-campo-compacta tbody > tr { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px 8px; padding: 12px; }
          .sumula-campo-compacta td:nth-child(1) { grid-column: span 4; }
          .sumula-campo-compacta td:nth-child(2),
          .sumula-campo-compacta td:nth-child(3) { grid-column: span 2; }
          .sumula-campo-compacta td:nth-child(4) { grid-column: span 1; }
          .sumula-campo-compacta td:nth-child(5),
          .sumula-campo-compacta td:nth-child(6),
          .sumula-campo-compacta td:nth-child(7),
          .sumula-campo-compacta td:nth-child(8) { grid-column: span 2; }
          .sumula-campo-compacta td:nth-child(9) { grid-column: span 3; }
          .sumula-campo-compacta td:nth-child(10),
          .sumula-campo-compacta td:nth-child(11),
          .sumula-campo-compacta td:nth-child(12),
          .sumula-campo-compacta td:nth-child(13) { grid-column: span 1; }
          .sumula-campo-compacta td:nth-child(14) { grid-column: span 1; }
          .sumula-campo-compacta td:nth-child(15) { grid-column: span 3; }
          .sumula-campo-compacta tbody > tr > td::before { font-size: 9px; }
        }
      `}</style>
      <section className="sumula-print-report" aria-label="Sumula oficial para impressao">
        <div className="sumula-print-header">
          <div>
            <small>11UP CLUB · SÚMULA DA PARTIDA</small>
            <h1>{match.category.name} × {match.opponent}</h1>
            <p>{formatDate(match.startsAt)} · {match.location || "Local a definir"}</p>
          </div>
          <div className="sumula-print-score">
            {match.organization.publicName || match.organization.name} {match.goalsFor ?? "—"} × {match.goalsAgainst ?? "—"} {match.opponent}
          </div>
        </div>
        <div className="sumula-print-meta">
          <span><strong>Categoria:</strong> {match.category.name}</span>
          <span><strong>Apresentação:</strong> {match.presentationTime || "—"}</span>
          <span><strong>Uniforme:</strong> {match.uniform || "—"}</span>
          <span><strong>Árbitro:</strong> {match.referee || "—"}</span>
          <span><strong>Assistente:</strong> {match.assistantReferee || "—"}</span>
          <span><strong>Status:</strong> {match.matchSheetStatus === "FINALIZED" ? "Finalizada" : "Rascunho"}</span>
        </div>
        <h2>Convocados · Participação e estatísticas ({match.callUps.length})</h2>
        <table className="sumula-print-table">
          <colgroup>
            <col style={{ width: "15%" }} /><col style={{ width: "10%" }} /><col style={{ width: "8%" }} />
            <col style={{ width: "4%" }} /><col style={{ width: "7%" }} /><col style={{ width: "7%" }} />
            <col style={{ width: "5%" }} /><col style={{ width: "3%" }} /><col style={{ width: "3%" }} />
            <col style={{ width: "4%" }} /><col style={{ width: "4%" }} /><col style={{ width: "4%" }} />
            <col style={{ width: "26%" }} />
          </colgroup>
          <thead><tr>
            <th>Atleta</th><th>Presença</th><th>Função</th><th>Nº</th>
            <th>{match.sport === "FOOTBALL" ? "1º T (E–S)" : "Ent."}</th>
            <th>{match.sport === "FOOTBALL" ? "2º T (E–S)" : "Saí."}</th>
            <th>Min.</th><th>G</th><th>A</th><th>CA</th><th>CV</th><th>Cap.</th><th>Observações</th>
          </tr></thead>
          <tbody>
            {match.callUps.map(({ athlete }) => {
              const stat = stats.get(athlete.id);
              const minuteCalc = stat?.enteredAtMinute != null && stat?.leftAtMinute != null && stat.leftAtMinute >= stat.enteredAtMinute
                ? stat.leftAtMinute - stat.enteredAtMinute : null;
              return (
                <tr key={athlete.id}>
                  <td>{athlete.nickname || athlete.name}</td>
                  <td>{stat?.participation === "PRESENT" ? "Presente" : stat?.participation === "ABSENT" ? "Ausente" : stat?.participation === "INJURED" ? "Lesionado" : stat?.participation === "SUSPENDED" ? "Suspenso" : stat?.participation === "NOT_RELATED" ? "Não relacionado" : "Relacionado"}</td>
                  <td>{stat?.lineupRole === "STARTER" ? "Titular" : stat?.lineupRole === "SUBSTITUTE" ? "Reserva" : stat?.lineupRole === "DID_NOT_PLAY" ? "Não entrou" : "—"}</td>
                  <td className="num">{stat?.jerseyNumber ?? athlete.jerseyNumber ?? "—"}</td>
                  <td className="num">{match.sport === "FOOTBALL"
                    ? (stat?.firstHalfEntryMinute != null && stat?.firstHalfExitMinute != null
                      ? `${stat.firstHalfEntryMinute}′–${stat.firstHalfExitMinute}′` : "—")
                    : (stat?.enteredAtMinute ?? "—")}</td>
                  <td className="num">{match.sport === "FOOTBALL"
                    ? (stat?.secondHalfEntryMinute != null && stat?.secondHalfExitMinute != null
                      ? `${stat.secondHalfEntryMinute}′–${stat.secondHalfExitMinute}′` : "—")
                    : (stat?.leftAtMinute ?? "—")}</td>
                  <td className="num">{stat?.minutesPlayed ?? minuteCalc ?? "—"}</td>
                  <td className="num">{stat?.goals ?? 0}</td>
                  <td className="num">{stat?.assists ?? 0}</td>
                  <td className="num">{stat?.yellowCards ?? 0}</td>
                  <td className="num">{stat?.redCards ?? 0}</td>
                  <td className="num">{stat?.isCaptain ? "Sim" : "—"}</td>
                  <td>{stat?.notes || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {match.matchSheetNotes ? <><h2>Observações gerais</h2><div className="sumula-print-notes">{match.matchSheetNotes}</div></> : null}
        {match.events.length ? <>
          <h2>Ocorrências</h2>
          <div className="sumula-print-events">
            {match.events.map(event => (
              <div key={event.id}>
                {event.minute == null ? "—" : event.minute + "′"} · {eventLabels[event.type] || event.type} · {event.team === "OPPONENT" ? match.opponent : event.athlete?.nickname || event.athlete?.name || "Nosso clube"}
                {event.period ? " · " + event.period : ""}{event.notes ? " · " + event.notes : ""}
              </div>
            ))}
          </div>
        </> : null}
        <div className="sumula-print-foot">Gerado pelo 11UP Club · Dados salvos na súmula · GPS opcional</div>
      </section>

      <div className="page-head match-sheet-head">
        <div>
          <span className="page-eyebrow">SÚMULA DA PARTIDA</span>
          <h1>
            {match.category.name} × {match.opponent}
          </h1>
          <p className="muted">
            {formatDate(match.startsAt)} • {match.location || "Local a definir"}
          </p>
        </div>
        <div className="actions convocation-no-print">
          <span
            className={`badge match-sheet-status-${match.matchSheetStatus.toLowerCase()}`}
          >
            {match.matchSheetStatus === "DRAFT"
              ? "Rascunho"
              : match.matchSheetStatus === "FINALIZED"
                ? "Finalizada"
                : "Arquivada"}
          </span>
          <SumulaPrintButton />
          <Link className="btn btn-secondary" href={`/jogos/${match.id}`}>
            Voltar ao jogo
          </Link>
        </div>
      </div>

      <section className="card match-sheet-scoreboard">
        <div>
          <small>
            {match.organization.publicName || match.organization.name}
          </small>
          <strong>{match.goalsFor ?? "—"}</strong>
        </div>
        <span>×</span>
        <div>
          <small>{match.opponent}</small>
          <strong>{match.goalsAgainst ?? "—"}</strong>
        </div>
      </section>

      <form action={saveMatchSheet} className="stack">
        <input type="hidden" name="matchId" value={match.id} />
        <section className="card">
          <div className="section-head">
            <div>
              <span className="page-eyebrow">FICHA DO JOGO</span>
              <h2>Informações oficiais</h2>
            </div>
          </div>
          <div className="match-sheet-grid">
            <label>
              Gols do clube
              <input
                type="number"
                min="0"
                name="goalsFor"
                defaultValue={match.goalsFor ?? ""}
                disabled={!editable}
                required
              />
            </label>
            <label>
              Gols do adversário
              <input
                type="number"
                min="0"
                name="goalsAgainst"
                defaultValue={match.goalsAgainst ?? ""}
                disabled={!editable}
                required
              />
            </label>
            <label>
              Horário de apresentação
              <input
                name="presentationTime"
                type="time"
                defaultValue={match.presentationTime ?? ""}
                disabled={!editable}
              />
            </label>
            <label>
              Uniforme
              <input
                name="uniform"
                defaultValue={match.uniform ?? ""}
                disabled={!editable}
                placeholder="Ex.: Alvinegro"
              />
            </label>
            <label>
              Árbitro
              <input
                name="referee"
                defaultValue={match.referee ?? ""}
                disabled={!editable}
              />
            </label>
            <label>
              Assistente / mesário
              <input
                name="assistantReferee"
                defaultValue={match.assistantReferee ?? ""}
                disabled={!editable}
              />
            </label>
          </div>
          <label>
            Relato e observações da súmula
            <textarea
              name="matchSheetNotes"
              rows={4}
              defaultValue={match.matchSheetNotes ?? ""}
              disabled={!editable}
            />
          </label>
        </section>

        <section className="card">
          <div className="section-head">
            <div>
              <span className="page-eyebrow">ELENCO</span>
              <h2>Participação e estatísticas</h2>
            </div>
            <span className="badge">{match.callUps.length} convocado(s)</span>
          </div>
          {match.callUps.length ? (
            <div className="table-wrap">
              <table className={match.sport === "FOOTBALL" ? "table match-sheet-table sumula-campo-compacta" : "table match-sheet-table"}>
                <thead>
                  <tr>
                    <th>Atleta</th>
                    <th>Presença</th>
                    <th>Função</th>
                    <th>Nº</th>
                     {/* 11UP_SUMULA_DOIS_TEMPOS_V1: uma entrada e uma saida POR TEMPO, somente campo */}
                     {match.sport === "FOOTBALL" ? (
                       <>
                         <th>1º T · Ent.</th><th>1º T · Saí.</th>
                         <th>2º T · Ent.</th><th>2º T · Saí.</th><th>Total</th>
                       </>
                     ) : (
                       <><th>Entrada</th><th>Saída</th><th>Min.</th></>
                     )}
                    <th>G</th>
                    <th>A</th>
                    <th>CA</th>
                    <th>CV</th>
                    <th>Cap.</th>
                     <th>Observações</th>
                  </tr>
                </thead>
                <tbody>
                  {match.callUps.map(({ athlete }) => {
                    const stat = stats.get(athlete.id);
                    return (
                      <tr key={athlete.id}>
                        <td>
                          <input
                            type="hidden"
                            name="athleteId"
                            value={athlete.id}
                          />
                          <strong>{athlete.nickname || athlete.name}</strong>
                          <div className="help">
                            {athlete.position || "Posição não informada"}
                          </div>
                        </td>
                        <td>
                          <select
                            name={`participation_${athlete.id}`}
                            defaultValue={stat?.participation ?? "RELATED"}
                            disabled={!editable}
                          >
                            {participationOptions.map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            name={`lineupRole_${athlete.id}`}
                            defaultValue={stat?.lineupRole ?? ""}
                            disabled={!editable}
                          >
                            <option value="">—</option>
                            <option value="STARTER">Titular</option>
                            <option value="SUBSTITUTE">Reserva</option>
                            <option value="DID_NOT_PLAY">Não entrou</option>
                          </select>
                        </td>
                        <td>
                          <input
                            className="sheet-number"
                            type="number"
                            min="1"
                            name={`jerseyNumber_${athlete.id}`}
                            defaultValue={
                              stat?.jerseyNumber ?? athlete.jerseyNumber ?? ""
                            }
                            disabled={!editable}
                          />
                        </td>
                         {match.sport === "FOOTBALL" ? (
                           <SumulaHalfMinuteInputs
                             athleteId={athlete.id}
                             athleteName={athlete.nickname || athlete.name}
                             firstHalfEntry={stat?.firstHalfEntryMinute ?? null}
                             firstHalfExit={stat?.firstHalfExitMinute ?? null}
                             secondHalfEntry={stat?.secondHalfEntryMinute ?? null}
                             secondHalfExit={stat?.secondHalfExitMinute ?? null}
                             legacyMinutes={stat?.minutesPlayed ?? null}
                             editable={editable}
                           />
                         ) : (
                           <SumulaMinuteInputs
                             athleteId={athlete.id}
                             athleteName={athlete.nickname || athlete.name}
                             initialEntry={stat?.enteredAtMinute ?? null}
                             initialExit={stat?.leftAtMinute ?? null}
                             initialMinutes={stat?.minutesPlayed ?? null}
                             editable={editable}
                           />
                         )}
                        {(
                          [
                            "goals",
                            "assists",
                            "yellowCards",
                            "redCards",
                          ] as const
                        ).map((field) => (
                          <td key={field}>
                            <input
                              className="sheet-number"
                              type="number"
                              min="0"
                              name={`${field}_${athlete.id}`}
                              defaultValue={stat?.[field] ?? 0}
                              disabled={!editable}
                            />
                          </td>
                        ))}
                        <td>
                          <input
                            type="radio"
                            name="captainId"
                            value={athlete.id}
                            defaultChecked={stat?.isCaptain}
                            disabled={!editable}
                            aria-label={`Definir ${athlete.name} como capitão`}
                          />
                        </td>
                         <td>
                           <textarea
                             name={`notes_${athlete.id}`}
                             defaultValue={stat?.notes ?? ""}
                             disabled={!editable}
                             rows={2}
                             placeholder="Observações individuais do jogo"
                             aria-label={`Observações de ${athlete.nickname || athlete.name}`}
                             style={{ minWidth: 190, maxWidth: 300, resize: "vertical" }}
                           />
                         </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">
              Faça a convocação antes de preencher a súmula.
            </div>
          )}
          {editable ? (
            <PendingSubmitButton pendingText="Salvando…" type="submit">Salvar rascunho da súmula</PendingSubmitButton>
          ) : null}
        </section>
      </form>

      <section className="card">
        <div className="section-head">
          <div>
            <span className="page-eyebrow">CRONOLOGIA</span>
            <h2>Ocorrências da partida</h2>
          </div>
        </div>
        {editable ? (
          <form action={addMatchEvent} className="match-event-form">
            <input type="hidden" name="matchId" value={match.id} />
            <label>
              Ocorrência
              <select name="type" defaultValue="GOAL">
                {Object.entries(eventLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Equipe
              <select name="team" defaultValue="OURS">
                <option value="OURS">Nosso clube</option>
                <option value="OPPONENT">Adversário</option>
              </select>
            </label>
            <label>
              Atleta
              <select name="athleteId" defaultValue="">
                <option value="">Não se aplica</option>
                {match.callUps.map(({ athlete }) => (
                  <option key={athlete.id} value={athlete.id}>
                    {athlete.nickname || athlete.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Minuto
              <input name="minute" type="number" min="0" />
            </label>
            <label>
              Período
              <input name="period" placeholder="Ex.: 1º tempo" />
            </label>
            <label>
              Observação
              <input name="notes" />
            </label>
            <PendingSubmitButton pendingText="Processando…" type="submit">Adicionar</PendingSubmitButton>
          </form>
        ) : null}
        <div className="match-event-list">
          {match.events.length ? (
            match.events.map((event) => (
              <div className="match-event" key={event.id}>
                <span className="match-event-minute">
                  {event.minute === null ? "—" : `${event.minute}'`}
                </span>
                <div>
                  <strong>{eventLabels[event.type] || event.type}</strong>
                  <p>
                    {event.team === "OPPONENT"
                      ? match.opponent
                      : event.athlete?.nickname ||
                        event.athlete?.name ||
                        match.organization.publicName ||
                        match.organization.name}
                    {event.period ? ` • ${event.period}` : ""}
                    {event.notes ? ` • ${event.notes}` : ""}
                  </p>
                </div>
                {editable ? (
                  <form action={deleteMatchEvent}>
                    <input type="hidden" name="matchId" value={match.id} />
                    <input type="hidden" name="eventId" value={event.id} />
                    <PendingSubmitButton pendingText="Excluindo…" className="btn-danger btn-small" type="submit">
                      Excluir
                    </PendingSubmitButton>
                  </form>
                ) : null}
              </div>
            ))
          ) : (
            <div className="empty">Nenhuma ocorrência registrada.</div>
          )}
        </div>
      </section>

      {canEdit ? (
        <section className="card match-sheet-finish convocation-no-print">
          {match.matchSheetStatus === "DRAFT" ? (
            <>
              <div>
                <h2>Finalizar súmula</h2>
                <p className="muted">
                  Confira o placar e salve o rascunho antes de finalizar. A
                  partida será marcada como encerrada.
                </p>
              </div>
              <form action={finalizeMatchSheet}>
                <input type="hidden" name="matchId" value={match.id} />
                <PendingSubmitButton pendingText="Finalizando…" type="submit">Finalizar súmula</PendingSubmitButton>
              </form>
            </>
          ) : (
            <>
              <div>
                <h2>Súmula finalizada</h2>
                <p className="muted">
                  Reabra somente se for necessário fazer alguma correção.
                </p>
              </div>
              <form action={reopenMatchSheet}>
                <input type="hidden" name="matchId" value={match.id} />
                <PendingSubmitButton pendingText="Processando…" className="btn-secondary" type="submit">
                  Reabrir súmula
                </PendingSubmitButton>
              </form>
            </>
          )}
        </section>
      ) : null}
    </>
  );
}
