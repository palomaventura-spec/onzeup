import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getCurrentUser, requireOrganizationUser } from "@/lib/auth";
import { getClubTrainingCategoryAccess } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

function unavailable() {
  return NextResponse.json({ error: "Arquivo indisponível." }, { status: 404, headers: noStore });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ attachmentId: string }> },
) {
  // Não consulta tabelas novas enquanto o recurso não for ativado.
  if (process.env.TRAINING_ABSENCE_DOWNLOAD_ENABLED !== "true") return unavailable();

  const user = await getCurrentUser();
  if (!user) return unavailable();

  const { attachmentId } = await context.params;
  if (!attachmentId || attachmentId.length > 128) return unavailable();

  const attachment = await prisma.trainingAbsenceAttachment.findUnique({
    where: { id: attachmentId },
    select: {
      storageKey: true,
      originalFileName: true,
      mimeType: true,
      sizeBytes: true,
      request: {
        select: {
          athleteId: true,
          organizationId: true,
          schedule: { select: { categoryId: true, sport: true } },
        },
      },
    },
  });
  if (!attachment) return unavailable();

  if (user.role === "GUARDIAN") {
    // A propriedade do Player vem do banco, não de IDs fornecidos na URL.
    const ownership = await prisma.guardianProfile.findUnique({
      where: { userId: user.id },
      select: {
        players: {
          where: {
            athleteLinks: {
              some: {
                athleteId: attachment.request.athleteId,
                verified: true,
                active: true,
                unlinkedAt: null,
                athlete: {
                  organizationId: attachment.request.organizationId,
                  active: true,
                },
              },
            },
          },
          select: { id: true },
          take: 1,
        },
      },
    });
    if (!ownership?.players.length) return unavailable();
  } else {
    // requireOrganizationUser resolve também a organização efetiva do suporte.
    // COACH e usuários sem organização não têm acesso pela rota do Club.
    if (user.role === "COACH") return unavailable();
    const clubUser = await requireOrganizationUser();
    if (clubUser.organizationId !== attachment.request.organizationId) return unavailable();
    const permissions = await getClubTrainingCategoryAccess(
      clubUser,
      attachment.request.schedule.categoryId,
      attachment.request.schedule.sport,
    );
    if (!permissions.canViewAttendance) return unavailable();
  }

  const token = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
  if (!token) return NextResponse.json({ error: "Armazenamento indisponível." }, { status: 503, headers: noStore });

  try {
    const result = await get(attachment.storageKey, { access: "private", token });
    if (!result) return unavailable();

    // O nome do arquivo não pode introduzir cabeçalhos HTTP nem caminhos.
    const safeName = attachment.originalFileName
      .replace(/[\\/\r\n"\x00-\x1f\x7f]/g, "_")
      .slice(0, 150) || "comprovante";
    const mime = ["application/pdf", "image/jpeg", "image/png"].includes(attachment.mimeType)
      ? attachment.mimeType : "application/octet-stream";

    return new Response(result.stream, {
      headers: {
        ...noStore,
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Content-Security-Policy": "sandbox",
      },
    });
  } catch {
    // Não registrar identificadores, nomes de arquivos ou dados médicos.
    console.error("TRAINING_ABSENCE_ATTACHMENT_DOWNLOAD_FAILED");
    return NextResponse.json({ error: "Não foi possível recuperar o comprovante." }, { status: 500, headers: noStore });
  }
}
