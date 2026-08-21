import crypto from "crypto";

const API = "https://api.mercadopago.com";

function token() {
  const value = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!value) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado.");
  return value;
}

export function mercadoPagoIsTestMode() {
  return token().startsWith("TEST-");
}

type MercadoPagoHttpResult<T> = {
  ok: boolean;
  status: number;
  body: T | null;
  requestId: string | null;
};

async function mercadoPagoRawFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<MercadoPagoHttpResult<T>> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  let body: T | null = null;

  try {
    body = text ? (JSON.parse(text) as T) : null;
  } catch {
    body = text ? (text as T) : null;
  }

  const requestId =
    response.headers.get("x-request-id") ||
    response.headers.get("x-correlation-id") ||
    response.headers.get("x-amzn-requestid") ||
    null;

  return {
    ok: response.ok,
    status: response.status,
    body,
    requestId,
  };
}

export async function mercadoPagoFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const result = await mercadoPagoRawFetch<T>(path, init);

  if (!result.ok) {
    console.error("MERCADOPAGO_API_ERROR", {
      path,
      status: result.status,
      requestId: result.requestId,
      body: result.body,
    });

    throw new Error(`Mercado Pago respondeu ${result.status}.`);
  }

  return result.body as T;
}

export type MercadoPagoSubscription = {
  id: string;
  status: string;
  external_reference?: string | null;
  init_point?: string | null;
  payer_email?: string | null;
  next_payment_date?: string | null;
};

export type MercadoPagoPayment = {
  id: number | string;
  status: string;
  external_reference?: string | null;
  transaction_amount?: number | null;
  date_approved?: string | null;
};

