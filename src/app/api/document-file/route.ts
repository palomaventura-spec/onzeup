import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
) {
  try {
    const user =
      await getCurrentUser();

    if (
      !user ||
      !user.organizationId
    ) {
      return NextResponse.json(
        {
          error:
            "Sessão expirada.",
        },
        {
          status: 401,
        },
      );
    }

    const url =
      new URL(request.url);

    const documentId =
      url.searchParams.get("id");

    if (!documentId) {
      return NextResponse.json(
        {
          error:
            "Documento não informado.",
        },
        {
          status: 400,
        },
      );
    }

    const document =
      await prisma.competitionAthleteDocument.findFirst({
        where: {
          id: documentId,

          athlete: {
            team: {
              competition: {
                organizationId:
                  user.organizationId,
              },
            },
          },
        },

        select: {
          sourceReferenceId: true,
          fileName: true,
          mimeType: true,
        },
      });

    if (
      !document ||
      !document.sourceReferenceId
    ) {
      return NextResponse.json(
        {
          error:
            "Documento não encontrado ou acesso não autorizado.",
        },
        {
          status: 404,
        },
      );
    }

    const result =
      await get(
        document.sourceReferenceId,
        {
          access: "private",
        },
      );

    if (!result) {
      return NextResponse.json(
        {
          error:
            "Arquivo não encontrado no armazenamento.",
        },
        {
          status: 404,
        },
      );
    }

    const safeName =
      (
        document.fileName ||
        "documento"
      )
        .replace(
          /["\r\n]/g,
          "",
        );

    return new Response(
      result.stream,
      {
        headers: {
          "Content-Type":
            document.mimeType ||
            result.blob.contentType ||
            "application/octet-stream",

          "Content-Disposition":
            `inline; filename="${safeName}"`,

          "Cache-Control":
            "private, no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "PRIVATE_DOCUMENT_READ_ERROR",
      error instanceof Error
        ? error.message
        : error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível abrir o documento.",
      },
      {
        status: 500,
      },
    );
  }
}