import Link from "next/link";
import WhatsAppAction from "@/components/WhatsAppAction";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";

function fmt(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export default async function CommunicationPage() {
  const user = await requireOrganizationUser();
  const orgName = user.organization?.publicName || user.organization?.name || "ONZEUP";
  const now = new Date();

  const [matches, charges, qtr] = await Promise.all([
    prisma.match.findMany({
      where: { organizationId: user.organizationId, status: "SCHEDULED", startsAt: { gte: now } },
      include: {
        category: true,
        callUps: { include: { athlete: true } },
      },
      orderBy: { startsAt: "asc" },
      take: 8,
    }),
    prisma.charge.findMany({
      where: { organizationId: user.organizationId, status: "PENDING" },
      include: { athlete: true },
      orderBy: { dueDate: "asc" },
      take: 20,
    }),
    prisma.qtr.findFirst({
      where: { organizationId: user.organizationId },
      orderBy: { weekStart: "desc" },
    }),
  ]);

  return (
    <>
      <div className="page-head">
        <div>
          <span className="page-eyebrow">MENSAGENS PRONTAS</span>
          <h1>Comunicação</h1>
          <p className="muted">Use o WhatsApp básico sem conectar API ou WhatsApp Business.</p>
        </div>
      </div>

      <div className="communication-grid">
        <section className="card">
          <div className="section-title-row">
            <div><span className="page-eyebrow">JOGOS</span><h2>Convocações</h2></div>
            <Link href="/convocacoes">Gerenciar</Link>
          </div>

          <div className="comm-list">
            {matches.map((match) => (
              <article key={match.id}>
                <div className="comm-title">
                  <div>
                    <small>{match.category.name}</small>
                    <strong>× {match.opponent}</strong>
                    <span>{fmt(match.startsAt)} • {match.location || "Local a definir"}</span>
                  </div>
                  <Link className="btn-secondary btn-small" href={`/convocacoes/${match.id}`}>Abrir</Link>
                </div>

                <div className="comm-recipient-list">
                  {match.callUps.slice(0, 8).map((callUp) => {
                    const athlete = callUp.athlete;
                    const message =
`⚽ CONVOCAÇÃO — ${match.category.name}

Olá! ${athlete.nickname || athlete.name} está convocado(a).

🆚 ${match.opponent}
📅 ${fmt(match.startsAt)}
📍 ${match.location || "Local a definir"}
🏆 ${match.competition || "Jogo"}

Por favor, confirme a presença.

${orgName}`;

                    return (
                      <div key={callUp.id}>
                        <span>
                          <strong>{athlete.nickname || athlete.name}</strong>
                          <small>{athlete.guardianName || "Responsável"}</small>
                        </span>
                        <WhatsAppAction phone={athlete.guardianPhone} message={message} label="Enviar" />
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="section-title-row">
            <div><span className="page-eyebrow">FINANCEIRO</span><h2>Lembretes de cobrança</h2></div>
            <Link href="/financeiro">Financeiro</Link>
          </div>

          <div className="comm-list">
            {charges.slice(0, 10).map((charge) => {
              const pix = user.organization?.pixKey
                ? `\n💠 Pix: ${user.organization.pixKey}`
                : "";
              const message =
`Olá! Lembrete da ${orgName}.

👤 Atleta: ${charge.athlete.nickname || charge.athlete.name}
📄 ${charge.title}
💰 ${money(charge.amountCents)}
📅 Vencimento: ${new Intl.DateTimeFormat("pt-BR").format(charge.dueDate)}${pix}

Se o pagamento já foi realizado, desconsidere.`;

              return (
                <article key={charge.id} className="comm-charge">
                  <div>
                    <strong>{charge.athlete.nickname || charge.athlete.name}</strong>
                    <span>{charge.title} • {money(charge.amountCents)}</span>
                  </div>
                  <WhatsAppAction phone={charge.athlete.guardianPhone} message={message} label="Lembrar" />
                </article>
              );
            })}
          </div>
        </section>

        <section className="card comm-qtr-card">
          <span className="page-eyebrow">GRUPOS / COMUNIDADE</span>
          <h2>QTR da semana</h2>
          <p className="muted">
            Para grupos de WhatsApp, gere o QTR e use o compartilhamento do celular ou copie a mensagem abaixo.
          </p>

          {qtr ? (
            <>
              <div className="comm-qtr-summary">
                <strong>QTR disponível</strong>
                <span>Semana de {new Intl.DateTimeFormat("pt-BR").format(qtr.weekStart)}</span>
              </div>
              <div className="actions">
                <Link className="btn" href="/qtr">Abrir QTR</Link>
                <WhatsAppAction
                  message={`⚽ QTR — ${orgName}\n\nA programação da semana está disponível. Confira treinos, jogos e horários atualizados.`}
                />
              </div>
            </>
          ) : (
            <Link className="btn" href="/qtr">Gerar primeiro QTR</Link>
          )}
        </section>
      </div>
    </>
  );
}
