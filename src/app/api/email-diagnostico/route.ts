import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();

  if (!user || user.role !== "SUPER_ADMIN") {
    // Não expõe sequer a existência/configuração do diagnóstico para visitantes.
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.json({
    resendApiKeyPresent: Boolean(process.env.RESEND_API_KEY),
    resendFromEmailPresent: Boolean(process.env.RESEND_FROM_EMAIL),
    resendReplyToPresent: Boolean(process.env.RESEND_REPLY_TO),
    appUrlPresent: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    nodeEnv: process.env.NODE_ENV,
  });
}
