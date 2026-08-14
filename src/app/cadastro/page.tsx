import Link from "next/link";
import { registerGuardian } from "./actions";

export default async function Register({searchParams}:{searchParams:Promise<{status?:string;erro?:string;ref?:string}>}){
 const q=await searchParams;
 return <main className="auth-marketing-page">
   <section className="auth-product-copy"><Link href="/" className="marketing-brand">ONZE<span>UP</span></Link><span className="marketing-kicker">ONZEUP PLAYER FREE</span><h1>Crie a identidade<br/>esportiva do atleta.</h1><p>Perfil público, dados esportivos, estatísticas, trajetória, um vídeo do YouTube e endereço próprio na ONZEUP.</p><strong>R$ 0 • sem cartão</strong></section>
   <section className="auth-form-card"><span className="page-eyebrow">CONTA DO RESPONSÁVEL</span><h2>Criar ONZEUP Player grátis</h2>
     {q.status?<div className="notice">Cadastro recebido. Confirme seu e-mail para ativar a conta. O envio automático será habilitado após configurar o remetente ONZEUP.</div>:null}
     {q.erro?<div className="notice error">Confira os dados, use uma senha com pelo menos 8 caracteres e aceite a declaração de responsabilidade.</div>:null}
     <form action={registerGuardian} className="stack" autoComplete="off">
       {q.ref ? <input type="hidden" name="ref" value={q.ref} /> : null}
       <label>Nome do responsável<input name="name" required/></label>
       <label>E-mail<input name="email" type="email" autoComplete="off" defaultValue="" required/></label>
       <label>WhatsApp<input name="phone"/></label>
       <label>Senha<input name="password" type="password" autoComplete="new-password" minLength={8} defaultValue="" required/></label>
       <label>Confirmar senha<input name="confirm" type="password" autoComplete="new-password" minLength={8} defaultValue="" required/></label>
       <label className="check-row"><input name="legal" type="checkbox" required/><span>Declaro ser responsável legal pelo menor e autorizo a criação e gestão do perfil esportivo.</span></label>
       <button className="btn" type="submit">Criar conta grátis</button>
     </form>
     <p className="help">Já possui conta? <Link href="/login">Entrar</Link></p>
   </section>
 </main>
}