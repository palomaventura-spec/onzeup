"use client";

import { FormEvent, useMemo, useState } from "react";

import ImageUpload from "@/components/ImageUpload";

import AthleteDocumentUploadForm from "./[id]/dados/AthleteDocumentUploadForm";
import { createAthlete } from "./actions";

type CategoryOption = {
  id: string;
  name: string;
  type: "STANDARD" | "EVALUATION";
  accentColor: string;
};

export default function AthleteCreateForm({
  categories,
}: {
  categories: CategoryOption[];
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [entryType, setEntryType] = useState<"STANDARD" | "EVALUATION">(
    "STANDARD",
  );
  const [categoryId, setCategoryId] = useState("");
  const [created, setCreated] = useState<{
    athleteId: string;
    athleteName: string;
  } | null>(null);

  const availableCategories = useMemo(
    () =>
      categories.filter(
        (category) => category.type === entryType,
      ),
    [categories, entryType],
  );

  function changeEntryType(value: "STANDARD" | "EVALUATION") {
    setEntryType(value);

    const firstCompatible = categories.find(
      (category) => category.type === value,
    );

    setCategoryId(firstCompatible?.id ?? "");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const result = await createAthlete(
        new FormData(event.currentTarget),
      );

      if (!result || "error" in result || !result.athleteId) {
        setError(
          result && "error" in result
            ? result.error ??
                "Não foi possível cadastrar o atleta."
            : "Não foi possível cadastrar o atleta.",
        );
        return;
      }

      setCreated(result);
    } catch {
      setError(
        "Não foi possível cadastrar o atleta. Tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (created) {
    return (
      <div
        className="athlete-create-document-step"
        aria-live="polite"
      >
        <div
          className="athlete-create-stepper"
          aria-label="Etapa 2 de 2"
        >
          <span>✓ Dados do atleta</span>
          <b>2</b>
          <strong>Documentos opcionais</strong>
        </div>

        <span className="page-eyebrow">ETAPA 2 DE 2</span>

        <h3>Documentos de {created.athleteName}</h3>

        <p className="muted">
          Se tiver algum documento em mãos, anexe agora. Caso
          contrário, conclua o cadastro e inclua pela ficha privada
          quando for mais conveniente.
        </p>

        <AthleteDocumentUploadForm
          athleteId={created.athleteId}
          athleteName={created.athleteName}
          guardians={[]}
        />

        <div className="actions" style={{ marginTop: 16 }}>
          <a
            className="btn"
            href={`/atletas/${created.athleteId}`}
          >
            Concluir e abrir ficha do atleta
          </a>

          <a className="btn btn-secondary" href="/atletas">
            Continuar depois
          </a>
        </div>
      </div>
    );
  }

  const evaluationMode = entryType === "EVALUATION";

  return (
    <form className="athlete-create-form" onSubmit={submit}>
      <div
        className="athlete-create-stepper"
        aria-label="Etapa 1 de 2"
      >
        <b>1</b>
        <strong>Dados do atleta</strong>
        <span>2. Documentos opcionais</span>
      </div>

      <fieldset>
        <legend>Entrada no clube</legend>

        <label>
          Situação de entrada
          <select
            name="entryType"
            value={entryType}
            onChange={(event) =>
              changeEntryType(
                event.target.value as
                  | "STANDARD"
                  | "EVALUATION",
              )
            }
          >
            <option value="STANDARD">Atleta do elenco</option>
            <option value="EVALUATION">
              Atleta em avaliação
            </option>
          </select>
        </label>

        <label>
          {evaluationMode
            ? "Categoria de avaliação"
            : "Categoria"}
          <select
            name="categoryId"
            value={categoryId}
            onChange={(event) =>
              setCategoryId(event.target.value)
            }
            required={evaluationMode}
          >
            {!evaluationMode ? (
              <option value="">Sem categoria</option>
            ) : null}

            {availableCategories.map((category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {category.name}
              </option>
            ))}
          </select>
        </label>

        {evaluationMode && !availableCategories.length ? (
          <p className="form-error" role="alert">
            Nenhuma categoria do tipo Avaliação foi criada.
            Crie uma categoria de avaliação antes de cadastrar
            este atleta.
          </p>
        ) : null}

        {evaluationMode ? (
          <p className="muted">
            O atleta permanecerá nesta categoria durante o
            processo de avaliação. Se for aprovado, poderá ser
            transferido depois para uma categoria oficial sem
            perder o histórico.
          </p>
        ) : null}
      </fieldset>

      <fieldset>
        <legend>Dados esportivos</legend>

        <label>
          Nome
          <input
            name="name"
            placeholder="Nome completo"
            required
          />
        </label>

        <label>
          Nome esportivo / apelido
          <input
            name="nickname"
            placeholder="Ex.: G9"
          />
        </label>

        <label>
          Ano de nascimento
          <input
            name="birthYear"
            type="number"
            min="2000"
            max="2035"
            placeholder="2018"
          />
        </label>

        <label>
          Número
          <input
            name="jerseyNumber"
            type="number"
            min="0"
            max="99"
            placeholder="9"
          />
        </label>

        <label>
          Posição
          <input
            name="position"
            placeholder="Ex.: Atacante"
          />
        </label>

        <label>
          Pé dominante
          <select name="dominantFoot" defaultValue="">
            <option value="">Não informado</option>
            <option value="RIGHT">Direito</option>
            <option value="LEFT">Esquerdo</option>
            <option value="BOTH">Ambidestro</option>
          </select>
        </label>

        <div className="athlete-create-photo">
          <ImageUpload
            name="photoUrl"
            label="Foto (JPEG/PNG/WEBP)"
          />
        </div>
      </fieldset>

            <fieldset>
        <legend>Registros esportivos</legend>

        <p
          className="muted"
          style={{ gridColumn: "1 / -1" }}
        >
          Preencha apenas os registros que o atleta possui.
          O mesmo atleta pode ter inscrição no futsal e no
          futebol de campo.
        </p>

        <label>
          Futsal · Federação
          <input
            name="futsalFederationName"
            placeholder="Ex.: Federação estadual"
          />
        </label>

        <label>
          Futsal · Nº de inscrição na Federação
          <input
            name="futsalFederationNumber"
            placeholder="Número de inscrição"
          />
        </label>

        <label>
          Campo · Federação
          <input
            name="footballFederationName"
            placeholder="Ex.: Federação estadual"
          />
        </label>

        <label>
          Campo · Nº de inscrição na Federação
          <input
            name="footballFederationNumber"
            placeholder="Número de inscrição"
          />
        </label>

        <label style={{ gridColumn: "1 / -1" }}>
          Campo · Nº de registro CBF
          <input
            name="cbfRegistrationNumber"
            placeholder="Número de registro CBF"
          />
        </label>
      </fieldset>
<fieldset>
        <legend>Família e responsável • privado</legend>

        <label>
          Nome do responsável
          <input
            name="guardianName"
            placeholder="Nome completo"
          />
        </label>

        <label>
          Parentesco / relação
          <input
            name="guardianRelation"
            placeholder="Ex.: Mãe, Pai, Tutor"
          />
        </label>

        <label>
          WhatsApp / telefone
          <input name="guardianPhone" />
        </label>

        <label>
          E-mail
          <input name="guardianEmail" type="email" />
        </label>
      </fieldset>

      <section
        className="athlete-create-documents-hint"
        aria-label="Documentos opcionais"
      >
        <span className="page-eyebrow">PRÓXIMA ETAPA</span>

        <strong>
          Depois de salvar, você poderá anexar documentos sem
          sair desta tela.
        </strong>

        <p className="muted">
          Atestados, exames, autorizações e identificações também
          poderão ser incluídos depois.
        </p>
      </section>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={
          saving ||
          (evaluationMode && !availableCategories.length)
        }
      >
        {saving
          ? "Salvando dados..."
          : evaluationMode
            ? "Cadastrar atleta em avaliação"
            : "Salvar dados e ir para documentos"}
      </button>
    </form>
  );
}
