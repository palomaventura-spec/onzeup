"use client";

import { FormEvent, useState } from "react";

import ImageUpload from "@/components/ImageUpload";

import AthleteDocumentUploadForm from "./[id]/dados/AthleteDocumentUploadForm";
import { createAthlete } from "./actions";

type CategoryOption = { id: string; name: string };

export default function AthleteCreateForm({
  categories,
}: {
  categories: CategoryOption[];
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{
    athleteId: string;
    athleteName: string;
  } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const result = await createAthlete(new FormData(event.currentTarget));
      if (!result || "error" in result || !result.athleteId) {
        setError(
          result && "error" in result
            ? result.error ?? "Não foi possível cadastrar o atleta."
            : "Não foi possível cadastrar o atleta.",
        );
        return;
      }
      setCreated(result);
    } catch {
      setError("Não foi possível cadastrar o atleta. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  if (created) {
    return (
      <div className="athlete-create-document-step" aria-live="polite">
        <div className="athlete-create-stepper" aria-label="Etapa 2 de 2">
          <span>✓ Dados do atleta</span>
          <b>2</b>
          <strong>Documentos opcionais</strong>
        </div>
        <span className="page-eyebrow">ETAPA 2 DE 2</span>
        <h3>Documentos de {created.athleteName}</h3>
        <p className="muted">
          Se tiver algum documento em mãos, anexe agora. Caso contrário, conclua o
          cadastro e inclua pela ficha privada quando for mais conveniente.
        </p>
        <AthleteDocumentUploadForm
          athleteId={created.athleteId}
          athleteName={created.athleteName}
          guardians={[]}
        />
        <div className="actions" style={{ marginTop: 16 }}>
          <a className="btn" href={`/atletas/${created.athleteId}`}>
            Concluir e abrir ficha do atleta
          </a>
          <a className="btn btn-secondary" href="/atletas">
            Continuar depois
          </a>
        </div>
      </div>
    );
  }

  return (
    <form className="athlete-create-form" onSubmit={submit}>
      <div className="athlete-create-stepper" aria-label="Etapa 1 de 2">
        <b>1</b>
        <strong>Dados do atleta</strong>
        <span>2. Documentos opcionais</span>
      </div>
      <fieldset>
        <legend>Dados esportivos</legend>
        <label>
          Nome
          <input name="name" placeholder="Nome completo" required />
        </label>
        <label>
          Nome esportivo / apelido
          <input name="nickname" placeholder="Ex.: G9" />
        </label>
        <label>
          Categoria
          <select name="categoryId" defaultValue="">
            <option value="">Sem categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ano de nascimento
          <input name="birthYear" type="number" min="2000" max="2035" placeholder="2018" />
        </label>
        <label>
          Número
          <input name="jerseyNumber" type="number" min="0" max="99" placeholder="9" />
        </label>
        <label>
          Posição
          <input name="position" placeholder="Ex.: Atacante" />
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
          <ImageUpload name="photoUrl" label="Foto (JPEG/PNG/WEBP)" />
        </div>
      </fieldset>

      <fieldset>
        <legend>Família e responsável • privado</legend>
        <label>
          Nome do responsável
          <input name="guardianName" placeholder="Nome completo" />
        </label>
        <label>
          Parentesco / relação
          <input name="guardianRelation" placeholder="Ex.: Mãe, Pai, Tutor" />
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

      <section className="athlete-create-documents-hint" aria-label="Documentos opcionais">
        <span className="page-eyebrow">PRÓXIMA ETAPA</span>
        <strong>Depois de salvar, você poderá anexar documentos sem sair desta tela.</strong>
        <p className="muted">
          Atestados, exames, autorizações e identificações também poderão ser incluídos depois.
        </p>
      </section>

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button type="submit" disabled={saving}>
        {saving ? "Salvando dados..." : "Salvar dados e ir para documentos"}
      </button>
    </form>
  );
}
