import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClubPermission } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";
import DocumentBatchCenter from "./DocumentBatchCenter";

export default async function AthleteDocumentsCenterPage() {
  const user = await requireClubPermission("ATHLETES_EDIT");
  if (user.role === "SUPER_ADMIN") redirect("/atletas");

  const athletes = await prisma.athlete.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      currentStatus: true,
      guardians: { select: { id: true, name: true }, orderBy: { name: "asc" } },
      memberships: {
        where: { status: "ACTIVE", categoryId: { not: null } },
        select: {
          category: {
            select: {
              id: true,
              name: true,
              documentRequirements: {
                where: { active: true },
                orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
                select: {
                  id: true, label: true, documentCategory: true,
                  subject: true, requiresExpiry: true, instructions: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const data = athletes.map((athlete) => ({
    id: athlete.id,
    name: athlete.name,
    status: athlete.currentStatus,
    guardians: athlete.guardians,
    categories: athlete.memberships
      .map((membership) => membership.category)
      .filter((category): category is NonNullable<typeof category> => Boolean(category))
      .map((category) => ({
        id: category.id,
        name: category.name,
        requirements: category.documentRequirements.map((requirement) => ({
          id: requirement.id,
          label: requirement.label,
          documentCategory: requirement.documentCategory,
          subject: requirement.subject as "ATHLETE" | "GUARDIAN",
          requiresExpiry: requirement.requiresExpiry,
          instructions: requirement.instructions,
        })),
      })),
  }));

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 14px 60px" }}>
      <Link href="/atletas" style={{ display: "inline-block", marginBottom: 16 }}>
        ← Voltar aos atletas
      </Link>
      <p className="page-eyebrow">11UP CLUB · ATLETAS</p>
      <h1>Documentos</h1>
      <p className="muted">Envio individual ou em lote, com os mesmos controles de documentos privados já utilizados pelo Club.</p>
      <DocumentBatchCenter athletes={data} />
    </main>
  );
}
