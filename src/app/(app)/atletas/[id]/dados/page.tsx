import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import SafeAvatar from "@/components/SafeAvatar";

import { requireClubPermission } from "@/lib/club-access";
import { getEffectiveClubRole } from "@/lib/club-permissions";
import { safeDecryptPrivateData } from "@/lib/private-data-crypto";
import { prisma } from "@/lib/prisma";

import AthleteDocumentUploadForm from "./AthleteDocumentUploadForm";
import AthleteDocumentInvitePanel from "./AthleteDocumentInvitePanel";
import AthleteDocumentManager from "./AthleteDocumentManager";

import {
  confirmAthleteDocumentation,
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
  MEDICAL_EXAM: "Outro exame médico",
  MEDICAL_CLEARANCE: "Atestado médico",
  ELECTROCARDIOGRAM: "Eletrocardiograma",
  ECHOCARDIOGRAM: "Ecocardiograma",
  AUTHORIZATION: "Autorização",
  SPORTS_REGISTRATION: "Registro esportivo",
  SCHOOL: "Outro documento escolar",
  SCHOOL_DECLARATION: "Declaração escolar",
  OTHER: "Outro",
} as const;

function formatFileSize(value: number | bigint) {
  const bytes = Number(value);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}


type AthletePrivateIcon =
  | "shield"
  | "guardian"
  | "document"
  | "approved"
  | "pending"
  | "expired"
  | "measurement"
  | "arrow";

