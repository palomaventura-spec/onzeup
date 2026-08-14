import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") || "").toLowerCase().trim();
  const password = String(form.get("password") || "");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) return NextResponse.redirect(new URL("/login", req.url), 303);

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.redirect(new URL("/login", req.url), 303);

  await createSession(user.id);
  const destination = user.role === "GUARDIAN" ? "/responsavel" : user.role === "COACH" ? "/coach/dashboard" : "/dashboard";
  return NextResponse.redirect(new URL(destination, req.url), 303);
}
