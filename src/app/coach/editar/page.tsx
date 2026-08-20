import Link from "next/link";
import ImageUpload from "@/components/ImageUpload";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { saveCoach } from "./actions";

export default async function CoachEdit({
  searchParams,
}: {
  searchParams: Promise<{ salvo?: string }>;
}) {
  const user = await requireUser();
  const q = await searchParams;
  const p = await prisma.coachProfile.findUnique({ where: { ownerUserId: user.id } });
  if (!p) redirect("/cadastro-coach");

  return (
    <main className="coach-editor">
      <header>
        <div>
          <span className="page-eyebrow">ONZEUP COACH</span>
          <h1>Meu site profissional</h1>
          <Link href="/coach/dashboard">← Voltar ao dashboard</Link>
        </div>
        {p.isPublic ? <Link className="btn-secondary" href={`/coach-profile/${p.slug}`} target="_blank">Ver site ↗</Link> : null}
      </header>

      {q.salvo ? <div className="notice">Perfil atualizado.</div> : null}

      <form action={saveCoach} className="card coach-form stack">
        <div className="form-grid-2">
          <ImageUpload name="photoUrl" label="Foto profissional" defaultValue={p.photoUrl || ""} />
          <ImageUpload name="coverUrl" label="Arte de capa do site" defaultValue={p.coverUrl || ""} />
        </div>

        <div className="form-grid-2">
          <label>Nome profissional<input name="professionalName" defaultValue={p.professionalName || p.name}/></label>
          <label>Função<input name="roleTitle" defaultValue={p.roleTitle || ""} placeholder="Treinador, auxiliar, scout..."/></label>
          <label>Clube atual<input name="currentClub" defaultValue={p.currentClub || ""}/></label>
          <label>Categorias<input name="categories" defaultValue={p.categories || ""} placeholder="Sub-9, Sub-11..."/></label>
          <label>Cidade<input name="city" defaultValue={p.city || ""}/></label>
          <label>Estado<input name="state" defaultValue={p.state || ""}/></label>
          <label>País<input name="country" defaultValue={p.country || ""}/></label>
          <label>Nacionalidade<input name="nationality" defaultValue={p.nationality || ""}/></label>
        </div>

        <label>Apresentação<textarea name="bio" defaultValue={p.bio || ""} rows={4}/></label>
        <label>Experiência<textarea name="experience" defaultValue={p.experience || ""} rows={5}/></label>
        <label>Histórico de clubes<textarea name="clubsHistory" defaultValue={p.clubsHistory || ""} rows={4}/></label>

        <div className="form-grid-2">
          <label>Licenças / certificações<textarea name="licenses" defaultValue={p.licenses || ""} rows={3}/></label>
          <label>Formação<textarea name="education" defaultValue={p.education || ""} rows={3}/></label>
          <label>Idiomas<input name="languages" defaultValue={p.languages || ""}/></label>
          <label>Conquistas<input name="achievements" defaultValue={p.achievements || ""}/></label>
        </div>

        <label>Metodologia<textarea name="methodology" defaultValue={p.methodology || ""} rows={4}/></label>

        <div className="form-grid-2">
          <label>Vídeo YouTube<input name="youtubeUrl" defaultValue={p.youtubeUrl || ""}/></label>
          <label>Instagram<input name="instagramUrl" defaultValue={p.instagramUrl || ""}/></label>
          <label>LinkedIn<input name="linkedinUrl" defaultValue={p.linkedinUrl || ""}/></label>
          <label>E-mail profissional<input name="contactEmail" type="email" defaultValue={p.contactEmail || ""}/></label>
        </div>

        <label className="check-row"><input name="isPublic" type="checkbox" defaultChecked={p.isPublic}/><span>Publicar meu site profissional</span></label>
        <label className="check-row"><input name="directoryVisible" type="checkbox" defaultChecked={p.directoryVisible}/><span>Aparecer no catálogo de treinadores</span></label>
        <button className="btn">Salvar perfil</button>
      </form>
    </main>
  );
}
