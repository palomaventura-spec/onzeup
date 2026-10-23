import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { runAutomaticDocumentNotices } from "@/lib/document-notice-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization") || "";
  const expected = secret ? `Bearer ${secret}` : "";
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  if (!expected || suppliedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }
  try {
    return NextResponse.json(await runAutomaticDocumentNotices());
  } catch (error) {
    console.error("DOCUMENT_NOTICE_CRON_ERROR", error instanceof Error ? error.name : "unknown_error");
    return NextResponse.json({ error: "Falha na rotina de avisos." }, { status: 500 });
  }
}
