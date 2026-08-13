"use client";

const modules = [
  { key: "dashboard", title: "Primeiros passos", text: "Visão geral da plataforma e checklist inicial." },
  { key: "organizacao", title: "Organização e site", text: "Logo, cores, privacidade e site público." },
  { key: "atletas", title: "Atletas do clube", text: "Cadastro do clube x perfil OnzeUp Player." },
  { key: "qtr", title: "QTR", text: "Automático, manual, híbrido e compartilhamento." },
  { key: "convocacoes", title: "Convocações", text: "WhatsApp básico e controle de confirmações." },
  { key: "financeiro", title: "Financeiro", text: "Mensalidades, Pix manual e baixa de pagamentos." },
  { key: "agenda", title: "Agenda", text: "Treinos e jogos em uma linha do tempo." },
  { key: "player", title: "ONZE Player", text: "Perfil esportivo administrado exclusivamente pela família." },
];

export default function HelpPage() {
  function resetTour(module: string) {
    localStorage.removeItem(`onzeup:tour:${module}`);
    alert("Tutorial reativado. Abra novamente a tela correspondente.");
  }

  function resetAll() {
    modules.forEach((module) => localStorage.removeItem(`onzeup:tour:${module.key}`));
    localStorage.removeItem("onzeup:getting-started:dismissed");
    localStorage.removeItem("onzeup:getting-started:collapsed");
    alert("Tutoriais e checklist foram reativados.");
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Ajuda</h1>
          <p className="muted">Tutoriais rápidos para usar os principais recursos da ONZEUP.</p>
        </div>
        <button type="button" onClick={resetAll}>Reativar todos os tutoriais</button>
      </div>

      <div className="help-library">
        {modules.map((module) => (
          <article className="card help-library-card" key={module.key}>
            <div>
              <span className="public-kicker">GUIA</span>
              <h2>{module.title}</h2>
              <p className="muted">{module.text}</p>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => resetTour(module.key)}
            >
              Mostrar novamente
            </button>
          </article>
        ))}
      </div>

      <section className="card help-concepts">
        <h2>Conceitos importantes</h2>

        <div className="help-concept-grid">
          <article>
            <strong>Atleta do clube</strong>
            <p>É administrado exclusivamente pela organização e participa de categorias, jogos, convocações e financeiro.</p>
          </article>

          <article>
            <strong>OnzeUp Player</strong>
            <p>É o perfil individual administrado pela família. Pode existir mesmo que o clube não use a ONZEUP.</p>
          </article>

          <article>
            <strong>WhatsApp básico</strong>
            <p>A ONZEUP abre a conversa com uma mensagem pronta. Não lê mensagens e não exige integração com WhatsApp Business.</p>
          </article>

          <article>
            <strong>QTR automático</strong>
            <p>Usa os treinos e jogos já cadastrados para montar a semana. Você pode editar o resultado antes de compartilhar.</p>
          </article>
        </div>
      </section>
    </>
  );
}
