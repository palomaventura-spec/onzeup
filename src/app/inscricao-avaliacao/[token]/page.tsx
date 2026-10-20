import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import PublicRegistrationForm from "./PublicRegistrationForm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PublicRegistrationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(token)) return <main className="card"><h1>Link indisponível</h1></main>;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const link = await prisma.publicRegistrationLink.findUnique({
    where: { tokenHash },
    select: {
      status: true, expiresAt: true,
      organization: { select: { name: true, publicName: true } },
      category: { select: { name: true, type: true, sport: true } },
      requirements: { where: { active: true }, select: { id: true, label: true, owner: true, required: true, expires: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!link || link.status !== "ACTIVE" || link.expiresAt <= new Date()) {
    return <main style={{ maxWidth: 760, margin: "48px auto", padding: 20 }}><section className="card"><h1>Inscrição indisponível</h1><p>Solicite um link ativo ao clube.</p></section></main>;
  }
  return <main style={{ maxWidth: 880, margin: "35px auto", padding: 16 }}>
    <section className="card"><span className="page-eyebrow">11UP CLUB · CADASTRO COLETIVO</span>
    <h1>{link.organization.publicName || link.organization.name}</h1>
    <p>Categoria: <strong>{link.category.name} · {link.category.sport === "FOOTBALL" ? "Futebol" : link.category.sport === "FUTSAL" ? "Futsal" : "Futebol e Futsal"} · {link.category.type === "EVALUATION" ? "Avaliação" : "Regular"}</strong></p>
    <p>O envio será analisado pelo clube. O cadastro não significa vínculo aprovado nem liberação médica ou esportiva.</p></section>
    <PublicRegistrationForm token={token} requirements={link.requirements} />
  </main>;
}
