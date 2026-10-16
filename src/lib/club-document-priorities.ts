import { prisma } from "@/lib/prisma";

export type DocumentPriorityStatus = "VENCIDO" | "A_VENCER" | "PENDENTE";
export type DocumentNoticeKind = "MISSING" | "REJECTED" | "EXPIRED" | "EXPIRING" | "REVIEW";

export type DocumentPriority = {
  key: string;
  athleteId: string;
  athleteName: string;
  categoryId: string | null;
  categoryName: string;
  documentName: string;
  status: DocumentPriorityStatus;
  notificationKind: DocumentNoticeKind;
  description: string;
  expiresAt: Date | null;
};

type ConfigWarning = { categoryId: string; categoryName: string };

function localDateKey(value: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return part("year") * 10000 + part("month") * 100 + part("day");
}

function plusDaysKey(todayKey: number, days: number): number {
  const year = Math.floor(todayKey / 10000);
  const month = Math.floor((todayKey % 10000) / 100);
  const day = todayKey % 100;
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.getUTCFullYear() * 10000 + (next.getUTCMonth() + 1) * 100 + next.getUTCDate();
}

/** Consulta somente leitura. Não atualiza APTO, documentos ou histórico. */
export async function listClubDocumentPriorities(organizationId: string, timeZone: string) {
  const today = localDateKey(new Date(), timeZone);
  const warningLimit = plusDaysKey(today, 30);

  const athletes = await prisma.athlete.findMany({
    where: {
      organizationId,
      active: true,
      currentStatus: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      memberships: {
        where: { status: "ACTIVE", categoryId: { not: null } },
        select: {
          category: {
            select: {
              id: true,
              name: true,
              type: true,
              requiresDocumentation: true,
              requiresMedicalExam: true,
              documentRequirements: {
                where: { active: true },
                select: {
                  id: true,
                  label: true,
                  documentCategory: true,
                  required: true,
                  minCount: true,
                  requiresExpiry: true,
                },
              },
            },
          },
        },
      },
      documents: {
        where: { deletedAt: null, status: { not: "ARCHIVED" } },
        select: {
          id: true,
          requirementId: true,
          title: true,
          category: true,
          status: true,
          expiresAt: true,
        },
      },
      documentManualIssues: {
        where: { status: "OPEN" },
        select: { id: true, title: true, blocking: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const rows: DocumentPriority[] = [];
  const configurationById = new Map<string, ConfigWarning>();
  const categoryById = new Map<string, { id: string; name: string }>();

  for (const athlete of athletes) {
    const categories = Array.from(
      new Map(
        athlete.memberships
          .map((membership) => membership.category)
          .filter((category): category is NonNullable<typeof category> => category !== null && category.type === "STANDARD")
          .map((category) => [category.id, category] as const),
      ).values(),
    );

    for (const category of categories) categoryById.set(category.id, { id: category.id, name: category.name });

    const defaultCategory = categories[0];
    const assignedRequirements = new Set<string>();

    for (const category of categories) {
      const requirements = category.documentRequirements;
      if (category.requiresDocumentation && !requirements.some((requirement) => requirement.required)) {
        configurationById.set(category.id, { categoryId: category.id, categoryName: category.name });
      }

      for (const requirement of requirements) {
        assignedRequirements.add(requirement.id);
        const attached = athlete.documents.filter((doc) => doc.requirementId === requirement.id);
        let valid = 0;
        let hasBlockingDocument = false;

        for (const doc of attached) {
          const date = doc.expiresAt ? localDateKey(doc.expiresAt, timeZone) : null;
          const isExpired = doc.status === "EXPIRED" || (date !== null && date < today);
          const noExpiry = requirement.requiresExpiry && date === null && doc.status === "APPROVED";
          const isWaiting = doc.status === "PENDING" || doc.status === "REJECTED" || noExpiry;
          let status: DocumentPriorityStatus | null = null;
          let description = "";

          if (isExpired) {
            status = "VENCIDO";
            description = "Documento vencido. Verifique a renovação.";
          } else if (isWaiting) {
            status = "PENDENTE";
            description = doc.status === "REJECTED"
              ? "Documento rejeitado. Necessário corrigir ou reenviar."
              : noExpiry ? "Documento aprovado, mas exige uma data de validade."
              : "Documento recebido e aguardando análise.";
          } else if (doc.status === "APPROVED") {
            valid += 1;
            if (date !== null && date <= warningLimit) {
              status = "A_VENCER";
              description = "Documento aprovado próximo do vencimento (até 30 dias).";
            }
          }

          if (status) {
            if (status !== "A_VENCER") hasBlockingDocument = true;
            rows.push({
              key: `doc:${doc.id}:${requirement.id}`,
              athleteId: athlete.id,
              athleteName: athlete.name,
              categoryId: category.id,
              categoryName: category.name,
              documentName: requirement.label,
              status,
              notificationKind: doc.status === "PENDING" || noExpiry ? "REVIEW" :
                status === "VENCIDO" ? "EXPIRED" :
                doc.status === "REJECTED" ? "REJECTED" :
                status === "A_VENCER" ? "EXPIRING" : "REVIEW",
              description,
              expiresAt: doc.expiresAt,
            });
          }
        }

        if (requirement.required && valid < Math.max(1, requirement.minCount) && !hasBlockingDocument) {
          rows.push({
            key: `missing:${athlete.id}:${requirement.id}`,
            athleteId: athlete.id,
            athleteName: athlete.name,
            categoryId: category.id,
            categoryName: category.name,
            documentName: requirement.label,
            status: "PENDENTE",
            notificationKind: "MISSING",
            description: attached.length
              ? "Quantidade de documentos válidos insuficiente para este requisito."
              : "Nenhum documento aprovado vinculado ao requisito obrigatório.",
            expiresAt: null,
          });
        }
      }

      // Exame obrigatório também deve aparecer quando a categoria ainda não o configurou como requisito.
      if (category.requiresMedicalExam && !requirements.some((req) => req.required &&
        (req.documentCategory === "MEDICAL_EXAM" || req.documentCategory === "MEDICAL_CLEARANCE"))) {
        const medical = athlete.documents.filter((doc) =>
          doc.category === "MEDICAL_EXAM" || doc.category === "MEDICAL_CLEARANCE");
        const hasValidMedical = medical.some((doc) => doc.status === "APPROVED" &&
          (!doc.expiresAt || localDateKey(doc.expiresAt, timeZone) >= today));
        if (!hasValidMedical && !medical.some((doc) => doc.status !== "APPROVED")) {
          rows.push({
            key: `medical:${athlete.id}:${category.id}`,
            athleteId: athlete.id,
            athleteName: athlete.name,
            categoryId: category.id,
            categoryName: category.name,
            documentName: "Atestado / exame médico obrigatório",
            status: "PENDENTE",
            notificationKind: "MISSING",
            description: "Categoria exige exame médico aprovado e válido.",
            expiresAt: null,
          });
        }
      }
    }

    // Arquivos avulsos também precisam aparecer para análise ou renovação.
    for (const doc of athlete.documents) {
      if (doc.requirementId && assignedRequirements.has(doc.requirementId)) continue;
      const date = doc.expiresAt ? localDateKey(doc.expiresAt, timeZone) : null;
      const isExpired = doc.status === "EXPIRED" || (date !== null && date < today);
      const status: DocumentPriorityStatus | null = isExpired
        ? "VENCIDO"
        : doc.status === "PENDING" || doc.status === "REJECTED"
          ? "PENDENTE"
          : doc.status === "APPROVED" && date !== null && date <= warningLimit
            ? "A_VENCER"
            : null;
      if (!status) continue;
      rows.push({
        key: `unlinked:${doc.id}`,
        athleteId: athlete.id,
        athleteName: athlete.name,
        categoryId: defaultCategory?.id ?? null,
        categoryName: defaultCategory?.name ?? "Sem categoria ativa",
        documentName: doc.title || "Documento avulso",
        status,
        notificationKind: doc.status === "PENDING" ? "REVIEW" : doc.status === "REJECTED" ? "REJECTED" :
          status === "VENCIDO" ? "EXPIRED" : status === "A_VENCER" ? "EXPIRING" : "REVIEW",
        description: doc.status === "REJECTED"
          ? "Documento rejeitado. Verifique a ficha do atleta."
          : status === "VENCIDO" ? "Documento vencido."
          : status === "A_VENCER" ? "Documento próximo do vencimento."
          : "Aguardando análise do documento.",
        expiresAt: doc.expiresAt,
      });
    }

    for (const issue of athlete.documentManualIssues) {
      rows.push({
        key: `manual:${issue.id}`,
        athleteId: athlete.id,
        athleteName: athlete.name,
        categoryId: defaultCategory?.id ?? null,
        categoryName: defaultCategory?.name ?? "Sem categoria ativa",
        documentName: issue.title,
        status: "PENDENTE",
        notificationKind: "REVIEW",
        description: issue.blocking
          ? "Pendência manual bloqueante registrada pelo gestor."
          : "Pendência manual aberta registrada pelo gestor.",
        expiresAt: null,
      });
    }
  }

  const priorityOrder: Record<DocumentPriorityStatus, number> = {
    VENCIDO: 0,
    PENDENTE: 1,
    A_VENCER: 2,
  };
  rows.sort((a, b) => priorityOrder[a.status] - priorityOrder[b.status] ||
    (a.expiresAt?.getTime() ?? Infinity) - (b.expiresAt?.getTime() ?? Infinity) ||
    a.athleteName.localeCompare(b.athleteName, "pt-BR"));

  return {
    rows,
    summary: {
      expired: rows.filter((row) => row.status === "VENCIDO").length,
      pending: rows.filter((row) => row.status === "PENDENTE").length,
      expiring: rows.filter((row) => row.status === "A_VENCER").length,
    },
    categories: [...categoryById.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    configurationWarnings: [...configurationById.values()].sort((a, b) => a.categoryName.localeCompare(b.categoryName, "pt-BR")),
  };
}
