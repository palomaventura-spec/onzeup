import Link from "next/link";

type Props = { body: string };

// Exibe mensagens comuns como texto e identifica somente o marcador interno
// de uma solicitação autenticada de documentos; nunca insere HTML bruto.
export default function PlayerCommunicationBody({ body }: Props) {
  const requestId = body.match(/\[DOCUMENT_REQUEST:([a-zA-Z0-9]{10,64})\]/)?.[1];
  const text = body.replace(/\n?\[DOCUMENT_REQUEST:[a-zA-Z0-9]{10,64}\]/g, "").trim();

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <p style={{ whiteSpace: "pre-line", margin: 0 }}>{text}</p>
      {requestId ? (
        <Link
          className="btn btn-secondary"
          href={`/api/athlete-registration-requests/access?requestId=${requestId}`}
          style={{ width: "fit-content" }}
        >
          Enviar documentos com segurança
        </Link>
      ) : null}
    </div>
  );
}
