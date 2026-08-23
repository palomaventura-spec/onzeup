import { requireOrganizationUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { finishClubOnboarding } from "./actions";
import PendingSubmitButton from "@/components/PendingSubmitButton";

export default async function ClubOnboardingPage() {
  const user = await requireOrganizationUser();
  if (user.organization?.onboardingCompleted) redirect("/dashboard");

  return (
    <main className="club-onboarding-page">
      <section className="club-onboarding-copy">
        <span className="marketing-kicker">ONZEUP CLUB</span>
        <h1>Vamos preparar<br/>seu clube.</h1>
        <p>
          Aqui entram somente os dados básicos. Categorias, atletas, comissão,
          treinos e jogos serão configurados dentro do Dashboard.
        </p>

        <div className="onboarding-progress">
          <span className="done">✓ Conta criada</span>
          <span className="active">02 Dados básicos</span>
          <span>03 Dashboard</span>
        </div>
      </section>

      <section className="auth-form-card onboarding-form-card">
        <span className="page-eyebrow">CONFIGURAÇÃO INICIAL</span>
        <h2>Dados do clube</h2>
        <p className="muted">
          Você poderá completar logo, cores, site, PIX e demais informações depois.
        </p>

        <form action={finishClubOnboarding} className="stack">
          <div className="form-grid-2">
            <label>
              Nome público
              <input
                name="publicName"
                defaultValue={user.organization?.publicName || user.organization?.name || ""}
                required
              />
            </label>

            <label>
              CNPJ <small>(se tiver)</small>
              <input name="taxId" placeholder="00.000.000/0000-00" />
            </label>

            <label>
              Modalidade
              <select name="sport" defaultValue={user.organization?.sport || "BOTH"}>
                <option value="FOOTBALL">Futebol de campo</option>
                <option value="FUTSAL">Futsal</option>
                <option value="BOTH">Campo + Futsal</option>
              </select>
            </label>

            <label>
              WhatsApp
              <input name="whatsapp" defaultValue={user.organization?.whatsapp || user.organization?.phone || ""} />
            </label>

            <label className="onboarding-address-field">
              Endereço
              <input name="address" defaultValue={user.organization?.address || ""} placeholder="Rua, número e complemento" />
            </label>

            <label>
              Cidade
              <input name="city" defaultValue={user.organization?.city || ""} />
            </label>

            <label>
              Estado
              <input name="state" defaultValue={user.organization?.state || ""} maxLength={2} placeholder="RJ" />
            </label>
          </div>

          <div className="onboarding-next-note">
            <strong>Depois do cadastro</strong>
            <p>
              Você irá direto ao Dashboard para criar categorias, cadastrar ou convidar
              atletas, adicionar comissão técnica e criar seu primeiro treino ou jogo.
            </p>
          </div>

          <PendingSubmitButton className="btn onboarding-submit" pendingText="Preparando seu Dashboard...">
            Salvar e abrir meu Dashboard →
          </PendingSubmitButton>
        </form>
      </section>
    </main>
  );
}
