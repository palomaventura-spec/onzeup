"use client";
import { useState, type FormEvent } from "react";
import PublicRegistrationUploadPanel from "./PublicRegistrationUploadPanel";

const ownerLabels: Record<string, string> = { ATHLETE: "Atleta", FATHER: "Pai", MOTHER: "Mãe", GUARDIAN: "Responsável" };
type Req = { id: string; label: string; owner: "ATHLETE" | "FATHER" | "MOTHER" | "GUARDIAN"; required: boolean; expires: boolean };
const val = (form: FormData, field: string) => String(form.get(field) || "").trim();
export default function PublicRegistrationForm({ token, requirements }: { token: string; requirements: Req[] }) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState<{ submissionId: string; uploadCredential: string; uploadCredentialExpiresAt: string } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSending(true); setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      athlete: { name: val(form, "name"), birthDate: val(form, "birthDate"), identity: val(form, "identity"), cpf: val(form, "cpf"), category: val(form, "category"), position1: val(form, "position1"), position2: val(form, "position2"), height: val(form, "height"), weight: val(form, "weight") },
      family: { fatherName: val(form, "fatherName"), motherName: val(form, "motherName"), fatherBirthDate: val(form, "fatherBirthDate"), motherBirthDate: val(form, "motherBirthDate"), address: val(form, "address"), email: val(form, "email"), phone1: val(form, "phone1"), phone2: val(form, "phone2") },
      guardian: { name: val(form, "guardianName"), relation: val(form, "guardianRelation"), phone: val(form, "guardianPhone"), email: val(form, "guardianEmail"), cpf: val(form, "guardianCpf"), rg: val(form, "guardianRg"), accepted: form.get("accepted") === "on" },
      guardian2: { name: val(form, "guardian2Name"), relation: val(form, "guardian2Relation"), phone: val(form, "guardian2Phone"), email: val(form, "guardian2Email") },
      health: { hasHealthPlan: form.get("hasHealthPlan") === "YES", healthPlanName: val(form, "healthPlanName"), susCard: val(form, "susCard"), questionnaireVersion: "11UP_PREVENTIVE_MINOR_V1", questionnaire: { heartCondition: val(form, "health_heartCondition"), exertionSymptoms: val(form, "health_exertionSymptoms"), breathingProblems: val(form, "health_breathingProblems"), medicalRestriction: val(form, "health_medicalRestriction"), importantAllergies: val(form, "health_importantAllergies"), recentInjury: val(form, "health_recentInjury") }, observations: val(form, "healthObservations"), declarationAccepted: form.get("healthDeclaration") === "on", declarationByGuardian: val(form, "guardianName") },
      sportsHistory: { lastClub: val(form, "lastClub"), registeredClubs: val(form, "registeredClubs"), referral: val(form, "referral"), intermediary: val(form, "intermediary"), arrivalDate: val(form, "arrivalDate"), amateurBond: form.get("amateurBond") === "on" },
    };
    try {
      const response = await fetch(`/api/club-public-registration/${encodeURIComponent(token)}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível enviar.");
      if (typeof data.submissionId === "string" && typeof data.uploadCredential === "string" && typeof data.uploadCredentialExpiresAt === "string") {
        setReceipt({ submissionId: data.submissionId, uploadCredential: data.uploadCredential, uploadCredentialExpiresAt: data.uploadCredentialExpiresAt });
      }
      setSuccess(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Erro no envio."); }
    finally { setSending(false); }
  }
  if (success) return <><section className="card" style={{ marginTop: 18 }}><h2>Inscrição recebida!</h2><p>Aguarde o contato do clube.</p></section>{receipt && <PublicRegistrationUploadPanel token={token} requirements={requirements} {...receipt} />}</>;
  const fields = (items: [string,string,string?][]) => items.map(([name,label,type]) => <label key={name}>{label}<input name={name} type={type || "text"} /></label>);
  return <form onSubmit={submit}>
    <section className="card" style={{ marginTop: 18 }}><h2>Dados do atleta</h2><div className="form-grid">
      <label>Nome completo *<input name="name" required maxLength={180}/></label>
      <label>Nascimento *<input name="birthDate" type="date" required /></label>
      {fields([["identity","Identidade"],["cpf","CPF"],["height","Altura"],["weight","Peso"],["position1","Posição principal"],["position2","Posição secundária"]])}
    </div></section>
    <section className="card" style={{ marginTop: 18 }}><h2>Família</h2><div className="form-grid">
      {fields([["fatherName","Nome do pai"],["fatherBirthDate","Nascimento do pai (opcional)","date"],["motherName","Nome da mãe"],["motherBirthDate","Nascimento da mãe (opcional)","date"],["address","Endereço"],["email","E-mail","email"],["phone1","Telefone"],["phone2","Segundo telefone"]])}
    </div></section>
    <section className="card" style={{ marginTop: 18 }}><h2>Informações de saúde</h2><div className="form-grid">
      <label>Plano de saúde<select name="hasHealthPlan"><option value="NO">Não</option><option value="YES">Sim</option></select></label>
      {fields([["healthPlanName","Qual plano?"],["susCard","Cartão SUS"]])}
    </div></section>
    <section className="card" style={{ marginTop: 18 }}>
      <h2>Questionário preventivo de saúde — atleta menor de idade</h2>
      <p className="muted">Preenchimento pelo responsável legal. Esta declaração é apenas preventiva e informativa: não comprova aptidão, não substitui consulta, exames ou atestado médico e não dispensa os documentos exigidos pelo clube.</p>
      <div style={{ display: "grid", gap: 20 }}>
        <fieldset style={{ border: "1px solid #32414c", borderRadius: 10, padding: 12, minWidth: 0 }}>
          <legend style={{ padding: "0 6px" }}>Algum médico informou que o atleta possui condição cardíaca relevante para a prática esportiva?</legend>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><input type="radio" name="health_heartCondition" value="YES" required /> Sim</label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><input type="radio" name="health_heartCondition" value="NO" required /> Não</label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><input type="radio" name="health_heartCondition" value="UNKNOWN" required /> Não sei</label>
          </div>
        </fieldset>
        <fieldset style={{ border: "1px solid #32414c", borderRadius: 10, padding: 12, minWidth: 0 }}>
          <legend style={{ padding: "0 6px" }}>O atleta já apresentou dor no peito, desmaio ou tontura intensa durante esforço físico?</legend>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><input type="radio" name="health_exertionSymptoms" value="YES" required /> Sim</label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><input type="radio" name="health_exertionSymptoms" value="NO" required /> Não</label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><input type="radio" name="health_exertionSymptoms" value="UNKNOWN" required /> Não sei</label>
          </div>
        </fieldset>
        <fieldset style={{ border: "1px solid #32414c", borderRadius: 10, padding: 12, minWidth: 0 }}>
          <legend style={{ padding: "0 6px" }}>O atleta possui dificuldade respiratória importante, especialmente durante exercícios?</legend>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><input type="radio" name="health_breathingProblems" value="YES" required /> Sim</label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><input type="radio" name="health_breathingProblems" value="NO" required /> Não</label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><input type="radio" name="health_breathingProblems" value="UNKNOWN" required /> Não sei</label>
          </div>
        </fieldset>
        <fieldset style={{ border: "1px solid #32414c", borderRadius: 10, padding: 12, minWidth: 0 }}>
          <legend style={{ padding: "0 6px" }}>Existe restrição médica vigente à participação em atividades físicas?</legend>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><input type="radio" name="health_medicalRestriction" value="YES" required /> Sim</label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><input type="radio" name="health_medicalRestriction" value="NO" required /> Não</label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><input type="radio" name="health_medicalRestriction" value="UNKNOWN" required /> Não sei</label>
          </div>
        </fieldset>
        <fieldset style={{ border: "1px solid #32414c", borderRadius: 10, padding: 12, minWidth: 0 }}>
          <legend style={{ padding: "0 6px" }}>O atleta possui alergia grave ou condição que exija cuidados de emergência?</legend>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><input type="radio" name="health_importantAllergies" value="YES" required /> Sim</label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><input type="radio" name="health_importantAllergies" value="NO" required /> Não</label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><input type="radio" name="health_importantAllergies" value="UNKNOWN" required /> Não sei</label>
          </div>
        </fieldset>
        <fieldset style={{ border: "1px solid #32414c", borderRadius: 10, padding: 12, minWidth: 0 }}>
          <legend style={{ padding: "0 6px" }}>O atleta possui lesão, cirurgia recente ou condição que possa interferir na prática esportiva?</legend>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><input type="radio" name="health_recentInjury" value="YES" required /> Sim</label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><input type="radio" name="health_recentInjury" value="NO" required /> Não</label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><input type="radio" name="health_recentInjury" value="UNKNOWN" required /> Não sei</label>
          </div>
        </fieldset>
        <label>Observações do responsável (opcional)<textarea name="healthObservations" maxLength={2000} rows={3} placeholder="Informações relevantes sobre as respostas, medicações ou cuidados, caso deseje informar" /></label>
        <label style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <input name="healthDeclaration" type="checkbox" required style={{ width: 18, height: 18, marginTop: 3, flexShrink: 0 }} />
          <span>Declaro, como responsável legal, que as informações refletem meu conhecimento atual. Sei que este questionário não constitui avaliação ou liberação médica e que devo comunicar alterações relevantes ao clube.</span>
        </label>
      </div>
    </section>
    <section className="card" style={{ marginTop: 18 }}><h2>Histórico esportivo</h2><div className="form-grid">
      {fields([["lastClub","Último clube"],["registeredClubs","Clubes anteriores"],["referral","Indicação"],["intermediary","Intermediário"],["arrivalDate","Data de chegada","date"]])}
      <label><input type="checkbox" name="amateurBond" /> Possui vínculo amador</label>
    </div></section>
    <section className="card" style={{ marginTop: 18 }}><h2>Responsável pelo cadastro</h2><div className="form-grid">
      <label>Nome completo *<input name="guardianName" required /></label>
      <label>Relação com o atleta *<select name="guardianRelation" required><option value="MOTHER">Mãe</option><option value="FATHER">Pai</option><option value="LEGAL_GUARDIAN">Responsável legal</option><option value="OTHER">Outro</option></select></label>
      {fields([["guardianCpf","CPF"],["guardianRg","RG"],["guardianPhone","WhatsApp"],["guardianEmail","E-mail","email"]])}
    </div><h3>Segundo responsável (opcional)</h3><div className="form-grid">
      {fields([["guardian2Name","Nome"],["guardian2Relation","Relação"],["guardian2Phone","WhatsApp"],["guardian2Email","E-mail","email"]])}
    </div></section>
    <section className="card" style={{ marginTop: 18 }}><h2>Documentos solicitados</h2>
      {requirements.length ? <ul>{requirements.map((r,i)=><li key={i}>{r.label} — {ownerLabels[r.owner]} — {r.required ? "Obrigatório" : "Opcional"}{r.expires ? " · Com validade" : ""}</li>)}</ul> : <p>O clube não configurou documentos para este link.</p>}
      <p className="muted">A ficha fica aguardando documentos ate a finalizacao. O envio dos documentos estará disponível após o registro da ficha, quando habilitado pelo clube.</p>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, margin: "18px 0" }}><input type="checkbox" name="accepted" required style={{ width: 18, height: 18, flexShrink: 0, marginTop: 2 }} /><span>Confirmo que sou responsável e que as informações prestadas são verdadeiras.</span></label>
      {error && <p role="alert" className="form-error">{error}</p>}
      <button type="submit" disabled={sending}>{sending ? "Enviando..." : "Enviar inscrição"}</button>
    </section>
  </form>;
}
