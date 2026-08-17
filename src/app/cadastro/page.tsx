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
  }>;
}) {
  const q = await searchParams;

  return (
    <main className="auth-marketing-page">
      <section className="auth-product-copy">
        <Link href="/" className="marketing-brand">
          ONZE<span>UP</span>
        </Link>
        <span className="marketing-kicker">ONZEUP PLAYER FREE</span>
        <h1>
          Crie a identidade
          <br />
          esportiva do atleta.
        </h1>
        <p>
          Perfil público, dados esportivos, estatísticas, trajetória, um vídeo
          do YouTube e endereço próprio na ONZEUP.
        </p>
        <strong>R$ 0 • sem cartão</strong>
      </section>

      <section className="auth-form-card">
        <span className="page-eyebrow">CONTA DO RESPONSÁVEL</span>
        <h2>Criar ONZEUP Player grátis</h2>

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
            ativação. Tente reenviar abaixo. Se persistir, a equipe ONZEUP
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
            <Link href="/login">Entrar na conta →</Link>
          </div>
        ) : null}

        {q.status ? (
          <form action={resendGuardianVerification} className="stack verification-resend-form">
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
              Criar conta grátis
            </PendingSubmitButton>
          </form>
        )}

        <p className="help">
          Já possui conta? <Link href="/login">Entrar</Link>
        </p>
      </section>
    </main>
  );
}
