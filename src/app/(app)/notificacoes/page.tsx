import Link from "next/link";

import { birthdayInfo } from "@/lib/athlete-birthdays";
import { requireOrganizationUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

type NotificationIcon =
  | "bell"
  | "birthday"
  | "callup"
  | "finance"
  | "match"
  | "arrow";

function Icon({
  name,
  size = 20,
}: {
  name: NotificationIcon;
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

  if (name === "bell") {
    return (
      <svg {...common}>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </svg>
    );
  }

  if (name === "birthday") {
    return (
      <svg {...common}>
        <path d="M3 10h18v11H3z" />
        <path d="M12 10v11M3 15h18" />
        <path d="M12 6c-1.5 0-3-1-3-2.5S10.5 1 12 3c1.5-2 3-1 3 .5S13.5 6 12 6Z" />
        <path d="M12 6v4" />
      </svg>
    );
  }

  if (name === "callup") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20c.7-4 2.7-6 5.5-6s4.8 2 5.5 6" />
        <path d="m16 11 2 2 3-4" />
      </svg>
    );
  }

  if (name === "finance") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M7 9h10M7 15h4" />
        <path d="M17 13v4M15 15h4" />
      </svg>
    );
  }

  if (name === "match") {
    return (
      <svg {...common}>
        <path d="M8 4h8l2 4-2 4H8L6 8l2-4Z" />
        <path d="m9 12-2 8M15 12l2 8M6 20h12" />
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

export default async function NotificationsPage() {
  const user = await requireOrganizationUser();
  const timeZone = user.organization?.timezone || "America/Sao_Paulo";
  const now = new Date();
  const inSevenDays = new Date(now);
  inSevenDays.setDate(inSevenDays.getDate() + 7);

  const [
    pendingCallUps,
    pendingCharges,
    upcomingMatches,
    birthdayAthletes,
  ] = await Promise.all([
    prisma.callUp.findMany({
      where: {
        organizationId: user.organizationId,
        status: "PENDING",
      },
      include: {
        athlete: true,
        match: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 30,
    }),
    prisma.charge.findMany({
      where: {
        organizationId: user.organizationId,
        status: "PENDING",
      },
      include: {
        athlete: true,
      },
      orderBy: {
        dueDate: "asc",
      },
      take: 30,
    }),
    prisma.match.findMany({
      where: {
        organizationId: user.organizationId,
        status: "SCHEDULED",
        startsAt: {
          gte: now,
          lte: inSevenDays,
        },
      },
      include: {
        category: true,
        callUps: true,
      },
      orderBy: {
        startsAt: "asc",
      },
    }),
    prisma.athlete.findMany({
      where: {
        organizationId: user.organizationId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        nickname: true,
        privateData: {
          select: {
            birthDate: true,
          },
        },
      },
    }),
  ]);

  const upcomingBirthdays = birthdayAthletes
    .flatMap((athlete) => {
      const birthDate = athlete.privateData?.birthDate;
      if (!birthDate) return [];

      const info = birthdayInfo(birthDate, now, timeZone);

      if (info.days < 0 || info.days > 7) return [];

      return [
        {
          id: athlete.id,
          name: athlete.name,
          nickname: athlete.nickname,
          ...info,
        },
      ];
    })
    .sort(
      (a, b) =>
        a.days - b.days ||
        a.name.localeCompare(b.name, "pt-BR"),
    );

  const overdue = pendingCharges.filter(
    (charge) => charge.dueDate < now,
  );

  const total =
    pendingCallUps.length +
    overdue.length +
    upcomingMatches.length +
    upcomingBirthdays.length;

  return (
    <div className="notifications-v4">
      <section className="notifications-v4-hero">
        <div className="notifications-v4-hero-copy">
          <span className="notifications-v4-eyebrow">
            CENTRAL DE ATENÇÃO
          </span>

          <div className="notifications-v4-title-line">
            <span className="notifications-v4-title-icon">
              <Icon name="bell" size={24} />
            </span>

            <div>
              <h1>Notificações</h1>
              <p>
                Pendências e acontecimentos importantes do clube
                reunidos em uma única visão.
              </p>
            </div>
          </div>
        </div>

        <div className="notifications-v4-total">
          <span>ITENS PARA ACOMPANHAR</span>
          <strong>{total}</strong>
          <small>
            {total === 1 ? "item identificado" : "itens identificados"}
          </small>
        </div>
      </section>

      <section
        className="notifications-v4-kpis"
        aria-label="Resumo de notificações"
      >
        <article>
          <span className="notifications-v4-kpi-icon birthday">
            <Icon name="birthday" />
          </span>
          <div>
            <small>ANIVERSÁRIOS</small>
            <strong>{upcomingBirthdays.length}</strong>
            <span>próximos 7 dias</span>
          </div>
        </article>

        <article>
          <span className="notifications-v4-kpi-icon callup">
            <Icon name="callup" />
          </span>
          <div>
            <small>CONVOCAÇÕES</small>
            <strong>{pendingCallUps.length}</strong>
            <span>aguardando resposta</span>
          </div>
        </article>

        <article>
          <span className="notifications-v4-kpi-icon finance">
            <Icon name="finance" />
          </span>
          <div>
            <small>FINANCEIRO</small>
            <strong>{overdue.length}</strong>
            <span>cobrança(s) vencida(s)</span>
          </div>
        </article>

        <article>
          <span className="notifications-v4-kpi-icon match">
            <Icon name="match" />
          </span>
          <div>
            <small>JOGOS</small>
            <strong>{upcomingMatches.length}</strong>
            <span>próximos 7 dias</span>
          </div>
        </article>
      </section>

      <section className="notifications-v4-grid">
        <article className="notifications-v4-card">
          <header className="notifications-v4-card-head">
            <div className="notifications-v4-card-title">
              <span className="notifications-v4-card-icon birthday">
                <Icon name="birthday" />
              </span>

              <div>
                <span className="notifications-v4-eyebrow">
                  ANIVERSÁRIOS
                </span>
                <h2>Hoje e próximos 7 dias</h2>
              </div>
            </div>

            <Link href="/atletas">
              Ver atletas
              <Icon name="arrow" size={15} />
            </Link>
          </header>

          <div className="notifications-v4-list">
            {upcomingBirthdays.map((athlete) => (
              <Link
                href={`/atletas/${athlete.id}`}
                key={athlete.id}
                className="notifications-v4-row"
              >
                <span className="notifications-v4-status info" />

                <div className="notifications-v4-row-copy">
                  <strong>
                    {athlete.nickname || athlete.name}
                  </strong>

                  <span>
                    {athlete.days === 0
                      ? `Aniversário hoje · ${athlete.age} anos`
                      : `${athlete.dateLabel} · completa ${athlete.age} anos`}
                  </span>
                </div>

                <b className="notifications-v4-row-action">
                  {athlete.days === 0
                    ? "Hoje 🎂"
                    : athlete.days === 1
                      ? "Amanhã"
                      : `Em ${athlete.days} dias`}
                  <Icon name="arrow" size={14} />
                </b>
              </Link>
            ))}

            {!upcomingBirthdays.length ? (
              <div className="notifications-v4-empty">
                <span className="notifications-v4-empty-icon">
                  <Icon name="birthday" />
                </span>
                <div>
                  <strong>Nenhum aniversário próximo</strong>
                  <span>
                    Não há aniversários cadastrados para os próximos 7 dias.
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </article>

        <article className="notifications-v4-card">
          <header className="notifications-v4-card-head">
            <div className="notifications-v4-card-title">
              <span className="notifications-v4-card-icon callup">
                <Icon name="callup" />
              </span>

              <div>
                <span className="notifications-v4-eyebrow">
                  CONVOCAÇÕES
                </span>
                <h2>Aguardando resposta</h2>
              </div>
            </div>

            <Link href="/jogos">
              Abrir jogos
              <Icon name="arrow" size={15} />
            </Link>
          </header>

          <div className="notifications-v4-list">
            {pendingCallUps.slice(0, 10).map((callUp) => (
              <Link
                href={`/jogos/${callUp.matchId}`}
                key={callUp.id}
                className="notifications-v4-row"
              >
                <span className="notifications-v4-status warning" />

                <div className="notifications-v4-row-copy">
                  <strong>
                    {callUp.athlete.nickname ||
                      callUp.athlete.name}
                  </strong>
                  <span>
                    {callUp.match.category.name} ×{" "}
                    {callUp.match.opponent}
                  </span>
                </div>

                <b className="notifications-v4-row-action warning-text">
                  Confirmar
                  <Icon name="arrow" size={14} />
                </b>
              </Link>
            ))}

            {!pendingCallUps.length ? (
              <div className="notifications-v4-empty">
                <span className="notifications-v4-empty-icon success">
                  <Icon name="callup" />
                </span>
                <div>
                  <strong>Tudo confirmado por aqui</strong>
                  <span>
                    Não existem respostas de convocação pendentes.
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </article>

        <article className="notifications-v4-card">
          <header className="notifications-v4-card-head">
            <div className="notifications-v4-card-title">
              <span className="notifications-v4-card-icon finance">
                <Icon name="finance" />
              </span>

              <div>
                <span className="notifications-v4-eyebrow">
                  FINANCEIRO
                </span>
                <h2>Cobranças vencidas</h2>
              </div>
            </div>

            <Link href="/financeiro">
              Abrir financeiro
              <Icon name="arrow" size={15} />
            </Link>
          </header>

          <div className="notifications-v4-list">
            {overdue.slice(0, 10).map((charge) => (
              <Link
                href="/financeiro"
                key={charge.id}
                className="notifications-v4-row"
              >
                <span className="notifications-v4-status danger" />

                <div className="notifications-v4-row-copy">
                  <strong>{charge.athlete.name}</strong>
                  <span>
                    {charge.title} · {money(charge.amountCents)}
                  </span>
                </div>

                <b className="notifications-v4-row-action danger-text">
                  Vencida
                  <Icon name="arrow" size={14} />
                </b>
              </Link>
            ))}

            {!overdue.length ? (
              <div className="notifications-v4-empty">
                <span className="notifications-v4-empty-icon success">
                  <Icon name="finance" />
                </span>
                <div>
                  <strong>Nenhuma cobrança vencida</strong>
                  <span>
                    O financeiro não possui pendências vencidas.
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </article>

        <article className="notifications-v4-card">
          <header className="notifications-v4-card-head">
            <div className="notifications-v4-card-title">
              <span className="notifications-v4-card-icon match">
                <Icon name="match" />
              </span>

              <div>
                <span className="notifications-v4-eyebrow">
                  PRÓXIMOS 7 DIAS
                </span>
                <h2>Jogos que merecem atenção</h2>
              </div>
            </div>

            <Link href="/agenda">
              Ver agenda
              <Icon name="arrow" size={15} />
            </Link>
          </header>

          <div className="notifications-v4-list">
            {upcomingMatches.map((match) => (
              <Link
                href={`/jogos/${match.id}`}
                key={match.id}
                className="notifications-v4-row"
              >
                <span className="notifications-v4-status info" />

                <div className="notifications-v4-row-copy">
                  <strong>
                    {match.category.name} × {match.opponent}
                  </strong>
                  <span>
                    {match.callUps.length} atleta(s) convocado(s)
                  </span>
                </div>

                <b className="notifications-v4-row-action">
                  Revisar
                  <Icon name="arrow" size={14} />
                </b>
              </Link>
            ))}

            {!upcomingMatches.length ? (
              <div className="notifications-v4-empty">
                <span className="notifications-v4-empty-icon success">
                  <Icon name="match" />
                </span>
                <div>
                  <strong>Nenhum jogo exige atenção</strong>
                  <span>
                    Não há jogos programados para os próximos 7 dias.
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </article>
      </section>

      <style>{`
        .notifications-v4 {
          --notifications-ink: #07131d;
          --notifications-muted: #6f7f8b;
          --notifications-line: #dfe6ea;
          --notifications-panel: #ffffff;
          --notifications-lime: #99e600;
          --notifications-lime-soft: #eff9d8;
          --notifications-warning: #f4b418;
          --notifications-danger: #e34a4a;
          --notifications-info: #3b9bd7;
          display: grid;
          gap: 18px;
          padding: 28px 34px 44px;
          background:
            radial-gradient(
              circle at 92% 2%,
              rgba(153, 230, 0, 0.075),
              transparent 25rem
            ),
            #f4f7f8;
        }

        .notifications-v4 * {
          box-sizing: border-box;
        }

        .notifications-v4-hero {
          min-height: 194px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 32px;
          padding: 30px 34px;
          overflow: hidden;
          position: relative;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 26px;
          color: #ffffff;
          background:
            linear-gradient(
              104deg,
              rgba(5, 20, 31, 0.99) 0%,
              rgba(6, 29, 37, 0.98) 58%,
              rgba(20, 76, 30, 0.97) 100%
            );
          box-shadow: 0 20px 45px rgba(7, 19, 29, 0.12);
        }

        .notifications-v4-hero::after {
          content: "";
          width: 360px;
          height: 360px;
          position: absolute;
          right: -110px;
          top: -180px;
          border: 1px solid rgba(153, 230, 0, 0.18);
          border-radius: 999px;
          box-shadow:
            0 0 0 42px rgba(153, 230, 0, 0.025),
            0 0 0 84px rgba(153, 230, 0, 0.018);
          pointer-events: none;
        }

        .notifications-v4-hero-copy,
        .notifications-v4-total {
          position: relative;
          z-index: 1;
        }

        .notifications-v4-eyebrow {
          display: block;
          margin-bottom: 8px;
          color: #7eaf00;
          font-size: 10px;
          font-weight: 900;
          line-height: 1.1;
          letter-spacing: 0.16em;
        }

        .notifications-v4-hero .notifications-v4-eyebrow {
          color: var(--notifications-lime);
          margin-bottom: 11px;
        }

        .notifications-v4-title-line {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .notifications-v4-title-icon {
          width: 54px;
          height: 54px;
          display: grid;
          place-items: center;
          flex: 0 0 54px;
          color: var(--notifications-lime);
          border: 1px solid rgba(153, 230, 0, 0.28);
          border-radius: 16px;
          background: rgba(153, 230, 0, 0.08);
        }

        .notifications-v4-title-line h1 {
          margin: 0;
          color: #ffffff !important;
          font-size: clamp(34px, 4vw, 58px);
          line-height: 0.98;
          letter-spacing: -0.045em;
        }

        .notifications-v4-title-line p {
          max-width: 690px;
          margin: 12px 0 0;
          color: rgba(255, 255, 255, 0.78);
          font-size: 16px;
        }

        .notifications-v4-total {
          min-width: 220px;
          padding: 20px 22px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          background: rgba(4, 24, 35, 0.66);
          backdrop-filter: blur(8px);
        }

        .notifications-v4-total span,
        .notifications-v4-total small {
          display: block;
        }

        .notifications-v4-total span {
          color: rgba(255, 255, 255, 0.58);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.12em;
        }

        .notifications-v4-total strong {
          display: block;
          margin: 4px 0 1px;
          color: #ffffff;
          font-size: 42px;
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .notifications-v4-total small {
          color: rgba(255, 255, 255, 0.72);
          font-size: 11px;
          font-weight: 700;
        }

        .notifications-v4-kpis {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .notifications-v4-kpis article {
          min-height: 124px;
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 20px;
          border: 1px solid var(--notifications-line);
          border-radius: 19px;
          background: var(--notifications-panel);
          box-shadow: 0 10px 30px rgba(8, 26, 38, 0.045);
        }

        .notifications-v4-kpi-icon,
        .notifications-v4-card-icon,
        .notifications-v4-empty-icon {
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 12px;
        }

        .notifications-v4-kpi-icon {
          width: 42px;
          height: 42px;
        }

        .notifications-v4-kpi-icon.birthday,
        .notifications-v4-card-icon.birthday {
          color: #719f00;
          background: #eff9d8;
        }

        .notifications-v4-kpi-icon.callup,
        .notifications-v4-card-icon.callup {
          color: #287eae;
          background: #e8f5fc;
        }

        .notifications-v4-kpi-icon.finance,
        .notifications-v4-card-icon.finance {
          color: #c07b00;
          background: #fff3d2;
        }

        .notifications-v4-kpi-icon.match,
        .notifications-v4-card-icon.match {
          color: #719f00;
          background: #eff9d8;
        }

        .notifications-v4-kpis article > div {
          display: grid;
        }

        .notifications-v4-kpis small {
          color: #72808b;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.12em;
        }

        .notifications-v4-kpis strong {
          margin-top: 2px;
          color: var(--notifications-ink);
          font-size: 31px;
          line-height: 1.05;
          letter-spacing: -0.04em;
        }

        .notifications-v4-kpis article div > span {
          margin-top: 3px;
          color: var(--notifications-muted);
          font-size: 12px;
          font-weight: 700;
        }

        .notifications-v4-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .notifications-v4-card {
          min-width: 0;
          overflow: hidden;
          border: 1px solid var(--notifications-line);
          border-radius: 20px;
          background: #ffffff;
          box-shadow: 0 10px 30px rgba(8, 26, 38, 0.04);
        }

        .notifications-v4-card-head {
          min-height: 94px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 18px 20px;
          border-bottom: 1px solid #e8edef;
        }

        .notifications-v4-card-title {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .notifications-v4-card-icon {
          width: 42px;
          height: 42px;
        }

        .notifications-v4-card-title > div {
          min-width: 0;
        }

        .notifications-v4-card-title .notifications-v4-eyebrow {
          margin-bottom: 4px;
        }

        .notifications-v4-card-title h2 {
          margin: 0;
          color: var(--notifications-ink);
          font-size: 20px;
          line-height: 1.15;
          letter-spacing: -0.025em;
        }

        .notifications-v4-card-head > a {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          flex: 0 0 auto;
          color: #709e00;
          font-size: 11px;
          font-weight: 900;
          text-decoration: none;
        }

        .notifications-v4-card-head > a:hover {
          color: #4f7500;
        }

        .notifications-v4-list {
          padding: 8px 14px 14px;
        }

        .notifications-v4-row {
          min-height: 70px;
          display: grid;
          grid-template-columns: 9px minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
          padding: 11px 8px;
          border-bottom: 1px solid #edf1f3;
          color: inherit;
          text-decoration: none;
        }

        .notifications-v4-row:last-child {
          border-bottom: 0;
        }

        .notifications-v4-row:hover {
          border-radius: 12px;
          background: #fafcfc;
        }

        .notifications-v4-status {
          width: 9px;
          height: 9px;
          border-radius: 999px;
        }

        .notifications-v4-status.info {
          background: var(--notifications-info);
          box-shadow: 0 0 0 4px rgba(59, 155, 215, 0.1);
        }

        .notifications-v4-status.warning {
          background: var(--notifications-warning);
          box-shadow: 0 0 0 4px rgba(244, 180, 24, 0.1);
        }

        .notifications-v4-status.danger {
          background: var(--notifications-danger);
          box-shadow: 0 0 0 4px rgba(227, 74, 74, 0.1);
        }

        .notifications-v4-row-copy {
          min-width: 0;
          display: grid;
          gap: 3px;
        }

        .notifications-v4-row-copy strong {
          overflow: hidden;
          color: var(--notifications-ink);
          font-size: 13px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .notifications-v4-row-copy span {
          overflow: hidden;
          color: #74838d;
          font-size: 11px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .notifications-v4-row-action {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #648f00;
          font-size: 10px;
          font-weight: 900;
          white-space: nowrap;
        }

        .notifications-v4-row-action.warning-text {
          color: #aa7600;
        }

        .notifications-v4-row-action.danger-text {
          color: #c93f3f;
        }

        .notifications-v4-empty {
          min-height: 116px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin: 6px 0 0;
          padding: 18px;
          border: 1px dashed #d8e1e5;
          border-radius: 14px;
          background: #fafcfc;
        }

        .notifications-v4-empty-icon {
          width: 40px;
          height: 40px;
          color: #82919b;
          background: #eef2f4;
        }

        .notifications-v4-empty-icon.success {
          color: #6d9900;
          background: var(--notifications-lime-soft);
        }

        .notifications-v4-empty > div {
          display: grid;
          gap: 3px;
        }

        .notifications-v4-empty strong {
          color: var(--notifications-ink);
          font-size: 12px;
        }

        .notifications-v4-empty span:not(.notifications-v4-empty-icon) {
          color: #7b8a94;
          font-size: 11px;
        }

        @media (max-width: 1180px) {
          .notifications-v4 {
            padding: 24px;
          }

          .notifications-v4-hero {
            align-items: flex-start;
            flex-direction: column;
          }

          .notifications-v4-total {
            width: 100%;
          }

          .notifications-v4-kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 860px) {
          .notifications-v4-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .notifications-v4 {
            gap: 14px;
            padding: 16px 12px 32px;
          }

          .notifications-v4-hero {
            min-height: auto;
            padding: 24px 20px;
            border-radius: 20px;
          }

          .notifications-v4-title-line {
            align-items: flex-start;
          }

          .notifications-v4-title-icon {
            width: 44px;
            height: 44px;
            flex-basis: 44px;
          }

          .notifications-v4-title-line h1 {
            font-size: 34px;
          }

          .notifications-v4-title-line p {
            font-size: 13px;
          }

          .notifications-v4-total {
            min-width: 0;
            padding: 16px;
          }

          .notifications-v4-total strong {
            font-size: 34px;
          }

          .notifications-v4-kpis {
            grid-template-columns: 1fr 1fr;
          }

          .notifications-v4-kpis article {
            min-height: 108px;
            gap: 10px;
            padding: 15px;
          }

          .notifications-v4-kpi-icon {
            width: 36px;
            height: 36px;
          }

          .notifications-v4-kpis strong {
            font-size: 25px;
          }

          .notifications-v4-card-head {
            align-items: flex-start;
          }

          .notifications-v4-card-title h2 {
            font-size: 18px;
          }
        }

        @media (max-width: 560px) {
          .notifications-v4-title-icon {
            display: none;
          }

          .notifications-v4-kpis {
            grid-template-columns: 1fr;
          }

          .notifications-v4-card-head {
            flex-direction: column;
          }

          .notifications-v4-row {
            grid-template-columns: 9px minmax(0, 1fr);
          }

          .notifications-v4-row-action {
            grid-column: 2;
            justify-self: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
