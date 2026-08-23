import { NextRequest, NextResponse } from "next/server";
function getHost(request:NextRequest){return (request.headers.get("x-forwarded-host")||request.headers.get("host")||"").split(":")[0].toLowerCase()}
export function middleware(request:NextRequest){
 const host=getHost(request), path=request.nextUrl.pathname;
 if(path.startsWith("/_next")||path.startsWith("/api")||path.startsWith("/favicon")||path.includes(".")) return NextResponse.next();
 const players=host==="players.onzeup.com.br"||host==="www.players.onzeup.com.br"||host==="players.localhost";
 const coach=host==="coach.onzeup.com.br"||host==="www.coach.onzeup.com.br"||host==="coach.localhost";
 const club=host==="club.onzeup.com.br"||host==="www.club.onzeup.com.br"||host==="club.localhost";
 if(players){const u=request.nextUrl.clone(); if(path==="/"){u.pathname="/players";return NextResponse.rewrite(u)} if(path==="/players"){u.pathname="/";return NextResponse.redirect(u)} return NextResponse.next()}
 if(coach){const u=request.nextUrl.clone(); if(path==="/"){u.pathname="/coaches";return NextResponse.rewrite(u)} if(path==="/coaches"){u.pathname="/";return NextResponse.redirect(u)} u.pathname=`/coach-profile${path}`;return NextResponse.rewrite(u)}
 if(club){const u=request.nextUrl.clone(); if(path==="/"){u.pathname="/club";return NextResponse.rewrite(u)} if(path==="/club"){u.pathname="/";return NextResponse.redirect(u)} return NextResponse.next()}
 return NextResponse.next();
}
export const config={matcher:["/((?!_next/static|_next/image).*)"]};
