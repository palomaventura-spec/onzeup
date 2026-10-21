import crypto from "crypto";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

function hashToken(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function cookieName(slug: string) {
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  return `onzeup_partnership_intent_${safeSlug}`;
}

export default async function PartnershipContinuePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (slug !== "teste") {
    notFound();
  }

  const next = `/parceria/${slug}/continuar`;

  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  if (user.role !== "GUARDIAN") {
    redirect("/login");
  }

  const organization = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      publicName: true,
      active: true,
    },
  });

  if (!organization || !organization.active) {
    notFound();
  }

  const store = await cookies();
  const rawToken = store.get(cookieName(slug))?.value;

  if (!rawToken) {
    redirect(`/parceria/${slug}?status=expirado`);
  }

  const intent =
    await prisma.playerPartnershipActivationIntent.findUnique({
      where: {
        tokenHash: hashToken(rawToken),
      },
      select: {
        expiresAt: true,
        consumedAt: true,
        organizationId: true,
        athlete: {
          select: {
            name: true,
          },
        },
      },
    });

  if (
    !intent ||
    intent.consumedAt ||
    intent.expiresAt <= new Date() ||
    intent.organizationId !== organization.id
  ) {
    redirect(`/parceria/${slug}?status=expirado`);
  }

  return (
    <main className="auth-marketing-page">
      <section className="auth-product-copy">
        <Link href="/" className="marketing-brand">
          11<span>UP</span>
        </Link>

        <span className="marketing-kicker">
          11UP PLAYER • PARCERIA
        </span>

        <h1>
          Identificação
          <br />
          confirmada.
        </h1>

        <p>
          O responsável entrou na conta correta e o atleta localizado
          permanece protegido pelo token temporário.
        </p>

        <strong>
          {organization.publicName || organization.name}
        </strong>
      </section>

      <section className="auth-form-card">
        <span className="page-eyebrow">
          FLUXO DE PARCERIA
        </span>

        <h2>Pronto para vincular</h2>

        <div className="notice">
          <strong>{intent.athlete.name}</strong>
          <br />
          Responsável autenticado com sucesso.
        </div>

        <p className="muted">
          Nesta etapa de validação ainda não criamos o Player nem o
          vínculo com o clube.
        </p>

        <p className="muted">
          O próximo passo será criar ou reutilizar o Player do atleta
          e registrar o vínculo oficial da parceria.
        </p>

        <Link className="btn-secondary" href="/responsavel">
          Voltar ao Player
        </Link>
      </section>
    </main>
  );
}