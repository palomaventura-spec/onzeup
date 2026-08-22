import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import NotificationBell from "@/components/NotificationBell";

const groups = [
  {
    title: "GESTÃO",
    items: [
      ["/dashboard", "Dashboard"],
      ["/agenda", "Agenda"],
      ["/categorias", "Categorias"],
      ["/comissao", "Comissão"],
      ["/atletas", "Atletas"],
    ],
  },
  {
    title: "FUTEBOL",
    items: [
      ["/treinos", "Treinos"],
      ["/jogos", "Jogos"],
      ["/qtr", "QTR"],
    ],
  },
  {
    title: "RELACIONAMENTO",
    items: [
      ["/comunicacao", "Comunicação"],
      ["/vinculos-player", "Vínculos Player"],
    ],
  },
  {
    title: "ADMINISTRAÇÃO",
    items: [
      ["/financeiro", "Financeiro"],
      ["/organizacao", "Site e Configurações"],
      ["/planos", "Plano e assinatura"],
      ["/integracoes", "Integrações"],
      ["/ajuda", "Ajuda"],
    ],
  },
] as const;

export default async function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="shell">
      <aside className="sidebar club-sidebar-final">
        <div className="club-sidebar-head">
          <div className="brand">
            ONZE<span>UP</span>
          </div>
          <p>O futuro do futebol começa na base.</p>
        </div>

        <div className="club-menu-groups">
          {groups.map((group) => (
            <section className="club-menu-group" key={group.title}>
              <h3>{group.title}</h3>
              <nav>
                {group.items.map(([href, label]) => (
                  <Link href={href} key={href}>
                    {label}
                  </Link>
                ))}
              </nav>
            </section>
          ))}
        </div>

        <form
          className="club-sidebar-logout"
          action="/api/auth/logout"
          method="post"
          style={{
            position: "static",
            width: "100%",
            marginTop: "24px",
            paddingTop: "18px",
          }}
        >
          <button
            className="btn-secondary"
            type="submit"
            style={{ position: "static", width: "100%", display: "block" }}
          >
            Sair
          </button>
        </form>
      </aside>

      <main className="main">
        {user?.organizationId ? (
          <div className="club-top-actions">
            <NotificationBell organizationId={user.organizationId} />
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
