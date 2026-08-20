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

export async function mercadoPagoFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
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
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    console.error("MERCADOPAGO_API_ERROR", {
      path,
      status: response.status,
      body,
    });
    throw new Error(`Mercado Pago respondeu ${response.status}.`);
  }

  return body as T;
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

export async function createPlayerPremiumSubscription(input: {
  payerEmail: string;
  externalReference: string;
  playerName: string;
  backUrl: string;
}) {
  const payerEmail =
    mercadoPagoIsTestMode() && process.env.MERCADOPAGO_TEST_PAYER_EMAIL
      ? process.env.MERCADOPAGO_TEST_PAYER_EMAIL
      : input.payerEmail;

  return mercadoPagoFetch<MercadoPagoSubscription>("/preapproval", {
    method: "POST",
    body: JSON.stringify({
      reason: `ONZEUP Player Premium - ${input.playerName}`,
      external_reference: input.externalReference,
      payer_email: payerEmail,
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
