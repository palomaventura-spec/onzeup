import Link from "next/link";
import { registerCoach } from "./actions";
export default async function CoachRegister({searchParams}:{searchParams:Promise<{erro?:string}>}){
 const q=await searchParams;
 return <main className="auth-marketing-page">
  <section className="auth-product-copy">
   <Link href="/" className="marketing-brand">ONZE<span>UP</span> <b>COACH</b></Link>
   <span className="marketing-kicker">PERFIL PROFISSIONAL</span>
   <h1>Sua carreira no futebol merece presença profissional.</h1>
   <p>Organize sua trajetória, experiências, licenças e conquistas em um perfil esportivo compartilhável.</p>
   <strong>Grátis no lançamento • sem cartão</strong>
  </section>
  <section className="auth-form-card">
   <span className="page-eyebrow">ONZEUP COACH</span><h2>Criar perfil profissional</h2>
   {q.erro==="email"?<div className="notice error">Já existe uma conta com este e-mail.</div>:null}
   {q.erro==="dados"?<div className="notice error">Confira os dados e a senha.</div>:null}
   <form action={registerCoach} className="stack" autoComplete="off">
    <label>Nome completo<input name="name" required/></label>
    <label>E-mail<input name="email" type="email" required/></label>
    <label>Senha<input name="password" type="password" minLength={8} autoComplete="new-password" required/></label>
    <label>Confirmar senha<input name="confirm" type="password" minLength={8} autoComplete="new-password" required/></label>
    <button className="btn">Criar ONZEUP Coach grátis</button>
   </form>
   <p className="help">Já possui conta? <Link href="/login">Entrar</Link></p>
  </section>
 </main>
}
