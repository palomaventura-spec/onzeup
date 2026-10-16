import Link from "next/link";
import {
  registerGuardian,
  resendGuardianVerification,
} from "./actions";
import PendingSubmitButton from "@/components/PendingSubmitButton";

export default async function Register({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    erro?: string;
    ref?: string;
    email?: string;
    next?: string;
  }>;
}) {
  const q = await searchParams;

  return (
    <main className="auth-marketing-page">
      <section className="auth-product-copy">
        <Link href="/" className="marketing-brand">
          11<span>UP</span>
        </Link>
        <span className="marketing-kicker">11UP PLAYER</span>
        <h1>
          Crie a identidade
          <br />
          esportiva do atleta.
        </h1>
        <p>
          Crie a conta do responsável para gerenciar o perfil esportivo do atleta.
          A contratação de um plano e as cortesias são etapas separadas.
        </p>
        <strong>Player Simples: R$ 19,90/mês • Premium: R$ 69,90/mês</strong>
      </section>

      <section className="auth-form-card">
        <span className="page-eyebrow">CONTA DO RESPONSÁVEL</span>
        <h2>Criar conta de responsável</h2>

        {q.status === "enviado" ? (
          <div className="notice">
            <strong>E-mail enviado.</strong>
            <br />
            Abra sua caixa de entrada e clique em <b>Ativar minha conta</b>.
            Verifique também a pasta de spam.
          </div>
        ) : null}

        {q.status === "reenviado" ? (
          <div className="notice">
            Se esta conta ainda estiver aguardando ativação, um novo link foi
            enviado para o e-mail informado.
          </div>
        ) : null}

        {q.status === "erro-email" ? (
          <div className="notice error">
            A conta foi criada, mas não conseguimos enviar o e-mail de
            ativação. Tente reenviar abaixo. Se persistir, a equipe 11UP
            poderá verificar o log de envio.
          </div>
        ) : null}

        {q.erro === "dados" ? (
          <div className="notice error">
            Confira os dados, use uma senha com pelo menos 8 caracteres e
            aceite a declaração de responsabilidade.
          </div>
        ) : null}

        {q.erro === "email-existente" ? (
          <div className="notice error">
            Este e-mail já possui uma conta ativa.{" "}
            <Link href={q.next ? `/login?next=${encodeURIComponent(q.next)}` : "/login"}>Entrar na conta →</Link>
          </div>
        ) : null}

        {q.status ? (
          <form action={resendGuardianVerification} className="stack verification-resend-form">
            {q.next ? <input type="hidden" name="next" value={q.next} /> : null}
            <label>
              Não recebeu? Reenviar confirmação
              <input
                name="email"
                type="email"
                defaultValue={q.email || ""}
                placeholder="seu@email.com"
                required
              />
            </label>
            <PendingSubmitButton
              className="btn-secondary"
              pendingText="Reenviando..."
            >
              Reenviar e-mail de ativação
            </PendingSubmitButton>
          </form>
        ) : (
          <form action={registerGuardian} className="stack" autoComplete="off">
            {q.next ? <input type="hidden" name="next" value={q.next} /> : null}
            {q.ref ? <input type="hidden" name="ref" value={q.ref} /> : null}

            <label>
              Nome do responsável
              <input name="name" required />
            </label>

            <label>
              E-mail
              <input
                name="email"
                type="email"
                autoComplete="email"
                defaultValue=""
                required
              />
              <small className="field-help">
                Atleta já cadastrado por um clube 11UP? Use o mesmo e-mail do responsável informado à equipe para facilitar a localização do vínculo.
              </small>
            </label>

            <label>
              WhatsApp
              <input name="phone" />
            </label>

            <label>
              Senha
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                defaultValue=""
                required
              />
            </label>

            <label>
              Confirmar senha
              <input
                name="confirm"
                type="password"
                autoComplete="new-password"
                minLength={8}
                defaultValue=""
                required
              />
            </label>

            <label className="check-row">
              <input name="legal" type="checkbox" required />
              <span>
                Declaro ser responsável legal pelo menor e autorizo a criação e
                gestão do perfil esportivo.
              </span>
            </label>

            <PendingSubmitButton
              className="btn"
              pendingText="Criando conta e enviando e-mail..."
            >
              Criar conta do responsável
            </PendingSubmitButton>
          </form>
        )}

        <p className="help">
          Já possui conta? <Link href={q.next ? `/login?next=${encodeURIComponent(q.next)}` : "/login"}>Entrar</Link>
        </p>
      </section>
    </main>
  );
}
