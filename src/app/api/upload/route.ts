import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 4 * 1024 * 1024;

function hasValidImageSignature(buffer: Buffer, mime: string) {
  if (mime === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mime === "image/png") {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return buffer.length >= png.length && png.every((byte, index) => buffer[index] === byte);
  }
  if (mime === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  return false;
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sessão expirada. Entre novamente para enviar imagens." }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");
    const purpose = String(form.get("purpose") || "site").replace(/[^a-z0-9-_]/gi, "").toLowerCase();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
    }

    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: "Formato não permitido. Use JPEG, PNG ou WEBP." }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_SIZE) {
      return NextResponse.json({ error: "A imagem deve ter até 4 MB." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (!hasValidImageSignature(bytes, file.type)) {
      return NextResponse.json({ error: "O conteúdo do arquivo não corresponde a uma imagem válida." }, { status: 400 });
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const organizationPart = user.organizationId || user.id;
    const pathname = `onzeup/${organizationPart}/${purpose}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    if (process.env.NODE_ENV === "production") {
      try {
        const blob = await put(pathname, bytes, {
          access: "public",
          addRandomSuffix: false,
        });
        return NextResponse.json({ url: blob.url, storage: "vercel-blob" });
      } catch (error) {
        console.error("BLOB_UPLOAD_ERROR", error instanceof Error ? error.message : error);
        return NextResponse.json(
          { error: "Não foi possível enviar a imagem para o armazenamento. Tente novamente." },
          { status: 502 }
        );
      }
    }

    const localName = pathname.split("/").pop()!;
    const dir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, localName), bytes);

    return NextResponse.json({ url: `/uploads/${localName}`, storage: "local-development" });
  } catch (error) {
    console.error("UPLOAD_ROUTE_ERROR", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Erro interno durante o upload." }, { status: 500 });
  }
}
