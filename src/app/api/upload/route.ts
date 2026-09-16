import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 4 * 1024 * 1024;

type DetectedImage = {
  mime: "image/jpeg" | "image/png" | "image/webp";
  ext: "jpg" | "png" | "webp";
};

function detectImage(buffer: Buffer): DetectedImage | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { mime: "image/jpeg", ext: "jpg" };
  }

  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (
    buffer.length >= png.length &&
    png.every((byte, index) => buffer[index] === byte)
  ) {
    return { mime: "image/png", ext: "png" };
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { mime: "image/webp", ext: "webp" };
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Sessão expirada. Entre novamente para enviar imagens." },
        { status: 401 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    const purpose = String(form.get("purpose") || "site")
      .replace(/[^a-z0-9-_]/gi, "")
      .toLowerCase();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_SIZE) {
      return NextResponse.json({ error: "A imagem deve ter até 4 MB." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const detected = detectImage(bytes);
    if (!detected) {
      return NextResponse.json(
        { error: "Imagem inválida ou formato não suportado. Use uma foto JPEG, PNG ou WEBP." },
        { status: 400 }
      );
    }

    const organizationPart = user.organizationId || user.id;
    const pathname = `onzeup/${organizationPart}/${purpose}/${Date.now()}-${crypto.randomUUID()}.${detected.ext}`;

    if (process.env.NODE_ENV === "production") {
      try {
        const blob = await put(pathname, bytes, {
          access: "public",
          addRandomSuffix: false,
          contentType: detected.mime,
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

    return NextResponse.json({
      url: `/uploads/${localName}`,
      storage: "local-development",
    });
  } catch (error) {
    console.error("UPLOAD_ROUTE_ERROR", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Erro interno durante o upload." }, { status: 500 });
  }
}
