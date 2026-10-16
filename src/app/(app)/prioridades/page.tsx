import Link from "next/link";
import { requireClubPermission } from "@/lib/club-access";
import { listClubDocumentPriorities, type DocumentPriorityStatus } from "@/lib/club-document-priorities";
import styles from "./Prioridades.module.css";

type Filters = { status?: string; categoria?: string; q?: string };

const STATUS_LABELS: Record<DocumentPriorityStatus, string> = {
  VENCIDO: "Vencido",
  A_VENCER: "A vencer",
  PENDENTE: "Pendente",
};

function stripAccents(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

export default async function ClubPrioritiesPage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const user = await requireClubPermission("ATHLETES_EDIT");
  const organizationId = user.organizationId;
  const timeZone = user.organization?.timezone || "America/Sao_Paulo";
  const data = await listClubDocumentPriorities(organizationId, timeZone);
  const params = await searchParams;

  const status = ["VENCIDO", "A_VENCER", "PENDENTE"].includes(params.status ?? "")
    ? params.status as DocumentPriorityStatus
    : "";
  const categoryId = data.categories.some((category) => category.id === params.categoria)
    ? params.categoria ?? ""
    : "";
  const query = (params.q ?? "").trim().slice(0, 100);
  const qNormalized = stripAccents(query);

  const filtered = data.rows.filter((row) => {
    if (status && row.status !== status) return false;
    if (categoryId && row.categoryId !== categoryId) return false;
    if (qNormalized && !stripAccents(`${row.athleteName} ${row.documentName} ${row.categoryName}`).includes(qNormalized)) {
      return false;
    }
    return true;
  });

  const statusLink = (next: string) => {
    const queryParams = new URLSearchParams();
    if (next) queryParams.set("status", next);
    if (categoryId) queryParams.set("categoria", categoryId);
    if (query) queryParams.set("q", query);
    return `/prioridades${queryParams.size ? `?${queryParams.toString()}` : ""}`;
  };

  return (
    <main className={styles.main}>
      <div className={styles.breadcrumb}>
        <Link href="/dashboard">← Visão geral</Link>
        <span>11UP CLUB · GESTÃO DOCUMENTAL</span>
      </div>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>CENTRAL DE PRIORIDADES</p>
          <h1>Documentos que precisam de atenção</h1>
          <p>Veja os atletas, as categorias e os documentos com pendências ou vencimentos. Selecione um atleta para resolver diretamente na ficha.</p>
        </div>
        <Link className={styles.secondaryButton} href="/atletas/documentos">Envio de documentos →</Link>
      </header>

      <div className={styles.metrics}>
        <Link href={statusLink("VENCIDO")} className={styles.metric}>
          <span>Vencidos</span>
          <strong>{data.summary.expired}</strong>
          <small>Renovação necessária</small>
        </Link>
        <Link href={statusLink("A_VENCER")} className={styles.metric}>
          <span>A vencer em 30 dias</span>
          <strong>{data.summary.expiring}</strong>
          <small>Antecipe a renovação</small>
        </Link>
        <Link href={statusLink("PENDENTE")} className={styles.metric}>
          <span>Pendentes</span>
          <strong>{data.summary.pending}</strong>
          <small>Envio ou análise necessária</small>
        </Link>
      </div>

      {data.configurationWarnings.length > 0 ? (
        <aside className={styles.configuration}>
          <div>
            <strong>Configuração documental a conferir</strong>
            <p>As categorias {data.configurationWarnings.map((category) => category.categoryName).join(", ")} exigem documentação, mas não possuem requisitos obrigatórios ativos. A listagem abaixo não substitui essa configuração.</p>
          </div>
          <Link href="/categorias">Conferir categorias →</Link>
        </aside>
      ) : null}

      <section className={styles.panel}>
        <div className={styles.panelTop}>
          <div>
            <h2>Lista de prioridades</h2>
            <p>{filtered.length} ocorrência(s) exibida(s) de {data.rows.length} identificada(s)</p>
          </div>
        </div>

        <nav className={styles.tabs} aria-label="Filtrar por situação">
          {[
            { value: "", label: "Todos", total: data.rows.length },
            { value: "VENCIDO", label: "Vencidos", total: data.summary.expired },
            { value: "A_VENCER", label: "A vencer", total: data.summary.expiring },
            { value: "PENDENTE", label: "Pendentes", total: data.summary.pending },
          ].map((tab) => (
            <Link key={tab.value} href={statusLink(tab.value)} className={status === tab.value ? styles.activeTab : styles.tab}>
              {tab.label} <span>{tab.total}</span>
            </Link>
          ))}
        </nav>

        <form className={styles.filters} method="get" action="/prioridades">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <label>
            <span>Atleta ou documento</span>
            <input type="search" name="q" placeholder="Buscar pelo nome..." defaultValue={query} maxLength={100} />
          </label>
          <label>
            <span>Categoria</span>
            <select name="categoria" defaultValue={categoryId}>
              <option value="">Todas as categorias</option>
              {data.categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <button type="submit">Filtrar</button>
          <Link href="/prioridades" className={styles.clearButton}>Limpar</Link>
        </form>

        {filtered.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Atleta / categoria</th><th>Documento ou pendência</th><th>Validade</th><th>Situação</th><th>Ação</th></tr></thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.key}>
                    <td><strong>{row.athleteName}</strong><small>{row.categoryName}</small></td>
                    <td><strong>{row.documentName}</strong><small>{row.description}</small></td>
                    <td>{row.expiresAt ? row.expiresAt.toLocaleDateString("pt-BR", { timeZone }) : "—"}</td>
                    <td><span className={`${styles.status} ${row.status === "VENCIDO" ? styles.expired : row.status === "A_VENCER" ? styles.expiring : styles.pending}`}>{STATUS_LABELS[row.status]}</span></td>
                    <td><Link className={styles.openLink} href={`/atletas/${encodeURIComponent(row.athleteId)}/dados`}>Abrir ficha →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.empty}>
            <strong>Nenhuma ocorrência encontrada</strong>
            <p>{data.rows.length ? "Tente alterar os filtros de pesquisa." : "Nenhum documento exige atenção neste momento. Confira também a configuração obrigatória por categoria."}</p>
          </div>
        )}
        <p className={styles.footerNote}>Os indicadores contabilizam ocorrências documentais, não atletas distintos. Documentos vencidos podem requerer nova aprovação; esta página não modifica os registros automaticamente.</p>
      </section>
    </main>
  );
}
