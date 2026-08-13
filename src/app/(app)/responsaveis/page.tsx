import WhatsAppAction from "@/components/WhatsAppAction";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";

type Group = {
  key: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  athletes: {
    id: string;
    name: string;
    nickname?: string | null;
    category?: string | null;
    pending: number;
  }[];
};

export default async function GuardiansPage() {
  const user = await requireOrganizationUser();

  const athletes = await prisma.athlete.findMany({
    where: { organizationId: user.organizationId, active: true },
    include: {
      category: true,
      charges: { where: { status: "PENDING" } },
    },
    orderBy: { name: "asc" },
  });

  const groups = new Map<string, Group>();

  athletes.forEach((athlete) => {
    const key =
      athlete.guardianEmail?.toLowerCase().trim() ||
      athlete.guardianPhone?.replace(/\D/g, "") ||
      `athlete:${athlete.id}`;

    const existing = groups.get(key) || {
      key,
      name: athlete.guardianName || "Responsável não informado",
      phone: athlete.guardianPhone,
      email: athlete.guardianEmail,
      athletes: [],
    };

    existing.athletes.push({
      id: athlete.id,
      name: athlete.name,
      nickname: athlete.nickname,
      category: athlete.category?.name,
      pending: athlete.charges.length,
    });

    groups.set(key, existing);
  });

  const list = [...groups.values()];

  return (
    <>
      <div className="page-head">
        <div>
          <span className="page-eyebrow">FAMÍLIAS</span>
          <h1>Responsáveis</h1>
          <p className="muted">Visão agrupada dos contatos privados vinculados aos atletas.</p>
        </div>
        <span className="badge">{list.length} responsável(is)</span>
      </div>

      <div className="guardian-grid">
        {list.map((guardian) => {
          const orgName = user.organization?.publicName || user.organization?.name || "ONZEUP";
          const athleteNames = guardian.athletes.map((athlete) => athlete.nickname || athlete.name).join(", ");
          const message = `Olá, ${guardian.name}! Aqui é da ${orgName}. Entramos em contato sobre ${athleteNames}.`;

          return (
            <article className="guardian-card" key={guardian.key}>
              <div className="guardian-avatar">
                {guardian.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="guardian-card-main">
                <div>
                  <h3>{guardian.name}</h3>
                  <p>{guardian.phone || "Telefone não informado"}</p>
                  <small>{guardian.email || "E-mail não informado"}</small>
                </div>

                <div className="guardian-athletes">
                  {guardian.athletes.map((athlete) => (
                    <span key={athlete.id}>
                      <strong>{athlete.nickname || athlete.name}</strong>
                      <small>{athlete.category || "Sem categoria"}{athlete.pending ? ` • ${athlete.pending} cobrança(s)` : ""}</small>
                    </span>
                  ))}
                </div>

                <WhatsAppAction phone={guardian.phone} message={message} label="Mensagem" />
              </div>
            </article>
          );
        })}
      </div>

      {!list.length ? (
        <div className="card empty">Cadastre os dados do responsável dentro do cadastro do atleta.</div>
      ) : null}

      <div className="private-note" style={{ marginTop: 18 }}>
        Estes dados são privados e nunca são exibidos no site público da organização.
      </div>
    </>
  );
}
