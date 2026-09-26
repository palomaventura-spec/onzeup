import Link from "next/link";
import { registerCoach, resendCoachVerification } from "./actions";
import PendingSubmitButton from "@/components/PendingSubmitButton";

export default async function CoachRegister({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; status?: string; email?: string }>;
}) {
  const q = await searchParams;
  const waiting = q.status === "enviado" || q.status === "reenviado" || q.status === "erro-email";

  return (
    <main className="auth-marketing-page">
      <section className="auth-product-copy">
        <Link href="/coach" className="marketing-brand">11<span>UP</span> <b>COACH</b></Link>
        <span className="marketing-kicker">GRATUITO PARA PROFISSIONAIS DO FUTEBOL</span>
        <h1>Crie sua presença profissional.</h1>
        <p>Organize sua trajetória e faça parte da rede de Coaches Parceiros 11UP.</p>
        <strong>R$ 0 • sem cartão</strong>
      </section>

      <section className="auth-form-card">
        <span className="page-eyebrow">11UP COACH</span>
        <h2>Criar perfil profissional</h2>

        {q.erro ? (
          <div className="notice error">Confira os dados. A senha deve ter pelo menos 8 caracteres e o e-mail não pode estar em uso.</div>
        ) : null}

        {q.status === "enviado" || q.status === "reenviado" ? (
          <div className="notice">
            Enviamos um link de confirmação para <strong>{q.email || "seu e-mail"}</strong>. Confirme o endereço antes de entrar no 11UP Coach.
          </div>
        ) : null}

        {q.status === "erro-email" ? (
          <div className="notice error">
            A conta foi criada, mas não conseguimos enviar o e-mail de confirmação agora. Tente reenviar abaixo.
          </div>
        ) : null}

        {waiting ? (
          <>
            <form action={resendCoachVerification} className="stack verification-resend-form">
              <input type="hidden" name="email" value={q.email || ""} />
              <PendingSubmitButton className="btn-secondary" pendingText="Reenviando...">Reenviar confirmação</PendingSubmitButton>
            </form>
            <p className="help">Já confirmou? <Link href="/login?perfil=coach">Entrar no 11UP Coach</Link></p>
          </>
        ) : (
          <form action={registerCoach} className="stack" autoComplete="off">
            <label>Nome completo<input name="name" required /></label>
            <label>E-mail<input name="email" type="email" required /></label>
            <label>Senha<input name="password" type="password" minLength={8} required /></label>
            <label>Confirmar senha<input name="confirm" type="password" minLength={8} required /></label>
            <fieldset className="coach-org-question">
              <legend>Você também administra uma organização esportiva?</legend>
              <label><input type="radio" name="managesOrganization" value="no" defaultChecked /> Não</label>
              <label><input type="radio" name="managesOrganization" value="yes" /> Sim</label>
              <select name="organizationType" defaultValue="">
                <option value="">Se sim, qual tipo?</option>
                <option value="SCHOOL">Escolinha</option>
                <option value="ACADEMY">Centro de treinamento</option>
                <option value="CLUB">Clube / equipe</option>
                <option value="PROJECT">Projeto social</option>
                <option value="PERSONAL_TRAINING">Treinamento personalizado</option>
              </select>
            </fieldset>
            <PendingSubmitButton className="btn" pendingText="Criando seu 11UP Coach...">Criar 11UP Coach grátis</PendingSubmitButton>
          </form>
        )}

        {!waiting ? <p className="help">Já possui conta? <Link href="/login?perfil=coach">Entrar</Link></p> : null}
      </section>
    </main>
  );
}
