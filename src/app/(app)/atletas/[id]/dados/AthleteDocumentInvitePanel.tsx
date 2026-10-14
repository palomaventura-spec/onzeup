"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Guardian = { id: string; name: string; email: string | null; phone: string | null };
type Invitation = {
  id: string;
  recipientName: string | null;
  status: string;
  expiresAt: string;
  createdAt: string;
};

type RequestedItem = { key: string; label: string; category: string; subject: "ATHLETE" | "GUARDIAN"; requirementId?: string };
type RequiredDocument = {
  id: string;
  key: string;
  label: string;
  category: string;
  subject: "ATHLETE" | "GUARDIAN";
  status: string;
  shouldRequest: boolean;
  missingCount: number;
};

const presetItems = [
  ["medical_clearance", "Atestado médico para futebol competitivo / alto rendimento", "MEDICAL_CLEARANCE", "ATHLETE"],
  ["electrocardiogram", "Eletrocardiograma (ECG) com laudo e imagens", "ELECTROCARDIOGRAM", "ATHLETE"],
  ["echocardiogram", "Ecocardiograma com laudo e imagens", "ECHOCARDIOGRAM", "ATHLETE"],
  ["blood_count", "Hemograma completo", "MEDICAL_EXAM", "ATHLETE"],
  ["lipid_glycemic_profile", "Perfil lipídico e glicêmico", "MEDICAL_EXAM", "ATHLETE"],
  ["registration_form", "Ficha cadastral preenchida", "OTHER", "ATHLETE"],
  ["photo_3x4", "Foto 3×4 atualizada", "OTHER", "ATHLETE"],
  ["athlete_identity", "Documento de identidade do atleta", "IDENTITY", "ATHLETE"],
  ["guardian_identity", "Documento de identidade do pai, mãe ou responsável legal", "IDENTITY", "GUARDIAN"],
  ["athlete_cpf", "CPF do atleta, quando não constar na identidade", "IDENTITY", "ATHLETE"],
  ["guardian_cpf", "CPF do responsável, quando não constar na identidade", "IDENTITY", "GUARDIAN"],
  ["birth_certificate", "Certidão de nascimento", "IDENTITY", "ATHLETE"],
  ["school_declaration", "Declaração escolar atualizada", "SCHOOL_DECLARATION", "ATHLETE"],
  ["vaccination_card", "Carteira de vacinação", "MEDICAL_EXAM", "ATHLETE"],
  ["health_card", "Carteira do plano de saúde ou cartão do SUS", "OTHER", "ATHLETE"],
  ["sports_registration", "Registro ou inscrição esportiva", "SPORTS_REGISTRATION", "ATHLETE"],
  ["authorization", "Autorização assinada pelo responsável", "AUTHORIZATION", "ATHLETE"],
] as const;

const statusLabels: Record<string, string> = {
  PENDING: "Aguardando envio",
  SUBMITTED: "Enviado pela família",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  EXPIRED: "Vencido",
  REVOKED: "Revogado",
};

