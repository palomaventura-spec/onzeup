"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AsaasReturnSync({
  paymentId,
}: {
  paymentId: string;
}) {
  const [message, setMessage] = useState("Confirmando pagamento com o Asaas...");
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      try {
        const response = await fetch("/api/asaas/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId }),
        });

        const result = await response.json();

        if (cancelled) return;

        if (!response.ok) {
          setMessage(
            result?.error ||
              "Pagamento recebido. A ativação automática ainda está sendo processada.",
          );
          return;
        }

        if (result.paid) {
          setPaid(true);
          setMessage("Pagamento confirmado. Seu ONZEUP Player Premium está ativo!");
          return;
        }

        setMessage(
          "O pagamento ainda está sendo processado pelo Asaas. Volte ao Player e atualize em alguns instantes.",
        );
      } catch {
        if (!cancelled) {
          setMessage(
            "Pagamento recebido. A ativação automática ainda está sendo processada.",
          );
        }
      }
    }

    sync();

    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  return (
    <>
      <p>{message}</p>
      <Link className="btn" href="/responsavel">
        {paid ? "Abrir meu Player Premium" : "Voltar ao ONZEUP Player"}
      </Link>
    </>
  );
}
