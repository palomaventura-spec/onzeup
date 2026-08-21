"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => {
      cardForm: (config: any) => {
        getCardFormData: () => {
          token?: string;
          cardholderEmail?: string;
        };
      };
    };
  }
}

export default function MercadoPagoSandboxCardForm({
  publicKey,
  playerId,
  payerEmail,
}: {
  publicKey: string;
  playerId: string;
  payerEmail: string;
}) {
  const [sdkReady, setSdkReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!sdkReady || mounted || !window.MercadoPago) return;

    const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
    const cardForm = mp.cardForm({
      amount: "29.90",
      iframe: true,
      form: {
        id: "form-checkout",
        cardNumber: { id: "form-checkout__cardNumber", placeholder: "Número do cartão" },
        expirationDate: { id: "form-checkout__expirationDate", placeholder: "MM/AA" },
        securityCode: { id: "form-checkout__securityCode", placeholder: "CVV" },
        cardholderName: { id: "form-checkout__cardholderName", placeholder: "Nome do titular" },
        issuer: { id: "form-checkout__issuer", placeholder: "Banco emissor" },
        installments: { id: "form-checkout__installments", placeholder: "Parcelas" },
        identificationType: { id: "form-checkout__identificationType", placeholder: "Tipo de documento" },
        identificationNumber: { id: "form-checkout__identificationNumber", placeholder: "CPF" },
        cardholderEmail: { id: "form-checkout__cardholderEmail", placeholder: "E-mail" },
      },
      callbacks: {
        onFormMounted: (error: unknown) => {
          if (error) {
            console.error("MERCADOPAGO_CARDFORM_MOUNT_ERROR", error);
            setStatus("Não foi possível carregar o formulário do Mercado Pago.");
            return;
          }
          setMounted(true);
        },
        onSubmit: async (event: Event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          setStatus("Criando assinatura de teste...");

          try {
            const data = cardForm.getCardFormData();
            const cardTokenId = String(data.token || "");
            const email = String(data.cardholderEmail || payerEmail || "");

            if (!cardTokenId) {
              throw new Error("O Mercado Pago não gerou o token do cartão. Confira os dados de teste.");
            }

            const response = await fetch("/api/mercadopago/sandbox-subscription", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ playerId, cardTokenId, payerEmail: email }),
            });
            const result = await response.json();

            if (!response.ok) {
              throw new Error(result?.error || "Não foi possível criar a assinatura.");
            }

            setStatus(`Assinatura criada (${result.subscriptionStatus}). Aguardando confirmação do pagamento.`);
            window.location.href = result.redirectUrl || `/checkout/mercadopago/retorno?paymentId=${encodeURIComponent(result.paymentId)}`;
          } catch (error) {
            console.error("MERCADOPAGO_SANDBOX_FORM_ERROR", error);
            setStatus(error instanceof Error ? error.message : "Erro ao criar assinatura de teste.");
            setBusy(false);
          }
        },
        onFetching: () => {
          setStatus("Validando dados com o Mercado Pago...");
          return () => {};
        },
      },
    });
  }, [sdkReady, mounted, publicKey, playerId, payerEmail, busy]);

  return (
    <>
      <Script src="https://sdk.mercadopago.com/js/v2" strategy="afterInteractive" onLoad={() => setSdkReady(true)} />

      <form id="form-checkout" className="mp-sandbox-form">
        <div className="mp-sandbox-grid">
          <label className="mp-field mp-field-wide">Número do cartão de teste<div id="form-checkout__cardNumber" className="mp-secure-field" /></label>
          <label className="mp-field">Validade<div id="form-checkout__expirationDate" className="mp-secure-field" /></label>
          <label className="mp-field">CVV<div id="form-checkout__securityCode" className="mp-secure-field" /></label>
          <label className="mp-field mp-field-wide">Nome do titular<input type="text" id="form-checkout__cardholderName" defaultValue="APRO" autoComplete="off" /></label>
          <label className="mp-field">Banco emissor<select id="form-checkout__issuer" /></label>
          <label className="mp-field">Parcelas<select id="form-checkout__installments" /></label>
          <label className="mp-field">Documento<select id="form-checkout__identificationType" /></label>
          <label className="mp-field">CPF de teste<input type="text" id="form-checkout__identificationNumber" defaultValue="12345678909" autoComplete="off" /></label>
          <label className="mp-field mp-field-wide">E-mail do comprador teste<input type="email" id="form-checkout__cardholderEmail" defaultValue={payerEmail} autoComplete="off" /></label>
        </div>

        <button type="submit" id="form-checkout__submit" className="btn" disabled={!mounted || busy}>
          {busy ? "Criando assinatura..." : "Testar assinatura R$ 29,90"}
        </button>

        <progress value="0" className="progress-bar mp-progress" aria-label="Carregando" />
        {status ? <p className="mp-sandbox-status">{status}</p> : null}
        <p className="field-help">Ambiente sandbox. Os campos de cartão são tokenizados pelo MercadoPago.js; o ONZEUP recebe apenas o CardToken.</p>
      </form>
    </>
  );
}
