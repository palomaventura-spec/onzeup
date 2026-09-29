import Link from "next/link";
import { notFound } from "next/navigation";

import AthleteSaveButton from "@/components/AthleteSaveButton";
import ImageUpload from "@/components/ImageUpload";
import SafeAvatar from "@/components/SafeAvatar";

import { requireClubPermission } from "@/lib/club-access";
import { hasClubPermission } from "@/lib/club-permissions";
import { prisma } from "@/lib/prisma";

import {
  approveEvaluationAthlete,
  rejectEvaluationAthlete,
  updateAthlete,
} from "../actions";

type CategoryAuditMetadata = {
  event?: string;
  reason?: string;
  fromCategory?: {
    id?: string;
    name?: string;
    type?: string;
  } | null;
  toCategory?: {
    id?: string;
    name?: string;
    type?: string;
  } | null;
};

function parseCategoryAuditMetadata(
  value: string | null,
) {
  if (!value) return null;

  try {
    return JSON.parse(value) as CategoryAuditMetadata;
  } catch {
    return null;
  }
}

function categoryAuditLabel(event?: string) {
  switch (event) {
    case "EVALUATION_ENTRY":
      return "Entrada em avaliação";
    case "EVALUATION_APPROVED":
      return "Aprovado para o elenco";
    case "EVALUATION_REJECTED":
      return "Não aprovado na avaliação";
    case "EVALUATION_TRANSFER":
      return "Transferência entre avaliações";
    case "CATEGORY_TRANSFER":
      return "Transferência de categoria";
    case "CATEGORY_REMOVAL":
      return "Retirado da categoria";
    case "CATEGORY_ASSIGNMENT":
      return "Vinculado à categoria";
    default:
      return "Alteração de categoria";
  }
}

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
        sportRegistrations: true,
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

  const categoryHistory =
    await prisma.athleteDataAuditLog.findMany({
      where: {
        organizationId: user.organizationId,
        athleteId: athlete.id,
        entityType: "ATHLETE_CATEGORY",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      select: {
        id: true,
        metadataJson: true,
        createdAt: true,
        actor: {
          select: {
            name: true,
          },
        },
      },
    });

  const standardCategories = categories.filter(
    (category) => category.type === "STANDARD",
  );

  const evaluationCategories = categories.filter(
    (category) =>
      category.type === "EVALUATION",
  );

  const latestCategoryEvent =
    parseCategoryAuditMetadata(
      categoryHistory[0]?.metadataJson ?? null,
    )?.event;

  const isRejectedEvaluation =
    latestCategoryEvent === "EVALUATION_REJECTED" &&
    !athlete.categoryId;

  const isEvaluation =
    athlete.category?.type === "EVALUATION";

  const accentColor =
    athlete.category?.accentColor || "#9DDB16";

  const futsalFederation =
    athlete.sportRegistrations.find(
      (registration) =>
        registration.sport === "FUTSAL" &&
        registration.authorityType === "FEDERATION",
    );

  const footballFederation =
    athlete.sportRegistrations.find(
      (registration) =>
        registration.sport === "FOOTBALL" &&
        registration.authorityType === "FEDERATION",
    );

  const cbfRegistration =
    athlete.sportRegistrations.find(
      (registration) =>
        registration.sport === "FOOTBALL" &&
        registration.authorityType === "CBF",
    );
  return (
    <main className="athlete-profile-page athlete-edit-page-v3">
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
              : isRejectedEvaluation
                ? "AVALIAÇÃO ENCERRADA"
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
            isRejectedEvaluation
              ? "athlete-status"
              : athlete.active
                ? "athlete-status active"
                : "athlete-status"
          }
          style={
            isEvaluation
              ? {
                  background: accentColor,
                  color: "#10200a",
                }
              : isRejectedEvaluation
                ? {
                    background: "#fee2e2",
                    color: "#b91c1c",
                  }
                : undefined
          }
        >
          {isEvaluation
            ? "Em avaliação"
            : isRejectedEvaluation
              ? "Não aprovado"
              : athlete.active
                ? "Ativo"
                : "Inativo"}
        </span>
      </section>

      <nav className="athlete-v3-tabs" aria-label="Navegação do atleta">
        <Link
          className="active"
          href={`/atletas/${athlete.id}`}
        >
          Ficha
        </Link>

        <Link
          href={`/atletas/${athlete.id}/dados#documentos`}
        >
          Documentos
        </Link>

        <Link
          href={`/atletas/${athlete.id}/performance`}
        >
          Performance
        </Link>

        <Link
          className="athlete-v3-back"
          href="/atletas"
        >
          ← Voltar aos atletas
        </Link>
      </nav>

      <div className="page-head athlete-v3-page-head">
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
            Ao aprovar, o atleta será transferido automaticamente para a categoria oficial vinculada a esta avaliação, mantendo todo o histórico.
          </p>

          <form
            action={approveEvaluationAthlete}
            style={{ marginTop: 16 }}
          >
            <input
              type="hidden"
              name="athleteId"
              value={athlete.id}
            />

            <button
              type="submit"
              className="btn"
            >
              Aprovar atleta
            </button>
          </form>
          <details style={{ marginTop: 16 }}>
            <summary style={{ cursor: "pointer", fontWeight: 800 }}>
              Registrar como não aprovado
            </summary>

            <form
              action={rejectEvaluationAthlete}
              className="form"
              style={{ marginTop: 14 }}
            >
              <input
                type="hidden"
                name="athleteId"
                value={athlete.id}
              />

              <label>
                Motivo / observação da decisão
                <textarea
                  name="reason"
                  rows={4}
                  required
                  placeholder="Registre de forma objetiva o motivo da não aprovação."
                />
              </label>

              <button
                type="submit"
                className="btn-secondary" style={{ borderColor: "#dc2626", color: "#b91c1c", background: "#fff" }}
              >
                Confirmar não aprovação
              </button>
            </form>
          </details>
        </section>
      ) : null}

      {categoryHistory.length ? (
        <section
          className="card"
          style={{ marginBottom: 18 }}
        >
          <span className="page-eyebrow">
            HISTÓRICO DE CATEGORIA
          </span>

          <h2>Movimentações do atleta</h2>

          <div className="stack">
            {categoryHistory.map((item) => {
              const metadata =
                parseCategoryAuditMetadata(
                  item.metadataJson,
                );

              return (
                <div key={item.id}>
                  <strong>
                    {categoryAuditLabel(
                      metadata?.event,
                    )}
                  </strong>

                  <p className="muted">
                    {metadata?.fromCategory?.name
                      ? `${metadata.fromCategory.name} → `
                      : ""}
                    {metadata?.toCategory?.name ||
                      "Sem categoria"}
                    {" · "}
                    {item.createdAt.toLocaleString(
                      "pt-BR",
                    )}
                    {item.actor?.name
                      ? ` · ${item.actor.name}`
                      : ""}
                  </p>

                  {metadata?.reason ? (
                    <p className="muted" style={{ marginTop: 4 }}>
                      Motivo: {metadata.reason}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
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

            <label style={{ alignSelf: "start" }}>
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

            <div
              className="form-divider"
              style={{
                gridColumn: "1 / -1",
              }}
            >
              <span>REGISTROS ESPORTIVOS</span>
            </div>

            <p
              className="muted"
              style={{
                gridColumn: "1 / -1",
              }}
            >
              O mesmo atleta pode ter inscrição no futsal,
              no futebol e registro CBF.
            </p>

            <label>
              Futsal · Federação
              <input
                name="futsalFederationName"
                defaultValue={
                  futsalFederation?.authorityName ?? ""
                }
                placeholder="Ex.: Federação estadual"
              />
            </label>

            <label>
              Futsal · Nº de inscrição
              <input
                name="futsalFederationNumber"
                defaultValue={
                  futsalFederation?.registrationNumber ?? ""
                }
              />
            </label>

            <label>
              Futebol · Federação
              <input
                name="footballFederationName"
                defaultValue={
                  footballFederation?.authorityName ?? ""
                }
                placeholder="Ex.: Federação estadual"
              />
            </label>

            <label>
              Futebol · Nº de inscrição
              <input
                name="footballFederationNumber"
                defaultValue={
                  footballFederation?.registrationNumber ?? ""
                }
              />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              Futebol · Nº de registro CBF
              <input
                name="cbfRegistrationNumber"
                defaultValue={
                  cbfRegistration?.registrationNumber ?? ""
                }
              />
            </label>
            <ImageUpload
              name="photoUrl"
              defaultValue={athlete.photoUrl}
              label="Foto do atleta — incluir ou substituir"
              recommended="JPEG, PNG ou WEBP até 4 MB. Após enviar ou remover, clique em Salvar alterações."
            />

            <label style={{ alignSelf: "start" }}>
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
                  : isRejectedEvaluation
                    ? "Não aprovado"
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
                Futsal · Federação
              </span>
              <strong>
                {futsalFederation
                  ? `${futsalFederation.authorityName || "Federação"} · ${futsalFederation.registrationNumber}`
                  : "—"}
              </strong>
            </div>

            <div>
              <span className="help">
                Futebol · Federação
              </span>
              <strong>
                {footballFederation
                  ? `${footballFederation.authorityName || "Federação"} · ${footballFederation.registrationNumber}`
                  : "—"}
              </strong>
            </div>

            <div>
              <span className="help">
                Futebol · CBF
              </span>
              <strong>
                {cbfRegistration?.registrationNumber || "—"}
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

      <style>{`
        .athlete-edit-page-v3 {
          --athlete-v3-ink: #07131d;
          --athlete-v3-muted: #70808b;
          --athlete-v3-line: #dfe6ea;
          --athlete-v3-lime: #99e600;
          --athlete-v3-lime-soft: #eff9d8;
          display: grid;
          gap: 18px;
          padding: 28px 34px 44px;
          background:
            radial-gradient(circle at 92% 2%, rgba(153, 230, 0, .075), transparent 25rem),
            #f4f7f8;
        }

        .athlete-edit-page-v3 * {
          box-sizing: border-box;
        }

        .athlete-edit-page-v3 .athlete-profile-hero {
          min-height: 194px;
          display: flex;
          align-items: center;
          gap: 22px;
          position: relative;
          overflow: hidden;
          margin: 0;
          padding: 28px 34px;
          border: 1px solid rgba(255,255,255,.08) !important;
          border-top: 0 !important;
          border-radius: 26px;
          color: #fff;
          background:
            linear-gradient(
              104deg,
              rgba(5, 20, 31, .99) 0%,
              rgba(6, 29, 37, .98) 58%,
              rgba(20, 76, 30, .97) 100%
            );
          box-shadow: 0 20px 45px rgba(7, 19, 29, .12);
        }

        .athlete-edit-page-v3 .athlete-profile-hero::after {
          content: "";
          width: 360px;
          height: 360px;
          position: absolute;
          right: -105px;
          top: -175px;
          border: 1px solid rgba(153,230,0,.18);
          border-radius: 999px;
          box-shadow:
            0 0 0 42px rgba(153,230,0,.025),
            0 0 0 84px rgba(153,230,0,.018);
          pointer-events: none;
        }

        .athlete-edit-page-v3 .athlete-profile-avatar,
        .athlete-edit-page-v3 .athlete-profile-hero > div,
        .athlete-edit-page-v3 .athlete-status {
          position: relative;
          z-index: 1;
        }

        .athlete-edit-page-v3 .athlete-profile-avatar {
          width: 94px;
          height: 94px;
          flex: 0 0 94px;
          overflow: hidden;
          border: 3px solid var(--athlete-v3-lime);
          border-radius: 22px;
          background: #fff;
          box-shadow: 0 12px 26px rgba(0,0,0,.18);
        }

        .athlete-edit-page-v3 .athlete-profile-avatar img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .athlete-edit-page-v3 .athlete-profile-hero .page-eyebrow {
          display: block;
          margin-bottom: 6px;
          color: var(--athlete-v3-lime) !important;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .16em;
        }

        .athlete-edit-page-v3 .athlete-profile-hero h1 {
          margin: 0;
          color: #fff !important;
          font-size: clamp(34px, 4vw, 54px);
          line-height: 1;
          letter-spacing: -.045em;
        }

        .athlete-edit-page-v3 .athlete-profile-hero p {
          margin: 8px 0 0;
          color: rgba(255,255,255,.78);
          font-size: 14px;
          font-weight: 700;
        }

        .athlete-edit-page-v3 .athlete-status {
          margin-left: auto;
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          padding: 0 14px;
          border-radius: 999px;
          color: #66747d;
          background: #edf1f3;
          font-size: 10px;
          font-weight: 900;
        }

        .athlete-edit-page-v3 .athlete-status.active {
          color: #10200a;
          background: var(--athlete-v3-lime);
        }

        .athlete-v3-tabs {
          min-height: 64px;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px;
          border: 1px solid var(--athlete-v3-line);
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 8px 28px rgba(8,26,38,.035);
        }

        .athlete-v3-tabs > a {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 18px;
          border-radius: 11px;
          color: #5e6f7a;
          font-size: 12px;
          font-weight: 900;
          text-decoration: none;
          transition: background .16s ease, color .16s ease;
        }

        .athlete-v3-tabs > a:hover {
          color: var(--athlete-v3-ink);
          background: #f4f7f8;
        }

        .athlete-v3-tabs > a.active {
          color: #0b1806;
          background: var(--athlete-v3-lime);
          box-shadow: 0 7px 18px rgba(153,230,0,.16);
        }

        .athlete-v3-tabs > .athlete-v3-back {
          margin-left: auto;
          border: 1px solid #dfe6ea;
          background: #fafbfb;
          color: #5f6f7a;
        }

        .athlete-v3-page-head {
          margin: 0;
          padding: 4px 2px 0;
        }

        .athlete-v3-page-head h1 {
          margin: 0;
          color: var(--athlete-v3-ink);
          font-size: 25px;
          letter-spacing: -.03em;
        }

        .athlete-v3-page-head .muted {
          max-width: 850px;
          margin-top: 5px;
          color: var(--athlete-v3-muted);
          font-size: 12px;
        }

        .athlete-edit-page-v3 > .card {
          margin: 0 !important;
          border: 1px solid var(--athlete-v3-line);
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 10px 30px rgba(8,26,38,.04);
        }

        .athlete-edit-page-v3 .form {
          gap: 16px;
        }

        .athlete-edit-page-v3 .form label {
          color: #394a56;
          font-size: 11px;
          font-weight: 900;
        }

        .athlete-edit-page-v3 .form input,
        .athlete-edit-page-v3 .form select,
        .athlete-edit-page-v3 .form textarea {
          min-height: 46px;
          border: 1px solid #d9e2e7;
          border-radius: 12px;
          color: #101820;
          background: #fff;
          font-size: 13px;
        }

        .athlete-edit-page-v3 .form textarea {
          min-height: 104px;
          padding-top: 12px;
        }

        .athlete-edit-page-v3 .form input:focus,
        .athlete-edit-page-v3 .form select:focus,
        .athlete-edit-page-v3 .form textarea:focus {
          border-color: #94d700;
          box-shadow: 0 0 0 3px rgba(153,230,0,.12);
          outline: none;
        }

        .athlete-edit-page-v3 .form-divider {
          margin-top: 6px;
          padding-top: 18px;
          border-top: 1px solid #e8edef;
        }

        .athlete-edit-page-v3 .form-divider span,
        .athlete-edit-page-v3 .page-eyebrow {
          color: #719f00;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .14em;
        }

        .athlete-edit-page-v3 .stack > div {
          padding: 12px 0;
          border-bottom: 1px solid #edf1f3;
        }

        .athlete-edit-page-v3 .stack > div:last-child {
          border-bottom: 0;
        }

        @media (max-width: 980px) {
          .athlete-edit-page-v3 {
            padding: 24px;
          }

          .athlete-edit-page-v3 .athlete-profile-hero {
            min-height: auto;
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .athlete-edit-page-v3 .athlete-status {
            margin-left: 0;
          }
        }

        @media (max-width: 760px) {
          .athlete-edit-page-v3 {
            gap: 14px;
            padding: 16px 12px 32px;
          }

          .athlete-edit-page-v3 .athlete-profile-hero {
            padding: 22px 18px;
            border-radius: 20px;
          }

          .athlete-edit-page-v3 .athlete-profile-avatar {
            width: 72px;
            height: 72px;
            flex-basis: 72px;
            border-radius: 18px;
          }

          .athlete-edit-page-v3 .athlete-profile-hero h1 {
            font-size: 32px;
          }

          .athlete-v3-tabs {
            overflow-x: auto;
            justify-content: flex-start;
            white-space: nowrap;
          }

          .athlete-v3-tabs > a {
            flex: 0 0 auto;
            padding: 0 14px;
          }

          .athlete-v3-tabs > .athlete-v3-back {
            margin-left: 0;
          }

          .athlete-v3-page-head h1 {
            font-size: 22px;
          }
        }

        @media (max-width: 520px) {
          .athlete-edit-page-v3 .athlete-profile-hero {
            display: grid;
            grid-template-columns: 72px 1fr;
          }

          .athlete-edit-page-v3 .athlete-status {
            grid-column: 1 / -1;
            width: max-content;
          }
        }
      `}</style>
    </main>
  );
}
