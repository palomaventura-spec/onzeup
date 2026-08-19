type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
};

export async function sendTransactionalEmail({
  to,
  subject,
  html,
}: SendEmailArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const replyTo =
    process.env.RESEND_REPLY_TO || "onzeupfutebolbase@gmail.com";

  if (!apiKey || !from) {
    console.error("RESEND_CONFIG_MISSING", {
      apiKeyPresent: Boolean(apiKey),
      fromPresent: Boolean(from),
      replyToPresent: Boolean(replyTo),
      nodeEnv: process.env.NODE_ENV,
    });
    return { ok: false, error: "RESEND_NOT_CONFIGURED" as const };
  }


  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        reply_to: replyTo,
        html,
      }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error("RESEND_SEND_ERROR", response.status, data);
      return {
        ok: false,
        error: "RESEND_SEND_FAILED" as const,
        status: response.status,
      };
    }

    return { ok: true, id: data?.id as string | undefined };
  } catch (error) {
    console.error("RESEND_NETWORK_ERROR", error);
    return { ok: false, error: "RESEND_NETWORK_ERROR" as const };
  }
}
