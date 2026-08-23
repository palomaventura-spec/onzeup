import Link from "next/link";
import { requireOrganizationUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ClubPlanStatusCard from "@/components/ClubPlanStatusCard";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function daysLeft(date?: Date | null) {
  if (!date) return null;
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86400000));
}

export default async function Dashboard() {
  const user = await requireOrganizationUser();
  if (!user.organization?.onboardingCompleted) redirect("/onboarding-clube");

  const orgId = user.organizationId;
  const [categories, athletes, staff, trainings, matches, subscription, categoryList, trainingList] =
    await Promise.all([
      prisma.category.count({ where: { organizationId: orgId } }),
      prisma.athlete.count({ where: { organizationId: orgId, active: true } }),
      prisma.staffMember.count({ where: { organizationId: orgId } }),
      prisma.trainingSchedule.count({ where: { organizationId: orgId } }),
      prisma.match.count({ where: { organizationId: orgId } }),
      prisma.subscription.findUnique({ where: { organizationId: orgId } }),
      prisma.category.findMany({ where: { organizationId: orgId }, orderBy: { name: "asc" }, take: 5 }),
      prisma.trainingSchedule.findMany({
        where: { organizationId: orgId },
        include: { category: true },
        orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
        take: 5,
      }),
    ]);

  const trialDays = daysLeft(subscription?.trialEnds);
  const org = user.organization;

  return (
    <>
      <div className="clean-dashboard-hero">
        <div>
          <span className="page-eyebrow">ONZEUP CLUB</span>
          <h1>{org.publicName || org.name}</h1>
          <p>
            {[org.city, org.state].filter(Boolean).join(" • ") || "Sua organização já está pronta para começar."}
          </p>
        </div>
        {subscription?.status === "TRIAL" && trialDays !== null ? (
          <div className="trial-counter">
            <small>PERÍODO GRÁTIS</small>
            <strong>{trialDays}</strong>
            <span>dias restantes</span>
          </div>
        ) : null}
      </div>

      <ClubPlanStatusCard organizationId={orgId} />

      <section className="clean-kpi-grid">
        <Link href="/categorias"><small>CATEGORIAS</small><strong>{categories}</strong><span>{categories ? "Gerenciar categorias →" : "Criar primeira categoria →"}</span></Link>
        <Link href="/atletas"><small>ATLETAS</small><strong>{athletes}</strong><span>{athletes ? "Ver elenco →" : "Adicionar primeiro atleta →"}</span></Link>
        <Link href="/comissao"><small>COMISSÃO</small><strong>{staff}</strong><span>{staff ? "Gerenciar comissão →" : "Adicionar comissão →"}</span></Link>
        <Link href="/jogos"><small>JOGOS</small><strong>{matches}</strong><span>{matches ? "Ver jogos →" : "Cadastrar primeiro jogo →"}</span></Link>
      </section>

      <div className="clean-dashboard-grid">
        <section className="card clean-dashboard-panel">
          <div className="section-title-row">
            <div><span className="page-eyebrow">COMECE POR AQUI</span><h2>Seu ONZEUP</h2></div>
          </div>
          <div className="setup-list">
            <div className="done"><b>✓</b><span><strong>Clube criado</strong><small>{org.publicName || org.name}</small></span></div>
            <div className={categories ? "done" : ""}><b>{categories ? "✓" : "02"}</b><span><strong>Categoria inicial</strong><small>{categories ? categoryList.map(c => c.name).join(", ") : "Cadastre a primeira categoria"}</small></span><Link href="/categorias">Abrir →</Link></div>
            <div className={athletes ? "done" : ""}><b>{athletes ? "✓" : "03"}</b><span><strong>Adicionar atletas</strong><small>{athletes ? `${athletes} atleta(s) ativo(s)` : "Monte seu primeiro elenco"}</small></span><Link href="/atletas">Abrir →</Link></div>
            <div className={staff ? "done" : ""}><b>{staff ? "✓" : "04"}</b><span><strong>Cadastrar comissão</strong><small>{staff ? `${staff} membro(s)` : "Treinadores e equipe"}</small></span><Link href="/comissao">Abrir →</Link></div>
            <div className={matches ? "done" : ""}><b>{matches ? "✓" : "05"}</b><span><strong>Primeiro jogo</strong><small>{matches ? "Programação iniciada" : "Cadastre sua primeira partida"}</small></span><Link href="/jogos">Abrir →</Link></div>
          </div>
        </section>

        <section className="card clean-dashboard-panel">
          <div className="section-title-row">
            <div><span className="page-eyebrow">ROTINA</span><h2>Treinos cadastrados</h2></div>
            <Link href="/treinos">Gerenciar</Link>
          </div>
          {trainingList.length ? (
            <div className="simple-training-list">
              {trainingList.map(t => (
                <article key={t.id}>
                  <div><strong>{WEEKDAYS[t.weekday]}</strong><span>{t.startTime}–{t.endTime}</span></div>
                  <div><b>{t.category.name}</b><small>{t.location || "Local a definir"}</small></div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-dashboard-state">
              <strong>Nenhum treino cadastrado</strong>
              <p>Organize os horários recorrentes das categorias.</p>
              <Link className="btn-secondary" href="/treinos">Cadastrar treino</Link>
            </div>
          )}
        </section>
      </div>

      <section className="card clean-site-card">
        <div>
          <span className="page-eyebrow">PRESENÇA DIGITAL</span>
          <h2>Seu site público já está criado.</h2>
          <p className="muted">Categorias, elenco, comissão e jogos podem alimentar automaticamente esta página.</p>
        </div>
        <div>
          <Link className="dashboard-secondary-btn" href="/organizacao">Configurar site</Link>
          <Link className="dashboard-primary-btn" href={`/o/${org.slug}`} target="_blank">Abrir site público ↗</Link>
        </div>
      </section>
    </>
  );
}
