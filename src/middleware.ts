import { NextRequest, NextResponse } from "next/server";

function getHost(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    ""
  ).split(":")[0].toLowerCase();
}

export function middleware(request: NextRequest) {
  const host = getHost(request);
  const path = request.nextUrl.pathname;

  if (
    path.startsWith("/_next") ||
    path.startsWith("/api") ||
    path.startsWith("/favicon") ||
    path.includes(".")
  ) {
    return NextResponse.next();
  }

  const isPlayers =
    host === "players.onzeup.com.br" ||
    host === "www.players.onzeup.com.br" ||
    host === "players.localhost" ||
    host.startsWith("players.");

  const isCoach =
    host === "coach.onzeup.com.br" ||
    host === "www.coach.onzeup.com.br" ||
    host === "coach.localhost" ||
    host.startsWith("coach.");

  if (isPlayers) {
    const url = request.nextUrl.clone();

    if (path === "/") {
      url.pathname = "/players";
      return NextResponse.rewrite(url);
    }

    if (path === "/players") {
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    // Public player slug stays visually /slug but is served by the existing
    // root dynamic player page.
    return NextResponse.next();
  }

  if (isCoach) {
    const url = request.nextUrl.clone();

    if (path === "/") {
      url.pathname = "/coaches";
      return NextResponse.rewrite(url);
    }

    if (path === "/coaches") {
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    url.pathname = `/coach-profile${path}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
