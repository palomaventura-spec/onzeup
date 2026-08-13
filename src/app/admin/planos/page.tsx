export default function PlansPage() {
  const plans = [
    {
      code: "STARTER",
      name: "Starter",
      audience: "Projetos e pequenos treinamentos",
      features: ["Site público", "Categorias", "Atletas", "Treinos", "Jogos e resultados"],
    },
    {
      code: "PRO",
      name: "Pro",
      audience: "Escolinhas e academias",
      features: ["Tudo do Starter", "Convocações", "Financeiro", "Domínio próprio"],
    },
    {
      code: "BUSINESS",
      name: "Business",
      audience: "Clubes e operações maiores",
      features: ["Tudo do Pro", "Integrações", "Suporte avançado", "Recursos futuros"],
    },
  ];

  return (
    <>
      <h1>Planos</h1>
      <p className="muted">Estrutura comercial inicial da OnzeUp.</p>

      <div className="public-grid cards-3">
        {plans.map(plan => (
          <article className="card" key={plan.code}>
            <span className="public-kicker">{plan.code}</span>
            <h2>{plan.name}</h2>
            <p className="muted">{plan.audience}</p>
            <div className="stack">
              {plan.features.map(f => <span key={f}>• {f}</span>)}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
