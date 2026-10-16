"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SupportTicketStatus } from "@prisma/client";
import { requireSuperAdmin, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const clean = (value: FormDataEntryValue | null) => String(value || "").trim();
const MAX_ATTACHMENT = 300 * 1024; // <= 300 KB. Next Server Actions default body is 1 MB.
const MAX_SUBJECT = 110;
const MAX_MESSAGE = 4000;

type ImageAttachment = {
  attachmentName: string;
  attachmentMime: string;
  attachmentData: Uint8Array;
};

function attachmentFromForm(value: FormDataEntryValue | null): Promise<ImageAttachment | null> {
  return (async () => {
    if (!(value instanceof File) || value.size === 0) return null;
    if (value.size > MAX_ATTACHMENT) throw new Error("anexo");
    const bytes = new Uint8Array(await value.arrayBuffer());
    const png = bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b);
    const jpg = bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp = bytes.length >= 12 && new TextDecoder().decode(bytes.subarray(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.subarray(8, 12)) === "WEBP";
    const mime = png ? "image/png" : jpg ? "image/jpeg" : webp ? "image/webp" : "";
    if (!mime) throw new Error("anexo");
    return {
      attachmentName: value.name.replace(/[\\/\x00-\x1f]/g, "_").slice(0, 100) || "captura",
      attachmentMime: mime,
      attachmentData: bytes,
    };
  })();
}

function validateText(subject: string, body: string): boolean {
  return subject.length >= 4 && subject.length <= MAX_SUBJECT && body.length >= 8 && body.length <= MAX_MESSAGE;
}

export async function openSupportTicket(formData: FormData) {
  const user = await requireUser();
  if (user.role === "SUPER_ADMIN") redirect("/admin/chamados");

  const subject = clean(formData.get("subject"));
  const body = clean(formData.get("body"));
  if (!validateText(subject, body)) redirect("/suporte?erro=dados");

  let attachment: ImageAttachment | null;
  try {
    attachment = await attachmentFromForm(formData.get("attachment"));
  } catch {
    redirect("/suporte?erro=anexo");
  }

  // Control accidental repeated submissions and account abuse.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentCount = await prisma.supportTicket.count({
    where: { requesterId: user.id, createdAt: { gte: since } },
  });
  if (recentCount >= 5) redirect("/suporte?erro=limite");

  const ticket = await prisma.supportTicket.create({
    data: {
      requesterId: user.id,
      area: user.role === "GUARDIAN" ? "PLAYER" : "CLUB",
      organizationId: user.organizationId || null,
      organizationName: user.organization?.publicName || user.organization?.name || null,
      subject,
      messages: {
        create: {
          authorId: user.id,
          body,
          ...attachment,
        },
      },
    },
  });

  revalidatePath("/suporte");
  revalidatePath("/admin/chamados");
  redirect(`/suporte/${ticket.id}`);
}

export async function replySupportTicket(formData: FormData) {
  const user = await requireUser();
  const ticketId = clean(formData.get("ticketId"));
  const body = clean(formData.get("body"));
  const admin = user.role === "SUPER_ADMIN";
  const destination = admin ? `/admin/chamados/${ticketId}` : `/suporte/${ticketId}`;
  if (!ticketId || body.length < 2 || body.length > MAX_MESSAGE) redirect(`${destination}?erro=dados`);

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { requesterId: true, status: true },
  });
  if (!ticket || (!admin && ticket.requesterId !== user.id)) {
    // Deliberately conceal existence of other users' tickets.
    redirect(admin ? "/admin/chamados" : "/suporte");
  }

  let attachment: ImageAttachment | null;
  try {
    attachment = await attachmentFromForm(formData.get("attachment"));
  } catch {
    redirect(`${destination}?erro=anexo`);
  }

  if (!admin) {
    const count = await prisma.supportMessage.count({
      where: {
        ticketId,
        authorId: user.id,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    if (count >= 12) redirect(`${destination}?erro=limite`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.supportMessage.create({
      data: { ticketId, authorId: user.id, body, ...attachment },
    });
    await tx.supportTicket.update({
      where: { id: ticketId },
      data: { status: admin ? "ANSWERED" : "OPEN" },
    });
  });

  revalidatePath(destination.split("?")[0]);
  revalidatePath("/suporte");
  revalidatePath("/admin/chamados");
  redirect(destination);
}

export async function changeSupportTicketStatus(formData: FormData) {
  await requireSuperAdmin();
  const ticketId = clean(formData.get("ticketId"));
  const status = clean(formData.get("status"));
  if (!ticketId || !(["OPEN", "IN_PROGRESS", "ANSWERED", "CLOSED"] as string[]).includes(status)) {
    redirect("/admin/chamados");
  }
  await prisma.supportTicket.updateMany({
    where: { id: ticketId },
    data: { status: status as SupportTicketStatus },
  });
  revalidatePath("/admin/chamados");
  revalidatePath(`/admin/chamados/${ticketId}`);
  revalidatePath(`/suporte/${ticketId}`);
  redirect(`/admin/chamados/${ticketId}`);
}
