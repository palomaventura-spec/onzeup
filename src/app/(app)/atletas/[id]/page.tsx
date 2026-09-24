import Link from "next/link";
import { notFound } from "next/navigation";

import AthleteSaveButton from "@/components/AthleteSaveButton";
import ImageUpload from "@/components/ImageUpload";
import SafeAvatar from "@/components/SafeAvatar";

import { requireClubPermission } from "@/lib/club-access";
import { hasClubPermission } from "@/lib/club-permissions";
import { prisma } from "@/lib/prisma";

import { updateAthlete } from "../actions";

function dominantFootLabel(value: string | null) {
  switch (value) {
    case "RIGHT":
      return "Direito";

    case "LEFT":
      return "Esquerdo";

    case "BOTH":
      return "Ambidestro";

    default:
      return "Não informado";
  }
}

export default async function EditAthletePage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const user =
    await requireClubPermission("ATHLETES_VIEW");

  const canEdit = hasClubPermission(
    user,
    "ATHLETES_EDIT",
  );

  const { id } = await params;

  const [athlete, categories] = await Promise.all([
    prisma.athlete.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      include: {
        category: true,
      },
    }),

    canEdit
      ? prisma.category.findMany({
          where: {
            organizationId:
              user.organizationId,
            active: true,
          },
          orderBy: [
            {
              type: "asc",
            },
            {
              name: "asc",
            },
          ],
        })
      : Promise.resolve([]),
  ]);

  if (!athlete) {
    notFound();
  }

  const standardCategories = categories.filter(
    (category) => category.type === "STANDARD",
  );

  const evaluationCategories = categories.filter(
    (category) =>
      category.type === "EVALUATION",
  );

  const isEvaluation =
    athlete.category?.type === "EVALUATION";

  const accentColor =
    athlete.category?.accentColor || "#9DDB16";

  return (
    <main className="athlete-profile-page">
      <section
        className="athlete-profile-hero"
        style={{
          borderTop: `5px solid ${accentColor}`,
        }}
      >
        <div className="athlete-profile-avatar">
          <SafeAvatar
            src={athlete.photoUrl}
            name={
              athlete.nickname || athlete.name
            }
          />
        </div>

        <div>
          <span
            className="page-eyebrow"
            style={{
              color: accentColor,
            }}
          >
            {isEvaluation
              ? "ATLETA EM AVALIAÇÃO"
              : "PERFIL DO ATLETA"}
          </span>

          <h1>
            {athlete.nickname || athlete.name}
          </h1>

          <p>
            {athlete.name} •{" "}
            {athlete.category?.name ||
              "Sem categoria"}{" "}
            •{" "}
            {athlete.position ||
              "Posição não informada"}
          </p>
        </div>

        <span
          className={
            athlete.active
              ? "athlete-status active"
              : "athlete-status"
          }
          style={
            isEvaluation
              ? {
                  background: accentColor,
                  color: "#10200a",
                }
              : undefined
          }
        >
          {isEvaluation
            ? "Em avaliação"
            : athlete.active
              ? "Ativo"
              : "Inativo"}
        </span>
      </section>

      <div className="page-head">
        <div>
          <h1>
            {canEdit
              ? isEvaluation
                ? "Avaliação e transferência"
                : "Editar atleta"
              : athlete.nickname ||
                athlete.name}
          </h1>

          <p className="muted">
            {canEdit
              ? isEvaluation
                ? "Ao aprovar o atleta, selecione abaixo uma categoria oficial e salve. Todo o cadastro, documentos e registros do atleta permanecem vinculados ao mesmo perfil."
                : "Dados esportivos públicos e dados privados do responsável ficam separados."
              : "Visualização dos dados esportivos do atleta."}
          </p>
        </div>

        <div className="actions">
          <Link
            className="btn"
            href={`/atletas/${athlete.id}/performance`}
          >
            Performance
          </Link>

          <Link
            className="btn btn-secondary"
            href="/atletas"
          >
            Voltar
          </Link>
        </div>
      </div>

      {isEvaluation && canEdit ? (
        <section
          className="card"
          style={{
            borderLeft: `5px solid ${accentColor}`,
            marginBottom: 18,
          }}
        >
          <span
            className="page-eyebrow"
            style={{
              color: accentColor,
            }}
          >
            PROCESSO DE AVALIAÇÃO
          </span>

          <h2>Atleta ainda não integrado ao elenco</h2>

          <p className="muted">
            Se for aprovado, basta trocar a categoria
            atual por uma categoria do elenco no formulário
            abaixo. Não é necessário criar outro cadastro.
          </p>
        </section>
      ) : null}

      {canEdit ? (
        <section className="card">
          <form
            className="form"
            action={updateAthlete}
          >
            <input
              type="hidden"
              name="id"
              value={athlete.id}
            />

            <label>
              Nome
              <input
                name="name"
                defaultValue={athlete.name}
                required
              />
            </label>

            <label>
              Nome esportivo / apelido
              <input
                name="nickname"
                defaultValue={
                  athlete.nickname ?? ""
                }
              />
            </label>

            <label>
              Categoria / situação
              <select
                name="categoryId"
                defaultValue={
                  athlete.categoryId ?? ""
                }
              >
                <option value="">
                  Sem categoria
                </option>

                {evaluationCategories.length ? (
                  <optgroup label="Em avaliação">
                    {evaluationCategories.map(
                      (category) => (
                        <option
                          key={category.id}
                          value={category.id}
                        >
                          {category.name}
                        </option>
                      ),
                    )}
                  </optgroup>
                ) : null}

                {standardCategories.length ? (
                  <optgroup label="Categorias do elenco">
                    {standardCategories.map(
                      (category) => (
                        <option
                          key={category.id}
                          value={category.id}
                        >
                          {category.name}
                        </option>
                      ),
                    )}
                  </optgroup>
                ) : null}
              </select>
            </label>

            {isEvaluation ? (
              <p
                className="muted"
                style={{
                  gridColumn: "1 / -1",
                }}
              >
                Para aprovar: selecione uma categoria
                em <strong>Categorias do elenco</strong>{" "}
                e salve as alterações.
              </p>
            ) : null}

            <label>
              Ano de nascimento
              <input
                name="birthYear"
                type="number"
                defaultValue={
                  athlete.birthYear ?? ""
                }
              />
            </label>

            <label>
              Número
              <input
                name="jerseyNumber"
                type="number"
                min="0"
                max="99"
                defaultValue={
                  athlete.jerseyNumber ?? ""
                }
              />
            </label>

            <label>
              Posição
              <input
                name="position"
                defaultValue={
                  athlete.position ?? ""
                }
              />
            </label>

            <label>
              Pé dominante
              <select
                name="dominantFoot"
                defaultValue={
                  athlete.dominantFoot ?? ""
                }
              >
                <option value="">
                  Não informado
                </option>

                <option value="RIGHT">
                  Direito
                </option>

                <option value="LEFT">
                  Esquerdo
                </option>

                <option value="BOTH">
                  Ambidestro
                </option>
              </select>
            </label>

            <ImageUpload
              name="photoUrl"
              defaultValue={athlete.photoUrl}
              label="Foto do atleta — incluir ou substituir"
              recommended="JPEG, PNG ou WEBP até 4 MB. Após enviar ou remover, clique em Salvar alterações."
            />

            <label>
              Status
              <select
                name="active"
                defaultValue={String(
                  athlete.active,
                )}
              >
                <option value="true">
                  Ativo
                </option>

                <option value="false">
                  Inativo
                </option>
              </select>
            </label>

            <hr
              style={{
                borderColor: "var(--line)",
                width: "100%",
              }}
            />

            <h3>Responsável — privado</h3>

            <label>
              Nome do responsável
              <input
                name="guardianName"
                defaultValue={
                  athlete.guardianName ?? ""
                }
              />
            </label>

            <label>
              Parentesco / relação
              <input
                name="guardianRelation"
                defaultValue={
                  athlete.guardianRelation ?? ""
                }
                placeholder="Ex.: Mãe, Pai, Avó, Tutor"
              />
            </label>

            <label>
              WhatsApp / telefone
              <input
                name="guardianPhone"
                defaultValue={
                  athlete.guardianPhone ?? ""
                }
              />
            </label>

            <label>
              E-mail
              <input
                name="guardianEmail"
                type="email"
                defaultValue={
                  athlete.guardianEmail ?? ""
                }
              />
            </label>

            <AthleteSaveButton />
          </form>
        </section>
      ) : (
        <section className="card">
          <span className="page-eyebrow">
            SOMENTE VISUALIZAÇÃO
          </span>

          <h2>Dados esportivos</h2>

          <div className="stack">
            {athlete.photoUrl ? (
              <div className="admin-athlete-photo">
                <SafeAvatar
                  src={athlete.photoUrl}
                  name={athlete.name}
                />
              </div>
            ) : null}

            <div>
              <span className="help">
                Nome
              </span>
              <strong>{athlete.name}</strong>
            </div>

            <div>
              <span className="help">
                Nome esportivo
              </span>
              <strong>
                {athlete.nickname || "—"}
              </strong>
            </div>

            <div>
              <span className="help">
                Categoria
              </span>
              <strong>
                {athlete.category?.name ||
                  "Sem categoria"}
              </strong>
            </div>

            <div>
              <span className="help">
                Situação
              </span>
              <strong>
                {isEvaluation
                  ? "Em avaliação"
                  : "Elenco"}
              </strong>
            </div>

            <div>
              <span className="help">
                Ano de nascimento
              </span>
              <strong>
                {athlete.birthYear || "—"}
              </strong>
            </div>

            <div>
              <span className="help">
                Número
              </span>
              <strong>
                {athlete.jerseyNumber ?? "—"}
              </strong>
            </div>

            <div>
              <span className="help">
                Posição
              </span>
              <strong>
                {athlete.position || "—"}
              </strong>
            </div>

            <div>
              <span className="help">
                Pé dominante
              </span>
              <strong>
                {dominantFootLabel(
                  athlete.dominantFoot,
                )}
              </strong>
            </div>

            <div>
              <span className="help">
                Status
              </span>
              <strong>
                {athlete.active
                  ? "Ativo"
                  : "Inativo"}
              </strong>
            </div>
          </div>

          <div
            className="form-divider"
            style={{
              marginTop: 24,
            }}
          >
            <span>
              PRIVACIDADE DA FAMÍLIA
            </span>
          </div>

          <p className="muted">
            Os dados pessoais e de contato do
            responsável são restritos à gestão
            autorizada do clube.
          </p>
        </section>
      )}
    </main>
  );
}
