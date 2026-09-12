import { NextRequest, NextResponse } from "next/server";

function getHost(request: NextRequest) {
  return (request.headers.get("x-forwarded-host") || request.headers.get("host") || "")
    .split(":")[0]
    .toLowerCase();
}

function secure(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()"
  );

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  return response;
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
    return secure(NextResponse.next());
  }

  const players =
    host === "players.onzeup.com.br" ||
    host === "www.players.onzeup.com.br" ||
    host === "players.localhost";
  const coach =
    host === "coach.onzeup.com.br" ||
    host === "www.coach.onzeup.com.br" ||
    host === "coach.localhost";
  const club =
    host === "club.onzeup.com.br" ||
    host === "www.club.onzeup.com.br" ||
    host === "club.localhost";

  if (players) {
    const url = request.nextUrl.clone();
    if (path === "/") {
      url.pathname = "/players";
      return secure(NextResponse.rewrite(url));
    }
    if (path === "/players") {
      url.pathname = "/";
      return secure(NextResponse.redirect(url));
    }
    return secure(NextResponse.next());
  }

  if (coach) {
    const url = request.nextUrl.clone();
    if (path === "/") {
      url.pathname = "/coaches";
      return secure(NextResponse.rewrite(url));
    }
    if (path === "/coaches") {
      url.pathname = "/";
      return secure(NextResponse.redirect(url));
    }
    url.pathname = `/coach-profile${path}`;
    return secure(NextResponse.rewrite(url));
  }

  if (club) {
    const url = request.nextUrl.clone();
    if (path === "/") {
      url.pathname = "/club";
      return secure(NextResponse.rewrite(url));
    }
    if (path === "/club") {
      url.pathname = "/";
      return secure(NextResponse.redirect(url));
    }
    return secure(NextResponse.next());
  }

  return secure(NextResponse.next());
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
