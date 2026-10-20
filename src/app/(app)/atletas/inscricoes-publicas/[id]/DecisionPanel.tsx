"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Candidate = {
  athleteId: string;
  name: string;
  nickname: string | null;
  birthYear: number | null;
  match: string;
};
type ResponseData = { candidates?: Candidate[]; error?: string; athleteId?: string };

type Props = {
  submissionId: string;
  status: string;
  hasPayload: boolean;
  approvalTestEnabled: boolean;
};

export default function DecisionPanel({ submissionId, status, hasPayload, approvalTestEnabled }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [choice, setChoice] = useState("REVIEW");
  const [selectedAthleteId, setSelectedAthleteId] = useState("");
  const [confirmedIdentity, setConfirmedIdentity] = useState(false);
  const eligible = status === "SUBMITTED" && hasPayload;
  const isApproval = choice === "APPROVE_NEW" || choice === "APPROVE_EXISTING";
  const canConfirm = approvalTestEnabled && eligible && checked && isApproval && confirmedIdentity && !loading &&
    (choice !== "APPROVE_EXISTING" || Boolean(selectedAthleteId));

  async function scan() {
    if (!eligible || loading) return;
    setLoading(true);
    setChecked(false);
    setConfirmedIdentity(false);
    setError(null);
    setSuccess(null);
    setCandidates([]);
    setSelectedAthleteId("");
    try {
      const response = await fetch(`/api/club-public-registration-submissions/${encodeURIComponent(submissionId)}/duplicates`, {
        method: "GET", credentials: "same-origin", cache: "no-store",
      });
      const data = (await response.json()) as ResponseData;
      if (!response.ok) throw new Error(data.error || "Não foi possível verificar possíveis duplicidades.");
      setCandidates(Array.isArray(data.candidates) ? data.candidates : []);
      setChecked(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha na consulta.");
    } finally { setLoading(false); }
  }

  async function confirmDecision() {
    if (!canConfirm || loading) return;
    const message = choice === "APPROVE_NEW"
      ? "Confirmar a CRIAÇÃO deste atleta fictício na homologação? A aprovação cadastral não libera aptidão esportiva."
      : "Confirmar o VÍNCULO desta inscrição ao atleta selecionado na homologação?";
    if (!window.confirm(message)) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    const endpoint = choice === "APPROVE_NEW" ? "approve-new" : "approve-existing";
    const body = choice === "APPROVE_NEW"
      ? { confirmation: "CRIAR_NOVO_ATLETA", duplicatesReviewed: true }
      : { athleteId: selectedAthleteId, confirmation: "VINCULAR_ATLETA_EXISTENTE" };
    try {
      const response = await fetch(`/api/club-public-registration-submissions/${encodeURIComponent(submissionId)}/${endpoint}`, {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const result = (await response.json()) as ResponseData;
      if (!response.ok) throw new Error(result.error || "Não foi possível concluir a decisão.");
      setSuccess(`Cadastro aprovado. Atleta associado: ${result.athleteId ?? "confirmado"}.`);
      setChecked(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha na aprovação.");
    } finally { setLoading(false); }
  }

  const button: React.CSSProperties = { minHeight: 42, padding: "9px 16px", borderRadius: 10, border: "1px solid #d5dee0", fontWeight: 700, cursor: "pointer" };
  return <section className="card" style={{ display: "grid", gap: 15 }}>
    <div>
      <h2>Decisão administrativa</h2>
      <p>Confira possíveis cadastros duplicados. A aprovação cadastral não significa aprovação médica nem esportiva.</p>
      <p role="status" style={{ color: approvalTestEnabled ? "#27643b" : "#8a5200" }}>
        {approvalTestEnabled ? "Modo de homologação: aprovação de inscrições sem anexos habilitada para teste." :
          "Aprovação desativada. A integração ainda não está habilitada neste ambiente."}
      </p>
    </div>
    <div>
      <button type="button" onClick={scan} disabled={!eligible || loading} style={button}>
        {loading ? "Verificando..." : "Verificar possíveis atletas existentes"}
      </button>
      {!eligible && <p>Esta verificação exige inscrição enviada e ficha privada disponível.</p>}
      {checked && <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        <strong>{candidates.length ? `${candidates.length} possível(is) correspondência(s)` : "Nenhuma correspondência encontrada nesta busca"}</strong>
        <p>Uma busca sem resultados não garante ausência de duplicidade. Confira a identidade antes de decidir.</p>
        {candidates.map(item => <label key={item.athleteId} style={{ display: "flex", gap: 8, alignItems: "center", padding: 10, border: "1px solid #d5dee0", borderRadius: 9 }}>
          <input type="radio" name="candidate-athlete" value={item.athleteId}
            checked={selectedAthleteId === item.athleteId}
            onChange={() => { setSelectedAthleteId(item.athleteId); setConfirmedIdentity(false); }} />
          <span>{item.name} {item.nickname ? `(${item.nickname})` : ""} · {item.birthYear ?? "Ano desconhecido"} · {item.match === "NAME_AND_BIRTH_DATE" ? "Nome e nascimento" : item.match === "NAME" ? "Nome" : "Nascimento"}</span>
        </label>)}
      </div>}
    </div>
    <div style={{ display: "grid", gap: 12 }}>
      <label htmlFor="decision-choice"><strong>Ação pretendida</strong></label>
      <select id="decision-choice" value={choice} disabled={loading} onChange={event => { setChoice(event.target.value); setConfirmedIdentity(false); setError(null); }}
        style={{ minHeight: 42, padding: 8, maxWidth: 420, borderRadius: 9 }}>
        <option value="REVIEW">Continuar conferência</option>
        <option value="APPROVE_NEW">Criar novo atleta</option>
        <option value="APPROVE_EXISTING">Vincular atleta existente</option>
        <option value="CHANGES_REQUESTED" disabled>Solicitar correções (indisponível neste teste)</option>
        <option value="REJECTED" disabled>Rejeitar inscrição (indisponível neste teste)</option>
      </select>
      {choice === "APPROVE_EXISTING" && <p>{selectedAthleteId ? "Confira se o atleta selecionado corresponde exatamente à inscrição." : "Selecione um atleta na verificação acima."}</p>}
      {choice === "APPROVE_NEW" && <p>Confirme que o atleta ainda não possui cadastro neste clube.</p>}
      {isApproval && checked && approvalTestEnabled && <label style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
        <input type="checkbox" checked={confirmedIdentity} onChange={event => setConfirmedIdentity(event.target.checked)} />
        <span>Conferi a identidade e possíveis duplicidades. Estou ciente de que esta ação cria ou vincula o atleta, mas não concede aptidão médica ou esportiva.</span>
      </label>}
      {error && <p role="alert" style={{ color: "#ae2939" }}>{error}</p>}
      {success && <p role="status" style={{ color: "#27643b" }}>{success}</p>}
      <button type="button" disabled={!canConfirm} onClick={confirmDecision}
        style={{ ...button, opacity: canConfirm ? 1 : .5, justifySelf: "start", background: "#a4e91c", color: "#152100" }}>
        {loading ? "Processando..." : approvalTestEnabled ? "Confirmar aprovação" : "Confirmar decisão (bloqueado)"}
      </button>
      {approvalTestEnabled && <small style={{ color: "#65727a" }}>Inscrições com arquivos anexados continuarão bloqueadas pela API nesta fase de homologação.</small>}
    </div>
  </section>;
}
