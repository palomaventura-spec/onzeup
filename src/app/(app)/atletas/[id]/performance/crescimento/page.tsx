import Link from "next/link";
import { notFound } from "next/navigation";

import SafeAvatar from "@/components/SafeAvatar";
import ModuleTabs from "@/components/ModuleTabs";
import GrowthCharts, { type BoneAgeMarker, type GrowthChartRow } from "@/components/growth/GrowthCharts";
import {
  deleteBoneAgeAssessment,
  deleteClubGrowthMeasurement,
  generateClubGrowthReport,
  saveBoneAgeAssessment,
  saveClubGrowthMeasurement,
  saveClubGrowthProfile,
  saveGrowthProfessionalAccess,
} from "@/app/actions/growth";
import {
  buildHeightChartRows,
  buildMeasurementMetrics,
  exactAgeAt,
  familyTargetHeight,
  GROWTH_DISCLAIMER,
  khamisRocheProjection,
} from "@/lib/growth-calculations";
import { requireClubGrowthAccess } from "@/lib/growth-access";
import { getEffectiveClubRole, hasClubPermission } from "@/lib/club-permissions";
import { safeDecryptPrivateData } from "@/lib/private-data-crypto";
import { prisma } from "@/lib/prisma";

function n(value: unknown) {
  if (value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function dateInput(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}
function dateLabel(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—";
}
function cm(value: number | null | undefined) {
  return value == null ? "—" : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} cm`;
}
function heightDisplay(value: number | null | undefined) {
  if (value == null) return "—";
  const meters = value / 100;
  return `${meters.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m (${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} cm)`;
}
function kg(value: number | null | undefined) {
  return value == null ? "—" : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`;
}
function errorMessage(value?: string) {
  const map: Record<string, string> = {
    nascimento: "Cadastre a data de nascimento exata na ficha privada antes de registrar medições de crescimento.",
    medicao: "Informe data, altura e peso válidos.",
    "data-futura": "A data da medição não pode estar no futuro.",
    "idade-ossea": "Confira a data, o método e a idade óssea informada em meses.",
    documento: "O documento selecionado não pertence a este atleta.",
    "sem-permissao": "A geração do relatório de crescimento é exclusiva do gestor.",
    "relatorio-sem-medicoes": "Cadastre pelo menos uma medição antes de gerar o relatório de crescimento.",
  };
  return value ? map[value] || "Não foi possível concluir a operação." : null;
}
function sourceLabel(source: string) {
  if (source === "PROFESSIONAL") return "Profissional";
  return "Clube";
}
function boneMethodLabel(method: string) {
  if (method === "GREULICH_PYLE") return "Greulich-Pyle";
  if (method === "TANNER_WHITEHOUSE") return "Tanner-Whitehouse";
  return "Outro";
}

export default async function AthleteGrowthPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; status?: string; edit?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const access = await requireClubGrowthAccess(id, "view");

  const athlete = await prisma.athlete.findFirst({
    where: { id, organizationId: access.user.organizationId },
    include: {
      category: true,
      privateData: { select: { birthDate: true } },
      growthProfile: true,
      bodyMeasurements: { orderBy: [{ measuredAt: "asc" }, { createdAt: "asc" }] },
      boneAgeAssessments: { orderBy: { examinedAt: "desc" }, include: { reportDocument: { select: { id: true, title: true, originalFileName: true } } } },
      documents: {
        where: { deletedAt: null, status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, originalFileName: true, category: true },
      },
    },
  });
  if (!athlete) notFound();

  const birthDate = athlete.privateData?.birthDate ?? null;
  const profile = athlete.growthProfile;
  const metrics = buildMeasurementMetrics(
    athlete.bodyMeasurements.map((item) => ({
      id: item.id,
      measuredAt: item.measuredAt,
      heightCm: n(item.heightCm),
      weightKg: n(item.weightKg),
      bmi: n(item.bmi),
      wingspanCm: n(item.wingspanCm),
      sittingHeightCm: n(item.sittingHeightCm),
    })),
    birthDate,
  );
  const latest = metrics[metrics.length - 1] ?? null;
  const currentAge = birthDate ? exactAgeAt(birthDate, latest?.measuredAt ?? new Date()) : null;
  const target = familyTargetHeight({
    sex: profile?.referenceSex,
    fatherHeightCm: n(profile?.fatherHeightCm),
    motherHeightCm: n(profile?.motherHeightCm),
  });
  const khamis = latest && currentAge
    ? khamisRocheProjection({
        sex: profile?.referenceSex,
        ageYears: currentAge.decimalYears,
        heightCm: latest.heightCm,
        weightKg: latest.weightKg,
        fatherHeightCm: n(profile?.fatherHeightCm),
        motherHeightCm: n(profile?.motherHeightCm),
      })
    : null;

  const chartRows = buildHeightChartRows({ measurements: metrics, sex: profile?.referenceSex }) as GrowthChartRow[];
  const boneAgeMarkers: BoneAgeMarker[] = athlete.boneAgeAssessments.flatMap((item) => {
    const age = birthDate ? exactAgeAt(birthDate, item.examinedAt) : null;
    return age ? [{ id: item.id, ageMonthsAtExam: age.totalMonths, dateLabel: dateLabel(item.examinedAt), label: boneMethodLabel(item.method) }] : [];
  });

  const selected = query.edit ? athlete.bodyMeasurements.find((m) => m.id === query.edit) ?? null : null;
  const effectiveRole = getEffectiveClubRole(access.user);
  const canManageGrowthProfile = effectiveRole === "MANAGER" || effectiveRole === "COORDINATOR";
  const canManageStaff = hasClubPermission(access.user, "STAFF_EDIT");
  const growthStaff = canManageStaff && athlete.categoryId
    ? await prisma.staffMember.findMany({
        where: { organizationId: access.user.organizationId, active: true, userId: { not: null }, OR: [{ categoryId: athlete.categoryId }, { categoryId: null }] },
        orderBy: { name: "asc" },
        select: {
          id: true, name: true, roleTitle: true,
          categoryPermissions: {
            where: { categoryId: athlete.categoryId, sport: "BOTH", permission: { in: ["GROWTH_VIEW", "GROWTH_MANAGE"] }, enabled: true },
            select: { permission: true },
          },
        },
      })
    : [];
  const medicalDocs = athlete.documents.filter((doc) => ["MEDICAL_EXAM", "OTHER"].includes(doc.category));
  const error = errorMessage(query.erro);

  return (
    <main className="growth-page">
      <section className="growth-hero">
        <div className="growth-hero-main">
          <div className="growth-avatar"><SafeAvatar src={athlete.photoUrl} name={athlete.nickname || athlete.name} alt={athlete.name} /></div>
          <div>
            <span className="growth-kicker">11UP PERFORMANCE · CLUB ELITE · PRIVADO</span>
            <h1>Crescimento e Desenvolvimento Físico</h1>
            <p>{athlete.nickname || athlete.name} · {athlete.category?.name || "Sem categoria"}</p>
          </div>
        </div>
        <div className="growth-hero-actions">
          <span className="growth-access-badge active">Acesso privado · Club Elite</span>
          <Link href={`/atletas/${athlete.id}/performance`}>← Performance</Link>
          {effectiveRole === "MANAGER" ? (
            <form action={generateClubGrowthReport} className="growth-export-form">
              <input type="hidden" name="athleteId" value={athlete.id} />
              <button className="growth-export-button" type="submit">Gerar relatório / PDF</button>
            </form>
          ) : null}
        </div>
      </section>

      <ModuleTabs
        className="performance-module-tabs growth-tabs"
        ariaLabel="Navegação da performance do atleta"
        items={[
          { label: "Visão geral", href: `/atletas/${athlete.id}/performance` },
          { label: "Treino", href: `/atletas/${athlete.id}/performance/treino` },
          { label: "Jogo", href: `/atletas/${athlete.id}/performance/jogo` },
          { label: "GPS", href: `/atletas/${athlete.id}/performance/gps` },
          { label: "Avaliações", href: `/atletas/${athlete.id}/performance/avaliacoes` },
          { label: "Crescimento", href: `/atletas/${athlete.id}/performance/crescimento`, active: true },
          { label: "Relatórios", href: `/atletas/${athlete.id}/performance/relatorios` },
        ]}
      />

      <div className="growth-warning"><strong>Acompanhamento esportivo privado.</strong> {GROWTH_DISCLAIMER}</div>
      {error ? <div className="growth-error">{error}</div> : null}

      <section className="growth-kpis">
        <article><span>ALTURA ATUAL</span><strong>{heightDisplay(latest?.heightCm)}</strong><small>{latest ? dateLabel(latest.measuredAt) : "Sem medição"}</small></article>
        <article><span>PESO ATUAL</span><strong>{kg(latest?.weightKg)}</strong><small>IMC {latest?.bmi?.toFixed(1) || "—"}</small></article>
        <article><span>IDADE EXATA</span><strong>{currentAge?.label || "—"}</strong><small>na data da medição</small></article>
        <article><span>CRESCIMENTO</span><strong>{latest?.growthDeltaCm == null ? "—" : `${latest.growthDeltaCm > 0 ? "+" : ""}${latest.growthDeltaCm} cm`}</strong><small>desde a medição anterior</small></article>
        <article><span>VELOCIDADE</span><strong>{latest?.growthVelocityCmPerYear == null ? "—" : `${latest.growthVelocityCmPerYear} cm/ano`}</strong><small>entre as duas últimas medições</small></article>
        <article><span>ALTURA-ALVO FAMILIAR</span><strong>{target ? heightDisplay(target.centerCm) : "—"}</strong><small>{target ? `${cm(target.lowCm)} a ${cm(target.highCm)}` : "Alturas parentais não informadas"}</small></article>
        <article><span>KHAMIS-ROCHE</span><strong>{khamis ? heightDisplay(khamis.centralCm) : "—"}</strong><small>{khamis ? `${khamis.percentReached}% da projeção · ±${khamis.approximateErrorCm} cm` : "Dados insuficientes ou idade fora do método"}</small></article>
      </section>

      {khamis ? (
        <section className="growth-projection-notice">
          <strong>{khamis.label}</strong>
          <span>{khamis.dynamicNotice}</span>
          <span>Faixa aproximada: {cm(khamis.lowCm)} a {cm(khamis.highCm)}.</span>
          <small>Método estatístico histórico desenvolvido em população específica; não representa certeza individual.</small>
        </section>
      ) : null}

      {metrics.length ? (
        <GrowthCharts
          rows={chartRows}
          boneAgeMarkers={boneAgeMarkers}
          adultProjection={khamis ? {
            ageMonths: 216,
            centralCm: khamis.centralCm,
            lowCm: khamis.lowCm,
            highCm: khamis.highCm,
            method: "Khamis-Roche",
          } : null}
          familyTarget={target ? {
            ageMonths: 216,
            centerCm: target.centerCm,
            lowCm: target.lowCm,
            highCm: target.highCm,
          } : null}
        />
      ) : (
        <section className="growth-empty"><span>📈</span><h2>A curva começa na primeira medição</h2><p>Registre altura e peso para iniciar o acompanhamento longitudinal do atleta.</p></section>
      )}

      {access.canManageGrowth ? (
        <section className="growth-admin-grid">
          {canManageGrowthProfile ? (
          <article className="growth-card">
            <div className="growth-card-head"><div><span>REFERÊNCIAS DE CRESCIMENTO</span><h2>Perfil privado de crescimento</h2></div></div>
            <form action={saveClubGrowthProfile} className="growth-form">
              <input type="hidden" name="athleteId" value={athlete.id} />
              <label>Referência para curvas e cálculos
                <select name="referenceSex" defaultValue={profile?.referenceSex || ""} required>
                  <option value="" disabled>Selecionar</option><option value="BOY">Menino</option><option value="GIRL">Menina</option>
                </select>
              </label>
              <div className="growth-form-row">
                <label>Altura da mãe (cm)<input name="motherHeightCm" type="number" step="0.1" min="120" max="220" defaultValue={n(profile?.motherHeightCm) ?? ""} /></label>
                <label>Altura do pai (cm)<input name="fatherHeightCm" type="number" step="0.1" min="120" max="230" defaultValue={n(profile?.fatherHeightCm) ?? ""} /></label>
              </div>
              <button className="growth-primary" type="submit">Salvar perfil privado</button>
            </form>
          </article>
          ) : null}

          {canManageStaff && athlete.categoryId ? (
            <article className="growth-card">
              <div className="growth-card-head"><div><span>PROFISSIONAIS AUTORIZADOS</span><h2>Acesso ao crescimento</h2><p>Permissões restritas à categoria atual do atleta. Dados continuam privados.</p></div></div>
              {growthStaff.length ? <div className="growth-staff-list">{growthStaff.map((staff) => {
                const canView = staff.categoryPermissions.some((p) => p.permission === "GROWTH_VIEW");
                const canManage = staff.categoryPermissions.some((p) => p.permission === "GROWTH_MANAGE");
                return <form action={saveGrowthProfessionalAccess} key={staff.id} className="growth-staff-row">
                  <input type="hidden" name="athleteId" value={athlete.id} /><input type="hidden" name="staffMemberId" value={staff.id} />
                  <div><strong>{staff.name}</strong><small>{staff.roleTitle}</small></div>
                  <label><input type="checkbox" name="allowView" value="true" defaultChecked={canView || canManage} /> Ver</label>
                  <label><input type="checkbox" name="allowManage" value="true" defaultChecked={canManage} /> Registrar</label>
                  <button type="submit">Salvar</button>
                </form>;
              })}</div> : <p className="muted">Nenhum profissional com usuário interno disponível para esta categoria.</p>}
            </article>
          ) : null}

          <article className="growth-card" id="nova-medicao">
            <div className="growth-card-head"><div><span>MEDIÇÃO</span><h2>{selected ? "Editar medição" : "Adicionar medição"}</h2></div></div>
            <form action={saveClubGrowthMeasurement} className="growth-form">
              <input type="hidden" name="athleteId" value={athlete.id} />
              {selected ? <input type="hidden" name="measurementId" value={selected.id} /> : null}
              <label>Data<input name="measuredAt" type="date" required defaultValue={dateInput(selected?.measuredAt || new Date())} /></label>
              <div className="growth-form-row">
                <label>Altura (cm)<input name="heightCm" type="number" min="40" max="250" step="0.1" required defaultValue={n(selected?.heightCm) ?? ""} /></label>
                <label>Peso (kg)<input name="weightKg" type="number" min="5" max="250" step="0.1" required defaultValue={n(selected?.weightKg) ?? ""} /></label>
              </div>
              <details><summary>Medições avançadas</summary><div className="growth-advanced">
                <label>Envergadura (cm)<input name="wingspanCm" type="number" step="0.1" defaultValue={n(selected?.wingspanCm) ?? ""} /></label>
                <label>Altura sentada (cm)<input name="sittingHeightCm" type="number" step="0.1" defaultValue={n(selected?.sittingHeightCm) ?? ""} /></label>
                <label>Gordura corporal (%)<input name="bodyFatPercent" type="number" step="0.1" defaultValue={n(selected?.bodyFatPercent) ?? ""} /></label>
                <label>Massa muscular (kg)<input name="muscleMassKg" type="number" step="0.1" defaultValue={n(selected?.muscleMassKg) ?? ""} /></label>
                <label className="wide">Observação<textarea name="notes" rows={3} defaultValue={selected?.notes || ""} /></label>
              </div></details>
              {!birthDate ? <p className="growth-error">Cadastre a data de nascimento exata na ficha privada antes de salvar.</p> : null}
              <div className="growth-form-actions"><button className="growth-primary" disabled={!birthDate} type="submit">{selected ? "Salvar alterações" : "Adicionar medição"}</button>{selected ? <Link href={`/atletas/${athlete.id}/performance/crescimento`}>Cancelar</Link> : null}</div>
            </form>
          </article>
        </section>
      ) : null}

      <section className="growth-card">
        <div className="growth-card-head"><div><span>HISTÓRICO</span><h2>Medições físicas</h2></div><b>{metrics.length} registro(s)</b></div>
        {metrics.length ? <div className="growth-table-wrap"><table className="growth-table"><thead><tr><th>Data</th><th>Idade</th><th>Altura</th><th>Peso</th><th>IMC</th><th>Δ altura</th><th>cm/ano</th><th>Enverg./Alt.</th><th>Origem</th>{access.canManageGrowth ? <th>Ações</th> : null}</tr></thead><tbody>
          {[...metrics].reverse().map((item) => {
            const original = athlete.bodyMeasurements.find((m) => m.id === item.id)!;
            return <tr key={item.id}><td>{dateLabel(item.measuredAt)}</td><td>{item.exactAge?.label || "—"}</td><td>{cm(item.heightCm)}</td><td>{kg(item.weightKg)}</td><td>{item.bmi?.toFixed(1) || "—"}</td><td>{item.growthDeltaCm == null ? "—" : `${item.growthDeltaCm > 0 ? "+" : ""}${item.growthDeltaCm} cm`}</td><td>{item.growthVelocityCmPerYear == null ? "—" : `${item.growthVelocityCmPerYear}`}</td><td>{item.wingspanHeightRatio ?? "—"}</td><td>{sourceLabel(original.measurementSource)}</td>{access.canManageGrowth ? <td><div className="growth-actions"><Link href={`?edit=${item.id}#nova-medicao`}>Editar</Link><form action={deleteClubGrowthMeasurement}><input type="hidden" name="athleteId" value={athlete.id} /><input type="hidden" name="measurementId" value={item.id} /><button type="submit">Excluir</button></form></div></td> : null}</tr>;
          })}
        </tbody></table></div> : <p className="muted">Nenhuma medição registrada.</p>}
      </section>

      <section className="growth-card">
        <div className="growth-card-head"><div><span>IDADE ÓSSEA · OPCIONAL</span><h2>Informação complementar privada</h2><p>O sistema apenas registra o dado informado por profissional/laudo. Não calcula maturação ou diagnóstico.</p></div></div>
        {access.canManageGrowth ? <form action={saveBoneAgeAssessment} className="growth-form growth-bone-form">
          <input type="hidden" name="athleteId" value={athlete.id} />
          <label>Data do exame<input name="examinedAt" type="date" required /></label>
          <label>Idade óssea (meses)<input name="boneAgeMonths" type="number" min="12" max="240" required /></label>
          <label>Método<select name="method" defaultValue="GREULICH_PYLE"><option value="GREULICH_PYLE">Greulich-Pyle</option><option value="TANNER_WHITEHOUSE">Tanner-Whitehouse</option><option value="OTHER">Outro</option></select></label>
          <label>Profissional / referência do laudo<input name="professional" /></label>
          <label>Documento anexado<select name="reportDocumentId" defaultValue=""><option value="">Sem documento vinculado</option>{medicalDocs.map((doc) => <option value={doc.id} key={doc.id}>{doc.title || doc.originalFileName}</option>)}</select></label>
          <label className="wide">Observação<textarea name="notes" rows={2} /></label>
          <button className="growth-primary" type="submit">Registrar informação de idade óssea</button>
        </form> : null}
        {athlete.boneAgeAssessments.length ? <div className="growth-bone-list">{athlete.boneAgeAssessments.map((item) => <article key={item.id}><div><strong>{dateLabel(item.examinedAt)}</strong><span>{boneMethodLabel(item.method)} · {item.boneAgeMonths} meses</span>{safeDecryptPrivateData(item.professionalEncrypted) ? <small>Profissional: {safeDecryptPrivateData(item.professionalEncrypted)}</small> : null}{safeDecryptPrivateData(item.notesEncrypted) ? <small>{safeDecryptPrivateData(item.notesEncrypted)}</small> : null}{item.reportDocument ? <small>Documento: {item.reportDocument.title || item.reportDocument.originalFileName}</small> : null}</div>{access.canManageGrowth ? <form action={deleteBoneAgeAssessment}><input type="hidden" name="athleteId" value={athlete.id} /><input type="hidden" name="assessmentId" value={item.id} /><button type="submit">Excluir</button></form> : null}</article>)}</div> : <p className="muted">Nenhuma informação de idade óssea registrada. Este exame não é obrigatório.</p>}
      </section>

      <footer className="growth-footer"><strong>{GROWTH_DISCLAIMER}</strong><span>Dados privados: não são usados no perfil público do atleta.</span></footer>

      <style>{`
        .growth-page{display:grid;gap:18px;padding:28px 34px 44px;background:#f4f7f8;color:#07131d}.growth-page *{box-sizing:border-box}
        .growth-hero{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:26px 30px;border-radius:25px;color:#fff;background:linear-gradient(105deg,#06111a,#0a1a17 58%,#204617);box-shadow:0 20px 45px rgba(7,19,29,.12)}.growth-hero-main{display:flex;align-items:center;gap:16px}.growth-avatar{width:82px;height:82px;overflow:hidden;border:3px solid #99e600;border-radius:20px;background:#fff}.growth-avatar img{width:100%;height:100%;object-fit:cover}.growth-kicker{color:#99e600;font-size:10px;font-weight:900;letter-spacing:.14em}.growth-hero h1{margin:5px 0;color:#fff!important;font-size:clamp(28px,3vw,44px);letter-spacing:-.04em}.growth-hero p{margin:0;color:#fff!important}.growth-hero-actions{display:grid;gap:9px;min-width:210px}.growth-hero-actions a{padding:11px 14px;border:0;border-radius:10px;text-align:center;color:#fff;text-decoration:none;background:rgba(255,255,255,.08);font:inherit}.growth-export-form{margin:0}.growth-export-button{width:100%;padding:11px 14px;border:0;border-radius:10px;text-align:center;color:#0b1707;background:#99e600;font:inherit;font-weight:900;cursor:pointer}.growth-export-button:hover{filter:brightness(.96)}.growth-access-badge{padding:9px 12px;border-radius:999px;text-align:center;font-size:10px;font-weight:900;background:rgba(255,255,255,.1)}.growth-access-badge.active{color:#10200a;background:#99e600}
        .growth-tabs{margin:0}.growth-warning,.growth-error,.growth-projection-notice{padding:13px 16px;border-radius:13px;font-size:12px;line-height:1.5}.growth-warning{border:1px solid #d9e8bd;background:#f6fbe9}.growth-error{border:1px solid #f0c4c4;background:#fff1f1;color:#8a2828}.growth-projection-notice{display:grid;gap:3px;border:1px solid #d8e5ba;background:#f6fbe9}
        .growth-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.growth-kpis article{min-height:116px;padding:16px;border:1px solid #dfe6ea;border-radius:18px;background:#fff;box-shadow:0 8px 24px rgba(8,26,38,.035)}.growth-kpis span{font-size:9px;font-weight:900;letter-spacing:.1em;color:#74838d}.growth-kpis strong{display:block;margin-top:7px;font-size:23px;letter-spacing:-.04em}.growth-kpis small{display:block;margin-top:5px;color:#71808a;font-size:10px;line-height:1.4}
        .growth-empty,.growth-card{padding:22px;border:1px solid #dfe6ea;border-radius:20px;background:#fff;box-shadow:0 10px 30px rgba(8,26,38,.04)}.growth-empty{text-align:center}.growth-empty span{font-size:34px}.growth-empty h2{margin:8px 0 4px}.growth-empty p{margin:0;color:#70808b}.growth-admin-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.growth-card-head{display:flex;justify-content:space-between;gap:16px;margin-bottom:16px}.growth-card-head span{color:#719f00;font-size:9px;font-weight:900;letter-spacing:.12em}.growth-card-head h2{margin:4px 0 0}.growth-card-head p{margin:6px 0 0;color:#71808a;font-size:11px}.growth-form{display:grid;gap:12px}.growth-form-row,.growth-advanced{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.growth-form label{display:grid;gap:6px;font-size:11px;font-weight:800;color:#35434c}.growth-form input,.growth-form select,.growth-form textarea{width:100%;min-height:42px;padding:0 11px;border:1px solid #d9e1e5;border-radius:10px;background:#fff;font:inherit}.growth-form textarea{padding:10px;resize:vertical}.growth-form label small{font-weight:500;color:#7a8992}.growth-form details{padding:11px;border:1px solid #e0e6e9;border-radius:12px;background:#fafcfc}.growth-form summary{cursor:pointer;font-size:11px;font-weight:900}.growth-advanced{margin-top:12px}.growth-advanced .wide,.growth-bone-form .wide{grid-column:1/-1}.growth-primary,.growth-danger{min-height:44px;border:0;border-radius:11px;font-weight:900;cursor:pointer}.growth-primary{background:#99e600;color:#07120a}.growth-primary:disabled{opacity:.45;cursor:not-allowed}.growth-danger{width:100%;margin-top:10px;border:1px solid #e4c3c3;background:#fff6f6;color:#8a3030}.growth-ok{margin:0;padding:10px;border-radius:10px;background:#f3f9e7;color:#496900;font-size:11px}.growth-form-actions{display:flex;align-items:center;gap:12px}.growth-form-actions .growth-primary{flex:1}.growth-form-actions a{font-size:11px;font-weight:800;color:#52636d}.growth-staff-list{display:grid;gap:8px}.growth-staff-row{display:grid;grid-template-columns:minmax(140px,1fr) auto auto auto;align-items:center;gap:10px;padding:10px;border:1px solid #e1e7e9;border-radius:11px}.growth-staff-row>div{display:grid}.growth-staff-row small{color:#71808a}.growth-staff-row label{display:flex;align-items:center;gap:5px;font-size:10px;font-weight:800}.growth-staff-row input{width:15px;height:15px}.growth-staff-row button{border:0;border-radius:8px;padding:8px 10px;background:#eff9d8;color:#4e7000;font-size:10px;font-weight:900;cursor:pointer}
        .growth-form label.growth-paper-check{display:flex;align-items:flex-start;gap:10px;padding:11px;border:1px solid #dbe7c1;border-radius:10px;background:#f6fbe9}.growth-form .growth-paper-check input[type="checkbox"]{appearance:auto!important;display:inline-block!important;width:16px!important;min-width:16px!important;max-width:16px!important;height:16px!important;min-height:16px!important;max-height:16px!important;flex:0 0 16px!important;margin:1px 0 0!important;padding:0!important;accent-color:#7daa00}
        .growth-table-wrap{overflow-x:auto;border:1px solid #e1e7ea;border-radius:14px}.growth-table{width:100%;min-width:1050px;border-collapse:collapse;font-size:11px}.growth-table th{padding:10px;background:#f4f7f8;text-align:left;color:#6f7e88;font-size:9px;letter-spacing:.08em}.growth-table td{padding:10px;border-top:1px solid #e9edef;vertical-align:top}.growth-actions{display:flex;gap:8px}.growth-actions a,.growth-actions button{border:0;background:none;padding:0;color:#4e7000;font-size:10px;font-weight:800;cursor:pointer}.growth-actions button{color:#9a3b3b}.growth-bone-form{grid-template-columns:repeat(2,minmax(0,1fr));margin-bottom:16px}.growth-bone-form>button{grid-column:1/-1}.growth-bone-list{display:grid;gap:8px}.growth-bone-list article{display:flex;justify-content:space-between;gap:16px;padding:12px;border:1px solid #e2e8ea;border-radius:12px}.growth-bone-list article div{display:grid;gap:3px}.growth-bone-list span,.growth-bone-list small{color:#657680;font-size:10px}.growth-bone-list button{border:0;background:transparent;color:#9a3b3b;font-weight:800;cursor:pointer}.growth-footer{display:grid;gap:4px;padding:14px 16px;border-radius:13px;background:#07131d;color:#fff;font-size:10px}.growth-footer span{color:#bac5cb}.muted{color:#70808b}
        @media(max-width:1180px){.growth-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}.growth-admin-grid{grid-template-columns:1fr}}
        @media(max-width:800px){.growth-page{padding:16px 12px 32px}.growth-hero{align-items:flex-start;flex-direction:column;padding:20px}.growth-hero-actions{width:100%}.growth-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.growth-bone-form{grid-template-columns:1fr}.growth-bone-form .wide,.growth-bone-form>button{grid-column:auto}}
        @media(max-width:520px){.growth-kpis{grid-template-columns:1fr}.growth-form-row,.growth-advanced{grid-template-columns:1fr}}
      `}</style>
    </main>
  );
}
