import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";
import ModuleTour from "@/components/help/ModuleTour";
import {
  createCharge,
  createMonthlyFees,
  createRefereeFeesForCallUps,
  markChargePaid,
  markChargePending,
  cancelCharge,
  deleteCharge,
} from "./actions";

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function fmtDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function labelType(type: string) {
  return {
    MONTHLY_FEE: "Mensalidade",
    REFEREE_FEE: "Arbitragem",
    TOURNAMENT: "Torneio",
    UNIFORM: "Uniforme",
    TRAVEL: "Viagem",
    EVENT: "Evento",
    OTHER: "Outro",
  }[type] || type;
}

function statusLabel(status: string) {
  return {
    PENDING: "Pendente",
    PAID: "Pago",
    OVERDUE: "Vencido",
    CANCELLED: "Cancelado",
  }[status] || status;
}

export default async function FinancePage() {
  const user = await requireOrganizationUser();
  const orgId = user.organizationId;

  const [charges, athletes, categories, matches] = await Promise.all([
    prisma.charge.findMany({
      where: { organizationId: orgId },
      include: { athlete: { include: { category: true } }, match: true },
      orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.athlete.findMany({
      where: { organizationId: orgId, active: true },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { organizationId: orgId },
      orderBy: { name: "asc" },
    }),
    prisma.match.findMany({
      where: { organizationId: orgId, status: "SCHEDULED" },
      include: { category: true, callUps: true },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  const pending = charges.filter(c => c.status === "PENDING");
  const paid = charges.filter(c => c.status === "PAID");
  const pendingTotal = pending.reduce((sum, c) => sum + c.amountCents, 0);
  const paidTotal = paid.reduce((sum, c) => sum + c.amountCents, 0);

  return (
    <>
      <div className="page-head">
        <ModuleTour module="financeiro" />
        <div>
          <h1>Financeiro</h1>
          <p className="muted">Controle simples de cobranças dos atletas e responsáveis.</p>
        </div>
      </div>

      <div className="grid">
        <div className="card"><h2>{money(pendingTotal)}</h2><span className="muted">Pendente</span></div>
        <div className="card"><h2>{money(paidTotal)}</h2><span className="muted">Recebido</span></div>
        <div className="card"><h2>{pending.length}</h2><span className="muted">Cobranças pendentes</span></div>
        <div className="card"><h2>{paid.length}</h2><span className="muted">Pagamentos registrados</span></div>
      </div>

      <div className="finance-grid">
        <section className="card">
          <h2>Cobrança individual</h2>
          <form className="form" action={createCharge}>
            <label>Atleta
              <select name="athleteId" required defaultValue="">
                <option value="" disabled>Selecione</option>
                {athletes.map(a => (
                  <option key={a.id} value={a.id}>{a.name} {a.category ? `— ${a.category.name}` : ""}</option>
                ))}
              </select>
            </label>

            <label>Tipo
              <select name="type" defaultValue="MONTHLY_FEE">
                <option value="MONTHLY_FEE">Mensalidade</option>
                <option value="REFEREE_FEE">Arbitragem</option>
                <option value="TOURNAMENT">Torneio</option>
                <option value="UNIFORM">Uniforme</option>
                <option value="TRAVEL">Viagem</option>
                <option value="EVENT">Evento</option>
                <option value="OTHER">Outro</option>
              </select>
            </label>

            <label>Título<input name="title" placeholder="Ex.: Mensalidade de agosto" required /></label>
            <label>Valor (R$)<input name="amount" inputMode="decimal" placeholder="180,00" required /></label>
            <label>Vencimento<input name="dueDate" type="date" required /></label>

            <label>Jogo relacionado
              <select name="matchId" defaultValue="">
                <option value="">Nenhum</option>
                {matches.map(m => (
                  <option key={m.id} value={m.id}>{m.category.name} × {m.opponent}</option>
                ))}
              </select>
            </label>

            <label>Descrição<textarea name="description" rows={3} /></label>
            <button type="submit">Criar cobrança</button>
          </form>
        </section>

        <section className="card">
          <h2>Mensalidade em lote</h2>
          <form className="form" action={createMonthlyFees}>
            <label>Categoria
              <select name="categoryId" defaultValue="">
                <option value="">Todos os atletas ativos</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label>Título<input name="title" defaultValue="Mensalidade" /></label>
            <label>Valor por atleta (R$)<input name="amount" placeholder="180,00" required /></label>
            <label>Vencimento<input name="dueDate" type="date" required /></label>
            <button type="submit">Gerar mensalidades</button>
          </form>

          <hr style={{borderColor:"var(--line)", width:"100%", margin:"24px 0"}} />

          <h2>Taxa de arbitragem</h2>
          <form className="form" action={createRefereeFeesForCallUps}>
            <label>Jogo
              <select name="matchId" required defaultValue="">
                <option value="" disabled>Selecione</option>
                {matches.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.category.name} × {m.opponent} — {m.callUps.length} convocado(s)
                  </option>
                ))}
              </select>
            </label>
            <label>Valor por convocado (R$)<input name="amount" placeholder="25,00" required /></label>
            <label>Vencimento<input name="dueDate" type="date" required /></label>
            <button type="submit">Gerar taxa para convocados</button>
          </form>
        </section>
      </div>

      <section className="card" style={{marginTop:18}}>
        <h2>Cobranças</h2>
        {charges.length === 0 ? (
          <div className="empty">Nenhuma cobrança cadastrada.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Atleta</th>
                  <th>Tipo</th>
                  <th>Título</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {charges.map(charge => (
                  <tr key={charge.id}>
                    <td>
                      <strong>{charge.athlete.name}</strong>
                      <div className="help">{charge.athlete.category?.name ?? "—"}</div>
                    </td>
                    <td>{labelType(charge.type)}</td>
                    <td>{charge.title}</td>
                    <td>{fmtDate(charge.dueDate)}</td>
                    <td><strong>{money(charge.amountCents)}</strong></td>
                    <td><span className={`status finance-${charge.status.toLowerCase()}`}>{statusLabel(charge.status)}</span></td>
                    <td>
                      <div className="actions">
                        {charge.status !== "PAID" ? (
                          <form action={markChargePaid} className="inline-form">
                            <input type="hidden" name="id" value={charge.id} />
                            <select name="paymentMethod" defaultValue="PIX"><option value="PIX">Pix</option><option value="CASH">Dinheiro</option><option value="TRANSFER">Transferência</option><option value="CARD">Cartão</option><option value="BOLETO">Boleto</option><option value="OTHER">Outro</option></select>
                            <button className="btn-small" type="submit">Dar baixa</button>
                          </form>
                        ) : (
                          <form action={markChargePending} className="inline-form">
                            <input type="hidden" name="id" value={charge.id} />
                            <button className="btn-secondary btn-small" type="submit">Reabrir</button>
                          </form>
                        )}

                        {charge.status !== "CANCELLED" && (
                          <form action={cancelCharge} className="inline-form">
                            <input type="hidden" name="id" value={charge.id} />
                            <button className="btn-secondary btn-small" type="submit">Cancelar</button>
                          </form>
                        )}

                        <form action={deleteCharge} className="inline-form">
                          <input type="hidden" name="id" value={charge.id} />
                          <button className="btn-danger btn-small" type="submit">Excluir</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}