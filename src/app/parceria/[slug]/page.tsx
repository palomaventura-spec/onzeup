import PendingSubmitButton from "@/components/PendingSubmitButton";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { locatePartnershipAthlete } from "./actions";

function hashToken(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function cookieName(slug: string) {
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  return `onzeup_partnership_intent_${safeSlug}`;
}

export default async function PartnershipPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { slug } = await params;
  const q = await searchParams;

  // Protecao temporaria: somente organizacao teste.
  if (slug !== "teste") {
    notFound();
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

  let matchedAthlete: { name: string } | null = null;

  if (rawToken) {
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
      intent &&
      !intent.consumedAt &&
      intent.expiresAt > new Date() &&
      intent.organizationId === organization.id
    ) {
      matchedAthlete = intent.athlete;
    }
  }

  const organizationName =
    organization.publicName || organization.name;

  const next = `/parceria/${slug}/continuar`;

  const locateAction = locatePartnershipAthlete.bind(null, slug);

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
          Ative o Player
          <br />
          vinculado ao clube.
        </h1>

        <p>
          Localize o cadastro do atleta usando os mesmos dados
          registrados pelo clube.
        </p>

        <strong>{organizationName}</strong>
      </section>

      <section className="auth-form-card">
        <span className="page-eyebrow">
          ATIVAÇÃO 11UP PLAYER
        </span>

        {q.status === "encontrado" && matchedAthlete ? (
          <>
            <div className="notice">
              <strong>Cadastro localizado.</strong>
              <br />
              {matchedAthlete.name}
            </div>

            <p className="muted">
              Agora entre na conta do responsável ou crie uma conta
              para continuar a ativação.
            </p>

            <div className="stack">
              <Link
                className="btn"
                href={`/login?next=${encodeURIComponent(next)}`}
              >
                Já tenho conta
              </Link>

              <Link
                className="btn-secondary"
                href={`/cadastro?next=${encodeURIComponent(next)}`}
              >
                Criar conta de responsável
              </Link>
            </div>
          </>
        ) : (
          <>
            <h2>Localizar atleta</h2>

            <p className="muted">
              Informe o nome completo e a data de nascimento do atleta.
            </p>

            {q.status === "nao-encontrado" ? (
              <div className="notice error">
                Não encontramos um atleta com esses dados neste clube.
                Confira o nome completo e a data de nascimento.
              </div>
            ) : null}

            {q.status === "validacao-manual" ? (
              <div className="notice error">
                Encontramos mais de um cadastro compatível. O vínculo
                precisará ser validado pelo clube.
              </div>
            ) : null}

            {q.status === "dados-incompletos" ? (
              <div className="notice error">
                Preencha o nome completo e a data de nascimento.
              </div>
            ) : null}

            {q.status === "indisponivel" ? (
              <div className="notice error">
                Esta parceria não está disponível no momento.
              </div>
            ) : null}

            <form action={locateAction} className="stack">
              <label>
                Nome completo do atleta
                <input
                  name="athleteFullName"
                  autoComplete="name"
                  required
                />
              </label>

              <label>
                Data de nascimento
                <input
                  name="birthDate"
                  type="date"
                  required
                />
              </label>

              <PendingSubmitButton pendingText="Buscando…" className="btn" type="submit">
                Localizar meu atleta
              </PendingSubmitButton>
            </form>

            <p className="help">
              Já possui conta 11UP?{" "}
              <Link
                href={`/login?next=${encodeURIComponent(next)}`}
              >
                Entrar
              </Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}