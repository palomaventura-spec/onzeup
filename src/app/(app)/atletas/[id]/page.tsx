import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";
import { createAthleteMembership, updateAthlete } from "../actions";

export default async function EditAthletePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrganizationUser();
  const { id } = await params;

  const [athlete, categories] = await Promise.all([
    prisma.athlete.findFirst({
      where: { id, organizationId: user.organizationId },
    }),
    prisma.category.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!athlete) notFound();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Editar atleta</h1>
          <p className="muted">Dados esportivos públicos e dados privados do responsável ficam separados.</p>
        </div>
        <Link className="btn btn-secondary" href="/atletas">Voltar</Link>
      </div>

      <section className="card">
        <form className="form" action={updateAthlete}>
          <input type="hidden" name="id" value={athlete.id} />

          <label>
            Nome
            <input name="name" defaultValue={athlete.name} required />
          </label>

          <label>
            Nome esportivo / apelido
            <input name="nickname" defaultValue={athlete.nickname ?? ""} />
          </label>

          <label>
            Categoria
            <select name="categoryId" defaultValue={athlete.categoryId ?? ""}>
              <option value="">Sem categoria</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>

          <label>
            Ano de nascimento
            <input name="birthYear" type="number" defaultValue={athlete.birthYear ?? ""} />
          </label>

          <label>
            Número
            <input name="jerseyNumber" type="number" min="0" max="99" defaultValue={athlete.jerseyNumber ?? ""} />
          </label>

          <label>
            Posição
            <input name="position" defaultValue={athlete.position ?? ""} />
          </label>

          <label>
            Pé dominante
            <select name="dominantFoot" defaultValue={athlete.dominantFoot ?? ""}>
              <option value="">Não informado</option>
              <option value="RIGHT">Direito</option>
              <option value="LEFT">Esquerdo</option>
              <option value="BOTH">Ambidestro</option>
            </select>
          </label>

          <label>
            URL da foto
            <input name="photoUrl" type="url" defaultValue={athlete.photoUrl ?? ""} />
          </label>

          <label>
            Status
            <select name="active" defaultValue={String(athlete.active)}>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </label>

          <hr style={{borderColor:"var(--line)", width:"100%"}} />

          <h3>Responsável — privado</h3>

          <label>
            Nome do responsável
            <input name="guardianName" defaultValue={athlete.guardianName ?? ""} />
          </label>

          <label>
            WhatsApp / telefone
            <input name="guardianPhone" defaultValue={athlete.guardianPhone ?? ""} />
          </label>

          <label>
            E-mail
            <input name="guardianEmail" type="email" defaultValue={athlete.guardianEmail ?? ""} />
          </label>

          <button type="submit">Salvar alterações</button>
        </form>
      </section>
    </>
  );
}
