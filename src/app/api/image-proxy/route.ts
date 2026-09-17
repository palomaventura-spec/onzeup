import { NextRequest, NextResponse } from "next/server";

import { requireClubPermission } from "@/lib/club-access";

export const runtime = "nodejs";

function allowedSource(source: URL, request: NextRequest) {
  const currentHost = new URL(request.url).hostname;
  return (
    source.protocol === "https:" &&
    (source.hostname === currentHost ||
      source.hostname.endsWith(".vercel-storage.com") ||
      source.hostname.endsWith(".vercel.app"))
  );
}

export async function GET(request: NextRequest) {
  await requireClubPermission("CALLUPS_VIEW");

  const value = request.nextUrl.searchParams.get("url");
  if (!value) {
    return NextResponse.json({ error: "URL ausente." }, { status: 400 });
  }

  let source: URL;
  try {
    source = new URL(value);
  } catch {
    return NextResponse.json({ error: "URL inválida." }, { status: 400 });
  }

  if (!allowedSource(source, request)) {
    return NextResponse.json(
      { error: "Origem não permitida." },
      { status: 403 },
    );
  }

  const response = await fetch(source, { cache: "force-cache" });
  if (!response.ok) {
    return NextResponse.json(
      { error: "Imagem indisponível." },
      { status: 404 },
    );
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json(
      { error: "Arquivo não é uma imagem." },
      { status: 415 },
    );
  }

  return new NextResponse(await response.arrayBuffer(), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
