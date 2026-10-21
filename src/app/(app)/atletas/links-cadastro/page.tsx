import { requireClubPermission } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";
import LinksCadastroClient from "./LinksCadastroClient";

export const dynamic = "force-dynamic";

export default async function LinksCadastroPage() {
  const user = await requireClubPermission("ATHLETES_EDIT");
  if (!user.organizationId) {
    return <main style={{padding: 24}}>Organização não selecionada.</main>;
  }
  const categories = await prisma.category.findMany({
    where: { organizationId: user.organizationId, active: true, type: { in: ["EVALUATION", "STANDARD"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, sport: true, type: true },
  });
  return <LinksCadastroClient categories={categories} />;
}
