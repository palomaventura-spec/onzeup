import Link from "next/link";
import { sendManualDocumentNotice } from "./notificacoes/actions";
import { requireClubPermission } from "@/lib/club-access";
import { listClubDocumentPriorities, type DocumentPriorityStatus } from "@/lib/club-document-priorities";
import styles from "./Prioridades.module.css";

type Filters = { status?: string; categoria?: string; q?: string; pagina?: string; aviso?: string };

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

  // Uma única linha por atleta: os documentos ficam agrupados para evitar listas intermináveis.
  type AthleteGroup = {
    id: string;
    name: string;
    categories: Set<string>;
    items: typeof filtered;
    expired: number;
    expiring: number;
    pending: number;
  };

  const groupByAthlete = new Map<string, AthleteGroup>();
  for (const item of filtered) {
    let group = groupByAthlete.get(item.athleteId);
    if (!group) {
      group = {
        id: item.athleteId,
        name: item.athleteName,
        categories: new Set<string>(),
        items: [],
        expired: 0,
        expiring: 0,
        pending: 0,
      };
      groupByAthlete.set(item.athleteId, group);
    }
    group.categories.add(item.categoryName);
    group.items.push(item);
    if (item.status === "VENCIDO") group.expired += 1;
    if (item.status === "A_VENCER") group.expiring += 1;
    if (item.status === "PENDENTE") group.pending += 1;
  }

  const importance: Record<DocumentPriorityStatus, number> = {
    VENCIDO: 0,
    A_VENCER: 1,
    PENDENTE: 2,
  };
  const groups = Array.from(groupByAthlete.values()).sort((a, b) => {
    const urgency = (group: AthleteGroup) => group.expired ? 0 : group.expiring ? 1 : 2;
    return urgency(a) - urgency(b) || a.name.localeCompare(b.name, "pt-BR");
  });
  for (const group of groups) {
    group.items.sort((a, b) => importance[a.status] - importance[b.status] || a.documentName.localeCompare(b.documentName, "pt-BR"));
  }

  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(groups.length / pageSize));
  const requestedPage = Number(params.pagina ?? "1");
  const currentPage = Number.isSafeInteger(requestedPage)
    ? Math.min(Math.max(1, requestedPage), pages)
    : 1;
  const startIndex = (currentPage - 1) * pageSize;
  const visibleGroups = groups.slice(startIndex, startIndex + pageSize);
  const pageWindowStart = Math.max(1, Math.min(currentPage - 2, pages - 4));
  const visiblePageNumbers = Array.from(
    { length: Math.min(5, pages) },
    (_, index) => pageWindowStart + index,
  );

  const buildUrl = (nextStatus: string, nextPage?: number) => {
    const queryParams = new URLSearchParams();
    if (nextStatus) queryParams.set("status", nextStatus);
    if (categoryId) queryParams.set("categoria", categoryId);
    if (query) queryParams.set("q", query);
    if (nextPage && nextPage > 1) queryParams.set("pagina", String(nextPage));
    return `/prioridades${queryParams.size ? `?${queryParams.toString()}` : ""}`;
  };
  const statusLink = (next: string) => buildUrl(next);
  const pageLink = (next: number) => buildUrl(status, next);

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
        <Link className={styles.secondaryButton} href="/prioridades/notificacoes">Notificações →</Link>
      </header>

      {params.aviso === "enviado" ? <p role="status" style={{ color: "#b8ed62" }}>Aviso enviado ao Player autorizado.</p> : null}
      {params.aviso === "recente" ? <p role="status" style={{ color: "#fbd38d" }}>Já foi enviado um aviso recentemente para este atleta. Nenhuma mensagem duplicada.</p> : null}
      {params.aviso === "sem-player" ? <p role="status" style={{ color: "#fbd38d" }}>Nenhum Player com vínculo aprovado para esse atleta. Use “Abrir ficha” para solicitar documentos por link seguro ou e-mail.</p> : null}
      {params.aviso === "sem-pendencias" ? <p role="status" style={{ color: "#fbd38d" }}>Pendência não encontrada ou já regularizada.</p> : null}
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
            <h2>Prioridades por atleta</h2>
            <p>{groups.length} atleta(s) com {filtered.length} pendência(s) nos filtros selecionados · {data.rows.length} ocorrência(s) identificada(s) no total</p>
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

        {groups.length ? (
          <>
            <div className={styles.listInfo}>
              <strong>
                Mostrando {startIndex + 1}–{Math.min(startIndex + pageSize, groups.length)} de {groups.length} atleta(s)
              </strong>
              <span>Clique no atleta para ver os documentos. Exibindo até {pageSize} atletas por página.</span>
            </div>

            <div className={styles.athleteList}>
              {visibleGroups.map((group) => (
                <details className={styles.athleteGroup} key={group.id}>
                  <summary className={styles.athleteSummary}>
                    <span className={styles.athleteIdentity}>
                      <strong>{group.name}</strong>
                      <small>{Array.from(group.categories).join(" · ")}</small>
                    </span>
                    <span className={styles.itemCount}>
                      {group.items.length} {group.items.length === 1 ? "pendência" : "pendências"}
                    </span>
                    <span className={styles.groupBadges}>
                      {group.expired > 0 ? <span className={`${styles.status} ${styles.expired}`}>{group.expired} vencido(s)</span> : null}
                      {group.expiring > 0 ? <span className={`${styles.status} ${styles.expiring}`}>{group.expiring} a vencer</span> : null}
                      {group.pending > 0 ? <span className={`${styles.status} ${styles.pending}`}>{group.pending} pendente(s)</span> : null}
                    </span>
                    <span className={styles.expandLabel}>Ver documentos <span aria-hidden="true">⌄</span></span>
                  </summary>
                  <div className={styles.athleteDetails}>
                    <div className={styles.documentList}>
                      {group.items.map((item) => (
                        <div className={styles.documentItem} key={item.key}>
                          <div className={styles.documentDescription}>
                            <strong>{item.documentName}</strong>
                            <small>{item.categoryName} · {item.description}</small>
                          </div>
                          <span className={styles.documentExpiry}>
                            {item.expiresAt
                              ? `Validade: ${item.expiresAt.toLocaleDateString("pt-BR", { timeZone })}`
                              : "Sem validade informada"}
                          </span>
                          <span className={`${styles.status} ${item.status === "VENCIDO" ? styles.expired : item.status === "A_VENCER" ? styles.expiring : styles.pending}`}>
                            {STATUS_LABELS[item.status]}
                          </span>
                          {item.notificationKind !== "REVIEW" ? (
                            <form action={sendManualDocumentNotice}>
                              <input type="hidden" name="athleteId" value={group.id} />
                              <input type="hidden" name="priorityKey" value={item.key} />
                              <button type="submit" style={{ background: "#263e30", border: "1px solid #6f9a68", color: "#dfffc9", padding: "8px 10px", borderRadius: 8, cursor: "pointer" }}>
                                Solicitar pelo Player
                              </button>
                            </form>
                          ) : <small style={{ color: "#bcd3c4" }}>Aguardando ação do clube</small>}
                        </div>
                      ))}
                    </div>
                    {group.items.some((item) => item.notificationKind !== "REVIEW") ? (
                      <form action={sendManualDocumentNotice} style={{ marginTop: 12 }}>
                        <input type="hidden" name="athleteId" value={group.id} />
                        <button type="submit" style={{ background: "#a8df2f", color: "#101d14", borderRadius: 10, border: 0, padding: "10px 14px", fontWeight: 800, cursor: "pointer" }}>
                          Solicitar todas as pendências pelo Player
                        </button>
                      </form>
                    ) : null}
                    <Link className={styles.openLink} href={`/atletas/${encodeURIComponent(group.id)}/dados`}>
                      Abrir ficha documental do atleta →
                    </Link>
                  </div>
                </details>
              ))}
            </div>

            {pages > 1 ? (
              <nav className={styles.pagination} aria-label="Páginas de atletas">
                {currentPage > 1 ? <Link href={pageLink(currentPage - 1)}>← Anterior</Link> : <span className={styles.paginationDisabled}>← Anterior</span>}
                {visiblePageNumbers.map((pageNumber) => (
                  <Link
                    key={pageNumber}
                    href={pageLink(pageNumber)}
                    aria-current={pageNumber === currentPage ? "page" : undefined}
                    className={pageNumber === currentPage ? styles.paginationActive : undefined}
                  >
                    {pageNumber}
                  </Link>
                ))}
                {currentPage < pages ? <Link href={pageLink(currentPage + 1)}>Próxima →</Link> : <span className={styles.paginationDisabled}>Próxima →</span>}
              </nav>
            ) : null}
          </>
        ) : (
          <div className={styles.empty}>
            <strong>Nenhuma ocorrência encontrada</strong>
            <p>{data.rows.length ? "Tente alterar os filtros de pesquisa." : "Nenhum documento exige atenção neste momento. Confira também a configuração obrigatória por categoria."}</p>
          </div>
        )}
        <p className={styles.footerNote}>Os indicadores contabilizam ocorrências documentais; a lista agrupa cada atleta apenas uma vez. Documentos vencidos podem requerer nova aprovação. Esta página não modifica os registros automaticamente.</p>
      </section>
    </main>
  );
}
