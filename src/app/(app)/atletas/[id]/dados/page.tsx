import Link from "next/link";
import { notFound } from "next/navigation";

import { requireClubPermission } from "@/lib/club-access";
import { safeDecryptPrivateData } from "@/lib/private-data-crypto";
import { prisma } from "@/lib/prisma";

import AthleteDocumentUploadForm from "./AthleteDocumentUploadForm";
import AthleteDocumentInvitePanel from "./AthleteDocumentInvitePanel";
import AthleteDocumentManager from "./AthleteDocumentManager";

import {
  createBodyMeasurement,
  deleteAthleteGuardian,
  deleteBodyMeasurement,
  saveAthleteGuardian,
  saveAthletePrivateData,
} from "./actions";

function dateInput(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function dateLabel(value: Date) {
  return value.toLocaleDateString("pt-BR");
}

function decimal(value: { toString(): string } | null | undefined) {
  return value?.toString() || "";
}

const relationLabels = {
  FATHER: "Pai",
  MOTHER: "Mãe",
  LEGAL_GUARDIAN: "Responsável legal",
  OTHER: "Outro",
} as const;

const documentCategoryLabels = {
  IDENTITY: "Identificação",
  MEDICAL_EXAM: "Exame médico",
  MEDICAL_CLEARANCE: "Atestado médico",
  AUTHORIZATION: "Autorização",
  SPORTS_REGISTRATION: "Registro esportivo",
  SCHOOL: "Documento escolar",
  OTHER: "Outro",
} as const;

function formatFileSize(value: number | bigint) {
  const bytes = Number(value);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function AthletePrivateDataPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireClubPermission("ATHLETES_EDIT");
  const { id } = await params;

  const athlete = await prisma.athlete.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      category: true,
      privateData: true,
      guardians: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
      bodyMeasurements: { orderBy: { measuredAt: "desc" } },
      registrationRequests: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          recipientName: true,
          status: true,
          expiresAt: true,
          createdAt: true,
        },
      },
      documents: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          category: true,
          status: true,
          title: true,
          originalFileName: true,
          mimeType: true,
          sizeBytes: true,
          issuedAt: true,
          expiresAt: true,
          rejectionReason: true,
          createdAt: true,
          guardian: { select: { name: true } },
        },
      },
    },
  });

  if (!athlete) notFound();

  const privateData = athlete.privateData;
  const approvedDocuments = athlete.documents.filter(
    (document) => document.status === "APPROVED"
  ).length;
  const pendingDocuments = athlete.documents.filter(
    (document) => document.status === "PENDING"
  ).length;
  const expiredDocuments = athlete.documents.filter(
    (document) =>
      document.status === "EXPIRED" ||
      (document.expiresAt && document.expiresAt < new Date())
  ).length;

  return (
    <>
      <div className="page-head">
        <div>
          <span className="page-eyebrow">FICHA PRIVADA DO ATLETA</span>
          <h1>{athlete.name}</h1>
          <p className="muted">
            {athlete.category?.name || "Sem categoria"} • Dados protegidos e
            restritos à gestão autorizada.
          </p>
        </div>
        <div className="actions">
          <Link className="btn btn-secondary" href={`/atletas/${athlete.id}`}>
            Voltar ao atleta
          </Link>
          <Link className="btn" href={`/atletas/${athlete.id}/performance`}>
            Performance
          </Link>
        </div>
      </div>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 14,
          marginBottom: 18,
        }}
      >
        {[
          ["Responsáveis", athlete.guardians.length],
          ["Documentos", athlete.documents.length],
          ["Aprovados", approvedDocuments],
          ["Pendentes", pendingDocuments],
          ["Vencidos", expiredDocuments],
          ["Medições", athlete.bodyMeasurements.length],
        ].map(([label, value]) => (
          <article className="card" key={label} style={{ padding: 17 }}>
            <span className="help" style={{ display: "block" }}>{label}</span>
            <strong style={{ display: "block", fontSize: 24, marginTop: 5 }}>
              {value}
            </strong>
          </article>
        ))}
      </section>

      <section className="card">
        <span className="page-eyebrow">DADOS PESSOAIS</span>
        <h2>Identificação do atleta</h2>
        <p className="muted">
          CPF, RG e informações médicas são armazenados de forma criptografada.
        </p>

        <form
          action={saveAthletePrivateData}
          className="form"
          style={{ width: "100%", maxWidth: "none", marginTop: 18 }}
        >
          <input type="hidden" name="athleteId" value={athlete.id} />

          <div className="form-grid-2">
            <label>
              Data de nascimento
              <input type="date" name="birthDate" defaultValue={dateInput(privateData?.birthDate)} />
            </label>
            <label>
              Nacionalidade
              <input name="nationality" defaultValue={privateData?.nationality || ""} />
            </label>
            <label>
              Naturalidade
              <input name="naturality" defaultValue={privateData?.naturality || ""} />
            </label>
            <label>
              E-mail do atleta
              <input type="email" name="email" defaultValue={privateData?.email || ""} />
            </label>
            <label>
              CPF
              <input name="cpf" defaultValue={safeDecryptPrivateData(privateData?.cpfEncrypted) || ""} autoComplete="off" />
            </label>
            <label>
              RG / documento de identificação
              <input name="rg" defaultValue={safeDecryptPrivateData(privateData?.rgEncrypted) || ""} autoComplete="off" />
            </label>
            <label>
              Órgão emissor
              <input name="rgIssuer" defaultValue={safeDecryptPrivateData(privateData?.rgIssuerEncrypted) || ""} />
            </label>
            <label>
              Instagram
              <input name="instagram" defaultValue={privateData?.instagram || ""} />
            </label>
          </div>

          <div className="form-divider"><span>SAÚDE E EMERGÊNCIA</span></div>

          <div className="form-grid-2">
            <label>
              Tipo sanguíneo
              <input name="bloodType" placeholder="Ex.: O+" defaultValue={safeDecryptPrivateData(privateData?.bloodTypeEncrypted) || ""} />
            </label>
            <label>
              Plano de saúde
              <input name="healthPlan" defaultValue={safeDecryptPrivateData(privateData?.healthPlanEncrypted) || ""} />
            </label>
            <label>
              Número da carteirinha
              <input name="healthPlanNumber" defaultValue={safeDecryptPrivateData(privateData?.healthPlanNumberEncrypted) || ""} />
            </label>
            <label>
              Contato de emergência
              <input name="emergencyContactName" defaultValue={safeDecryptPrivateData(privateData?.emergencyContactNameEncrypted) || ""} />
            </label>
            <label>
              Telefone de emergência
              <input name="emergencyContactPhone" defaultValue={safeDecryptPrivateData(privateData?.emergencyContactPhoneEncrypted) || ""} />
            </label>
            <label>
              Relação com o atleta
              <input name="emergencyContactRelation" placeholder="Ex.: Mãe, pai, avó" defaultValue={safeDecryptPrivateData(privateData?.emergencyContactRelationEncrypted) || ""} />
            </label>
          </div>

          <label>
            Alergias
            <textarea name="allergies" rows={3} defaultValue={safeDecryptPrivateData(privateData?.allergiesEncrypted) || ""} />
          </label>
          <label>
            Medicamentos em uso
            <textarea name="medications" rows={3} defaultValue={safeDecryptPrivateData(privateData?.medicationsEncrypted) || ""} />
          </label>
          <label>
            Condições de saúde
            <textarea name="healthConditions" rows={3} defaultValue={safeDecryptPrivateData(privateData?.healthConditionsEncrypted) || ""} />
          </label>
          <label>
            Restrições e recomendações médicas
            <textarea name="medicalRestrictions" rows={3} defaultValue={safeDecryptPrivateData(privateData?.medicalRestrictionsEncrypted) || ""} />
          </label>
          <label>
            Observações médicas adicionais
            <textarea name="medicalNotes" rows={4} defaultValue={safeDecryptPrivateData(privateData?.medicalNotesEncrypted) || ""} />
          </label>

          <button type="submit">Salvar dados privados e médicos</button>
        </form>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <span className="page-eyebrow">RESPONSÁVEIS</span>
        <h2>Família e responsáveis legais</h2>

        <div className="stack" style={{ marginTop: 16 }}>
          {athlete.guardians.map((guardian) => (
            <details key={guardian.id} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 15 }}>
              <summary style={{ cursor: "pointer", fontWeight: 800 }}>
                {guardian.name} • {relationLabels[guardian.relation]}
                {guardian.isPrimary ? " • Principal" : ""}
              </summary>
              <form action={saveAthleteGuardian} className="form" style={{ width: "100%", maxWidth: "none", marginTop: 18 }}>
                <input type="hidden" name="athleteId" value={athlete.id} />
                <input type="hidden" name="guardianId" value={guardian.id} />
                <div className="form-grid-2">
                  <label>Nome completo<input name="name" required defaultValue={guardian.name} /></label>
                  <label>Relação<select name="relation" defaultValue={guardian.relation}><option value="MOTHER">Mãe</option><option value="FATHER">Pai</option><option value="LEGAL_GUARDIAN">Responsável legal</option><option value="OTHER">Outro</option></select></label>
                  <label>CPF<input name="cpf" defaultValue={safeDecryptPrivateData(guardian.cpfEncrypted) || ""} /></label>
                  <label>RG<input name="rg" defaultValue={safeDecryptPrivateData(guardian.rgEncrypted) || ""} /></label>
                  <label>Órgão emissor<input name="rgIssuer" defaultValue={safeDecryptPrivateData(guardian.rgIssuerEncrypted) || ""} /></label>
                  <label>Telefone<input name="phone" defaultValue={guardian.phone || ""} /></label>
                  <label>E-mail<input type="email" name="email" defaultValue={guardian.email || ""} /></label>
                  <label>Profissão<input name="profession" defaultValue={guardian.profession || ""} /></label>
                  <label>Nacionalidade<input name="nationality" defaultValue={guardian.nationality || ""} /></label>
                  <label>Naturalidade<input name="naturality" defaultValue={guardian.naturality || ""} /></label>
                  <label>Estado civil<input name="maritalStatus" defaultValue={guardian.maritalStatus || ""} /></label>
                  <label>CEP<input name="postalCode" defaultValue={guardian.postalCode || ""} /></label>
                  <label>Endereço<input name="address" defaultValue={guardian.address || ""} /></label>
                  <label>Bairro<input name="neighborhood" defaultValue={guardian.neighborhood || ""} /></label>
                  <label>Cidade<input name="city" defaultValue={guardian.city || ""} /></label>
                  <label>Instagram<input name="instagram" defaultValue={guardian.instagram || ""} /></label>
                  <label>Responsável principal<select name="isPrimary" defaultValue={String(guardian.isPrimary)}><option value="false">Não</option><option value="true">Sim</option></select></label>
                  <label>Autorizado a buscar o atleta<select name="authorizedForPickup" defaultValue={String(guardian.authorizedForPickup)}><option value="false">Não</option><option value="true">Sim</option></select></label>
                </div>
                <button type="submit">Salvar responsável</button>
              </form>
              <form action={deleteAthleteGuardian} style={{ marginTop: 10 }}>
                <input type="hidden" name="athleteId" value={athlete.id} />
                <input type="hidden" name="guardianId" value={guardian.id} />
                <button className="btn btn-secondary" type="submit">Excluir responsável</button>
              </form>
            </details>
          ))}
        </div>

        <details style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 15, marginTop: 16 }}>
          <summary style={{ cursor: "pointer", fontWeight: 800 }}>Adicionar responsável</summary>
          <form action={saveAthleteGuardian} className="form" style={{ width: "100%", maxWidth: "none", marginTop: 18 }}>
            <input type="hidden" name="athleteId" value={athlete.id} />
            <div className="form-grid-2">
              <label>Nome completo<input name="name" required /></label>
              <label>Relação<select name="relation" defaultValue="MOTHER"><option value="MOTHER">Mãe</option><option value="FATHER">Pai</option><option value="LEGAL_GUARDIAN">Responsável legal</option><option value="OTHER">Outro</option></select></label>
              <label>CPF<input name="cpf" /></label><label>RG<input name="rg" /></label>
              <label>Órgão emissor<input name="rgIssuer" /></label><label>Telefone<input name="phone" /></label>
              <label>E-mail<input type="email" name="email" /></label><label>Profissão<input name="profession" /></label>
              <label>Nacionalidade<input name="nationality" /></label><label>Naturalidade<input name="naturality" /></label>
              <label>Estado civil<input name="maritalStatus" /></label><label>CEP<input name="postalCode" /></label>
              <label>Endereço<input name="address" /></label><label>Bairro<input name="neighborhood" /></label>
              <label>Cidade<input name="city" /></label><label>Instagram<input name="instagram" /></label>
              <label>Responsável principal<select name="isPrimary" defaultValue="false"><option value="false">Não</option><option value="true">Sim</option></select></label>
              <label>Autorizado a buscar o atleta<select name="authorizedForPickup" defaultValue="false"><option value="false">Não</option><option value="true">Sim</option></select></label>
            </div>
            <button type="submit">Cadastrar responsável</button>
          </form>
        </details>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <span className="page-eyebrow">MEDIÇÕES FÍSICAS</span>
        <h2>Histórico corporal</h2>
        <form action={createBodyMeasurement} className="form" style={{ width: "100%", maxWidth: "none", marginTop: 18 }}>
          <input type="hidden" name="athleteId" value={athlete.id} />
          <div className="form-grid-2">
            <label>Data da medição<input type="date" name="measuredAt" defaultValue={dateInput(new Date())} /></label>
            <label>Altura (cm)<input type="number" min="0" step="0.01" name="heightCm" /></label>
            <label>Peso (kg)<input type="number" min="0" step="0.01" name="weightKg" /></label>
            <label>Envergadura (cm)<input type="number" min="0" step="0.01" name="wingspanCm" /></label>
            <label>Gordura corporal (%)<input type="number" min="0" step="0.01" name="bodyFatPercent" /></label>
            <label>Massa muscular (kg)<input type="number" min="0" step="0.01" name="muscleMassKg" /></label>
          </div>
          <label>Observações<textarea name="notes" rows={3} /></label>
          <button type="submit">Registrar medição e calcular IMC</button>
        </form>

        {athlete.bodyMeasurements.length ? (
          <div className="table-wrap" style={{ marginTop: 20 }}>
            <table className="table">
              <thead><tr><th>Data</th><th>Altura</th><th>Peso</th><th>IMC</th><th>Envergadura</th><th>Gordura</th><th>Massa muscular</th><th>Ação</th></tr></thead>
              <tbody>
                {athlete.bodyMeasurements.map((item) => (
                  <tr key={item.id}>
                    <td>{dateLabel(item.measuredAt)}</td>
                    <td>{decimal(item.heightCm) || "—"} {item.heightCm ? "cm" : ""}</td>
                    <td>{decimal(item.weightKg) || "—"} {item.weightKg ? "kg" : ""}</td>
                    <td><strong>{decimal(item.bmi) || "—"}</strong></td>
                    <td>{decimal(item.wingspanCm) || "—"}</td>
                    <td>{decimal(item.bodyFatPercent) || "—"}{item.bodyFatPercent ? "%" : ""}</td>
                    <td>{decimal(item.muscleMassKg) || "—"}</td>
                    <td><form action={deleteBodyMeasurement}><input type="hidden" name="athleteId" value={athlete.id} /><input type="hidden" name="measurementId" value={item.id} /><button className="btn btn-secondary" type="submit">Excluir</button></form></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="muted" style={{ marginTop: 18 }}>Nenhuma medição registrada.</p>}
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <span className="page-eyebrow">DOCUMENTOS E EXAMES</span>
        <h2>Central de arquivos privados</h2>
        <p className="muted">
          Anexe documentos pessoais, autorizações, exames, laudos e atestados.
          Os arquivos ficam no armazenamento privado e restritos à equipe autorizada.
        </p>
        <div className="actions" style={{ marginTop: 14 }}>
          <span className="badge">{athlete.documents.length} arquivo(s)</span>
          <span className="badge">{pendingDocuments} pendente(s)</span>
          <span className="badge">{expiredDocuments} vencido(s)</span>
        </div>

        <AthleteDocumentInvitePanel
          athleteId={athlete.id}
          guardians={athlete.guardians.map((guardian) => ({
            id: guardian.id,
            name: guardian.name,
            email: guardian.email,
            phone: guardian.phone,
          }))}
          invitations={athlete.registrationRequests.map((invitation) => ({
            ...invitation,
            expiresAt: invitation.expiresAt.toISOString(),
            createdAt: invitation.createdAt.toISOString(),
          }))}
        />

        <AthleteDocumentUploadForm
          athleteId={athlete.id}
          athleteName={athlete.name}
          guardians={athlete.guardians.map((guardian) => ({
            id: guardian.id,
            name: guardian.name,
          }))}
        />

        <AthleteDocumentManager
          documents={athlete.documents.map((document) => ({
            id: document.id,
            title: document.title,
            originalFileName: document.originalFileName,
            categoryLabel: documentCategoryLabels[document.category],
            subjectLabel: document.guardian?.name
              ? `Responsável: ${document.guardian.name}`
              : `Atleta: ${athlete.name}`,
            status: document.status,
            sizeLabel: formatFileSize(document.sizeBytes),
            createdAtLabel: dateLabel(document.createdAt),
            issuedAt: dateInput(document.issuedAt),
            expiresAt: dateInput(document.expiresAt),
            rejectionReason: document.rejectionReason,
          }))}
        />
      </section>
    </>
  );
}
