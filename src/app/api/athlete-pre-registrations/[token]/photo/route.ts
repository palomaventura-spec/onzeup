import crypto from "node:crypto";

import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 4 * 1024 * 1024;

const ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function hashToken(value: string) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

function detectImage(
  bytes: Buffer,
):
  | { mime: "image/jpeg"; ext: "jpg" }
  | { mime: "image/png"; ext: "png" }
  | { mime: "image/webp"; ext: "webp" }
  | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return {
      mime: "image/jpeg",
      ext: "jpg",
    };
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return {
      mime: "image/png",
      ext: "png",
    };
  }

  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return {
      mime: "image/webp",
      ext: "webp",
    };
  }

  return null;
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{ token: string }>;
  },
) {
  try {
    const { token } = await context.params;

    if (!token) {
      return NextResponse.json(
        { error: "Link inválido." },
        { status: 400 },
      );
    }

    const registration =
      await prisma.athletePreRegistrationRequest.findUnique({
        where: {
          tokenHash: hashToken(token),
        },
        select: {
          id: true,
          organizationId: true,
          status: true,
          expiresAt: true,
        },
      });

    if (!registration) {
      return NextResponse.json(
        {
          error:
            "Este link não existe ou não está mais disponível.",
        },
        { status: 404 },
      );
    }

    if (
      registration.status !== "PENDING"
    ) {
      return NextResponse.json(
        {
          error:
            "Este cadastro não aceita mais alterações.",
        },
        { status: 409 },
      );
    }

    if (
      registration.expiresAt < new Date()
    ) {
      return NextResponse.json(
        {
          error:
            "Este link expirou.",
        },
        { status: 410 },
      );
    }

    const form =
      await request.formData();

    const file =
      form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Arquivo inválido." },
        { status: 400 },
      );
    }

    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Formato não permitido. Use JPEG, PNG ou WEBP.",
        },
        { status: 400 },
      );
    }

    if (
      file.size <= 0 ||
      file.size > MAX_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            "A imagem deve ter até 4 MB.",
        },
        { status: 400 },
      );
    }

    const bytes =
      Buffer.from(
        await file.arrayBuffer(),
      );

    const detected =
      detectImage(bytes);

    if (!detected) {
      return NextResponse.json(
        {
          error:
            "Imagem inválida ou formato não suportado.",
        },
        { status: 400 },
      );
    }

    if (
      !process.env.BLOB_READ_WRITE_TOKEN &&
      !process.env.VERCEL_OIDC_TOKEN
    ) {
      return NextResponse.json(
        {
          error:
            "Armazenamento de imagens não configurado.",
        },
        { status: 503 },
      );
    }

    const pathname =
      `onzeup/${registration.organizationId}/athlete-pre-registration/${registration.id}/${Date.now()}-${crypto.randomUUID()}.${detected.ext}`;

    const blob =
      await put(
        pathname,
        bytes,
        {
          access: "public",
          addRandomSuffix: false,
          contentType: detected.mime,
          cacheControlMaxAge:
            60 * 60 * 24 * 365,
        },
      );

    return NextResponse.json({
      ok: true,
      url: blob.url,
    });
  } catch (error) {
    console.error(
      "ATHLETE_PRE_REGISTRATION_PHOTO_ERROR",
      error instanceof Error
        ? error.message
        : error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível enviar a foto.",
      },
      { status: 500 },
    );
  }
}
