import Link from "next/link";
import { resetPassword } from "./actions";
export default async function Reset({searchParams}:{searchParams:Promise<{token?:string;erro?:string}>}){
 const q=await searchParams;
 return <main className="auth-marketing-page"><section className="auth-product-copy"><Link href="/" className="marketing-brand">ONZE<span>UP</span></Link><span className="marketing-kicker">NOVA SENHA</span><h1>Crie uma nova senha.</h1></section>
 <section className="auth-form-card"><h2>Redefinir senha</h2>{q.erro==="token"?<div className="notice error">Link inválido ou expirado.</div>:null}{q.erro==="dados"?<div className="notice error">As senhas precisam coincidir e ter pelo menos 8 caracteres.</div>:null}
 {q.token?<form action={resetPassword} className="stack"><input type="hidden" name="token" value={q.token}/><label>Nova senha<input name="password" type="password" minLength={8} required/></label><label>Confirmar senha<input name="confirm" type="password" minLength={8} required/></label><button className="btn">Salvar nova senha</button></form>:<Link className="btn" href="/esqueci-senha">Solicitar novo link</Link>}</section></main>
}
