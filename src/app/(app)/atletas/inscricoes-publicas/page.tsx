import Link from "next/link";
import { PublicRegistrationSubmissionStatus } from "@prisma/client";
import { requireClubPermission } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  PENDING_DOCUMENTS: "Aguardando documentos",
  SUBMITTED: "Para análise",
  CHANGES_REQUESTED: "Correções solicitadas",
  APPROVED: "Cadastro aprovado",
  REJECTED: "Rejeitado",
};

export default async function PublicRegistrationReviewList({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireClubPermission("ATHLETES_EDIT");
  // Dados privados nao devem estar disponiveis ao suporte Super Admin.
  if (user.role === "SUPER_ADMIN") {
    return <main className="card"><h1>Acesso restrito</h1></main>;
  }
  const params = await searchParams;
  const status = params.status && Object.values(PublicRegistrationSubmissionStatus).includes(params.status as PublicRegistrationSubmissionStatus)
    ? params.status as PublicRegistrationSubmissionStatus
    : null;
  const [links, submissions, statusCounts, totalCount, activeLinkCount] = await Promise.all([
    prisma.publicRegistrationLink.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true, status: true, category: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.publicRegistrationSubmission.findMany({
      where: { organizationId: user.organizationId, ...(status ? { status } : {}) },
      select: {
        id: true, status: true, createdAt: true, submittedAt: true,
        category: { select: { name: true } },
        link: { select: { name: true } },
        _count: { select: { documents: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.publicRegistrationSubmission.groupBy({ by: ["status"], where: { organizationId: user.organizationId }, _count: { _all: true } }),
    prisma.publicRegistrationSubmission.count({ where: { organizationId: user.organizationId } }),
    prisma.publicRegistrationLink.count({ where: { organizationId: user.organizationId, status: "ACTIVE" } }),
  ]);
  const counts = Object.fromEntries(statusCounts.map(item => [item.status, item._count._all]));
  const metrics = [
    { label: "Links ativos", value: activeLinkCount, tint: "#e5f9b3" },
    { label: "Inscrições", value: totalCount, tint: "#edf1f5" },
    { label: "Para análise", value: counts.SUBMITTED ?? 0, tint: "#e0efff" },
    { label: "Aguardando documentos", value: counts.PENDING_DOCUMENTS ?? 0, tint: "#fff1d6" },
    { label: "Aprovadas", value: counts.APPROVED ?? 0, tint: "#e3f5e8" },
    { label: "Rejeitadas", value: counts.REJECTED ?? 0, tint: "#ffe8e8" },
  ];
  return (
    <main style={{ padding: "clamp(16px, 3vw, 34px)", display: "grid", gap: 22, maxWidth: 1500, margin: "0 auto", width: "100%", minWidth: 0 }}>
      <header style={{ background: "linear-gradient(112deg, #09171a 0%, #0d2626 65%, #224921 100%)", color: "white", borderRadius: 24, padding: "clamp(22px, 4vw, 38px)", display: "grid", gap: 12 }}>
        <span style={{ color: "#a4e91c", fontSize: 12, fontWeight: 800, letterSpacing: 2 }}>11UP CLUB · GESTÃO DE INSCRIÇÕES</span>
        <div style={{ display: "flex", gap: 18, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ color: "white", margin: 0, fontSize: "clamp(28px, 4vw, 44px)" }}>Cadastro por link</h1>
            <p style={{ color: "#c6d4d5", margin: "9px 0 0", maxWidth: 640 }}>Receba, confira e acompanhe os cadastros enviados pelas famílias. Aprovação cadastral não significa aptidão esportiva.</p>
          </div>
          <Link href="/atletas/links-cadastro" style={{ background: "#a4e91c", color: "#102000", fontWeight: 800, borderRadius: 12, padding: "13px 18px", textDecoration: "none" }}>+ Gerenciar links</Link>
        </div>
        <Link href="/atletas/pre-cadastros" style={{ color: "#e8f3e3", fontSize: 13, width: "fit-content" }}>← Cadastros individuais</Link>
      </header>
      <section aria-label="Resumo das inscrições" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 12 }}>
        {metrics.map(m => <div key={m.label} style={{ background: "var(--card, #fff)", border: "1px solid var(--line, #dce4e9)", borderRadius: 17, padding: "19px 18px", minWidth: 0 }}>
          <span style={{ display: "inline-block", background: m.tint, width: 28, height: 5, borderRadius: 8, marginBottom: 14 }} />
          <div style={{ fontSize: 32, fontWeight: 850, lineHeight: 1.05, fontVariantNumeric: "tabular-nums" }}>{m.value}</div>
          <div className="muted" style={{ marginTop: 8, fontSize: 13, fontWeight: 650 }}>{m.label}</div>
        </div>)}
      </section>
      <section className="card" style={{ padding: "clamp(18px, 3vw, 25px)", borderRadius: 20, display: "grid", gap: 17 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div><h2 style={{ margin: 0 }}>Links de cadastro</h2><p className="muted" style={{ margin: "5px 0 0" }}>Acompanhe os links criados para cada categoria.</p></div>
          <Link href="/atletas/links-cadastro" style={{ fontWeight: 750 }}>Ver todos os links →</Link>
        </div>
        {links.length === 0 ? <p className="muted">Nenhum link cadastrado.</p> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 12 }}>
            {links.map(link => <div key={link.id} style={{ padding: 16, border: "1px solid var(--line, #dce4e9)", borderRadius: 14, display: "grid", gap: 7 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <strong style={{ overflowWrap: "anywhere" }}>{link.name}</strong>
                <span style={{ background: link.status === "ACTIVE" ? "#e3f5d1" : "#edf1f5", color: "#264526", padding: "4px 9px", borderRadius: 20, fontSize: 11, fontWeight: 800 }}>{({ ACTIVE: "Ativo", DRAFT: "Rascunho", PAUSED: "Pausado", REVOKED: "Revogado", EXPIRED: "Expirado" } as Record<string,string>)[link.status] ?? link.status}</span>
              </div>
              <span className="muted" style={{ fontSize: 13 }}>{link.category.name}</span>
            </div>)}
          </div>
        )}
        {links.length === 100 && <small className="muted">Mostrando os 100 links mais recentes.</small>}
      </section>
      <section className="card" style={{ padding: "clamp(18px, 3vw, 25px)", borderRadius: 20, display: "grid", gap: 18 }}>
        <div><h2 style={{ margin: 0 }}>Inscrições recebidas</h2><p className="muted" style={{ margin: "5px 0 0" }}>Selecione uma inscrição para conferir os dados enviados.</p></div>
        <nav aria-label="Filtrar por status" style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {[{ key: "", label: "Todas", count: totalCount }, ...Object.entries(LABELS).map(([key, label]) => ({key, label, count: counts[key] ?? 0}))].map(item => {
            const selected = (status ?? "") === item.key;
            return <Link key={item.key} href={item.key ? `/atletas/inscricoes-publicas?status=${item.key}` : "/atletas/inscricoes-publicas"} aria-current={selected ? "page" : undefined} style={{ padding: "9px 12px", borderRadius: 999, textDecoration: "none", background: selected ? "#a4e91c" : "var(--surface, #f0f3f5)", color: selected ? "#162400" : "inherit", border: "1px solid var(--line, #dde3e6)", fontWeight: selected ? 800 : 600, fontSize: 13 }}>{item.label} <span style={{ opacity: .7, marginLeft: 5 }}>{item.count}</span></Link>;
          })}
        </nav>
        {submissions.length === 0 ? <p className="muted">Nenhuma inscrição neste filtro.</p> : (
          <div style={{ display: "grid", gap: 10 }}>
            {submissions.map(s => <article key={s.id} style={{ border: "1px solid var(--line, #dce4e9)", borderRadius: 15, padding: "17px 19px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 15, flexWrap: "wrap" }}>
              <div style={{ display: "grid", gap: 7, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}><strong>{s.category.name}</strong><span style={{ fontSize: 12, fontWeight: 800, borderRadius: 20, padding: "5px 10px", background: s.status === "APPROVED" ? "#e3f5d1" : s.status === "REJECTED" ? "#ffeded" : s.status === "SUBMITTED" ? "#e5f0ff" : "#fff0d6", color: "#263747" }}>{LABELS[s.status] ?? s.status}</span></div>
                <span className="muted" style={{ fontSize: 13 }}>Link: {s.link.name}</span>
                <span className="muted" style={{ fontSize: 12 }}>{s.submittedAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} · {s._count.documents} arquivo(s)</span>
              </div>
              <Link href={`/atletas/inscricoes-publicas/${encodeURIComponent(s.id)}`} style={{ background: "#a4e91c", color: "#152100", fontWeight: 800, padding: "11px 15px", borderRadius: 10, textDecoration: "none" }}>Analisar cadastro →</Link>
            </article>)}
          </div>
        )}
        {submissions.length === 100 && <small className="muted">Exibindo os 100 registros mais recentes neste filtro.</small>}
      </section>
    </main>
  );
}
