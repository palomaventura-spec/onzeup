import ImageUpload from "@/components/ImageUpload";
import Link from "next/link";
import { requireOrganizationUser } from "@/lib/auth";
import { updateOrganization } from "./actions";
import ModuleTour from "@/components/help/ModuleTour";
import PendingSubmitButton from "@/components/PendingSubmitButton";

export default async function OrganizationPage() {
  const user = await requireOrganizationUser();
  const org = user.organization!;

  return (
    <>
      <div className="page-head">
        <ModuleTour module="organizacao" />
        <div>
          <h1>Site e Configurações</h1>
          <p className="muted">Configure os dados do clube e personalize sua página/site público.</p>
        </div>
        <Link className="btn" href={`/o/${org.slug}`} target="_blank">Ver site público</Link>
      </div>

      <section className="card">
        <form className="form" action={updateOrganization}>
          <label>
            Nome interno
            <input name="name" defaultValue={org.name} required />
          </label>

          <label>
            Nome público
            <input name="publicName" defaultValue={org.publicName ?? ""} placeholder="Nome exibido no site" />
          </label>

          <label>
            Sobre
            <textarea name="description" rows={5} defaultValue={org.description ?? ""} />
          </label>

          <ImageUpload name="logoUrl" purpose="logo" label="Logo do clube" recommended="JPEG, PNG ou WEBP • até 4 MB. Prefira fundo transparente." defaultValue={org.logoUrl} />

          <ImageUpload name="coverUrl" purpose="cover" label="Arte de capa do site" recommended="JPEG, PNG ou WEBP • até 4 MB. Recomendado: 1920 × 900 px." defaultValue={org.coverUrl} />

          <label>Posição da arte de capa<select name="coverPosition" defaultValue={org.coverPosition}><option value="CENTER">Centralizada</option><option value="TOP">Topo</option><option value="BOTTOM">Parte inferior</option></select></label>
          <label>Escurecimento da capa <strong>{org.coverOverlay}%</strong><input name="coverOverlay" type="range" min="30" max="90" step="5" defaultValue={org.coverOverlay} /></label>

          <label>Cor principal<input name="accentColor" type="color" defaultValue={org.accentColor ?? "#9DDB16"} /></label>
          <label>Cor secundária<input name="secondaryColor" type="color" defaultValue={org.secondaryColor ?? "#FFFFFF"} /></label>
          <label>Fundo do site<input name="publicBackground" type="color" defaultValue={org.publicBackground ?? "#080B0C"} /></label>
          <label>Tema do site<select name="publicTheme" defaultValue={org.publicTheme}><option value="DARK">Escuro</option><option value="LIGHT">Claro</option><option value="CUSTOM">Personalizado</option></select></label>
          <label>Chave Pix<input name="pixKey" defaultValue={org.pixKey ?? ""} placeholder="CPF, CNPJ, e-mail, telefone ou aleatória" /></label>
          <label>CNPJ <small>(opcional)</small><input name="taxId" defaultValue={org.taxId ?? ""} placeholder="00.000.000/0000-00" /></label>

          <label>
            Telefone
            <input name="phone" defaultValue={org.phone ?? ""} />
          </label>

          <label>
            WhatsApp
            <input name="whatsapp" defaultValue={org.whatsapp ?? ""} />
          </label>

          <label>
            E-mail
            <input name="email" type="email" defaultValue={org.email ?? ""} />
          </label>

          <label>
            Instagram
            <input name="instagram" defaultValue={org.instagram ?? ""} placeholder="@seuperfil" />
          </label>

          <label>
            Endereço
            <input name="address" defaultValue={org.address ?? ""} />
          </label>

          <label>
            Cidade
            <input name="city" defaultValue={org.city ?? ""} />
          </label>

          <label>
            Estado
            <input name="state" defaultValue={org.state ?? ""} />
          </label>

          <hr style={{borderColor:"var(--line)", width:"100%"}} />
          <h3>Seções públicas</h3>

          <label className="check">
            <input name="showAthletesPublicly" type="checkbox" defaultChecked={org.showAthletesPublicly} />
            Exibir atletas no site
          </label>

          <label className="check">
            <input name="showStaffPublicly" type="checkbox" defaultChecked={org.showStaffPublicly} />
            Exibir comissão técnica
          </label>

          <label className="check">
            <input name="showTrainingsPublicly" type="checkbox" defaultChecked={org.showTrainingsPublicly} />
            Exibir horários de treino
          </label>

          <label className="check">
            <input name="showMatchesPublicly" type="checkbox" defaultChecked={org.showMatchesPublicly} />
            Exibir jogos e resultados
          </label>

          <PendingSubmitButton pendingText="Salvando configurações...">Salvar configurações</PendingSubmitButton>
        </form>
      </section>
    </>
  );
}