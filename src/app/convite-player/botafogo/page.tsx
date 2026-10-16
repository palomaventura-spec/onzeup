import Link from "next/link";
import styles from "./ConviteActions.module.css";

const afterLogin = "/responsavel";
const continueQuery = encodeURIComponent(afterLogin);

export const metadata = {
  title: "Convite às famílias | 11UP Player",
  description: "Acesso ao 11UP Player para famílias participantes do piloto esportivo.",
};

export default function BotafogoPlayerInvitationPage() {
  return (
    <main className="auth-marketing-page">
      <section className="auth-product-copy">
        <Link href="/" className="marketing-brand">
          11<span>UP</span>
        </Link>
        <span className="marketing-kicker">11UP PLAYER • CONVITE INSTITUCIONAL</span>
        <h1>
          Um novo espaço para acompanhar a trajetória do atleta.
        </h1>
        <p>
          O Botafogo convida as famílias dos seus atletas de futebol a criarem
          sua conta no 11UP Player.
        </p>
        <p>
          Um espaço para acompanhar a trajetória esportiva do atleta, manter
          seu perfil atualizado e receber comunicados do clube.
        </p>
        <strong>Player Simples: R$ 19,90/mês • Premium: R$ 69,90/mês</strong>
        <p className="help">
          A eventual cortesia do Player Simples é um benefício institucional
          condicionado à elegibilidade, à aprovação do vínculo e à liberação
          manual pela administração do 11UP. O convite não ativa cortesia
          nem assinatura automaticamente. O Premium não está incluído.
        </p>
      </section>

      <section className="auth-form-card">
        <span className="page-eyebrow">CONVITE À FAMÍLIA</span>
        <h2>Acesse seu 11UP Player</h2>
        <p className="muted">
          O cadastro da conta é a primeira etapa. Depois, crie ou acesse o
          perfil do atleta, solicite o vínculo com o clube e aguarde a confirmação.
        </p>
        <div className={styles.actions}>
          <Link
            className={`${styles.actionButton} ${styles.primaryButton}`}
            href={`/cadastro?next=${continueQuery}`}
          >
            <span>Criar conta do responsável</span>
            <span className={styles.actionArrow} aria-hidden="true">→</span>
          </Link>
          <div className={styles.separator} aria-hidden="true">
            <span>ou</span>
          </div>
          <Link
            className={`${styles.actionButton} ${styles.secondaryButton}`}
            href={`/login?next=${continueQuery}`}
          >
            <span>Já tenho conta? Entrar</span>
            <span className={styles.actionArrow} aria-hidden="true">→</span>
          </Link>
        </div>
        <p className={styles.note}>
          A comunicação com o clube está disponível nos planos Simples e Premium
          após a aprovação do vínculo. Nenhuma cobrança ou cortesia é criada
          por esta página.
        </p>
      </section>
    </main>
  );
}
