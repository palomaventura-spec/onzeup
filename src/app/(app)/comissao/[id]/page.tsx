import ImageUpload from "@/components/ImageUpload";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireOrganizationUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { updateStaffMember } from "../actions";

function dateInput(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireOrganizationUser();
  const { id } = await params;
  const [member, categories] = await Promise.all([
    prisma.staffMember.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { category: true },
    }),
    prisma.category.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!member) notFound();

  return (
    <>
      <div className="staff-detail-hero card">
        <div className="staff-detail-avatar">
          {member.photoUrl ? (
            <img src={member.photoUrl} alt={member.name} />
          ) : (
            <span>{member.name.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
        <div>
          <span className="page-eyebrow">PERFIL PROFISSIONAL</span>
          <h1>{member.name}</h1>
          <strong>{member.roleTitle}</strong>
          <p>
            {member.category?.name || "Atuação geral"} •{" "}
            {member.sport === "BOTH"
              ? "Campo + Futsal"
              : member.sport === "FOOTBALL"
                ? "Campo"
                : "Futsal"}
          </p>
        </div>
        <div className="actions">
          <span className={`badge ${member.active ? "" : "danger"}`}>
            {member.active ? "Ativo" : "Inativo"}
          </span>
          <Link className="btn btn-secondary" href="/comissao">
            Voltar
          </Link>
        </div>
      </div>

      <section className="card staff-detail-form-card">
        <div className="section-title-row">
          <div>
            <span className="page-eyebrow">CADASTRO</span>
            <h2>Dados do profissional</h2>
          </div>
        </div>
        <form className="staff-detail-form" action={updateStaffMember}>
          <input type="hidden" name="id" value={member.id} />
          <fieldset>
            <legend>Identificação</legend>
            <label>
              Nome
              <input name="name" defaultValue={member.name} required />
            </label>
            <label>
              Função
              <input
                name="roleTitle"
                defaultValue={member.roleTitle}
                required
              />
            </label>
            <label>
              Telefone / WhatsApp
              <input name="phone" defaultValue={member.phone || ""} />
            </label>
            <label>
              Registro profissional
              <input
                name="professionalRegistration"
                defaultValue={member.professionalRegistration || ""}
              />
            </label>
            <label>
              Formação
              <input name="education" defaultValue={member.education || ""} />
            </label>
            <label>
              Especialidades
              <input
                name="specialties"
                defaultValue={member.specialties || ""}
              />
            </label>
            <label>
              Data de entrada
              <input
                name="joinedAt"
                type="date"
                defaultValue={dateInput(member.joinedAt)}
              />
            </label>
            <label>
              Status
              <select name="active" defaultValue={String(member.active)}>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </label>
            <div className="staff-photo-field">
              <ImageUpload
                name="photoUrl"
                label="Foto profissional"
                defaultValue={member.photoUrl || ""}
              />
            </div>
          </fieldset>
          <fieldset>
            <legend>Atuação e acesso</legend>
            <label>
              Categoria
              <select name="categoryId" defaultValue={member.categoryId || ""}>
                <option value="">Geral / todas</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
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
              <input
                name="coachEmail"
                type="email"
                defaultValue={member.coachEmail || ""}
              />
            </label>
            <label>
              Biografia profissional
              <textarea name="bio" rows={7} defaultValue={member.bio || ""} />
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                name="canManageCallUps"
                defaultChecked={member.canManageCallUps}
              />
              <span>Permitir gerenciar convocações desta categoria</span>
            </label>
          </fieldset>
          <button type="submit">Salvar perfil profissional</button>
        </form>
      </section>
    </>
  );
}
