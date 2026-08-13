import Link from "next/link";
import { requestPasswordReset } from "./actions";
export default async function Forgot({searchParams}:{searchParams:Promise<{status?:string;token?:string}>}){
 const q=await searchParams;
 return <main className="auth-marketing-page"><section className="auth-product-copy"><Link href="/" className="marketing-brand">ONZE<span>UP</span></Link><span className="marketing-kicker">RECUPERAÇÃO DE ACESSO</span><h1>Recupere sua conta.</h1><p>Informe o e-mail usado no cadastro.</p></section>
 <section className="auth-form-card"><h2>Esqueci minha senha</h2>
 {q.status==="ok"?<div className="notice">Se o e-mail existir, enviaremos as instruções de recuperação.</div>:null}
 {q.status==="dev"&&q.token?<div className="notice">Ambiente local: <Link href={`/redefinir-senha?token=${q.token}`}>abrir link de redefinição</Link>.</div>:null}
 <form action={requestPasswordReset} className="stack"><label>E-mail<input name="email" type="email" required/></label><button className="btn">Enviar link de recuperação</button></form><p className="help"><Link href="/login">← Voltar ao login</Link></p></section></main>
}
