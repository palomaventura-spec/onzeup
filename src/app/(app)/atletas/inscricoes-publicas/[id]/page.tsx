import Link from "next/link";
import DecisionPanel from "./DecisionPanel";
import { notFound } from "next/navigation";
import { requireClubPermission } from "@/lib/club-access";
import { safeDecryptPrivateData } from "@/lib/private-data-crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Section = Record<string, unknown>;
const object = (value: unknown): Section =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Section : {};
const labels: Record<string, string> = {
  name: "Nome completo", birthDate: "Data de nascimento", identity: "Identidade", cpf: "CPF",
  category: "Categoria informada", position1: "Posição principal", position2: "Segunda posição",
  height: "Altura", weight: "Peso", fatherName: "Nome do pai", motherName: "Nome da mãe",
  fatherBirthDate: "Nascimento do pai", motherBirthDate: "Nascimento da mãe",
  address: "Endereço", email: "E-mail", phone1: "Telefone principal", phone2: "Telefone secundário",
  relation: "Parentesco", phone: "WhatsApp / telefone", rg: "RG", accepted: "Declaração confirmada",
  hasHealthPlan: "Possui plano de saúde", healthPlanName: "Plano de saúde", susCard: "Cartão SUS",
  questionnaireVersion: "Versão do questionário", observations: "Observações da família",
  declarationAccepted: "Declaração preventiva aceita", declarationByGuardian: "Responsável declarante",
  declaredAt: "Data da declaração", lastClub: "Último clube", registeredClubs: "Clubes anteriores",
  referral: "Indicação", intermediary: "Intermediário", arrivalDate: "Data de chegada",
  amateurBond: "Vínculo amador",
};
const questions = [
  ["heartCondition", "Condição cardíaca informada por médico"],
  ["exertionSymptoms", "Dor no peito, desmaio ou tontura durante esforço"],
  ["breathingProblems", "Dificuldade respiratória durante exercícios"],
  ["medicalRestriction", "Restrição médica vigente"],
  ["importantAllergies", "Alergia grave ou condição que exige cuidado de emergência"],
  ["recentInjury", "Lesão, cirurgia recente ou outra condição relevante"],
] as const;
function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Não informado";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    const enumLabels: Record<string, string> = { MOTHER: "Mãe", FATHER: "Pai", GUARDIAN: "Responsável", ATHLETE: "Atleta", YES: "Sim", NO: "Não", UNKNOWN: "Não sei", TRUE: "Sim", FALSE: "Não", PENDING: "Aguardando conferência", APPROVED: "Aprovado", REJECTED: "Recusado" };
    if (enumLabels[value]) return enumLabels[value];
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) { const [y,m,d] = value.split("-"); return `${d}/${m}/${y}`; }
    return value;
  }
  return "Não informado";
}
const statusLabels: Record<string, string> = { PENDING_DOCUMENTS: "Aguardando documentos", SUBMITTED: "Para análise", CHANGES_REQUESTED: "Correções solicitadas", APPROVED: "Cadastro aprovado", REJECTED: "Rejeitado" };
const sections = [
  ["athlete", "Dados do atleta"], ["family", "Família"], ["guardian", "Responsável principal"],
  ["guardian2", "Segundo responsável"], ["health", "Informações de saúde (acesso restrito)"],
  ["sportsHistory", "Histórico esportivo"],
] as const;

