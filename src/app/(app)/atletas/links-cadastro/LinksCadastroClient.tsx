"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Category = { id: string; name: string; sport: string; type: string };
const sportLabel = (value: string) => ({ FOOTBALL: "Futebol", FUTSAL: "Futsal", BOTH: "Futebol e Futsal" } as Record<string, string>)[value] ?? value;
const typeLabel = (value: string) => value === "EVALUATION" ? "Avaliação" : "Regular";
type RegistrationLink = {
  id: string;
  name: string;
  categoryId: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  maxSubmissions: number | null;
  _count?: { submissions: number };
};
type LinksResponse = { links?: RegistrationLink[]; error?: string; disabled?: boolean };
type CreateResponse = { id?: string; status?: string; previewPath?: string; error?: string };

export default function LinksCadastroClient({ categories }: { categories: Category[] }) {
  const [links, setLinks] = useState<RegistrationLink[]>([]);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [validityDays, setValidityDays] = useState("30");
  const [lastPath, setLastPath] = useState("");
  const [maxSubmissions, setMaxSubmissions] = useState("");
  const [requirementsLinkId, setRequirementsLinkId] = useState("");
  const [requirements, setRequirements] = useState<{ id?: string; categoryRequirementId?: string | null; label: string; owner: "ATHLETE" | "FATHER" | "MOTHER" | "GUARDIAN"; required: boolean; expires: boolean }[]>([]);
  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const readJson = async (response: Response): Promise<Record<string, any>> => {
    const text = await response.text();
    try { return text ? JSON.parse(text) as Record<string, any> : {}; }
    catch { return { error: `Servidor respondeu ${response.status} sem JSON válido.` }; }
  };

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/club-public-registration-links", { cache: "no-store" });
      const data = await readJson(response) as LinksResponse;
      if (!response.ok) throw new Error(data.error || "Erro ao carregar links.");
      setLinks(Array.isArray(data.links) ? data.links : []);
      setDisabled(data.disabled === true);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível consultar os links.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setLastPath("");
    try {
      const response = await fetch("/api/club-public-registration-links", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), categoryId, validityDays: Number(validityDays), maxSubmissions: maxSubmissions === "" ? null : Number(maxSubmissions) }),
      });
      const data = await readJson(response) as CreateResponse;
      if (!response.ok) throw new Error(data.error || "Falha ao criar link.");
      if (data.previewPath) setLastPath(data.previewPath);
      setName("");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao criar link."); }
    finally { setBusy(false); }
  }

  async function updateStatus(id: string, status: "ACTIVE" | "PAUSED" | "REVOKED") {
    if (!window.confirm(`Confirma alterar a situação do link para ${status}?`)) return;
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/club-public-registration-links/${encodeURIComponent(id)}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error || "Falha ao atualizar link.");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao atualizar link."); }
    finally { setBusy(false); }
  }
  async function configure(id: string) {
    setError("");
    try {
      const res = await fetch(`/api/club-public-registration-links/${encodeURIComponent(id)}/requirements`, { cache: "no-store" });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error || "Falha ao consultar documentos.");
      setRequirementsLinkId(id);
      setRequirements(Array.isArray(data.requirements) ? data.requirements.filter((r: {active:boolean})=>r.active).map((r: {id?:string;categoryRequirementId?:string|null;label:string;owner:"ATHLETE"|"FATHER"|"MOTHER"|"GUARDIAN";required:boolean;expires:boolean})=>({ id:r.id, categoryRequirementId:r.categoryRequirementId ?? null, label:r.label, owner:r.owner, required:r.required, expires:r.expires })) : []);
    } catch(e) { setError(e instanceof Error ? e.message : "Falha ao consultar documentos."); }
  }
  async function saveRequirements() {
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/club-public-registration-links/${encodeURIComponent(requirementsLinkId)}/requirements`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({items: requirements}),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error || "Falha ao salvar documentos.");
      setRequirementsLinkId("");
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao salvar documentos."); }
    finally { setBusy(false); }
  }
  const categoryName = (id: string) => {
    const category = categories.find(c => c.id === id);
    return category ? `${category.name} · ${sportLabel(category.sport)} · ${typeLabel(category.type)}` : "Categoria não disponível";
  };
  const readableDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR");
  };

  return (
    <main style={{ padding: "24px clamp(16px, 4vw, 40px)", display: "grid", gap: 22, maxWidth: 1120, margin: "0 auto" }}>
      <header style={{ padding: 24, borderRadius: 22, background: "linear-gradient(115deg,#071923,#123820)", color: "white" }}>
        <p style={{ color: "#a3e635", fontSize: 12, fontWeight: 800, letterSpacing: ".1em" }}>11UP CLUB · ATLETAS</p>
        <h1 style={{ margin: "8px 0", fontSize: "clamp(28px, 4vw, 42px)", color: "#ffffff" }}>Links coletivos de inscrição</h1>
        <p style={{ color: "#d7e1e2" }}>Prepare links coletivos reutilizáveis por categoria de avaliação ou regular e acompanhe os cadastros recebidos.</p>
        <nav style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          <Link href="/atletas" style={{ color: "white" }}>← Voltar para atletas</Link>
          <Link href="/atletas/inscricoes-publicas" style={{ color: "#c9fa70" }}>Consultar inscrições recebidas →</Link>
        </nav>
      </header>

      <section style={{ padding: 22, border: "1px solid #dce4e4", borderRadius: 18, background: "white" }}>
        <h2 style={{ marginTop: 0 }}>Criar link coletivo (rascunho)</h2>
        <p style={{ color: "#576a71" }}>Nesta fase o link será criado como <strong>DRAFT (rascunho)</strong>. Não o envie às famílias: a ativação e os documentos exigidos ainda precisam ser configurados.</p>
        {disabled && <p role="status" style={{ color: "#944b00" }}>Funcionalidade desativada até a homologação do banco. Nenhuma inscrição poderá ser criada.</p>}
        <form onSubmit={create} style={{ display: "grid", gap: 16 }}>
          <label style={{ display: "grid", gap: 6 }}>Nome do link
            <input required maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Avaliação Sub-08 — Outubro" style={{ padding: 12, border: "1px solid #b6c5cb", borderRadius: 10, width: "100%" }}/>
          </label>
          <label style={{ display: "grid", gap: 6 }}>Categoria de destino
            <select required value={categoryId} onChange={e=>setCategoryId(e.target.value)} style={{ padding: 12, border: "1px solid #b6c5cb", borderRadius: 10, width: "100%" }}>
              {categories.length === 0 && <option value="">Nenhuma categoria ativa</option>}
              {categories.map(c=><option key={c.id} value={c.id}>{c.name} · {sportLabel(c.sport)} · {typeLabel(c.type)}</option>)}
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>Validade (1 a 90 dias)
            <input required type="number" min={1} max={90} value={validityDays} onChange={e=>setValidityDays(e.target.value)} style={{ padding: 12, border: "1px solid #b6c5cb", borderRadius: 10, maxWidth: 200 }}/>
          </label>
          <label style={{ display: "grid", gap: 6 }}>Limite de inscrições (opcional; até 10.000)
            <input type="number" min={1} max={10000} value={maxSubmissions} onChange={e=>setMaxSubmissions(e.target.value)} placeholder="Sem limite" style={{ padding: 12, border: "1px solid #b6c5cb", borderRadius: 10, maxWidth: 200 }}/>
          </label>
          <button type="submit" disabled={disabled || busy || !categoryId || !name.trim()} style={{ padding: "12px 18px", border: 0, borderRadius: 12, background: "#9be600", color: "#102009", fontWeight: 800, cursor: "pointer", opacity: busy || !categoryId || !name.trim() ? .5 : 1, justifySelf: "start" }}>
            {busy ? "Criando..." : "Criar rascunho"}
          </button>
        </form>
        {error && <p role="alert" style={{ color: "#a32121" }}>{error}</p>}
        {lastPath && <div role="status" style={{ marginTop: 18, padding: 16, background: "#f1f8e5", borderRadius: 12 }}>
          <strong>Rascunho criado.</strong>
          <p>O caminho gerado só é exibido agora. Guarde-o para configuração futura, mas não o compartilhe com famílias enquanto o link estiver em DRAFT.</p>
          <code style={{ overflowWrap: "anywhere" }}>{lastPath}</code>
          <div style={{ marginTop: 12 }}><button type="button" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}${lastPath}`).catch(() => setError("Não foi possível copiar. Selecione o endereço manualmente."))}>Copiar endereço de rascunho</button></div>
        </div>}
      </section>

      <section style={{ padding: 22, border: "1px solid #dce4e4", borderRadius: 18, background: "white" }}>
        <h2 style={{ marginTop: 0 }}>Links do clube</h2>
        {loading ? <p>Carregando links…</p> : links.length === 0 ? <p>Nenhum link cadastrado.</p> :
          <div style={{ display: "grid", gap: 10 }}>
            {links.map(item => <div key={item.id} style={{ border: "1px solid #e0e7e7", borderRadius: 12, padding: 14, display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}>
              <div><strong>{item.name}</strong><p style={{ margin: "6px 0 0", color: "#566770", fontSize: 13 }}>{categoryName(item.categoryId)} · Expira em {readableDate(item.expiresAt)}</p></div>
              <div style={{ display:"grid",gap:8,justifyItems:"end" }}>
                <span style={{ fontWeight: 800, color: item.status === "ACTIVE" ? "#16703a" : "#765b18" }}>{item.status} · {item._count?.submissions ?? 0}{item.maxSubmissions === null ? " / sem limite" : ` / ${item.maxSubmissions}`} inscrições</span>
                {!disabled && <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {item.status === "DRAFT" && <button type="button" disabled={busy} onClick={()=>void configure(item.id)}>Documentos</button>}
                  {(item.status === "DRAFT" || item.status === "PAUSED") && <button type="button" disabled={busy} onClick={()=>void updateStatus(item.id,"ACTIVE")}>Ativar</button>}
                  {item.status === "ACTIVE" && <button type="button" disabled={busy} onClick={()=>void updateStatus(item.id,"PAUSED")}>Pausar</button>}
                  {item.status !== "REVOKED" && <button type="button" disabled={busy} onClick={()=>void updateStatus(item.id,"REVOKED")}>Revogar</button>}
                </div>}
              </div>
            </div>)}
          </div>}
        <p style={{ color: "#657379", fontSize: 12 }}>Por segurança, a API não devolve o endereço original dos links já criados. A ativação e a configuração documental serão feitas em uma próxima etapa.</p>
      </section>
      {requirementsLinkId && <section style={{background:"white",padding:22,border:"1px solid #dce4e4",borderRadius:18}}>
        <h2>Documentos exigidos pelo link</h2>
        <p>Configure antes de ativar. Os documentos enviados serão privados e analisados pelo gestor.</p>
        {requirements.map((item,i)=><div key={i} style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:10,marginBottom:12}}>
          <input aria-label={`Documento ${i+1}`} value={item.label} maxLength={120} onChange={e=>setRequirements(curr=>curr.map((r,j)=>j===i?{...r,label:e.target.value}:r))}/>
          <select aria-label="Titular" value={item.owner} onChange={e=>setRequirements(curr=>curr.map((r,j)=>j===i?{...r,owner:e.target.value as typeof item.owner}:r))}>
            <option value="ATHLETE">Atleta</option><option value="FATHER">Pai</option><option value="MOTHER">Mãe</option><option value="GUARDIAN">Responsável</option>
          </select>
          {item.categoryRequirementId && <span title="Documento herdado da categoria" style={{fontSize:12,color:"#21663c",fontWeight:700}}>Herdado da categoria</span>}
          <label><input type="checkbox" checked={item.required} onChange={e=>setRequirements(curr=>curr.map((r,j)=>j===i?{...r,required:e.target.checked}:r))}/> Obrigatório</label>
          <label><input type="checkbox" checked={item.expires} onChange={e=>setRequirements(curr=>curr.map((r,j)=>j===i?{...r,expires:e.target.checked}:r))}/> Tem validade</label>
          <button type="button" onClick={()=>setRequirements(curr=>curr.filter((_,j)=>j!==i))}>Remover</button>
        </div>)}
        <div style={{display:"flex",gap:10}}>
          <button type="button" disabled={requirements.length>=30} onClick={()=>setRequirements(curr=>[...curr,{label:"",owner:"ATHLETE",required:true,expires:false}])}>+ Documento</button>
          <button type="button" disabled={busy || requirements.some(x=>!x.label.trim())} onClick={()=>void saveRequirements()}>Salvar exigências</button>
          <button type="button" onClick={()=>setRequirementsLinkId("")}>Cancelar</button>
        </div>
      </section>}
    </main>
  );
}