function Icon({
  name,
  size = 20,
}: {
  name: AthletePrivateIcon;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "shield") {
    return (
      <svg {...common}>
        <path d="M12 3 4 7v5c0 4.5 3.1 7.7 8 9 4.9-1.3 8-4.5 8-9V7l-8-4Z" />
        <path d="M9 12h6M12 9v6" />
      </svg>
    );
  }

  if (name === "guardian") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20c.7-4 2.7-6 5.5-6s4.8 2 5.5 6" />
        <path d="M16 7a2.5 2.5 0 0 1 0 5" />
        <path d="M17 15c2 .5 3.2 2.1 3.7 5" />
      </svg>
    );
  }

  if (name === "document") {
    return (
      <svg {...common}>
        <path d="M6 3h8l4 4v14H6z" />
        <path d="M14 3v5h5M9 13h6M9 17h5" />
      </svg>
    );
  }

  if (name === "approved") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </svg>
    );
  }

  if (name === "pending") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (name === "expired") {
    return (
      <svg {...common}>
        <path d="M12 3 2.8 19h18.4L12 3Z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    );
  }

  if (name === "measurement") {
    return (
      <svg {...common}>
        <path d="M4 19V5M4 19h16" />
        <path d="M8 15h2M8 11h4M8 7h2M14 15h2M14 11h2M14 7h2" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M5 12h14" />
      <path d="m14 7 5 5-5 5" />
    </svg>
  );
}

export default async function AthletePrivateDataPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireClubPermission("ATHLETES_EDIT");
  const { id } = await params;

  // O suporte 11UP pode diagnosticar o sistema,
  // mas nunca acessa dados privados ou médicos do atleta.
  if (user.role === "SUPER_ADMIN") {
    redirect(`/atletas/${id}?support=private-data-restricted`);
  }

  const athlete = await prisma.athlete.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      category: true,
      memberships: {
        where: {
          status: "ACTIVE",
          categoryId: { not: null },
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          sport: true,
          categoryId: true,
          category: {
            select: {
              id: true,
              name: true,
              type: true,
              sport: true,
              documentRequirements: {
                where: { active: true },
                orderBy: [
                  { sortOrder: "asc" },
                  { label: "asc" },
                ],
                select: {
                  id: true,
                  key: true,
                  label: true,
                  documentCategory: true,
                  subject: true,
                  minCount: true,
                  required: true,
                  requiresApproval: true,
                  requiresExpiry: true,
                  instructions: true,
                  active: true,
                },
              },
            },
          },
        },
      },
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
          requirementId: true,
          requirementKeySnapshot: true,
          requirementLabelSnapshot: true,
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

  const internalDossiers = getEffectiveClubRole(user) === "MANAGER"
    ? await prisma.performanceReport.findMany({
        where: { organizationId: user.organizationId, athleteId: athlete.id,
          reportType: "CONSOLIDATED" },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, snapshot: true, createdAt: true },
      })
    : [];
  const privateData = athlete.privateData;
  const now = new Date();

  const activeDocumentRequirements = athlete.memberships
    .flatMap((membership) => membership.category?.documentRequirements ?? [])
    .filter((requirement, index, items) =>
      items.findIndex((item) => item.id === requirement.id) === index
    );

  const requiredDocumentRequirements = activeDocumentRequirements.filter(
    (requirement) => requirement.required
  );

  const activeDocuments = athlete.documents.filter(
    (document) => document.status !== "ARCHIVED"
  );

  const documentRequirementStates = requiredDocumentRequirements.map((requirement) => {
    const requirementDocuments = activeDocuments.filter(
      (document) => document.requirementId === requirement.id
    );

    const validDocuments = requirementDocuments.filter((document) => {
      const expired =
        document.status === "EXPIRED" ||
        Boolean(document.expiresAt && document.expiresAt < now) ||
        Boolean(requirement.requiresExpiry && !document.expiresAt);

      if (expired || document.status === "REJECTED") return false;

      if (requirement.requiresApproval) {
        return document.status === "APPROVED";
      }

      return true;
    });

    const fulfilled = validDocuments.length >= requirement.minCount;

    const hasExpired = requirementDocuments.some(
      (document) =>
        document.status === "EXPIRED" ||
        Boolean(document.expiresAt && document.expiresAt < now) ||
        Boolean(requirement.requiresExpiry && !document.expiresAt)
    );

    const hasPending = requirementDocuments.some(
      (document) =>
        document.status === "PENDING" || document.status === "REJECTED"
    );

    const status = fulfilled
      ? "APPROVED"
      : hasExpired
        ? "EXPIRED"
        : hasPending
          ? "PENDING"
          : "MISSING";

    return {
      ...requirement,
      status,
      fulfilled,
      deliveredCount: validDocuments.length,
      missingCount: Math.max(requirement.minCount - validDocuments.length, 0),
    };
  });

  const missingRequiredDocuments = documentRequirementStates.filter(
    (requirement) => requirement.status === "MISSING"
  ).length;

  const pendingRequiredDocuments = documentRequirementStates.filter(
    (requirement) => requirement.status === "PENDING"
  ).length;

  const expiredRequiredDocuments = documentRequirementStates.filter(
    (requirement) => requirement.status === "EXPIRED"
  ).length;

  const allRequiredDocumentsFulfilled =
    requiredDocumentRequirements.length > 0 &&
    documentRequirementStates.every((requirement) => requirement.fulfilled);

  const approvedDocuments = activeDocuments.filter(
    (document) => document.status === "APPROVED"
  ).length;

  const pendingDocuments = activeDocuments.filter(
    (document) => document.status === "PENDING"
  ).length;

  const rejectedDocuments = activeDocuments.filter(
    (document) => document.status === "REJECTED"
  ).length;

  const expiredDocuments = activeDocuments.filter(
    (document) =>
      document.status === "EXPIRED" ||
      Boolean(document.expiresAt && document.expiresAt < now)
  ).length;

  const hasPendingRequest = athlete.registrationRequests.some(
    (request) => request.status === "PENDING"
  );

  const documentationConfirmedAt = athlete.documentationConfirmedAt;

  const hasConfiguredDocumentRequirements =
    requiredDocumentRequirements.length > 0;

  const requiredDocumentRequirementIds = new Set(
    requiredDocumentRequirements.map(
      (requirement) => requirement.id
    )
  );

  const hasRelevantDocumentAfterConfirmation =
    documentationConfirmedAt
      ? activeDocuments.some(
          (document) =>
            Boolean(
              document.requirementId &&
                requiredDocumentRequirementIds.has(
                  document.requirementId
                )
            ) &&
            document.createdAt >
              documentationConfirmedAt
        )
      : false;

  const hasLegacyDocumentAfterConfirmation =
    documentationConfirmedAt
      ? activeDocuments.some(
          (document) =>
            document.createdAt >
              documentationConfirmedAt
        )
      : false;

  const hasDocumentsAfterConfirmation =
    hasConfiguredDocumentRequirements
      ? hasRelevantDocumentAfterConfirmation
      : hasLegacyDocumentAfterConfirmation;

  const legacyDocumentationReady =
    activeDocuments.length > 0 &&
    approvedDocuments === activeDocuments.length &&
    expiredDocuments === 0;

  const documentationRequirementsReady = hasConfiguredDocumentRequirements
    ? allRequiredDocumentsFulfilled
    : legacyDocumentationReady;

  const documentationInDay =
    Boolean(documentationConfirmedAt) &&
    documentationRequirementsReady &&
    !hasPendingRequest &&
    !hasDocumentsAfterConfirmation;

  const canConfirmDocumentation =
    documentationRequirementsReady &&
    !hasPendingRequest &&
    !documentationInDay;

  const documentStatusLabel = hasConfiguredDocumentRequirements
    ? expiredRequiredDocuments > 0
      ? "Documento obrigatório vencido"
      : pendingRequiredDocuments > 0
        ? "Documentação pendente"
        : missingRequiredDocuments > 0
          ? "Faltam documentos obrigatórios"
          : documentationInDay
            ? "Documentação em dia"
            : "Aguardando confirmação"
    : expiredDocuments > 0
      ? "Documento vencido"
      : pendingDocuments > 0 || rejectedDocuments > 0
        ? "Aguardando conferência"
        : hasPendingRequest
          ? "Documentos solicitados"
          : activeDocuments.length === 0
            ? "Faltam documentos"
            : documentationInDay
              ? "Documentação em dia"
              : "Aguardando confirmação";
  const documentStatusDescription = hasConfiguredDocumentRequirements
    ? expiredRequiredDocuments > 0
      ? `${expiredRequiredDocuments} requisito(s) obrigatório(s) com documento vencido ou sem validade informada.`
      : pendingRequiredDocuments > 0
        ? `${pendingRequiredDocuments} requisito(s) obrigatório(s) aguardando aprovação ou substituição.`
        : missingRequiredDocuments > 0
          ? `${missingRequiredDocuments} documento(s) obrigatório(s) ainda não foram entregues.`
          : documentationInDay
            ? "Todos os documentos obrigatórios foram revisados e estão regulares."
            : "Todos os documentos obrigatórios estão válidos. Confirme a conferência para marcar a documentação como em dia."
    : expiredDocuments > 0
      ? "Há documento com validade expirada. Atualize a documentação do atleta."
      : pendingDocuments > 0 || rejectedDocuments > 0
        ? "Existem documentos que ainda precisam de revisão ou substituição."
        : hasPendingRequest
          ? "A solicitação foi enviada. Aguardando o responsável concluir o envio."
          : activeDocuments.length === 0
            ? "Nenhum documento ativo foi cadastrado. Solicite os documentos ao responsável."
            : documentationInDay
              ? "A documentação foi revisada pelo gestor e está regular."
              : "Todos os documentos estão aprovados. Confirme a conferência para marcar a documentação como em dia.";
  return (
    <main className="athlete-documents-v4">
      <section className="athlete-documents-v4-hero">
        <div className="athlete-documents-v4-avatar">
          <SafeAvatar
            src={athlete.photoUrl}
            name={athlete.nickname || athlete.name}
            alt={athlete.name}
          />
        </div>

        <div className="athlete-documents-v4-hero-copy">
          <span className="athlete-documents-v4-eyebrow">
            FICHA PRIVADA DO ATLETA
          </span>

          <h1>{athlete.nickname || athlete.name}</h1>

          <p>
            {athlete.name}
            {" · "}
            {athlete.category?.name || "Sem categoria"}
            {" · "}
            {athlete.position || "Posição não informada"}
          </p>
        </div>

        <span
          className={`athlete-documents-v4-status ${
            athlete.active ? "active" : ""
          }`}
        >
          {athlete.active ? "Ativo" : "Inativo"}
        </span>
      </section>

      <nav
        className="athlete-documents-v4-tabs"
        aria-label="Navegação do atleta"
      >
        <Link href={`/atletas/${athlete.id}`}>
          Ficha
        </Link>

        <Link
          className="active"
          href={`/atletas/${athlete.id}/dados#documentos`}
        >
          Documentos
        </Link>

        <Link href={`/atletas/${athlete.id}/performance`}>
          Performance
        </Link>

        <Link
          className="athlete-documents-v4-back"
          href="/atletas"
        >
          ← Voltar aos atletas
        </Link>
      </nav>

      <section
        className="athlete-documents-v4-kpis"
        aria-label="Resumo da ficha privada"
      >
        <article>
          <span className="athlete-documents-v4-kpi-icon">
            <Icon name="guardian" />
          </span>
          <div>
            <small>RESPONSÁVEIS</small>
            <strong>{athlete.guardians.length}</strong>
            <span>vínculo(s) familiar(es)</span>
          </div>
        </article>

        <article>
          <span className="athlete-documents-v4-kpi-icon">
            <Icon name="document" />
          </span>
          <div>
            <small>DOCUMENTOS</small>
            <strong>{athlete.documents.length}</strong>
            <span>arquivo(s) cadastrado(s)</span>
          </div>
        </article>

        <article>
          <span className="athlete-documents-v4-kpi-icon approved">
            <Icon name="approved" />
          </span>
          <div>
            <small>APROVADOS</small>
            <strong>{approvedDocuments}</strong>
            <span>documento(s) regular(es)</span>
          </div>
        </article>

        <article>
          <span className="athlete-documents-v4-kpi-icon pending">
            <Icon name="pending" />
          </span>
          <div>
            <small>PENDENTES</small>
            <strong>{pendingDocuments}</strong>
            <span>aguardando conferência</span>
          </div>
        </article>

        <article>
          <span className="athlete-documents-v4-kpi-icon expired">
            <Icon name="expired" />
          </span>
          <div>
            <small>VENCIDOS</small>
            <strong>{expiredDocuments}</strong>
            <span>precisam de atualização</span>
          </div>
        </article>

        <article>
          <span className="athlete-documents-v4-kpi-icon measurement">
            <Icon name="measurement" />
          </span>
          <div>
            <small>MEDIÇÕES</small>
            <strong>{athlete.bodyMeasurements.length}</strong>
            <span>registro(s) corporal(is)</span>
          </div>
        </article>
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

      {getEffectiveClubRole(user) === "MANAGER" ? (
        <section className="card" style={{ marginTop: 18 }}>
          <span className="page-eyebrow">PRONTUÁRIOS ARQUIVADOS</span>
          <h2>Histórico do prontuário esportivo</h2>
          <p className="muted">As versões geradas ficam disponíveis para consulta e nova impressão. Os anexos originais continuam na central privada abaixo.</p>
          {internalDossiers.length ? <div className="table-wrap" style={{ marginTop: 16 }}>
            <table className="table"><thead><tr><th>Data</th><th>Versão</th><th>Prontuário</th><th>Acesso</th></tr></thead><tbody>
            {internalDossiers.map((item) => {
              const kind = item.snapshot && typeof item.snapshot === "object" && !Array.isArray(item.snapshot) && "documentKind" in item.snapshot
                ? item.snapshot.documentKind : null;
              return <tr key={item.id}><td>{dateLabel(item.createdAt)}</td>
                <td>{kind === "INTERNAL_DOSSIER" ? "Interno" : "Compartilhável"}</td>
                <td>{item.title}</td>
                <td><Link href={`/performance-report/${item.id}`} target="_blank" rel="noopener noreferrer">Abrir prontuário ↗</Link></td>
              </tr>;
            })}
            </tbody></table>
          </div> : <p className="muted">Nenhum prontuário gerado ainda.</p>}
          <Link className="btn btn-secondary" href={`/atletas/${athlete.id}/performance/relatorios`} style={{ marginTop: 12 }}>Gerar prontuário</Link>
        </section>
      ) : null}

      <section
        id="documentos"
        className="card"
        style={{ marginTop: 18, scrollMarginTop: 100 }}
      >
        <span className="page-eyebrow">DOCUMENTOS E EXAMES</span>
        <h2>Central de arquivos privados</h2>
        <p className="muted">
          Anexe documentos pessoais, autorizações, exames, laudos e atestados.
          Os arquivos ficam no armazenamento privado e restritos à equipe autorizada.
        </p>
        <div
          style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 14,
            border: documentationInDay
              ? "1px solid rgba(34, 197, 94, 0.35)"
              : expiredDocuments > 0
                ? "1px solid rgba(239, 68, 68, 0.35)"
                : "1px solid rgba(245, 158, 11, 0.35)",
            background: documentationInDay
              ? "rgba(34, 197, 94, 0.08)"
              : expiredDocuments > 0
                ? "rgba(239, 68, 68, 0.08)"
                : "rgba(245, 158, 11, 0.08)",
          }}
        >
          <strong style={{ display: "block", marginBottom: 6 }}>
            {documentationInDay
              ? "✓ "
              : expiredDocuments > 0
                ? "⚠ "
                : "● "}
            {documentStatusLabel}
          </strong>

          <p className="muted" style={{ margin: 0 }}>
            {documentStatusDescription}
          </p>

          {canConfirmDocumentation ? (
            <form
              action={confirmAthleteDocumentation}
              style={{ marginTop: 14 }}
            >
              <input type="hidden" name="athleteId" value={athlete.id} />
              <button type="submit">
                Confirmar documentação em dia
              </button>
            </form>
          ) : null}
        </div>
        <div className="actions" style={{ marginTop: 14 }}>
          <span className="badge">{athlete.documents.length} arquivo(s)</span>
          <span className="badge">{pendingDocuments} pendente(s)</span>
          <span className="badge">{expiredDocuments} vencido(s)</span>
        </div>

        {hasConfiguredDocumentRequirements ? (
          <div
            className="card"
            style={{ marginTop: 18, padding: 18 }}
          >
            <span className="page-eyebrow">DOCUMENTOS OBRIGATÓRIOS</span>
            <h3 style={{ margin: "6px 0 14px" }}>
              Checklist da categoria
            </h3>

            <div style={{ display: "grid", gap: 10 }}>
              {documentRequirementStates.map((requirement) => {
                const statusLabel =
                  requirement.status === "APPROVED"
                    ? requirement.requiresApproval
                      ? "Aprovado"
                      : "Entregue"
                    : requirement.status === "EXPIRED"
                      ? "Vencido"
                      : requirement.status === "PENDING"
                        ? "Pendente"
                        : "Faltando";

                return (
                  <div
                    key={requirement.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "12px 14px",
                      border: "1px solid #e2e8eb",
                      borderRadius: 12,
                      background: "#fff",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ display: "block" }}>
                        {requirement.label}
                      </strong>

                      <small className="muted">
                        {requirement.subject === "GUARDIAN"
                          ? "Responsável"
                          : "Atleta"}
                        {requirement.minCount > 1
                          ? ` · ${requirement.minCount} arquivos necessários`
                          : ""}
                      </small>

                      {requirement.instructions ? (
                        <p
                          className="muted"
                          style={{ margin: "5px 0 0" }}
                        >
                          {requirement.instructions}
                        </p>
                      ) : null}
                    </div>

                    <span
                      className="badge"
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {statusLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

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
          documentRequirements={documentRequirementStates.map((requirement) => ({
            id: requirement.id,
            label: requirement.label,
            documentCategory: requirement.documentCategory,
            subject: requirement.subject,
            requiresExpiry: requirement.requiresExpiry,
            instructions: requirement.instructions,
            status: requirement.status,
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
            subject: document.guardian ? "GUARDIAN" : "ATHLETE",
            requirementId: document.requirementId,
            requirementLabelSnapshot: document.requirementLabelSnapshot,
            status: document.status,
            sizeLabel: formatFileSize(document.sizeBytes),
            createdAtLabel: dateLabel(document.createdAt),
            issuedAt: dateInput(document.issuedAt),
            expiresAt: dateInput(document.expiresAt),
            rejectionReason: document.rejectionReason,
          }))}
          documentRequirements={documentRequirementStates.map((requirement) => ({
            id: requirement.id,
            label: requirement.label,
            subject: requirement.subject,
            status: requirement.status,
          }))}
        />
      </section>

      <style>{`
        .athlete-documents-v4 {
          --athlete-private-ink: #07131d;
          --athlete-private-muted: #70808b;
          --athlete-private-line: #dfe6ea;
          --athlete-private-lime: #99e600;
          --athlete-private-lime-soft: #eff9d8;
          display: grid;
          gap: 18px;
          padding: 28px 34px 44px;
          background:
            radial-gradient(circle at 92% 2%, rgba(153, 230, 0, .075), transparent 25rem),
            #f4f7f8;
        }

        .athlete-documents-v4 * {
          box-sizing: border-box;
        }

        .athlete-documents-v4-hero {
          min-height: 194px;
          display: flex;
          align-items: center;
          gap: 22px;
          position: relative;
          overflow: hidden;
          padding: 28px 34px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 26px;
          color: #fff;
          background:
            linear-gradient(
              104deg,
              rgba(5, 20, 31, .99) 0%,
              rgba(6, 29, 37, .98) 58%,
              rgba(20, 76, 30, .97) 100%
            );
          box-shadow: 0 20px 45px rgba(7,19,29,.12);
        }

        .athlete-documents-v4-hero::after {
          content: "";
          width: 360px;
          height: 360px;
          position: absolute;
          right: -105px;
          top: -175px;
          border: 1px solid rgba(153,230,0,.18);
          border-radius: 999px;
          box-shadow:
            0 0 0 42px rgba(153,230,0,.025),
            0 0 0 84px rgba(153,230,0,.018);
          pointer-events: none;
        }

        .athlete-documents-v4-avatar,
        .athlete-documents-v4-hero-copy,
        .athlete-documents-v4-status {
          position: relative;
          z-index: 1;
        }

        .athlete-documents-v4-avatar {
          width: 94px;
          height: 94px;
          flex: 0 0 94px;
          overflow: hidden;
          border: 3px solid var(--athlete-private-lime);
          border-radius: 22px;
          background: #fff;
          box-shadow: 0 12px 26px rgba(0,0,0,.18);
        }

        .athlete-documents-v4-avatar img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .athlete-documents-v4-eyebrow {
          display: block;
          margin-bottom: 6px;
          color: var(--athlete-private-lime);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .16em;
        }

        .athlete-documents-v4-hero h1 {
          margin: 0;
          color: #fff !important;
          font-size: clamp(34px, 4vw, 54px);
          line-height: 1;
          letter-spacing: -.045em;
        }

        .athlete-documents-v4-hero p {
          margin: 8px 0 0;
          color: rgba(255,255,255,.78);
          font-size: 14px;
          font-weight: 700;
        }

        .athlete-documents-v4-status {
          margin-left: auto;
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          padding: 0 14px;
          border-radius: 999px;
          color: #66747d;
          background: #edf1f3;
          font-size: 10px;
          font-weight: 900;
        }

        .athlete-documents-v4-status.active {
          color: #10200a;
          background: var(--athlete-private-lime);
        }

        .athlete-documents-v4-tabs {
          min-height: 64px;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px;
          border: 1px solid var(--athlete-private-line);
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 8px 28px rgba(8,26,38,.035);
        }

        .athlete-documents-v4-tabs > a {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 18px;
          border-radius: 11px;
          color: #5e6f7a;
          font-size: 12px;
          font-weight: 900;
          text-decoration: none;
        }

        .athlete-documents-v4-tabs > a:hover {
          color: var(--athlete-private-ink);
          background: #f4f7f8;
        }

        .athlete-documents-v4-tabs > a.active {
          color: #0b1806;
          background: var(--athlete-private-lime);
          box-shadow: 0 7px 18px rgba(153,230,0,.16);
        }

        .athlete-documents-v4-tabs > .athlete-documents-v4-back {
          margin-left: auto;
          border: 1px solid #dfe6ea;
          color: #5f6f7a;
          background: #fafbfb;
        }

        .athlete-documents-v4-kpis {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 12px;
        }

        .athlete-documents-v4-kpis article {
          min-height: 118px;
          display: flex;
          align-items: flex-start;
          gap: 11px;
          padding: 17px;
          border: 1px solid var(--athlete-private-line);
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 10px 30px rgba(8,26,38,.04);
        }

        .athlete-documents-v4-kpi-icon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          flex: 0 0 38px;
          border-radius: 11px;
          color: #719f00;
          background: var(--athlete-private-lime-soft);
        }

        .athlete-documents-v4-kpi-icon.approved {
          color: #4e8c32;
          background: #e8f7e2;
        }

        .athlete-documents-v4-kpi-icon.pending {
          color: #b77700;
          background: #fff3d2;
        }

        .athlete-documents-v4-kpi-icon.expired {
          color: #c74747;
          background: #fde8e8;
        }

        .athlete-documents-v4-kpi-icon.measurement {
          color: #287eae;
          background: #e8f5fc;
        }

        .athlete-documents-v4-kpis article > div {
          min-width: 0;
          display: grid;
        }

        .athlete-documents-v4-kpis small {
          color: #74838d;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .1em;
        }

        .athlete-documents-v4-kpis strong {
          margin-top: 2px;
          color: var(--athlete-private-ink);
          font-size: 27px;
          line-height: 1.05;
          letter-spacing: -.04em;
        }

        .athlete-documents-v4-kpis article div > span {
          margin-top: 3px;
          color: var(--athlete-private-muted);
          font-size: 10px;
          font-weight: 700;
        }

        .athlete-documents-v4 > section.card {
          margin: 0 !important;
          padding: 24px;
          border: 1px solid var(--athlete-private-line);
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 10px 30px rgba(8,26,38,.04);
        }

        .athlete-documents-v4 > section.card > .page-eyebrow {
          color: #719f00;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .14em;
        }

        .athlete-documents-v4 > section.card > h2 {
          margin-top: 5px;
          color: var(--athlete-private-ink);
          font-size: 23px;
          letter-spacing: -.03em;
        }

        .athlete-documents-v4 .muted {
          color: var(--athlete-private-muted);
          font-size: 12px;
        }

        .athlete-documents-v4 .form {
          gap: 16px;
        }

        .athlete-documents-v4 .form-grid-2 {
          gap: 16px;
        }

        .athlete-documents-v4 .form label {
          color: #394a56;
          font-size: 11px;
          font-weight: 900;
        }

        .athlete-documents-v4 .form input,
        .athlete-documents-v4 .form select,
        .athlete-documents-v4 .form textarea {
          min-height: 46px;
          border: 1px solid #d9e2e7;
          border-radius: 12px;
          color: #101820;
          background: #fff;
          font-size: 13px;
        }

        .athlete-documents-v4 .form textarea {
          min-height: 96px;
          padding-top: 12px;
        }

        .athlete-documents-v4 .form input:focus,
        .athlete-documents-v4 .form select:focus,
        .athlete-documents-v4 .form textarea:focus {
          border-color: #94d700;
          box-shadow: 0 0 0 3px rgba(153,230,0,.12);
          outline: none;
        }

        .athlete-documents-v4 .form button:not(.btn-secondary),
        .athlete-documents-v4 > section.card form > button:not(.btn-secondary) {
          min-height: 44px;
          border: 0;
          border-radius: 11px;
          color: #0a1705;
          background: var(--athlete-private-lime);
          font-weight: 900;
        }

        .athlete-documents-v4 .form-divider {
          margin-top: 6px;
          padding-top: 18px;
          border-top: 1px solid #e8edef;
        }

        .athlete-documents-v4 .form-divider span {
          color: #719f00;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .14em;
        }

        .athlete-documents-v4 details {
          border-color: #dfe6ea !important;
          border-radius: 14px !important;
          background: #fbfcfc;
        }

        .athlete-documents-v4 details > summary {
          color: var(--athlete-private-ink);
          font-size: 12px;
        }

        .athlete-documents-v4 .table-wrap {
          border: 1px solid #e2e8eb;
          border-radius: 14px;
          overflow-x: auto;
        }

        .athlete-documents-v4 .table {
          margin: 0;
        }

        .athlete-documents-v4 .table th {
          color: #6e7e89;
          background: #f7f9fa;
          font-size: 9px;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .athlete-documents-v4 .table td {
          font-size: 11px;
        }

        #documentos {
          scroll-margin-top: 90px !important;
        }

        @media (max-width: 1240px) {
          .athlete-documents-v4 {
            padding: 24px;
          }

          .athlete-documents-v4-kpis {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 820px) {
          .athlete-documents-v4-hero {
            min-height: auto;
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .athlete-documents-v4-status {
            margin-left: 0;
          }

          .athlete-documents-v4-tabs {
            overflow-x: auto;
            white-space: nowrap;
          }

          .athlete-documents-v4-tabs > a {
            flex: 0 0 auto;
          }

          .athlete-documents-v4-tabs > .athlete-documents-v4-back {
            margin-left: 0;
          }

          .athlete-documents-v4-kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .athlete-documents-v4 {
            gap: 14px;
            padding: 16px 12px 32px;
          }

          .athlete-documents-v4-hero {
            padding: 22px 18px;
            border-radius: 20px;
          }

          .athlete-documents-v4-avatar {
            width: 72px;
            height: 72px;
            flex-basis: 72px;
            border-radius: 18px;
          }

          .athlete-documents-v4-hero h1 {
            font-size: 32px;
          }

          .athlete-documents-v4 > section.card {
            padding: 18px;
          }
        }

        @media (max-width: 520px) {
          .athlete-documents-v4-hero {
            display: grid;
            grid-template-columns: 72px 1fr;
          }

          .athlete-documents-v4-status {
            grid-column: 1 / -1;
            width: max-content;
          }

          .athlete-documents-v4-kpis {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
