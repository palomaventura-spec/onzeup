import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

const CLUB_DEMO_EMAIL = "admin@onzeup.com.br";

export async function POST(req: Request) {
  const form = await req.formData();
  const type = String(form.get("type") || "");

  if (type === "club") {
    const user = await prisma.user.findUnique({
      where: { email: CLUB_DEMO_EMAIL },
    });

    if (!user || !user.active) {
      return NextResponse.redirect(new URL("/login?demo=missing", req.url), 303);
    }

    await createSession(user.id);
    return NextResponse.redirect(new URL("/dashboard", req.url), 303);
  }

  if (type === "player") {
    const token = crypto.randomUUID().replaceAll("-", "");
    const email = `demo-player-${token}@demo.onzeup.local`;
    const passwordHash = await hash(crypto.randomUUID(), 10);

    const user = await prisma.user.create({
      data: {
        name: "Visitante Demo",
        email,
        passwordHash,
        role: "GUARDIAN",
        active: true,
        guardianProfile: {
          create: {},
        },
      },
    });

    await createSession(user.id);

    return NextResponse.redirect(
      new URL("/responsavel?demo=novo", req.url),
      303
    );
  }

  return NextResponse.redirect(new URL("/login?demo=invalid", req.url), 303);
}
