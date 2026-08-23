"use client";

import { useMemo, useState } from "react";

type VideoItem = {
  title: string;
  description: string;
  url: string;
  featured: boolean;
};

function parseInitial(raw?: string | null): VideoItem[] {
  const value = String(raw || "").trim();
  if (!value) return [{ title: "", description: "", url: "", featured: true }];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      const items = parsed
        .map((item, index) => ({
          title: String(item?.title || ""),
          description: String(item?.description || ""),
          url: String(item?.url || ""),
          featured: Boolean(item?.featured ?? index === 0),
        }))
        .filter((item) => item.url || item.title || item.description);

      return items.length
        ? items
        : [{ title: "", description: "", url: "", featured: true }];
    }
  } catch {}

  const urls = value.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  return urls.length
    ? urls.map((url, index) => ({
        title: index === 0 ? "Melhores momentos" : "",
        description: "",
        url,
        featured: index === 0,
      }))
    : [{ title: "", description: "", url: "", featured: true }];
}

export default function PlayerVideoEditor({
  name = "videos",
  defaultValue,
  premium = false,
}: {
  name?: string;
  defaultValue?: string | null;
  premium?: boolean;
}) {
  const [items, setItems] = useState<VideoItem[]>(() => parseInitial(defaultValue));

  const allowed = premium ? items : items.slice(0, 1);
  const serialized = useMemo(
    () =>
      JSON.stringify(
        allowed
          .filter((item) => item.url.trim())
          .map((item, index) => ({
            title: item.title.trim(),
            description: item.description.trim(),
            url: item.url.trim(),
            featured: item.featured || index === 0,
          })),
      ),
    [allowed],
  );

  function patch(index: number, data: Partial<VideoItem>) {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...data } : item)),
    );
  }

  function setFeatured(index: number) {
    setItems((current) =>
      current.map((item, i) => ({ ...item, featured: i === index })),
    );
  }

  function remove(index: number) {
    setItems((current) => {
      const next = current.filter((_, i) => i !== index);
      if (!next.length) {
        return [{ title: "", description: "", url: "", featured: true }];
      }
      if (!next.some((item) => item.featured)) next[0].featured = true;
      return next;
    });
  }

  return (
    <section className="player-video-editor">
      <input type="hidden" name={name} value={serialized} />

      <div className="player-video-editor-head">
        <div>
          <span className="page-eyebrow">VÍDEOS</span>
          <h3>Melhores momentos</h3>
          <p className="muted">
            Edite a legenda que aparece abaixo de cada vídeo no site.
          </p>
        </div>

        {premium ? (
          <button
            type="button"
            className="btn-secondary btn-small"
            onClick={() =>
              setItems((current) => [
                ...current,
                { title: "", description: "", url: "", featured: false },
              ])
            }
          >
            + Adicionar vídeo
          </button>
        ) : null}
      </div>

      <div className="player-video-editor-list">
        {allowed.map((item, index) => (
          <article className="card player-video-editor-card" key={index}>
            <div className="player-video-editor-number">
              {item.featured ? "DESTAQUE" : `VÍDEO ${String(index + 1).padStart(2, "0")}`}
            </div>

            <label>
              Título do vídeo
              <input
                value={item.title}
                onChange={(e) => patch(index, { title: e.target.value })}
                placeholder="Ex.: Estreia pelo Botafogo"
              />
            </label>

            <label>
              Descrição curta (opcional)
              <input
                value={item.description}
                onChange={(e) => patch(index, { description: e.target.value })}
                placeholder="Ex.: Campeonato Estadual • 2026"
              />
            </label>

            <label>
              Link do YouTube
              <input
                type="url"
                value={item.url}
                onChange={(e) => patch(index, { url: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
              />
            </label>

            <div className="actions">
              <label className="check-row">
                <input
                  type="radio"
                  name="featured-video-ui"
                  checked={item.featured}
                  onChange={() => setFeatured(index)}
                />
                <span>Usar como destaque</span>
              </label>

              {premium && items.length > 1 ? (
                <button
                  type="button"
                  className="btn-danger btn-small"
                  onClick={() => remove(index)}
                >
                  Remover
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {!premium ? (
        <p className="field-help">
          Plano Free: 1 vídeo. No Premium você pode adicionar vários vídeos com
          título, descrição e destaque.
        </p>
      ) : null}
    </section>
  );
}