type MercadoPagoSubscriptionSearch = {
  results?: MercadoPagoSubscription[];
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain) return "***";
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}***@${domain}`;
}

async function findSandboxSubscriptionByReference(input: {
  payerEmail: string;
  externalReference: string;
}) {
  const query = new URLSearchParams({
    payer_email: input.payerEmail,
    limit: "20",
    offset: "0",
  });

  const result = await mercadoPagoRawFetch<MercadoPagoSubscriptionSearch>(
    `/preapproval/search?${query.toString()}`,
    {
      method: "GET",
      headers: {
        "X-scope": "stage",
      },
    },
  );

  if (!result.ok) {
    console.warn("MERCADOPAGO_PREAPPROVAL_RECOVERY_SEARCH_FAILED", {
      status: result.status,
      requestId: result.requestId,
    });
    return null;
  }

  const match = result.body?.results?.find(
    (item) =>
      String(item.external_reference || "") === input.externalReference,
  );

  return match || null;
}

export async function createPlayerPremiumSubscription(input: {
  payerEmail: string;
  externalReference: string;
  playerName: string;
  backUrl: string;
}) {
  if (mercadoPagoIsTestMode()) {
    throw new Error(
      "Checkout hospedado desabilitado em TEST. Use o sandbox CardForm.",
    );
  }

  return mercadoPagoFetch<MercadoPagoSubscription>("/preapproval", {
    method: "POST",
    body: JSON.stringify({
      reason: `ONZEUP Player Premium - ${input.playerName}`,
      external_reference: input.externalReference,
      payer_email: input.payerEmail,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: 29.9,
        currency_id: "BRL",
      },
      back_url: input.backUrl,
      status: "pending",
    }),
  });
}

export async function createPlayerPremiumSandboxSubscription(input: {
  payerEmail: string;
  externalReference: string;
  playerName: string;
  backUrl: string;
  cardTokenId: string;
}) {
  if (!mercadoPagoIsTestMode()) {
    throw new Error(
      "Sandbox só pode ser usado com MERCADOPAGO_ACCESS_TOKEN iniciado por TEST-.",
    );
  }

  const payload = {
    reason: `ONZEUP Player Premium - ${input.playerName}`,
    external_reference: input.externalReference,
    payer_email: input.payerEmail,
    card_token_id: input.cardTokenId,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: 29.9,
      currency_id: "BRL",
    },
    back_url: input.backUrl,
    status: "authorized",
  };

  console.info("MERCADOPAGO_PREAPPROVAL_PAYLOAD", {
    reason: payload.reason,
    external_reference: payload.external_reference,
    payer_email: maskEmail(payload.payer_email),
    card_token_present: Boolean(payload.card_token_id),
    card_token_length: payload.card_token_id.length,
    auto_recurring: payload.auto_recurring,
    back_url_origin: (() => {
      try {
        return new URL(payload.back_url).origin;
      } catch {
        return "invalid";
      }
    })(),
    status: payload.status,
    accessTokenIsTest: mercadoPagoIsTestMode(),
  });

  // Tentativa inicial + no máximo 3 retries transitórios.
  // Antes de cada retry, procuramos a assinatura pelo payer_email e
  // external_reference. Isso reduz o risco de duplicar uma assinatura caso
  // o Mercado Pago tenha processado a criação antes de devolver 502/503/504.
  const retryDelays = [1000, 3000, 7000];

  for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
    const attemptNumber = attempt + 1;

    const result = await mercadoPagoRawFetch<MercadoPagoSubscription>(
      "/preapproval",
      {
        method: "POST",
        headers: {
          "X-scope": "stage",
        },
        body: JSON.stringify(payload),
      },
    );

    console.info("MERCADOPAGO_PREAPPROVAL_ATTEMPT", {
      attempt: attemptNumber,
      status: result.status,
      requestId: result.requestId,
      bodyPresent: result.body !== null,
    });

    if (result.ok && result.body) {
      return result.body;
    }

    const transient = [502, 503, 504].includes(result.status);

    if (!transient) {
      console.error("MERCADOPAGO_API_ERROR", {
        path: "/preapproval",
        status: result.status,
        requestId: result.requestId,
        body: result.body,
        attempt: attemptNumber,
      });

      throw new Error(`Mercado Pago respondeu ${result.status}.`);
    }

    console.warn("MERCADOPAGO_PREAPPROVAL_TRANSIENT_ERROR", {
      status: result.status,
      requestId: result.requestId,
      attempt: attemptNumber,
    });

    // Confirma se a tentativa anterior criou a assinatura apesar do erro.
    try {
      const recovered = await findSandboxSubscriptionByReference({
        payerEmail: input.payerEmail,
        externalReference: input.externalReference,
      });

      if (recovered) {
        console.info("MERCADOPAGO_PREAPPROVAL_RECOVERED", {
          subscriptionId: recovered.id,
          status: recovered.status,
          externalReference: input.externalReference,
        });
        return recovered;
      }
    } catch (recoveryError) {
      console.warn(
        "MERCADOPAGO_PREAPPROVAL_RECOVERY_ERROR",
        recoveryError instanceof Error
          ? recoveryError.message
          : recoveryError,
      );
    }

    if (attempt >= retryDelays.length) {
      console.error("MERCADOPAGO_API_ERROR", {
        path: "/preapproval",
        status: result.status,
        requestId: result.requestId,
        body: result.body,
        attempts: attemptNumber,
      });

      throw new Error(
        `Mercado Pago indisponível após ${attemptNumber} tentativas (${result.status}).`,
      );
    }

    const delay = retryDelays[attempt];

    console.info("MERCADOPAGO_PREAPPROVAL_RETRY_SCHEDULED", {
      nextAttempt: attemptNumber + 1,
      delayMs: delay,
    });

    await sleep(delay);
  }

  throw new Error("Falha inesperada ao criar assinatura no Mercado Pago.");
}

export async function getMercadoPagoSubscription(id: string) {
  return mercadoPagoFetch<MercadoPagoSubscription>(
    `/preapproval/${encodeURIComponent(id)}`,
  );
}

export async function getMercadoPagoPayment(id: string) {
  return mercadoPagoFetch<MercadoPagoPayment>(
    `/v1/payments/${encodeURIComponent(id)}`,
  );
}

function safeEqualHex(a: string, b: string) {
  try {
    const aa = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
  } catch {
    return false;
  }
}

export function validateMercadoPagoWebhook(input: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  if (!secret) {
    console.error("MERCADOPAGO_WEBHOOK_SECRET_MISSING");
    return false;
  }

  if (!input.xSignature) return false;

  let ts = "";
  let v1 = "";

  for (const part of input.xSignature.split(",")) {
    const [rawKey, ...rawValue] = part.split("=");
    const key = rawKey?.trim();
    const value = rawValue.join("=").trim();
    if (key === "ts") ts = value;
    if (key === "v1") v1 = value;
  }

  if (!ts || !v1) return false;

  const dataId = input.dataId ? input.dataId.toLowerCase() : "";
  let manifest = "";

  if (dataId) manifest += `id:${dataId};`;
  if (input.xRequestId) manifest += `request-id:${input.xRequestId};`;
  manifest += `ts:${ts};`;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  return safeEqualHex(expected, v1);
}

export type StoredProviderData = {
  provider?: "MERCADOPAGO";
  environment?: "TEST" | "PRODUCTION";
  subscriptionId?: string;
  checkoutUrl?: string;
  subscriptionStatus?: string;
  processedPaymentIds?: string[];
  lastPaymentStatus?: string;
  lastPaymentId?: string;
};

export function readProviderData(value?: string | null): StoredProviderData {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeProviderData(value: StoredProviderData) {
  return JSON.stringify(value);
}
