import Link from "next/link";

export default function DemoBanner({
  kind,
}: {
  kind: "club" | "player";
}) {
  return (
    <div className="demo-environment-banner">
      <span>AMBIENTE DEMONSTRAÇÃO</span>
      <p>
        {kind === "club"
          ? "Você está no Clube Demo OnzeUp, uma organização fictícia separada de qualquer clube real ou cadastrado nos testes."
          : "Você está testando uma conta familiar fictícia do ONZE Player. Não use dados pessoais reais."}
      </p>
      <Link href="/">Voltar ao site</Link>
    </div>
  );
}