function date(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

export default function AthleteDocumentInvitePanel({
  athleteId,
  guardians,
  invitations,
  requiredDocuments,
}: {
  athleteId: string;
  guardians: Guardian[];
  invitations: Invitation[];
  requiredDocuments: RequiredDocument[];
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [customItems, setCustomItems] = useState<Array<{ label: string; subject: "ATHLETE" | "GUARDIAN" }>>([]);
  const [guardianId, setGuardianId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [selectedRequirements, setSelectedRequirements] = useState<string[]>(() =>
    requiredDocuments.filter((item) => item.shouldRequest).map((item) => item.id),
  );
  const [sendEmail, setSendEmail] = useState(false);
  const [sendPlayer, setSendPlayer] = useState(false);
  const [sentLabels, setSentLabels] = useState<string[]>([]);
  const [channelResults, setChannelResults] = useState("");

  async function createInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setGeneratedLink("");
    setMessage("");
    setError("");
    setChannelResults("");
    setSentLabels([]);

    const form = new FormData(event.currentTarget);
    const selectedKeys = new Set(form.getAll("presetItems").map(String));
    const automaticItems: RequestedItem[] = requiredDocuments
      .filter((item) => selectedRequirements.includes(item.id))
      .flatMap((item) =>
        Array.from({ length: Math.min(10, Math.max(1, item.missingCount)) }, (_, index) => ({
          key: `req_${item.id}_${index + 1}`,
          label: item.missingCount > 1 ? `${item.label} — arquivo ${index + 1}` : item.label,
          category: item.category,
          subject: item.subject,
          requirementId: item.id,
        })),
      );
    const requestedItems: RequestedItem[] = [
      ...automaticItems,
      ...presetItems
        .filter(([key]) => selectedKeys.has(key) && !automaticItems.some((item) => item.label === presetItems.find(([k]) => k === key)?.[1]))
        .map(([key, label, category, subject]) => ({ key, label, category, subject })),
    ];

    customItems.forEach((item, index) => {
      const normalized = item.label.trim();
      if (normalized) requestedItems.push({
        key: `custom_${index}_${crypto.randomUUID().replaceAll("-", "")}`,
        label: normalized,
        category: "OTHER",
        subject: item.subject,
      });
    });

    if (!requestedItems.length) {
      setError("Selecione pelo menos um documento para solicitar.");
      setSending(false);
      return;
    }
    if (sendEmail && !recipientEmail.trim()) {
      setError("Informe o e-mail do responsável para ativar o envio pelo Resend.");
      setSending(false);
      return;
    }
    try {
      const response = await fetch("/api/athlete-registration-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId,
          guardianId: form.get("guardianId"),
          recipientName: form.get("recipientName"),
          recipientEmail: form.get("recipientEmail"),
          recipientPhone: form.get("recipientPhone"),
          validityDays: form.get("validityDays"),
          requestedItems,
          sendEmail,
          sendPlayer,
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        link?: string;
        emailStatus?: "not_requested" | "sent" | "failed";
        playerStatus?: "not_requested" | "sent" | "not_linked";
      };
      if (!response.ok || !result.link) throw new Error(result.error || "Falha ao gerar o link.");

      setGeneratedLink(result.link);
      setSentLabels(requestedItems.map((item) => item.label));
      const statuses = [
        sendEmail ? (result.emailStatus === "sent" ? "E-mail enviado pelo Resend." : "O e-mail não foi enviado; use o link ou tente novamente após conferir o Resend.") : "",
        sendPlayer ? (result.playerStatus === "sent" ? "Aviso publicado na Comunicação do Player vinculado." : "Nenhum Player ativo e verificado foi encontrado para este e-mail.") : "",
      ].filter(Boolean);
      setChannelResults(statuses.join(" "));
      setMessage("Link seguro criado. Copie ou abra o WhatsApp agora; por segurança ele não será exibido novamente.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao gerar o link.");
    } finally {
      setSending(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(generatedLink);
    setMessage("Link copiado. Agora você pode enviá-lo à família.");
  }

  function sendWhatsApp() {
    if (!generatedLink) return;
    let phone = recipientPhone.replace(/\D/g, "");
    if (phone.length === 10 || phone.length === 11) phone = `55${phone}`;
    const list = sentLabels.map((item) => `- ${item}`).join("\n");
    const text = `Olá, ${recipientName}! O clube solicitou os seguintes documentos:\n${list}\n\nEnvie os arquivos pelo link seguro do 11UP:\n${generatedLink}\n\nNão compartilhe este link com terceiros.`;
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function revoke(requestId: string) {
    if (!window.confirm("Deseja cancelar este link? Ele deixará de funcionar imediatamente.")) return;
    setError("");
    const response = await fetch("/api/athlete-registration-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, athleteId }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error || "Não foi possível cancelar o link.");
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ marginTop: 18 }}>
      <details style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 15 }}>
        <summary style={{ cursor: "pointer", fontWeight: 800 }}>Solicitar documentos pendentes por link, e-mail ou Player</summary>
        <form onSubmit={createInvitation} className="form" style={{ width: "100%", maxWidth: "none", marginTop: 18 }}>
          <div className="form-grid-2">
            <label>
              Responsável cadastrado (opcional)
              <select
                name="guardianId"
                value={guardianId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  const guardian = guardians.find((item) => item.id === nextId);
                  setGuardianId(nextId);
                  if (guardian) {
                    setRecipientName(guardian.name);
                    setRecipientEmail(guardian.email || "");
                    setRecipientPhone(guardian.phone || "");
                  }
                }}
              >
                <option value="">Destinatário não cadastrado</option>
                {guardians.map((guardian) => <option key={guardian.id} value={guardian.id}>{guardian.name}</option>)}
              </select>
            </label>
            <label>Nome de quem receberá o link<input name="recipientName" required value={recipientName} onChange={(event) => setRecipientName(event.target.value)} /></label>
            <label>E-mail (opcional)<input type="email" name="recipientEmail" value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} /></label>
            <label>WhatsApp / telefone (opcional)<input name="recipientPhone" value={recipientPhone} onChange={(event) => setRecipientPhone(event.target.value)} /></label>
            <label>
              Validade do link
              <select name="validityDays" defaultValue="7">
                <option value="1">1 dia</option><option value="3">3 dias</option>
                <option value="7">7 dias</option><option value="15">15 dias</option>
                <option value="30">30 dias</option>
              </select>
            </label>
          </div>

          {requiredDocuments.length > 0 ? (
            <fieldset style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 15 }}>
              <legend style={{ fontWeight: 800 }}>Documentos obrigatórios da categoria</legend>
              <p className="muted" style={{ marginTop: 0 }}>Os documentos que faltam ou precisam ser substituídos já vêm selecionados. Arquivos aguardando aprovação não são solicitados novamente por padrão.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
                {requiredDocuments.map((item) => (
                  <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" style={{ width: "auto" }}
                      checked={selectedRequirements.includes(item.id)}
                      onChange={(event) => setSelectedRequirements((current) =>
                        event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))}
                    />
                    <span>{item.label}<small className="help" style={{ display: "block" }}>{item.status === "APPROVED" ? "Já regularizado" : item.status === "MISSING" ? "Faltando" : item.status === "EXPIRED" ? "Vencido" : "Pendente de revisão"}</small></span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          <fieldset style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 15 }}>
            <legend style={{ fontWeight: 800 }}>Documentos adicionais (opcional)</legend>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
              {presetItems.map(([value, label, , subject]) => (
                <label key={value} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <input type="checkbox" name="presetItems" value={value} style={{ width: "auto" }} />
                  <span>{label}<span className="help" style={{ display: "block" }}>{subject === "GUARDIAN" ? "Documento do responsável" : "Documento do atleta"}</span></span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 15 }}>
            <legend style={{ fontWeight: 800 }}>Outros documentos</legend>
            <p className="muted">Inclua qualquer documento que não esteja na lista padrão.</p>
            <div className="stack">
              {customItems.map((item, index) => (
                <div className="actions" key={index}>
                  <input
                    value={item.label}
                    required
                    placeholder="Nome do documento solicitado"
                    onChange={(event) => setCustomItems((items) => items.map((current, itemIndex) => itemIndex === index ? { ...current, label: event.target.value } : current))}
                    style={{ flex: 1 }}
                  />
                  <select value={item.subject} onChange={(event) => setCustomItems((items) => items.map((current, itemIndex) => itemIndex === index ? { ...current, subject: event.target.value as "ATHLETE" | "GUARDIAN" } : current))}>
                    <option value="ATHLETE">Do atleta</option>
                    <option value="GUARDIAN">Do responsável</option>
                  </select>
                  <button type="button" className="btn btn-secondary" onClick={() => setCustomItems((items) => items.filter((_, itemIndex) => itemIndex !== index))}>Remover</button>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => setCustomItems((items) => [...items, { label: "", subject: "ATHLETE" }])} style={{ marginTop: 12 }}>
              Adicionar outro documento
            </button>
          </fieldset>

          <fieldset style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 15 }}>
            <legend style={{ fontWeight: 800 }}>Como deseja notificar o responsável?</legend>
            <div style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" style={{ width: "auto" }} checked={sendEmail} onChange={(event) => setSendEmail(event.target.checked)} />
                Enviar e-mail ao responsável
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" style={{ width: "auto" }} checked={sendPlayer} onChange={(event) => setSendPlayer(event.target.checked)} />
                Publicar na Comunicação do Player vinculado (somente se o e-mail corresponder a um vínculo verificado)
              </label>
              <small className="muted">WhatsApp: o botão para abrir a mensagem pronta será disponibilizado após gerar o link. O envio é confirmado no WhatsApp.</small>
            </div>
          </fieldset>

          {message ? <p className="form-success">{message}</p> : null}
          {channelResults ? <p className="muted" role="status">{channelResults}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
          {generatedLink ? (
            <div className="actions">
              <input readOnly value={generatedLink} aria-label="Link gerado" style={{ flex: 1 }} />
              <button type="button" onClick={copyLink}>Copiar link</button>
              <button type="button" className="btn btn-secondary" onClick={sendWhatsApp}>Abrir WhatsApp com mensagem pronta</button>
            </div>
          ) : null}
          <button type="submit" disabled={sending}>{sending ? "Gerando..." : "Gerar link seguro"}</button>
        </form>
      </details>

      {invitations.length ? (
        <div className="table-wrap" style={{ marginTop: 18 }}>
          <table className="table">
            <thead><tr><th>Destinatário</th><th>Criado</th><th>Validade</th><th>Status</th><th>Ação</th></tr></thead>
            <tbody>
              {invitations.map((invitation) => {
                const expired = invitation.status === "PENDING" && new Date(invitation.expiresAt) < new Date();
                return (
                  <tr key={invitation.id}>
                    <td>{invitation.recipientName || "Família"}</td>
                    <td>{date(invitation.createdAt)}</td>
                    <td>{date(invitation.expiresAt)}</td>
                    <td><span className="badge">{expired ? "Vencido" : statusLabels[invitation.status] || invitation.status}</span></td>
                    <td>{invitation.status === "PENDING" && !expired ? <button type="button" className="btn btn-secondary" onClick={() => revoke(invitation.id)}>Revogar</button> : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <p className="muted" style={{ marginTop: 14 }}>Nenhum link criado.</p>}
    </div>
  );
}
