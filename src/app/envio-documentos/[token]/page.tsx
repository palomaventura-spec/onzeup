import crypto from "node:crypto";

import { safeDecryptPrivateData } from "@/lib/private-data-crypto";
import { prisma } from "@/lib/prisma";

import FamilyDocumentSubmissionForm from "./FamilyDocumentSubmissionForm";

export const dynamic = "force-dynamic";

const labels: Record<string, string> = {
  IDENTITY: "Documento de identificação",
  MEDICAL_EXAM: "Outro exame médico",
  MEDICAL_CLEARANCE: "Atestado / liberação médica",
  ELECTROCARDIOGRAM: "Eletrocardiograma",
  ECHOCARDIOGRAM: "Ecocardiograma",
  AUTHORIZATION: "Autorização",
  SPORTS_REGISTRATION: "Registro esportivo",
  SCHOOL: "Outro documento escolar",
  SCHOOL_DECLARATION: "Declaração escolar",
  OTHER: "Outro documento",
};

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function requestedItems(payloadEncrypted: string | null) {
  try {
    const payload = JSON.parse(safeDecryptPrivateData(payloadEncrypted) || "{}") as {
      requestedItems?: Array<{ key: string; label: string; category: string }>;
    };
    return (payload.requestedItems || []).filter((item) => item?.key && item?.label && Boolean(labels[item.category]));
  } catch {
    return [];
  }
}

function Unavailable({ message }: { message: string }) {
  return (
    <main style={{ width: "min(760px, calc(100% - 32px))", margin: "48px auto" }}>
      <section className="card">
        <span className="page-eyebrow">11UP • ENVIO SEGURO</span>
        <h1>Link indisponível</h1>
        <p className="muted">{message}</p>
      </section>
    </main>
  );
}

export default async function FamilyDocumentSubmissionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 32) return <Unavailable message="Confira o endereço recebido ou solicite um novo link ao clube." />;

  const invitation = await prisma.athleteRegistrationRequest.findUnique({
    where: { tokenHash: hash(token) },
    select: {
      status: true,
      recipientName: true,
      expiresAt: true,
      payloadEncrypted: true,
      athlete: { select: { name: true, nickname: true } },
      organization: { select: { name: true, publicName: true, logoUrl: true } },
      documents: {
        where: { deletedAt: null },
        select: { id: true, category: true, requestItemKey: true },
      },
    },
  });

  if (!invitation) return <Unavailable message="Este link não existe ou não está mais disponível." />;
  if (invitation.status === "REVOKED") return <Unavailable message="Este link foi cancelado pelo clube." />;
  if (invitation.status === "EXPIRED" || invitation.expiresAt < new Date()) return <Unavailable message="Este link expirou. Solicite um novo link ao clube." />;

  const organizationName = invitation.organization.publicName || invitation.organization.name;
  const athleteName = invitation.athlete.nickname || invitation.athlete.name;

  if (invitation.status !== "PENDING") {
    return (
      <main style={{ width: "min(760px, calc(100% - 32px))", margin: "48px auto" }}>
        <section className="card" style={{ textAlign: "center" }}>
          {invitation.organization.logoUrl ? <img src={invitation.organization.logoUrl} alt={organizationName} style={{ width: 72, height: 72, objectFit: "contain", marginBottom: 14 }} /> : null}
          <span className="page-eyebrow">11UP • ENVIO SEGURO</span>
          <h1>Link encerrado</h1>
          <p className="muted">
            O envio de documentos de {athleteName} foi finalizado e
            enviado para conferência de {organizationName}.
          </p>
          <p>
            <strong>
              Este link não aceita novos arquivos.
            </strong>
          </p>
        </section>
      </main>
    );
  }

  const requested = requestedItems(invitation.payloadEncrypted);
  const received = new Set<string>(invitation.documents.map((document) => document.requestItemKey).filter((value): value is string => Boolean(value)));

  return (
    <main style={{ width: "min(920px, calc(100% - 32px))", margin: "34px auto 60px" }}>
      <section className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {invitation.organization.logoUrl ? <img src={invitation.organization.logoUrl} alt={organizationName} style={{ width: 68, height: 68, objectFit: "contain" }} /> : null}
          <div>
            <span className="page-eyebrow">11UP • ENVIO SEGURO</span>
            <h1 style={{ marginBottom: 5 }}>Documentos de {athleteName}</h1>
            <p className="muted" style={{ margin: 0 }}>{organizationName} solicitou documentos para atualização da ficha do atleta.</p>
          </div>
        </div>
        <div className="form-divider" style={{ marginTop: 18 }}><span>PRIVACIDADE</span></div>
        <p className="muted">Os arquivos são privados e serão acessados somente pela equipe autorizada do clube. O link expira em {invitation.expiresAt.toLocaleDateString("pt-BR")}.</p>
      </section>

      <FamilyDocumentSubmissionForm
        token={token}
        requestedDocuments={requested.map((item) => ({
          key: item.key,
          label: item.label,
          category: item.category,
          received: received.has(item.key),
        }))}
      />
    </main>
  );
}
