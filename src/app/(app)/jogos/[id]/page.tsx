import Link from "next/link";
import { notFound } from "next/navigation";
import { SportType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireClubPermission } from "@/lib/club-access";
import { hasClubPermission } from "@/lib/club-permissions";
import { googleCalendarUrl } from "@/lib/google-calendar";

import { deleteMatch, updateMatch } from "../actions";

type GameIcon =
  | "calendar"
  | "users"
  | "sheet"
  | "location"
  | "shirt"
  | "staff"
  | "score"
  | "arrow";

function Icon({
  name,
  size = 18,
}: {
  name: GameIcon;
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

  if (name === "users") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M4 18c0-3 2.2-5 5-5s5 2 5 5" />
        <path d="M16 7a2.5 2.5 0 0 1 0 5M16 14c2.4.2 4 1.8 4 4" />
      </svg>
    );
  }

  if (name === "sheet") {
    return (
      <svg {...common}>
        <path d="M6 3h9l3 3v15H6z" />
        <path d="M14 3v4h4M9 12h6M9 16h6" />
      </svg>
    );
  }

  if (name === "location") {
    return (
      <svg {...common}>
        <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" />
        <circle cx="12" cy="10" r="2" />
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

  if (name === "staff") {
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3 19c0-3.2 2.2-5.2 5-5.2s5 2 5 5.2M14 18c.4-2.3 1.9-3.8 4.2-3.8 1.4 0 2.6.5 3.3 1.4" />
      </svg>
    );
  }

  if (name === "score") {
    return (
      <svg {...common}>
        <rect x="4" y="6" width="16" height="10" rx="2" />
        <path d="M8 10h2v2H8zM14 10h2v2h-2zM7 19h10" />
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

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toTimeInput(date: Date) {
  return date.toISOString().slice(11, 16);
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

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function sportLabel(value: SportType | string) {
  return value === "FUTSAL" ? "Futsal" : "Campo";
}

function homeAwayLabel(value: string | null) {
  switch (value) {
    case "HOME":
      return "Mandante";
    case "AWAY":
      return "Visitante";
    case "NEUTRAL":
      return "Campo neutro";
    default:
      return "Não informado";
  }
}

function statusLabel(value: string) {
  switch (value) {
    case "FINISHED":
      return "Finalizado";
    case "CANCELLED":
      return "Cancelado";
    default:
      return "Agendado";
  }
}

export default async function EditMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireClubPermission("MATCHES_VIEW");

  const canEdit = hasClubPermission(user, "MATCHES_EDIT");
  const canManageCallUps = hasClubPermission(user, "CALLUPS_MANAGE");
  const canViewCallUps = hasClubPermission(user, "CALLUPS_VIEW");

  const { id } = await params;

  const [match, categories, staffMembers] = await Promise.all([
    prisma.match.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      include: {
        category: true,
        callUps: true,
        staffAssignments: {
          include: {
            staffMember: true,
          },
        },
      },
    }),

    canEdit
      ? prisma.category.findMany({
          where: {
            organizationId: user.organizationId,
            active: true,
            type: "STANDARD",
            sport: {
              in: [SportType.FOOTBALL, SportType.FUTSAL],
            },
          },
          orderBy: [
            { sport: "asc" },
            { name: "asc" },
          ],
        })
      : Promise.resolve([]),

    canEdit
      ? prisma.staffMember.findMany({
          where: {
            organizationId: user.organizationId,
            active: true,
          },
          orderBy: {
            name: "asc",
          },
        })
      : Promise.resolve([]),
  ]);

  if (!match) {
    notFound();
  }

  const calendarUrl = googleCalendarUrl({
    title: `${match.category.name} × ${match.opponent}`,
    start: match.startsAt,
    location: match.location,
    details:
      [match.competition, match.notes].filter(Boolean).join(" • ") ||
      "Jogo cadastrado no 11UP",
  });

  const scoreReady =
    match.status === "FINISHED" &&
    match.goalsFor != null &&
    match.goalsAgainst != null;

  return (
    <main className="game-v13">
      <section className="game-v13-hero">
        <div>
          <span className="game-v13-eyebrow">
            11UP CLUB · JOGOS E SÚMULAS ·{" "}
            {sportLabel(match.sport).toUpperCase()}
          </span>

          <h1>
            {match.category.name} × {match.opponent}
          </h1>

          <p>
            {formatDate(match.startsAt)} · {formatTime(match.startsAt)}
            {match.location ? ` · ${match.location}` : ""}
          </p>
        </div>

        <div className="game-v13-hero-aside">
          <small>STATUS DO JOGO</small>

          <strong>
            {scoreReady
              ? `${match.goalsFor} × ${match.goalsAgainst}`
              : statusLabel(match.status)}
          </strong>

          <span>
            {sportLabel(match.sport)} · {homeAwayLabel(match.homeAway)}
          </span>
        </div>
      </section>

      <section className="game-v13-actions">
        <div>
          <Link
            className="primary"
            href={`/jogos/${match.id}/sumula`}
          >
            <Icon name="sheet" size={16} />
            {match.matchSheetStatus === "DRAFT"
              ? "Preencher súmula"
              : "Ver súmula"}
          </Link>

          {canViewCallUps ? (
            <Link
              href={`/convocacoes/${match.id}`}
            >
              <Icon name="users" size={16} />
              {canManageCallUps
                ? "Gerenciar convocação"
                : "Ver convocação"}
            </Link>
          ) : null}

          <a
            href={calendarUrl}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="calendar" size={16} />
            Google Agenda
          </a>
        </div>

        <Link href="/jogos">
          ← Voltar aos jogos
        </Link>
      </section>

      <section className="game-v13-kpis">
        <article>
          <span className="game-v13-kpi-icon">
            <Icon name="users" />
          </span>

          <div>
            <small>CONVOCADOS</small>
            <strong>{match.callUps.length}</strong>
            <span>de {match.callUpLimit} previstos</span>
          </div>
        </article>

        <article>
          <span className="game-v13-kpi-icon">
            <Icon name="calendar" />
          </span>

          <div>
            <small>DATA E HORÁRIO</small>
            <strong>{formatDate(match.startsAt)}</strong>
            <span>{formatTime(match.startsAt)}</span>
          </div>
        </article>

        <article>
          <span className="game-v13-kpi-icon">
            <Icon name="location" />
          </span>

          <div>
            <small>LOCAL</small>
            <strong>{match.location || "A definir"}</strong>
            <span>{homeAwayLabel(match.homeAway)}</span>
          </div>
        </article>

        <article>
          <span className="game-v13-kpi-icon">
            <Icon name="sheet" />
          </span>

          <div>
            <small>SÚMULA</small>
            <strong>
              {match.matchSheetStatus === "DRAFT"
                ? "Pendente"
                : "Preenchida"}
            </strong>
            <span>{statusLabel(match.status)}</span>
          </div>
        </article>
      </section>

      {canViewCallUps ? (
        <section className="game-v13-callup">
          <div>
            <span className="game-v13-eyebrow">CONVOCAÇÃO</span>

            <h2>
              {match.callUps.length}/{match.callUpLimit} atletas convocados
            </h2>

            <p>
              {canManageCallUps
                ? "Selecione atletas, acompanhe confirmações, monte a escalação e gere a arte/PDF."
                : "Consulte a convocação e a escalação deste jogo."}
            </p>
          </div>

          <Link href={`/convocacoes/${match.id}`}>
            {canManageCallUps
              ? "Abrir central de convocação"
              : "Ver convocação"}
            <Icon name="arrow" size={16} />
          </Link>
        </section>
      ) : null}

      {canEdit ? (
        <form
          className="game-v13-form"
          action={updateMatch}
        >
          <input
            type="hidden"
            name="id"
            value={match.id}
          />

          <section className="game-v13-card">
            <header>
              <span className="game-v13-card-icon">
                <Icon name="calendar" />
              </span>

              <div>
                <span className="game-v13-eyebrow">
                  DADOS DO JOGO
                </span>

                <h2>Informações principais</h2>

                <p>
                  Categoria, adversário, data, local e situação da partida.
                </p>
              </div>
            </header>

            <div className="game-v13-grid">
              <label>
                <span>Categoria</span>

                <select
                  name="categoryId"
                  defaultValue={match.categoryId}
                  required
                >
                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name} · {sportLabel(category.sport)}
                    </option>
                  ))}
                </select>

                <small>
                  A modalidade do jogo acompanha automaticamente a categoria.
                </small>
              </label>

              <div className="game-v13-readonly-field">
                <span>Modalidade atual</span>
                <strong>{sportLabel(match.sport)}</strong>
                <small>
                  Se a categoria mudar, a modalidade será atualizada ao salvar.
                </small>
              </div>

              <label>
                <span>Adversário</span>

                <input
                  name="opponent"
                  defaultValue={match.opponent}
                  required
                />
              </label>

              <label>
                <span>Evento / torneio</span>

                <input
                  name="competition"
                  defaultValue={match.competition ?? ""}
                  placeholder="Opcional"
                />
              </label>

              <label>
                <span>Data</span>

                <input
                  name="matchDate"
                  type="date"
                  defaultValue={toDateInput(match.startsAt)}
                  required
                />
              </label>

              <label>
                <span>Horário</span>

                <input
                  name="matchTime"
                  type="time"
                  defaultValue={toTimeInput(match.startsAt)}
                  required
                />
              </label>

              <label>
                <span>Local</span>

                <input
                  name="location"
                  defaultValue={match.location ?? ""}
                  placeholder="Campo / ginásio"
                />
              </label>

              <label>
                <span>Mandante / visitante</span>

                <select
                  name="homeAway"
                  defaultValue={match.homeAway ?? ""}
                >
                  <option value="">Não informado</option>
                  <option value="HOME">Mandante</option>
                  <option value="AWAY">Visitante</option>
                  <option value="NEUTRAL">Campo neutro</option>
                </select>
              </label>
            </div>
          </section>

          <section className="game-v13-card">
            <header>
              <span className="game-v13-card-icon">
                <Icon name="users" />
              </span>

              <div>
                <span className="game-v13-eyebrow">
                  CONVOCAÇÃO
                </span>

                <h2>Configuração operacional</h2>

                <p>
                  Limite, confirmação e horário de apresentação dos atletas.
                </p>
              </div>
            </header>

            <div className="game-v13-grid three">
              <label>
                <span>Quantidade de convocados</span>

                <input
                  name="callUpLimit"
                  type="number"
                  min={match.sport === "FUTSAL" ? 5 : 9}
                  max="30"
                  defaultValue={match.callUpLimit}
                  required
                />
              </label>

              <label>
                <span>Tipo de convocação</span>

                <select
                  name="callUpMode"
                  defaultValue={match.callUpMode}
                  required
                >
                  <option value="CONFIRMATION_REQUIRED">
                    Confirmação obrigatória
                  </option>

                  <option value="INFORMATION_ONLY">
                    Somente informativa
                  </option>
                </select>

                <small>
                  Define se os responsáveis precisam responder.
                </small>
              </label>

              <label>
                <span>Horário de apresentação</span>

                <input
                  name="presentationTime"
                  type="time"
                  defaultValue={match.presentationTime ?? ""}
                />
              </label>
            </div>
          </section>

          <section className="game-v13-card">
            <header>
              <span className="game-v13-card-icon">
                <Icon name="shirt" />
              </span>

              <div>
                <span className="game-v13-eyebrow">
                  LOGÍSTICA
                </span>

                <h2>Uniforme e equipamentos</h2>

                <p>
                  Essas informações também alimentam a convocação e a arte/PDF.
                </p>
              </div>
            </header>

            <div className="game-v13-grid">
              <label>
                <span>Como o atleta deve chegar</span>

                <select
                  name="arrivalAttire"
                  defaultValue={match.arrivalAttire}
                >
                  <option value="GAME_UNIFORM">
                    Uniforme de jogo — já uniformizado
                  </option>

                  <option value="TRAINING_UNIFORM">
                    Uniforme de treino — troca no local
                  </option>
                </select>
              </label>

              <label>
                <span>Uniforme / padrão</span>

                <input
                  name="uniform"
                  defaultValue={match.uniform ?? ""}
                />
              </label>

              <label>
                <span>Meião</span>

                <input
                  name="sockRequirement"
                  defaultValue={match.sockRequirement ?? ""}
                />
              </label>

              <label>
                <span>Calçado</span>

                <select
                  name="footwearType"
                  defaultValue={
                    match.footwearType ??
                    (match.sport === "FUTSAL"
                      ? "FUTSAL_SHOES"
                      : "FIELD_CLEATS")
                  }
                >
                  <option value="FIELD_CLEATS">
                    Chuteira de trava — campo
                  </option>

                  <option value="SOCIETY_CLEATS">
                    Chuteira society — campo
                  </option>

                  <option value="FUTSAL_SHOES">
                    Tênis/chuteira de futsal
                  </option>
                </select>
              </label>

              <label className="game-v13-check">
                <input
                  name="shinGuardsRequired"
                  type="checkbox"
                  defaultChecked={match.shinGuardsRequired}
                />

                <span>Caneleira obrigatória</span>
              </label>

              <label className="game-v13-wide">
                <span>Outras orientações</span>

                <textarea
                  name="equipmentNotes"
                  rows={3}
                  defaultValue={match.equipmentNotes ?? ""}
                  placeholder="Ex.: levar documento, garrafa de água..."
                />
              </label>
            </div>
          </section>

          <section className="game-v13-card">
            <header>
              <span className="game-v13-card-icon">
                <Icon name="staff" />
              </span>

              <div>
                <span className="game-v13-eyebrow">
                  COMISSÃO TÉCNICA
                </span>

                <h2>Profissionais presentes</h2>

                <p>
                  Selecione quem estará presente neste jogo.
                </p>
              </div>
            </header>

            <div className="game-v13-staff">
              {staffMembers.length ? (
                staffMembers.map((member) => (
                  <label key={member.id}>
                    <input
                      name="staffIds"
                      type="checkbox"
                      value={member.id}
                      defaultChecked={match.staffAssignments.some(
                        (assignment) =>
                          assignment.staffMemberId === member.id,
                      )}
                    />

                    <span>
                      <strong>{member.name}</strong>
                      <small>
                        {member.roleTitle} · {sportLabel(member.sport)}
                      </small>
                    </span>
                  </label>
                ))
              ) : (
                <div className="game-v13-empty">
                  Nenhum profissional ativo cadastrado.
                </div>
              )}
            </div>
          </section>

          <section className="game-v13-card">
            <header>
              <span className="game-v13-card-icon">
                <Icon name="score" />
              </span>

              <div>
                <span className="game-v13-eyebrow">
                  RESULTADO
                </span>

                <h2>Status e placar</h2>

                <p>
                  Finalize a partida e registre o resultado oficial.
                </p>
              </div>
            </header>

            <div className="game-v13-result-grid">
              <label>
                <span>Status</span>

                <select
                  name="status"
                  defaultValue={match.status}
                >
                  <option value="SCHEDULED">Agendado</option>
                  <option value="FINISHED">Finalizado</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
              </label>

              <div className="game-v13-score">
                <label>
                  <span>Nós</span>

                  <input
                    name="goalsFor"
                    type="number"
                    min="0"
                    defaultValue={match.goalsFor ?? ""}
                  />
                </label>

                <b>×</b>

                <label>
                  <span>Adversário</span>

                  <input
                    name="goalsAgainst"
                    type="number"
                    min="0"
                    defaultValue={match.goalsAgainst ?? ""}
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="game-v13-card">
            <header>
              <div>
                <span className="game-v13-eyebrow">
                  OBSERVAÇÕES
                </span>

                <h2>Notas do jogo</h2>
              </div>
            </header>

            <div className="game-v13-notes">
              <textarea
                name="notes"
                rows={5}
                defaultValue={match.notes ?? ""}
                placeholder="Informações adicionais da partida"
              />
            </div>
          </section>

          <div className="game-v13-savebar">
            <div>
              <strong>Alterações do jogo</strong>
              <span>
                Salve para atualizar jogo, convocação e dados utilizados na arte/PDF.
              </span>
            </div>

            <button type="submit">
              Salvar alterações
            </button>
          </div>
        </form>
      ) : (
        <section className="game-v13-card">
          <header>
            <div>
              <span className="game-v13-eyebrow">
                SOMENTE VISUALIZAÇÃO
              </span>

              <h2>Informações da partida</h2>
            </div>
          </header>

          <div className="game-v13-readonly">
            <div>
              <span>Categoria</span>
              <strong>{match.category.name}</strong>
            </div>

            <div>
              <span>Modalidade</span>
              <strong>{sportLabel(match.sport)}</strong>
            </div>

            <div>
              <span>Adversário</span>
              <strong>{match.opponent}</strong>
            </div>

            <div>
              <span>Data e horário</span>
              <strong>{formatDateTime(match.startsAt)}</strong>
            </div>

            <div>
              <span>Local</span>
              <strong>{match.location || "—"}</strong>
            </div>

            <div>
              <span>Status</span>
              <strong>{statusLabel(match.status)}</strong>
            </div>

            {scoreReady ? (
              <div>
                <span>Resultado</span>
                <strong>
                  {match.goalsFor} × {match.goalsAgainst}
                </strong>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {canEdit ? (
        <details className="game-v13-danger">
          <summary>Opções avançadas</summary>

          <div>
            <p>
              A exclusão deve ser usada somente quando este jogo tiver sido criado por engano.
            </p>

            <form action={deleteMatch}>
              <input
                type="hidden"
                name="id"
                value={match.id}
              />

              <button type="submit">
                Excluir jogo
              </button>
            </form>
          </div>
        </details>
      ) : null}
    </main>
  );
}
