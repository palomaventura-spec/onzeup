import crypto from "crypto";

import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 10 * 1024 * 1024;

type DetectedDocument = {
  mime:
    | "application/pdf"
    | "image/jpeg"
    | "image/png"
    | "image/webp";

  ext:
    | "pdf"
    | "jpg"
    | "png"
    | "webp";
};

function detectDocument(
  buffer: Buffer,
): DetectedDocument | null {
  if (
    buffer.length >= 5 &&
    buffer.subarray(0, 5).toString("ascii") === "%PDF-"
  ) {
    return {
      mime: "application/pdf",
      ext: "pdf",
    };
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return {
      mime: "image/jpeg",
      ext: "jpg",
    };
  }

  const png = [
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
  ];

  if (
    buffer.length >= png.length &&
    png.every(
      (byte, index) =>
        buffer[index] === byte,
    )
  ) {
    return {
      mime: "image/png",
      ext: "png",
    };
  }

  if (
    buffer.length >= 12 &&
    buffer
      .subarray(0, 4)
      .toString("ascii") === "RIFF" &&
    buffer
      .subarray(8, 12)
      .toString("ascii") === "WEBP"
  ) {
    return {
      mime: "image/webp",
      ext: "webp",
    };
  }

  return null;
}

function cleanPurpose(value: string) {
  return value
    .replace(/[^a-z0-9-_]/gi, "")
    .toLowerCase()
    .slice(0, 80);
}

function cleanFilename(value: string) {
  return value
    .replace(/[^\p{L}\p{N}._ -]/gu, "")
    .trim()
    .slice(0, 180);
}

export async function POST(
  request: Request,
) {
  try {
    const user =
      await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Sessão expirada. Entre novamente para enviar documentos.",
        },
        {
          status: 401,
        },
      );
    }

    const form =
      await request.formData();

    const file =
      form.get("file");

    const purpose =
      cleanPurpose(
        String(
          form.get("purpose") ||
            "competition-document",
        ),
      ) || "competition-document";

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "Arquivo inválido.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      file.size <= 0 ||
      file.size > MAX_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            "O documento deve ter até 10 MB.",
        },
        {
          status: 400,
        },
      );
    }

    const bytes =
      Buffer.from(
        await file.arrayBuffer(),
      );

    const detected =
      detectDocument(bytes);

    if (!detected) {
      return NextResponse.json(
        {
          error:
            "Arquivo inválido ou formato não suportado. Use PDF, JPEG, PNG ou WEBP.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !process.env.BLOB_READ_WRITE_TOKEN &&
      !process.env.VERCEL_OIDC_TOKEN
    ) {
      return NextResponse.json(
        {
          error:
            "Armazenamento privado de documentos não configurado.",
        },
        {
          status: 503,
        },
      );
    }

    const organizationPart =
      user.organizationId ||
      user.id;

    const pathname =
      `onzeup-private/${organizationPart}/${purpose}/` +
      `${Date.now()}-${crypto.randomUUID()}.${detected.ext}`;

    const blob =
      await put(
        pathname,
        bytes,
        {
          access: "private",
          addRandomSuffix: false,
          contentType:
            detected.mime,
        },
      );

    return NextResponse.json({
      url: blob.url,
      pathname:
        blob.pathname,
      storage:
        "vercel-blob-private",
      fileName:
        cleanFilename(file.name) ||
        `documento.${detected.ext}`,
      mimeType:
        detected.mime,
      size:
        file.size,
    });
  } catch (error) {
    console.error(
      "PRIVATE_DOCUMENT_UPLOAD_ERROR",
      error instanceof Error
        ? error.message
        : error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível enviar o documento.",
      },
      {
        status: 500,
      },
    );
  }
}