import Link from "next/link";
import { requireClubPermission } from "@/lib/club-access";
import { getEffectiveClubRole } from "@/lib/club-permissions";
import { prisma } from "@/lib/prisma";
import { buildDocumentNoticePreview, readDocumentNoticeSettings } from "@/lib/document-notice-service";
import { saveDocumentNoticeSettings } from "./actions";

export const dynamic = "force-dynamic";

export default async function NoticeSettingsPage({ searchParams }: { searchParams: Promise<{ salvo?: string; erro?: string }> }) {
  const user = await requireClubPermission("ATHLETES_EDIT");
  const manager = getEffectiveClubRole(user) === "MANAGER";
  const prefs = await readDocumentNoticeSettings(user.organizationId);
  const preview = await buildDocumentNoticePreview(user.organizationId, user.organization?.timezone || "America/Sao_Paulo", prefs);
  const history = await prisma.documentNoticeLog.findMany({
    where: { organizationId: user.organizationId }, orderBy: { createdAt: "desc" }, take: 30,
    select: { id: true, athleteId: true, mode: true, itemCount: true, createdAt: true },
  });
  const athletes = history.length ? await prisma.athlete.findMany({
    where: { organizationId: user.organizationId, id: { in: [...new Set(history.map((h) => h.athleteId))] } },
    select: { id: true, name: true },
  }) : [];
  const names = new Map(athletes.map((athlete) => [athlete.id, athlete.name]));
  const { salvo, erro } = await searchParams;
  const automaticUnavailable = preview.configurationWarnings.length > 0;

  return (
    <main style={{ padding: "22px 16px 70px", maxWidth: 1080, margin: "0 auto", display: "grid", gap: 20 }}>
      <div><Link href="/prioridades" style={{ color: "#b8ed62" }}>← Central de Prioridades</Link></div>
      <header className="card" style={{ padding: 22, background: "#12201a" }}>
        <span className="page-eyebrow" style={{ color: "#b8ed62" }}>11UP CLUB · DOCUMENTOS</span>
        <h1 style={{ color: "#ffffff" }}>Notificações documentais</h1>
        <p className="muted" style={{ color: "#d2e3d7" }}>Envio manual ou automático, sempre para responsáveis com Player vinculado e aprovado.</p>
        {salvo === "1" && <p role="status" style={{ color: "#b8ed62" }}>Preferências guardadas. Nenhuma mensagem foi enviada ao salvar.</p>}
        {erro === "requisitos" && <div role="alert" style={{ background: "#3b2918", border: "1px solid #a86c1d", borderRadius: 10, padding: 12, color: "#ffe2a8", marginBottom: 12 }}>
          A ativação automática foi bloqueada porque há categorias sem requisitos documentais obrigatórios configurados. Nenhuma preferência foi alterada. <Link href="/categorias" style={{ color: "#eaffb2", textDecoration: "underline" }}>Conferir categorias →</Link>
        </div>}
        <strong style={{ color: prefs.mode === "AUTOMATIC" ? "#b8ed62" : "#fbd38d" }}>
          Modo atual: {prefs.mode === "AUTOMATIC" ? "Automático ativo" : "Manual (sem envios automáticos)"}
        </strong>
      </header>

      <section className="card" style={{ padding: 22, display: "grid", gap: 12 }}>
        <h2>Prévia de destinatários</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
          {[
            ["Atletas com pendências acionáveis", preview.groups.length],
            ["Com Player aprovado", preview.linkedAthletes],
            ["Sem Player aprovado", preview.pendingAthletes],
            ["Destinatários autorizados", preview.eligibleRecipients],
          ].map(([label, value]) => <div key={String(label)} style={{ background: "#182721", padding: 16, borderRadius: 12 }}>
            <span style={{ color: "#c9d8cb", fontSize: 12 }}>{label}</span>
            <div style={{ fontSize: 30, fontWeight: 800, color: "white" }}>{value}</div>
          </div>)}
        </div>
        {automaticUnavailable && <div role="note" style={{ color: "#7c4800", fontWeight: 650, background: "#fff2d8", border: "1px solid #e8bd75", borderRadius: 10, padding: 14 }}>
          <strong>Envio automático temporariamente indisponível.</strong>
          <p style={{ margin: "8px 0" }}>
            {"Categorias que exigem documentação, mas não têm requisitos obrigatórios ativos: "}
            {Array.from(new Set(preview.configurationWarnings.map((category) => category.categoryName))).join(", ")}.
          </p>
          <p style={{ margin: "0 0 8px" }}>Configure os documentos obrigatórios dessas categorias antes de habilitar o modo Automático. O modo Manual continua disponível.</p>
          <Link href="/categorias" style={{ color: "#583600", textDecoration: "underline", fontWeight: 800 }}>Conferir categorias →</Link>
        </div>}
        <p className="muted">Documentos aguardando análise do clube e pendências internas não serão cobrados. A prévia não envia mensagens.</p>
      </section>

      <section className="card" style={{ padding: 22, display: "grid", gap: 14 }}>
        <h2>Preferências do clube</h2>
        {manager ? <form action={saveDocumentNoticeSettings} style={{ display: "grid", gap: 14 }}>
          <fieldset style={{ border: "1px solid #44594d", borderRadius: 12, padding: 15, display: "grid", gap: 10 }}>
            <legend>Modo de operação</legend>
            <label style={{ display: "flex", gap: 9, alignItems: "center" }}><input type="radio" name="mode" value="MANUAL" defaultChecked={prefs.mode === "MANUAL"} style={{ width: "auto" }}/> Manual — sem disparos automáticos</label>
            <label style={{ display: "flex", gap: 9, alignItems: "center", color: automaticUnavailable && prefs.mode !== "AUTOMATIC" ? "#737a75" : undefined }}>
              <input type="radio" name="mode" value="AUTOMATIC" defaultChecked={prefs.mode === "AUTOMATIC"}
                disabled={automaticUnavailable && prefs.mode !== "AUTOMATIC"} style={{ width: "auto" }}/>
              Automático — avisos diários conforme regras
            </label>
            {automaticUnavailable && <small style={{ color: "#895000", fontWeight: 650 }}>
              Para habilitar o modo Automático, primeiro configure os requisitos obrigatórios das categorias indicadas na prévia acima.
            </small>}
          </fieldset>
          <label>Intervalo mínimo entre avisos ao mesmo Player / atleta
            <select name="intervalDays" defaultValue={String(prefs.intervalDays)}>
              <option value="7">7 dias</option><option value="15">15 dias</option><option value="30">30 dias</option>
            </select>
          </label>
          <fieldset style={{ border: "1px solid #44594d", borderRadius: 12, padding: 15, display: "grid", gap: 10 }}>
            <legend>Quais pendências podem gerar avisos?</legend>
            {([[
              "notifyMissing", "Documentos obrigatórios ausentes", prefs.notifyMissing,
            ], ["notifyRejected", "Documentos rejeitados", prefs.notifyRejected],
              ["notifyExpired", "Documentos vencidos", prefs.notifyExpired],
              ["notifyExpiring", "Documentos a vencer em até 30 dias", prefs.notifyExpiring],
            ] as const).map(([name,label,checked])=><label key={name} style={{ display: "flex", gap: 9, alignItems: "center" }}>
              <input type="checkbox" name={name} defaultChecked={checked} style={{ width: "auto" }}/>{label}
            </label>)}
          </fieldset>
          <label style={{ display: "flex", gap: 10, alignItems: "center", background: "#2d281a", color: "#fff0c7", fontWeight: 600, borderRadius: 10, padding: 12 }}>
            <input type="checkbox" name="confirmActivation" value="CONFIRMAR" style={{ width: "auto" }}/>
            Confirmo que revisei os destinatários. Autorizo a ativação caso selecione Automático.
          </label>
          <p className="muted">Ao salvar, nenhum envio é disparado imediatamente. No modo automático, a rotina diária envia no máximo 20 avisos por clube por execução.</p>
          <button type="submit" className="btn">Salvar preferências</button>
        </form> : <p className="muted">Apenas o gestor pode ativar ou alterar notificações automáticas.</p>}
      </section>

      <section className="card" style={{ padding: 22, display: "grid", gap: 12 }}>
        <h2>Envios recentes</h2>
        {history.length ? history.map((item) => <div key={item.id} style={{ borderBottom: "1px solid #35453b", padding: "10px 0" }}>
          <strong>{names.get(item.athleteId) || "Atleta indisponível"}</strong>
          <div className="muted">{item.itemCount} documento(s) · {item.mode === "AUTOMATIC" ? "Automático" : "Manual"} · {item.createdAt.toLocaleString("pt-BR", { timeZone: user.organization?.timezone || "America/Sao_Paulo" })}</div>
        </div>) : <p className="muted">Nenhum aviso enviado até agora.</p>}
      </section>
    </main>
  );
}
