import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Não encontrado", { status: 404 });
  const { messageId } = await params;
  const message = await prisma.supportMessage.findUnique({
    where: { id: messageId },
    select: { attachmentData: true, attachmentMime: true, attachmentName: true, ticket: { select: { requesterId: true } } },
  });
  if (!message || (user.role !== "SUPER_ADMIN" && message.ticket.requesterId !== user.id) || !message.attachmentData) {
    return new NextResponse("Não encontrado", { status: 404 });
  }
  const mime = ["image/png", "image/jpeg", "image/webp"].includes(message.attachmentMime || "") ? message.attachmentMime! : "application/octet-stream";
  const ext = mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : "webp";
  return new NextResponse(Uint8Array.from(message.attachmentData).buffer, {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="captura-11up.${ext}"`,
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      "X-Frame-Options": "DENY",
    },
  });
}
