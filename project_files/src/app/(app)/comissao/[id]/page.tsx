import { notFound } from "next/navigation";
import Link from "next/link";
import ImageUpload from "@/components/ImageUpload";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";
import { updateStaffMember } from "../actions";

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrganizationUser();
  const { id } = await params;

  const [member, categories] = await Promise.all([
    prisma.staffMember.findFirst({
      where: { id, organizationId: user.organizationId },
    }),
    prisma.category.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!member) notFound();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Editar comissão</h1>
          <p className="muted">Atualize os dados do profissional e o vínculo com o ONZEUP Coach.</p>
        </div>
        <Link className="btn btn-secondary" href="/comissao">Voltar</Link>
      </div>

      <section className="card">
        <form className="form" action={updateStaffMember}>
          <input type="hidden" name="id" value={member.id} />

          <label>Nome<input name="name" defaultValue={member.name} required /></label>
          <label>Função<input name="roleTitle" defaultValue={member.roleTitle} required /></label>

          <label>
            Categoria
            <select name="categoryId" defaultValue={member.categoryId ?? ""}>
              <option value="">Geral / todas</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>

          <label>
            Modalidade
            <select name="sport" defaultValue={member.sport}>
              <option value="BOTH">Campo + Futsal</option>
              <option value="FOOTBALL">Futebol de campo</option>
              <option value="FUTSAL">Futsal</option>
            </select>
          </label>

          <label>
            E-mail do ONZEUP Coach
            <input name="coachEmail" type="email" defaultValue={member.coachEmail ?? ""} />
            <small className="field-help">Deve ser o mesmo e-mail usado pelo profissional na conta ONZEUP Coach.</small>
          </label>

          <label className="check-row">
            <input type="checkbox" name="canManageCallUps" defaultChecked={member.canManageCallUps} />
            <span>Permitir gerenciar convocações desta categoria</span>
          </label>

          <ImageUpload name="photoUrl" label="Foto" defaultValue={member.photoUrl ?? ""} />
          <label>Mini bio<textarea name="bio" rows={5} defaultValue={member.bio ?? ""} /></label>

          <button type="submit">Salvar alterações</button>
        </form>
      </section>
    </>
  );
}
