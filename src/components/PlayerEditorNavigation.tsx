import Link from "next/link";
import { Camera, Home, NotebookPen, UserRound } from "lucide-react";
import styles from "./PlayerEditorNavigation.module.css";

type Props = { playerId: string; playerName: string; active: "dados" | "pagina" };

export default function PlayerEditorNavigation({ playerId, playerName, active }: Props) {
  const query = `?player=${encodeURIComponent(playerId)}`;
  return (
    <nav className={styles.shell} aria-label={`Editar ${playerName}`}>
      <div className={styles.heading}>
        <div><span className={styles.overline}>CENTRAL DE EDIÇÃO</span><h2>{playerName}</h2></div>
        <Link href={`/responsavel${query}`} className={styles.home}><Home size={16} aria-hidden="true" /> Início</Link>
      </div>
      <div className={styles.tabs}>
        <Link href={`/responsavel/dados${query}`} className={`${styles.tab} ${active === "dados" ? styles.current : ""}`} aria-current={active === "dados" ? "page" : undefined}>
          <UserRound size={18} aria-hidden="true" /> Dados e vínculos
        </Link>
        <Link href={`/responsavel/pagina${query}`} className={`${styles.tab} ${active === "pagina" ? styles.current : ""}`} aria-current={active === "pagina" ? "page" : undefined}>
          <Camera size={18} aria-hidden="true" /> Foto e página
        </Link>
        <Link href={`/responsavel/desempenho${query}`} className={styles.tab}>
          <NotebookPen size={18} aria-hidden="true" /> Diário
        </Link>
      </div>
      <p className={styles.hint}>Salve as alterações antes de trocar de aba.</p>
    </nav>
  );
}
