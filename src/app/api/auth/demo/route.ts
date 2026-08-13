import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

const DEMO_EMAILS = {
  club: "admin@onzeup.com.br",
  player: "responsavel@onzeup.com.br",
} as const;

export async function POST(req: Request) {
  const form = await req.formData();
  const type = String(form.get("type") || "") as keyof typeof DEMO_EMAILS;
  const email = DEMO_EMAILS[type];

  if (!email) {
    return NextResponse.redirect(new URL("/login?demo=invalid", req.url), 303);
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.active) {
    return NextResponse.redirect(new URL("/login?demo=missing", req.url), 303);
  }

  await createSession(user.id);

  return NextResponse.redirect(
    new URL(type === "player" ? "/responsavel" : "/dashboard", req.url),
    303
  );
}
