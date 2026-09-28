import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const raw = process.env.DATABASE_URL || "";

  try {
    const url = new URL(raw);

    console.log("PRODUCTION_DATABASE_HOST", url.hostname);
    console.log("PRODUCTION_DATABASE_NAME", url.pathname.replace("/", ""));

    return NextResponse.json({
      ok: true,
      host: url.hostname,
      database: url.pathname.replace("/", ""),
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "DATABASE_URL indisponível",
      },
      { status: 500 },
    );
  }
}
