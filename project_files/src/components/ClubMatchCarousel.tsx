"use client";

import { useEffect, useRef, useState } from "react";

export type PublicMatchCard = {
  id: string;
  category: string;
  competition?: string | null;
  opponent: string;
  startsAt: string;
  location?: string | null;
};

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })
    .format(new Date(iso)).replace(".", "");
}
function fmtTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false })
    .format(new Date(iso));
}

export default function ClubMatchCarousel({
  matches,
  clubName,
  logoUrl,
  allGamesHref,
}: {
  matches: PublicMatchCard[];
  clubName: string;
  logoUrl?: string | null;
  allGamesHref: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function go(next: number) {
    const bounded = Math.max(0, Math.min(matches.length - 1, next));
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: bounded * el.clientWidth, behavior: "smooth" });
    setIndex(bounded);
  }

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => {
      if (!el.clientWidth) return;
      setIndex(Math.max(0, Math.min(matches.length - 1, Math.round(el.scrollLeft / el.clientWidth))));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [matches.length]);

  if (!matches.length) return null;

  return (
    <aside className="match-carousel-shell" aria-label="Próximos jogos">
      <div className="match-carousel-head">
        <div>
          <span className="next-match-label">PRÓXIMOS JOGOS</span>
          <small>{index + 1} / {matches.length}</small>
        </div>
        {matches.length > 1 ? (
          <div className="match-carousel-arrows">
            <button type="button" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Jogo anterior">‹</button>
            <button type="button" onClick={() => go(index + 1)} disabled={index === matches.length - 1} aria-label="Próximo jogo">›</button>
          </div>
        ) : null}
      </div>

      <div className="match-carousel-track" ref={track}>
        {matches.map((match) => (
          <article className="match-carousel-slide" key={match.id}>
            <div className="next-match-category">{match.category}{match.competition ? ` • ${match.competition}` : ""}</div>
            <div className="next-match-versus">
              <div>{logoUrl ? <img src={logoUrl} alt="" /> : <b>OU</b>}<strong>{clubName}</strong></div>
              <span>×</span>
              <div className="opponent-mark"><b>{match.opponent.slice(0, 2).toUpperCase()}</b><strong>{match.opponent}</strong></div>
            </div>
            <div className="next-match-info">
              <strong>{fmtDate(match.startsAt)} • {fmtTime(match.startsAt)}</strong>
              <span>{match.location || "Local a definir"}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="match-carousel-footer">
        <div className="match-carousel-dots" aria-hidden="true">
          {matches.map((m, i) => <button type="button" key={m.id} className={i === index ? "active" : ""} onClick={() => go(i)} />)}
        </div>
        <a href={allGamesHref}>Ver todos os jogos →</a>
      </div>
    </aside>
  );
}
