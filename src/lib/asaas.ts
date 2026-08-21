const SANDBOX_API = "https://api-sandbox.asaas.com/v3";
const PRODUCTION_API = "https://api.asaas.com/v3";

function apiKey() {
  const value = process.env.ASAAS_API_KEY;
  if (!value) throw new Error("ASAAS_API_KEY não configurado.");
  return value;
}

export function asaasIsSandbox() {
  return String(process.env.ASAAS_ENV || "sandbox").toLowerCase() !== "production";
}

function baseUrl() {
  return asaasIsSandbox() ? SANDBOX_API : PRODUCTION_API;
}

export async function asaasFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      access_token: apiKey(),
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
    console.error("ASAAS_API_ERROR", {
      path,
      status: response.status,
      body,
      sandbox: asaasIsSandbox(),
    });
    throw new Error(`Asaas respondeu ${response.status}.`);
  }

  return body as T;
}

export type AsaasCheckout = {
  id: string;
  link?: string | null;
  status?: string | null;
  externalReference?: string | null;
};

function formatAsaasDate(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    " ",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
    ":",
    pad(date.getSeconds()),
  ].join("");
}

export async function createAsaasPlayerPremiumCheckout(input: {
  externalReference: string;
  playerName: string;
  successUrl: string;
  cancelUrl: string;
  expiredUrl: string;
}) {
  const nextDueDate = new Date();
  nextDueDate.setMinutes(nextDueDate.getMinutes() + 5);

  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 10);

  const checkout = await asaasFetch<AsaasCheckout>("/checkouts", {
    method: "POST",
    body: JSON.stringify({
      billingTypes: ["CREDIT_CARD"],
      chargeTypes: ["RECURRENT"],
      minutesToExpire: 120,
      externalReference: input.externalReference,
      callback: {
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        expiredUrl: input.expiredUrl,
      },
      items: [
        {
          name: "ONZEUP Player Premium",
          description: `Plano Premium mensal - ${input.playerName}`,
          quantity: 1,
          value: 29.9,
        },
      ],
      subscription: {
        cycle: "MONTHLY",
        nextDueDate: formatAsaasDate(nextDueDate),
        endDate: formatAsaasDate(endDate),
      },
    }),
  });

  if (!checkout.id) {
    throw new Error("Asaas não retornou o ID do checkout.");
  }

  return {
    ...checkout,
    link:
      checkout.link ||
      `https://asaas.com/checkoutSession/show?id=${encodeURIComponent(checkout.id)}`,
  };
}

export type AsaasStoredData = {
  provider?: "ASAAS";
  environment?: "SANDBOX" | "PRODUCTION";
  checkoutId?: string;
  checkoutUrl?: string;
  checkoutStatus?: string;
  subscriptionId?: string;
  processedEventIds?: string[];
  lastEvent?: string;
};

export function readAsaasData(value?: string | null): AsaasStoredData {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeAsaasData(value: AsaasStoredData) {
  return JSON.stringify(value);
}
