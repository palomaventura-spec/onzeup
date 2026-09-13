import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireClubPermission } from "@/lib/club-access";
import { hasClubPermission } from "@/lib/club-permissions";
import { googleCalendarUrl } from "@/lib/google-calendar";

import { updateMatch } from "../actions";

function toDateInput(date: Date) {
  return date
    .toISOString()
    .slice(0, 10);
}

function toTimeInput(date: Date) {
  return date
    .toISOString()
    .slice(11, 16);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

function homeAwayLabel(
  value: string | null
) {
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
  params: Promise<{
    id: string;
  }>;
}) {
  const user =
    await requireClubPermission(
      "MATCHES_VIEW"
    );

  const canEdit =
    hasClubPermission(
      user,
      "MATCHES_EDIT"
    );

  const canManageCallUps =
    hasClubPermission(
      user,
      "CALLUPS_MANAGE"
    );

  const canViewCallUps =
    hasClubPermission(
      user,
      "CALLUPS_VIEW"
    );

  const { id } =
    await params;

  const [
    match,
    categories,
  ] = await Promise.all([
    prisma.match.findFirst({
      where: {
        id,
        organizationId:
          user.organizationId,
      },

      include: {
        category: true,
        callUps: true,
      },
    }),

    canEdit
      ? prisma.category.findMany({
          where: {
            organizationId:
              user.organizationId,
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

  const calendarUrl =
    googleCalendarUrl({
      title:
        `${match.category.name} × ${match.opponent}`,

      start:
        match.startsAt,

      location:
        match.location,

      details:
        [
          match.competition,
          match.notes,
        ]
          .filter(Boolean)
          .join(" • ") ||
        "Jogo cadastrado no ONZEUP",
    });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>
            {canEdit
              ? "Editar jogo"
              : "Detalhes do jogo"}
          </h1>

          <p className="muted">
            {canEdit
              ? "Atualize informações e resultado da partida."
              : "Consulte as informações da partida e gerencie a convocação autorizada."}
          </p>
        </div>

        <div className="actions">
          <a
            className="btn btn-secondary"
            href={calendarUrl}
            target="_blank"
            rel="noreferrer"
          >
            Google Agenda
          </a>

          <Link
            className="btn btn-secondary"
            href="/jogos"
          >
            Voltar
          </Link>
        </div>
      </div>

      {canViewCallUps ? (
        <section className="card match-callup-hub">
          <div>
            <span className="page-eyebrow">
              CONVOCAÇÃO
            </span>

            <h2>
              Atletas convocados:{" "}
              {match.callUps.length}
            </h2>

            <p className="muted">
              {canManageCallUps
                ? "Selecione atletas, acompanhe confirmações e envie a convocação deste jogo."
                : "Consulte os atletas convocados para este jogo."}
            </p>
          </div>

          <Link
            className="btn"
            href={`/convocacoes/${match.id}`}
          >
            {canManageCallUps
              ? "Gerenciar convocação"
              : "Ver convocação"}
          </Link>
        </section>
      ) : null}

      {canEdit ? (
        <section className="card">
          <form
            className="form"
            action={updateMatch}
          >
            <input
              type="hidden"
              name="id"
              value={match.id}
            />

            <label>
              Categoria

              <select
                name="categoryId"
                defaultValue={match.categoryId}
                required
              >
                {categories.map(
                  (category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              Competição

              <input
                name="competition"
                defaultValue={
                  match.competition ?? ""
                }
              />
            </label>

            <label>
              Adversário

              <input
                name="opponent"
                defaultValue={
                  match.opponent
                }
                required
              />
            </label>

            <label>
              Data

              <input
                name="matchDate"
                type="date"
                defaultValue={toDateInput(
                  match.startsAt
                )}
                required
              />
            </label>

            <label>
              Horário

              <input
                name="matchTime"
                type="time"
                defaultValue={toTimeInput(
                  match.startsAt
                )}
                required
              />
            </label>

            <label>
              Local

              <input
                name="location"
                defaultValue={
                  match.location ?? ""
                }
              />
            </label>

            <label>
              Mandante / visitante

              <select
                name="homeAway"
                defaultValue={
                  match.homeAway ?? ""
                }
              >
                <option value="">
                  Não informado
                </option>

                <option value="HOME">
                  Mandante
                </option>

                <option value="AWAY">
                  Visitante
                </option>

                <option value="NEUTRAL">
                  Campo neutro
                </option>
              </select>
            </label>

            <label>
              Status

              <select
                name="status"
                defaultValue={
                  match.status
                }
              >
                <option value="SCHEDULED">
                  Agendado
                </option>

                <option value="FINISHED">
                  Finalizado
                </option>

                <option value="CANCELLED">
                  Cancelado
                </option>
              </select>
            </label>

            <label>
              Gols da organização

              <input
                name="goalsFor"
                type="number"
                min="0"
                defaultValue={
                  match.goalsFor ?? ""
                }
              />
            </label>

            <label>
              Gols do adversário

              <input
                name="goalsAgainst"
                type="number"
                min="0"
                defaultValue={
                  match.goalsAgainst ?? ""
                }
              />
            </label>

            <label>
              Observações

              <textarea
                name="notes"
                rows={5}
                defaultValue={
                  match.notes ?? ""
                }
              />
            </label>

            <button type="submit">
              Salvar alterações
            </button>
          </form>
        </section>
      ) : (
        <section className="card">
          <span className="page-eyebrow">
            SOMENTE VISUALIZAÇÃO
          </span>

          <h2>
            Informações da partida
          </h2>

          <div className="stack">
            <div>
              <span className="help">
                Categoria
              </span>

              <strong>
                {match.category.name}
              </strong>
            </div>

            <div>
              <span className="help">
                Competição
              </span>

              <strong>
                {match.competition || "—"}
              </strong>
            </div>

            <div>
              <span className="help">
                Adversário
              </span>

              <strong>
                {match.opponent}
              </strong>
            </div>

            <div>
              <span className="help">
                Data e horário
              </span>

              <strong>
                {formatDateTime(
                  match.startsAt
                )}
              </strong>
            </div>

            <div>
              <span className="help">
                Local
              </span>

              <strong>
                {match.location || "—"}
              </strong>
            </div>

            <div>
              <span className="help">
                Mandante / visitante
              </span>

              <strong>
                {homeAwayLabel(
                  match.homeAway
                )}
              </strong>
            </div>

            <div>
              <span className="help">
                Status
              </span>

              <strong>
                {statusLabel(
                  match.status
                )}
              </strong>
            </div>

            {match.status ===
            "FINISHED" ? (
              <div>
                <span className="help">
                  Resultado
                </span>

                <strong>
                  {match.goalsFor ?? 0} ×{" "}
                  {match.goalsAgainst ?? 0}
                </strong>
              </div>
            ) : null}

            <div>
              <span className="help">
                Observações
              </span>

              <strong>
                {match.notes || "—"}
              </strong>
            </div>
          </div>
        </section>
      )}
    </>
  );
}