import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    resendApiKeyPresent: Boolean(process.env.RESEND_API_KEY),
    resendFromEmailPresent: Boolean(process.env.RESEND_FROM_EMAIL),
    resendReplyToPresent: Boolean(process.env.RESEND_REPLY_TO),
    appUrlPresent: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    nodeEnv: process.env.NODE_ENV,
  });
}
