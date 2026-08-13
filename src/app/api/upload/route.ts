import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import fs from "fs/promises";
import path from "path";
import { requireUser } from "@/lib/auth";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(req: Request) {
  await requireUser();

  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
  }

  if (!ALLOWED.includes(file.type) || file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Use JPEG, PNG ou WEBP com até 5 MB." },
      { status: 400 }
    );
  }

  const ext =
    file.type === "image/png" ? "png" :
    file.type === "image/webp" ? "webp" : "jpg";

  const safeName = `onzeup/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  // Produção/Vercel: storage persistente.
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(safeName, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });

    return NextResponse.json({ url: blob.url, storage: "vercel-blob" });
  }

  // Desenvolvimento local: mantém o fluxo atual.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Storage não configurado. Defina BLOB_READ_WRITE_TOKEN." },
      { status: 503 }
    );
  }

  const localName = safeName.split("/").pop()!;
  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, localName),
    Buffer.from(await file.arrayBuffer())
  );

  return NextResponse.json({
    url: `/uploads/${localName}`,
    storage: "local-development",
  });
}