export default async function PublicRegistrationReviewDetail({
  params,
}: { params: Promise<{ id: string }> }) {
  const user = await requireClubPermission("ATHLETES_EDIT");
  if (user.role === "SUPER_ADMIN") notFound();
  const { id } = await params;
  const submission = await prisma.publicRegistrationSubmission.findFirst({
    where: { id, organizationId: user.organizationId },
    select: {
      id: true, status: true, createdAt: true, submittedAt: true,
      payloadEncrypted: true, photoStorageKey: true,
      category: { select: { name: true, sport: true, type: true } },
      link: { select: { name: true, requirements: { where: { active: true }, select: { id: true, label: true, owner: true, required: true }, orderBy: { sortOrder: "asc" } } } },
      documents: {
        select: { id: true, labelSnapshot: true, ownerSnapshot: true, status: true, expiresAt: true, mimeType: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!submission) notFound();
  const decrypted = safeDecryptPrivateData(submission.payloadEncrypted);
  let payload: Section = {};
  try { payload = object(decrypted ? JSON.parse(decrypted) : {}); } catch { /* fail closed */ }
  return (
    <main style={{ padding: "clamp(16px, 3vw, 32px)", display: "grid", gap: 18, maxWidth: 1500, margin: "0 auto", minWidth: 0 }}>
      <header style={{ background: "linear-gradient(110deg,#0b161c,#10352d)", borderRadius: 22, padding: "clamp(22px, 4vw, 36px)", color: "white", display: "grid", gap: 12 }}>
        <Link href="/atletas/inscricoes-publicas" style={{ color: "#e2efdf", width: "fit-content" }}>← Voltar ao Cadastro por link</Link>
        <span style={{ fontSize: 12, letterSpacing: 2, fontWeight: 800, color: "#a4e91c" }}>11UP CLUB · REVISÃO PRIVADA</span>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, color: "white", fontSize: "clamp(28px, 4vw, 42px)" }}>Análise de cadastro</h1>
          <span style={{ background: "#e5efff", color: "#17395c", fontSize: 12, fontWeight: 800, padding: "8px 13px", borderRadius: 999 }}>{statusLabels[submission.status] ?? submission.status}</span>
        </div>
        <div style={{ color: "#d8e8e2", display: "flex", gap: 9, flexWrap: "wrap", fontSize: 14 }}>
          <strong>{submission.category.name}</strong><span>·</span><span>{({ FOOTBALL: "Futebol", FUTSAL: "Futsal", BOTH: "Futebol e Futsal" } as Record<string,string>)[submission.category.sport] ?? submission.category.sport}</span><span>·</span><span>{submission.category.type === "EVALUATION" ? "Avaliação" : "Regular"}</span>
        </div>
        <p style={{ color: "#b5c9c9", margin: 0, fontSize: 13 }}>Link: {submission.link.name}. A aprovação cadastral não significa aptidão médica ou esportiva.</p>
      </header>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,200px),1fr))", gap: 12 }}>
        {[{ title: "Categoria do link", value: submission.category.name }, { title: "Arquivos enviados", value: String(submission.documents.length) }, { title: "Situação", value: statusLabels[submission.status] ?? submission.status }].map(item => <div key={item.title} className="card" style={{ padding: 18, borderRadius: 16 }}><div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>{item.title}</div><strong style={{ fontSize: 18 }}>{item.value}</strong></div>)}
      </div>
      {!decrypted && <section className="card"><p role="alert">Não foi possível abrir a ficha privada. A análise está bloqueada.</p></section>}
      {decrypted && sections.map(([key, label]) => {
        const values = object(payload[key]);
        return <section className="card" key={key} style={{ padding: "clamp(18px, 3vw, 25px)", borderRadius: 18, display: "grid", gap: 14 }}>
          <h2 style={{ margin: 0 }}>{label}</h2>
          <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
            {Object.entries(values).filter(([field, value]) => field !== "questionnaire" && value !== null && value !== undefined && value !== "" && !(Array.isArray(value) && value.length === 0)).map(([field, value]) => (
              <div key={field}>
                <dt className="muted">{labels[field] ?? field}</dt>
                <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{display(value)}</dd>
              </div>
            ))}
          </dl>
          {Object.entries(values).filter(([field, value]) => field !== "questionnaire" && value !== null && value !== undefined && value !== "").length === 0 && <p className="muted" style={{ margin: 0 }}>Nenhuma informação adicional enviada nesta seção.</p>}
          {key === "health" && <div style={{ marginTop: 20 }}>
            <h3>Questionário preventivo de saúde</h3>
            <p className="muted">Triagem informativa. Não comprova aptidão nem substitui exames ou atestado médico.</p>
            <dl style={{ display: "grid", gap: 12 }}>
              {questions.map(([field, title]) => <div key={field}>
                <dt className="muted">{title}</dt>
                <dd style={{ margin: 0 }}>{display(object(values.questionnaire)[field])}</dd>
              </div>)}
            </dl>
          </div>}
        </section>;
      })}
      <section className="card" style={{ padding: "clamp(18px,3vw,25px)", borderRadius: 18 }}>
        <h2 style={{ marginTop: 0 }}>Documentos e pendências da inscrição</h2>
        <p className="muted">O envio é opcional no cadastro; a regularização documental continua sujeita à conferência do clube.</p>
        <p>Foto: {submission.photoStorageKey ? "Recebida" : "Não enviada"}</p>
        {submission.link.requirements.length === 0 && <p>Nenhum requisito documental configurado neste link.</p>}
        <ul style={{ display: "grid", gap: 12, paddingLeft: 20 }}>
          {submission.link.requirements.map(req => {
            const docs = submission.documents.filter(d => d.labelSnapshot === req.label && d.ownerSnapshot === req.owner);
            const status = docs.some(d => d.status === "APPROVED") ? "Aprovado" : docs.some(d => d.status === "PENDING") ? "Enviado — aguardando conferência" : docs.some(d => d.status === "REJECTED") ? "Rejeitado — nova entrega necessária" : docs.length ? "Enviado — verificar situação" : req.required ? "Pendente — não enviado" : "Opcional — não enviado";
            return <li key={req.id}><strong>{req.label}</strong> · {display(req.owner)} · {status}</li>;
          })}
          {submission.documents.filter(d => !submission.link.requirements.some(req => req.label === d.labelSnapshot && req.owner === d.ownerSnapshot)).map(d => (
            <li key={d.id}><strong>{d.labelSnapshot}</strong> · {display(d.ownerSnapshot)} · {display(d.status)}</li>
          ))}
        </ul>
        <p className="muted">Os arquivos privados não são disponibilizados nesta página. Nenhuma pendência é regularizada automaticamente.</p>
      </section>
      <DecisionPanel submissionId={submission.id} status={submission.status} hasPayload={Boolean(decrypted)} approvalTestEnabled={process.env.NODE_ENV !== "production" && process.env.CLUB_PUBLIC_REGISTRATION_APPROVAL_ENABLED === "true"} />
    </main>
  );
}
