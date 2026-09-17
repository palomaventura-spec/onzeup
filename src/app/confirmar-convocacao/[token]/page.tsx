import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { respondToCallUp } from "./actions";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

export default async function PublicCallUpResponsePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ sucesso?: string; erro?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const callUp = await prisma.callUp.findUnique({
    where: { responseToken: token },
    include: {
      athlete: true,
      organization: true,
      match: {
        include: {
          category: true,
          staffAssignments: { include: { staffMember: true } },
        },
      },
    },
  });

  if (!callUp) notFound();

  const athleteName = callUp.athlete.nickname || callUp.athlete.name;
  const clubName = callUp.organization.publicName || callUp.organization.name;
  const canRespond =
    callUp.match.callUpMode === "CONFIRMATION_REQUIRED" &&
    callUp.match.status === "SCHEDULED";

  return (
    <main className="public-callup-page">
      <section className="public-callup-card">
        <span className="eyebrow">ONZEUP • CONVOCAÇÃO</span>
        <h1>{clubName}</h1>
        <p className="lead">
          {athleteName} foi convocado(a) para a partida abaixo.
        </p>

        <div className="public-callup-match">
          <strong>
            {callUp.match.category.name} × {callUp.match.opponent}
          </strong>
          <span>{formatDate(callUp.match.startsAt)}</span>
          <span>{callUp.match.location || "Local a definir"}</span>
          <span>{callUp.match.competition || "Jogo"}</span>
          <span>Chegada: {callUp.match.presentationTime || "A definir"}</span>
          <span>
            {callUp.match.arrivalAttire === "TRAINING_UNIFORM"
              ? "Chegar com uniforme de treino; troca no local"
              : "Chegar uniformizado para o jogo"}
          </span>
          <span>{callUp.match.sockRequirement || "Meião oficial"}</span>
          <span>
            {callUp.match.shinGuardsRequired
              ? "Caneleira obrigatória"
              : "Caneleira opcional"}
          </span>
          <span>
            Comissão:{" "}
            {callUp.match.staffAssignments.length
              ? callUp.match.staffAssignments
                  .map((item) => item.staffMember.name)
                  .join(", ")
              : "A definir"}
          </span>
        </div>

        {query.sucesso === "1" ? (
          <div className="success-message">
            Resposta registrada com sucesso. Você pode alterar a resposta nesta
            mesma página enquanto o jogo estiver agendado.
          </div>
        ) : null}

        {query.erro ? (
          <div className="error-message">
            Esta convocação não está mais disponível para resposta.
          </div>
        ) : null}

        {canRespond ? (
          <form action={respondToCallUp} className="form public-callup-form">
            <input type="hidden" name="token" value={token} />
            <label>
              Nome de quem está respondendo
              <input
                name="responseByName"
                defaultValue={callUp.responseByName || ""}
                placeholder="Ex.: mãe, pai ou responsável"
              />
            </label>
            <div className="actions">
              <button className="btn" name="status" value="CONFIRMED">
                Confirmar presença
              </button>
              <button className="btn btn-danger" name="status" value="DECLINED">
                Informar ausência
              </button>
            </div>
          </form>
        ) : (
          <p className="empty">Esta convocação é somente informativa.</p>
        )}

        <small className="help">
          Situação atual:{" "}
          {callUp.status === "CONFIRMED"
            ? "Presença confirmada"
            : callUp.status === "DECLINED"
              ? "Ausência informada"
              : callUp.status === "INFORMED"
                ? "Convocação informada"
                : "Aguardando resposta"}
        </small>
      </section>
    </main>
  );
}
