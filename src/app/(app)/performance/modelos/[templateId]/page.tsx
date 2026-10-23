import PendingSubmitButton from "@/components/PendingSubmitButton";
import Link from "next/link";
import styles from "./ModelEditor.module.css";
import { notFound, redirect } from "next/navigation";
import { requireClubPermission } from "@/lib/club-access";
import { hasEffectiveClubElite } from "@/lib/billing-entitlements";
import { prisma } from "@/lib/prisma";
import { format11UPName, parsePerformanceClassification } from "@/lib/performance-model-catalog";
import { saveClubEvaluationModel, restoreClubEvaluationModel } from "../actions";

const AREA_NAMES = {
  PHYSICAL: "Física", TECHNICAL: "Técnica", TACTICAL: "Tática",
  COGNITIVE: "Cognitiva", EMOTIONAL: "Emocional",
} as const;

export default async function EditPerformanceModel({params}:{params: Promise<{templateId:string}>}) {
  const user = await requireClubPermission("PERFORMANCE_MANAGE");
  if (user.role === "SUPER_ADMIN") redirect("/performance?erro=permissao");
  const {templateId} = await params;
  const [subscription, organization, model] = await Promise.all([
    prisma.subscription.findUnique({where:{organizationId:user.organizationId}}),
    prisma.organization.findUnique({where:{id:user.organizationId},select:{accessStatus:true,complimentaryUntil:true}}),
    prisma.performanceTemplate.findFirst({
      where:{id:templateId,organizationId:user.organizationId,active:true,modelFamilyKey:{not:null}},
      include:{criteria:{orderBy:[{sortOrder:"asc"},{label:"asc"}],include:{levels:{orderBy:{score:"asc"}}}}},
    }),
  ]);
  if (!hasEffectiveClubElite({plan:subscription?.plan,status:subscription?.status,trialEnds:subscription?.trialEnds,
    currentPeriodEnd:subscription?.currentPeriodEnd,accessStatus:organization?.accessStatus,
    complimentaryUntil:organization?.complimentaryUntil})) redirect("/performance?erro=elite");
  if (!model) notFound();
  const stage = parsePerformanceClassification(model.classificationJson);
  return (
    <main style={{maxWidth:1100,margin:"0 auto",padding:"24px 16px 80px"}}>
      <div className="page-head">
        <div>
          <span className="page-eyebrow">11UP PERFORMANCE · EDITOR DE MODELO</span>
          <h1>{format11UPName(model.name)}</h1>
          <p className="muted">{model.athleteRole === "GOALKEEPER" ? "Goleiro" : "Jogador de linha"} · Versão {model.version}</p>
        </div>
        <Link className="btn btn-secondary" href="/performance/modelos">Voltar aos modelos</Link>
      </div>
      <section className="card" style={{marginBottom:18}}>
        <strong>Histórico protegido</strong>
        <p className="muted" style={{marginBottom:0}}>Ao salvar, o sistema cria uma nova versão. Critérios e descrições anteriores permanecem ligados às avaliações já registradas. Desmarque “Ativo” para não usar um critério nas próximas avaliações.</p>
      </section>
      <form action={saveClubEvaluationModel} style={{display:"grid",gap:16}}>
        <input type="hidden" name="templateId" value={model.id}/>
        <section className="card form" style={{width:"100%",maxWidth:"none"}}>
          <label>Nome do modelo
            <input name="name" defaultValue={format11UPName(model.name)} required maxLength={120}/>
          </label>
          <label>Descrição
            <textarea name="description" defaultValue={model.description ?? ""} rows={2} maxLength={800}/>
          </label>
        </section>
        <section className="card" style={{display:"grid",gap:12}}>
          <h2 style={{margin:0}}>Estágios de classificação</h2>
          <label className={styles.checkRow}>
            <input className={styles.checkbox} type="checkbox" name="stageEnabled" value="1" defaultChecked={Boolean(stage)}/>
            <span className={styles.checkText}>Usar classificação percentual de três estágios neste modelo</span>
          </label>
          <p className="muted" style={{margin:0}}>Na planilha: Estágio 1 até 35%; Estágio 2 acima de 35% até 70%; Estágio 3 acima de 70%.</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
            <label>Limite do estágio 1 (%)
              <input type="number" name="urgencyMax" min="0" max="99" step="0.1" defaultValue={stage?.urgencyMax ?? 35}/>
            </label>
            <label>Limite do estágio 2 (%)
              <input type="number" name="attentionMax" min="1" max="100" step="0.1" defaultValue={stage?.attentionMax ?? 70}/>
            </label>
          </div>
        </section>
        {Object.entries(AREA_NAMES).map(([area,name]) => {
          const criteria = model.criteria.filter((item) => item.area === area);
          return (
            <section className="card" key={area} style={{display:"grid",gap:10}}>
              <h2 style={{margin:0}}>Área {name} · {criteria.filter((item)=>item.active).length} critérios</h2>
              {criteria.length ? criteria.map((criterion) => (
                <details key={criterion.id} style={{border:"1px solid var(--line)",borderRadius:12,padding:12}}>
                  <summary style={{cursor:"pointer",fontWeight:700}}>{criterion.label}{!criterion.active ? " (inativo)" : ""}</summary>
                  <div style={{display:"grid",gap:10,marginTop:12}}>
                    <label className={styles.checkRow}>
                      <input className={styles.checkbox} type="checkbox" name={`active_${criterion.id}`} value="1" defaultChecked={criterion.active}/>
                      <span className={styles.checkText}>Ativo para próximas avaliações</span>
                    </label>
                    <label>Nome do critério
                      <input name={`label_${criterion.id}`} defaultValue={criterion.label} maxLength={160} required/>
                    </label>
                    <label>Descrição
                      <textarea name={`description_${criterion.id}`} defaultValue={criterion.description ?? ""} maxLength={600} rows={2}/>
                    </label>
                    <label>Ordem dentro do modelo
                      <input type="number" name={`order_${criterion.id}`} min="1" max="999" defaultValue={criterion.sortOrder}/>
                    </label>
                    <label>Área
                      <select name={`area_${criterion.id}`} defaultValue={criterion.area}>
                        {Object.entries(AREA_NAMES).map(([areaCode,areaName]) => <option value={areaCode} key={areaCode}>{areaName}</option>)}
                      </select>
                    </label>
                    <h3 style={{margin:"8px 0 0"}}>Descrições das notas</h3>
                    {criterion.levels.map((level) => (
                      <div key={level.id} style={{display:"grid",gap:8,background:"rgba(128,128,128,.04)",borderRadius:8,padding:10}}>
                        <label>Nota {level.score} — classificação
                          <input name={`level_label_${criterion.id}_${level.score}`} defaultValue={level.label} required maxLength={100}/>
                        </label>
                        <label>Descrição da nota {level.score}
                          <textarea name={`level_description_${criterion.id}_${level.score}`} defaultValue={level.description} required rows={2} maxLength={1200}/>
                        </label>
                      </div>
                    ))}
                  </div>
                </details>
              )) : <p className="muted">Nenhum critério nesta área.</p>}
            </section>
          );
        })}
        <section className="card" style={{display:"grid",gap:10}}>
          <h2 style={{margin:0}}>Adicionar critério</h2>
          <p className="muted" style={{margin:0}}>Opcional: adicione um novo critério nesta versão. As descrições das quatro notas poderão ser personalizadas na edição seguinte.</p>
          <label>Nome do novo critério
            <input name="newLabel" maxLength={160} placeholder="Ex.: Antecipação ofensiva"/>
          </label>
          <label>Descrição
            <textarea name="newDescription" rows={2} maxLength={600}/>
          </label>
          <label>Área
            <select name="newArea" defaultValue="TECHNICAL">
              {Object.entries(AREA_NAMES).map(([code,label])=><option key={code} value={code}>{label}</option>)}
            </select>
          </label>
        </section>
        <PendingSubmitButton pendingText="Salvando…" className="btn" type="submit">Salvar como nova versão</PendingSubmitButton>
      </form>
      <section className="card" style={{marginTop:22}}>
        <h2>Restaurar padrão inicial</h2>
        <p className="muted">Cria uma nova versão igual à primeira versão deste modelo. Não apaga nem modifica avaliações anteriores.</p>
        <form action={restoreClubEvaluationModel}>
          <input type="hidden" name="templateId" value={model.id}/>
          <PendingSubmitButton pendingText="Salvando…" className="btn btn-secondary" type="submit">Restaurar padrão em nova versão</PendingSubmitButton>
        </form>
      </section>
    </main>
  );
}
