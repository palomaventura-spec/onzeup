import { sendTransactionalEmail } from "@/lib/email";

export type AdminRegistrationType = "PLAYER" | "COACH" | "CLUB";

type AdminRegistrationArgs = {
  type: AdminRegistrationType;
  name: string;
  email: string;
  detail?: string | null;
  status?: string;
};

export function adminEmail() {
  return (process.env.ONZEUP_ADMIN_EMAIL || "onzeupfutebolbase@gmail.com").trim();
}

function typeLabel(type: AdminRegistrationType) {
  if (type === "PLAYER") return "Player / Responsável";
  if (type === "COACH") return "Coach";
  return "Club / Organização";
}

export async function notifyAdminNewRegistration({
  type,
  name,
  email,
  detail,
  status = "Novo cadastro",
}: AdminRegistrationArgs) {
  const destination = adminEmail();
  const label = typeLabel(type);
  const when = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

  const result = await sendTransactionalEmail({
    to: destination,
    subject: `Novo ${label} cadastrado — 11UP`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#101719">
        <div style="font-size:28px;font-weight:900;margin-bottom:22px">ONZE<span style="color:#9ddb16">UP</span></div>
        <h2>Novo cadastro na plataforma</h2>
        <p>Um novo cadastro foi realizado no 11UP.</p>
        <table style="width:100%;border-collapse:collapse;margin:22px 0">
          <tr><td style="padding:9px 0;color:#657278">Tipo</td><td style="padding:9px 0;font-weight:bold">${label}</td></tr>
          <tr><td style="padding:9px 0;color:#657278">Nome</td><td style="padding:9px 0;font-weight:bold">${name}</td></tr>
          <tr><td style="padding:9px 0;color:#657278">E-mail</td><td style="padding:9px 0">${email}</td></tr>
          ${detail ? `<tr><td style="padding:9px 0;color:#657278">Detalhe</td><td style="padding:9px 0">${detail}</td></tr>` : ""}
          <tr><td style="padding:9px 0;color:#657278">Status</td><td style="padding:9px 0">${status}</td></tr>
          <tr><td style="padding:9px 0;color:#657278">Data</td><td style="padding:9px 0">${when}</td></tr>
        </table>
        <p style="color:#657278;font-size:13px">Acompanhe e gerencie os cadastros pela Central 11UP.</p>
      </div>
    `,
  });

  if (!result.ok) {
    console.error("ADMIN_REGISTRATION_EMAIL_FAILED", { type, email });
  }

  return result;
}
