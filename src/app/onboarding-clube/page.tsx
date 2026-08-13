import { requireOrganizationUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { finishClubOnboarding } from "./actions";

export default async function ClubOnboardingPage() {
  const user = await requireOrganizationUser();
  if (user.organization?.onboardingCompleted) redirect("/dashboard");

  return (
    <main className="club-onboarding-page">
      <section className="club-onboarding-copy">
        <span className="marketing-kicker">ONZEUP CLUB</span>
        <h1>Vamos preparar<br/>seu clube.</h1>
        <p>
          Estas informações já entram no seu painel. Depois você poderá editar
          tudo normalmente.
        </p>
        <div className="onboarding-progress">
          <span className="done">✓ Conta criada</span>
          <span className="active">02 Configuração inicial</span>
          <span>03 Dashboard</span>
        </div>
      </section>

      <section className="auth-form-card onboarding-form-card">
        <span className="page-eyebrow">CONFIGURAÇÃO INICIAL</span>
        <h2>Informações da organização</h2>

        <form action={finishClubOnboarding} className="stack">
          <div className="form-grid-2">
            <label>Nome público
              <input name="publicName" defaultValue={user.organization?.publicName || user.organization?.name || ""} required />
            </label>
            <label>Modalidade
              <select name="sport" defaultValue={user.organization?.sport || "BOTH"}>
                <option value="FOOTBALL">Futebol de campo</option>
                <option value="FUTSAL">Futsal</option>
                <option value="BOTH">Campo + Futsal</option>
              </select>
            </label>
            <label>Cidade<input name="city" defaultValue={user.organization?.city || ""}/></label>
            <label>Estado<input name="state" defaultValue={user.organization?.state || ""} maxLength={2}/></label>
            <label>Instagram<input name="instagram" placeholder="@seuclube"/></label>
            <label>Chave Pix <small>(opcional)</small><input name="pixKey"/></label>
            <label>Cor principal
              <input name="accentColor" type="color" defaultValue={user.organization?.accentColor || "#9DDB16"}/>
            </label>
          </div>

          <div className="onboarding-divider">
            <span className="page-eyebrow">PRIMEIRA CATEGORIA</span>
            <p className="muted">Opcional. Se preencher, ela já aparecerá no dashboard.</p>
          </div>

          <div className="form-grid-2">
            <label>Categoria<input name="categoryName" placeholder="Ex.: Sub-9"/></label>
            <label>Ano de nascimento<input name="birthYear" type="number" min="2000" max="2030" placeholder="2017"/></label>
          </div>

          <div className="onboarding-divider">
            <span className="page-eyebrow">PRIMEIRO TREINO</span>
            <p className="muted">Opcional. Preencha junto com a categoria para já criar o horário.</p>
          </div>

          <div className="form-grid-2">
            <label>Dia
              <select name="weekday" defaultValue="">
                <option value="">Selecionar</option>
                <option value="1">Segunda</option><option value="2">Terça</option>
                <option value="3">Quarta</option><option value="4">Quinta</option>
                <option value="5">Sexta</option><option value="6">Sábado</option>
                <option value="0">Domingo</option>
              </select>
            </label>
            <label>Local<input name="location" placeholder="Campo / ginásio"/></label>
            <label>Início<input name="startTime" type="time"/></label>
            <label>Fim<input name="endTime" type="time"/></label>
          </div>

          <button className="btn onboarding-submit" type="submit">
            Finalizar e abrir meu Dashboard →
          </button>
        </form>
      </section>
    </main>
  );
}
