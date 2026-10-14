import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { decryptPrivateData } from "@/lib/private-data-crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(message: string, status = 403) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

// O comunicado contém somente o ID da solicitação.
// O token secreto nunca deve ser incluído no texto do comunicado.
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "GUARDIAN") {
      return fail("Entre na sua conta de responsável para acessar o envio.", 401);
    }

    const requestId = new URL(request.url).searchParams.get("requestId")?.trim() ?? "";
    if (!/^[a-zA-Z0-9]{10,64}$/.test(requestId)) {
      return fail("Solicitação inválida.", 400);
    }

    const requestRow = await prisma.athleteRegistrationRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        organizationId: true,
        athleteId: true,
        payloadEncrypted: true,
      },
    });

    if (!requestRow) {
      return fail("Solicitação não encontrada.", 404);
    }

    // Verificar autorização ANTES de recuperar o token.
    // A autorização continua obrigatória após o envio ter sido concluído.
    const authorizedRecipient = await prisma.clubCommunicationRecipient.findFirst({
      where: {
        athleteId: requestRow.athleteId,
        communication: {
          organizationId: requestRow.organizationId,
          body: { contains: `[DOCUMENT_REQUEST:${requestRow.id}]` },
        },
        player: {
          guardian: { userId: user.id },
          athleteLinks: {
            some: {
              athleteId: requestRow.athleteId,
              active: true,
              verified: true,
            },
          },
        },
      },
      select: { id: true },
    });

    if (!authorizedRecipient) {
      return fail("Você não possui vínculo autorizado para esta solicitação.", 403);
    }

    let token: unknown;
    try {
      const payload = JSON.parse(
        decryptPrivateData(requestRow.payloadEncrypted) || "{}",
      ) as { playerAccessToken?: unknown };
      token = payload.playerAccessToken;
    } catch {
      return fail("Não foi possível validar a solicitação.", 410);
    }

    if (typeof token !== "string" || !/^[a-zA-Z0-9_-]{32,256}$/.test(token)) {
      return fail("Este comunicado não tem um link de envio disponível.", 410);
    }

    // Não bloquear solicitações SUBMITTED/APPROVED/REJECTED/EXPIRED/REVOKED
    // aqui: a página de destino exibe o estado correto e impede novos anexos.
    const response = NextResponse.redirect(
      new URL(`/envio-documentos/${token}`, request.url),
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("PLAYER_DOCUMENT_ACCESS_ERROR", error);
    return fail("Não foi possível abrir a solicitação. Tente novamente.", 500);
  }
}
