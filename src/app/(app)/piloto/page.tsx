import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";

export default async function PilotPage() {
  const user = await requireOrganizationUser();

  const [categories, athletes, staff, trainings, matches, guardians] =
    await Promise.all([
      prisma.category.count({ where: { organizationId: user.organizationId } }),
      prisma.athlete.count({ where: { organizationId: user.organizationId, active: true } }),
      prisma.staffMember.count({ where: { organizationId: user.organizationId } }),
      prisma.trainingSchedule.count({ where: { organizationId: user.organizationId } }),
      prisma.match.count({ where: { organizationId: user.organizationId } }),
      prisma.athlete.count({
        where: {
          organizationId: user.organizationId,
          active: true,
          OR: [
            { guardianName: { not: null } },
            { guardianPhone: { not: null } },
            { guardianEmail: { not: null } },
          ],
        },
      }),
    ]);

  const checks = [
    ["Organização configurada", Boolean(user.organization?.onboardingCompleted)],
    ["Categorias cadastradas", categories > 0],
    ["Atletas ativos", athletes > 0],
    ["Comissão cadastrada", staff > 0],
    ["Treinos configurados", trainings > 0],
    ["Jogo cadastrado", matches > 0],
    ["Responsáveis vinculados", guardians > 0],
    ["Storage de produção", Boolean(process.env.BLOB_READ_WRITE_TOKEN)],
  ] as const;

  const done = checks.filter(([, ok]) => ok).length;

  return (
    <>
      <div className="page-head">
        <div>
          <span className="page-eyebrow">PILOT READY</span>
          <h1>Preparação para o piloto</h1>
          <p className="muted">
            Checklist técnico e operacional antes de publicar o ambiente externo.
          </p>
        </div>
        <span className="badge">{done}/{checks.length} pronto(s)</span>
      </div>

      <section className="card pilot-readiness">
        <div className="pilot-progress">
          <span style={{ width: `${Math.round((done / checks.length) * 100)}%` }} />
        </div>

        <div className="pilot-check-grid">
          {checks.map(([label, ok]) => (
            <article className={ok ? "ready" : ""} key={label}>
              <span>{ok ? "✓" : "!"}</span>
              <strong>{label}</strong>
              <small>{ok ? "Pronto" : "Revisar antes do deploy"}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="card pilot-notes">
        <h2>Antes de abrir o domínio</h2>
        <p>
          Teste Clube e ONZE Player em celular e desktop, confirme uploads, QTR,
          WhatsApp, site público, permissões e vínculos. No Vercel, configure
          DATABASE_URL, SESSION_SECRET e BLOB_READ_WRITE_TOKEN.
        </p>
      </section>
    </>
  );
}
