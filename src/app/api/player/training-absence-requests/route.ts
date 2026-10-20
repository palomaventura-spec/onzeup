import crypto from "node:crypto";
import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findEligibleTrainingAthletes } from "@/lib/training-athletes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const REASONS = new Set(["DOENCA", "ESCOLAR", "FAMILIAR", "OUTRO"]);

function stringField(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function validSignature(bytes: Buffer, type: string) {
  if (type === "application/pdf") return bytes.subarray(0, 1024).includes(Buffer.from("%PDF-", "ascii"));
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, i) => bytes[i] === value);
  return false;
}

function reject(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (process.env.TRAINING_ABSENCE_API_ENABLED !== "true") return reject("Funcionalidade ainda não disponível.", 503);
  // Esta rota só deve ser utilizada após a migration estar implantada e a análise do Club pronta.
  const user = await getCurrentUser();
  if (!user || user.role !== "GUARDIAN" || !user.active) return reject("Acesso não autorizado.", 403);

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) return reject("Envie um formulário válido.", 415);
  let data: FormData;
  try { data = await request.formData(); } catch { return reject("Formulário inválido.", 400); }

  const playerId = stringField(data.get("playerId"));
  const scheduleId = stringField(data.get("scheduleId"));
  const reason = stringField(data.get("reason"));
  const details = stringField(data.get("details"));
  if (!playerId || !scheduleId || !REASONS.has(reason) || details.length > 1000) {
    return reject("Dados da justificativa inválidos.", 400);
  }
  if (reason === "OUTRO" && !details) return reject("Explique o motivo da ausência.", 400);

  const rawFile = data.get("file");
  const file = rawFile instanceof File && rawFile.size > 0 ? rawFile : null;
  if (rawFile !== null && !(rawFile instanceof File)) return reject("Arquivo inválido.", 400);
  if (file && (file.size > MAX_FILE_SIZE || !ALLOWED_TYPES.has(file.type))) {
    return reject("Envie PDF, JPG ou PNG de até 4 MB.", 400);
  }

  const guardian = await prisma.guardianProfile.findUnique({
    where: { userId: user.id },
    select: { players: { where: { id: playerId }, select: { id: true } } },
  });
  if (!guardian?.players.length) return reject("Perfil Player não autorizado.", 403);

  const schedule = await prisma.trainingSchedule.findUnique({
    where: { id: scheduleId },
    select: { id: true, organizationId: true, categoryId: true, sport: true, date: true },
  });
  if (!schedule || !schedule.date) return reject("Treino não encontrado.", 404);

  const linkedAthletes = await prisma.playerAthleteLink.findMany({
    where: {
      playerId, verified: true, active: true,
      athlete: { organizationId: schedule.organizationId, active: true },
    },
    select: { athlete: { select: { id: true, organizationId: true, categoryId: true } } },
  });
  if (!linkedAthletes.length) return reject("Vínculo com o clube não autorizado.", 403);

  // A lista oficial do Club considera categorias regulares e categorias de avaliação
  // vinculadas, além da modalidade. Isso evita regras diferentes entre chamada e pedido.
  const eligibleAthletes = await findEligibleTrainingAthletes(
    schedule.organizationId,
    schedule.categoryId,
    schedule.sport,
  );
  const eligibleIds = new Set(eligibleAthletes.map((athlete) => athlete.id));
  // Interseção obrigatória: elegível no treino E vínculo aprovado deste Player.
  const matching = [...new Set(
    linkedAthletes.map(({ athlete }) => athlete.id).filter((id) => eligibleIds.has(id)),
  )];
  if (matching.length === 0) return reject("Treino fora da categoria autorizada do atleta.", 403);
  if (matching.length > 1) return reject("Há mais de um atleta elegível. Selecione um atleta individualmente.", 409);
  const athleteId = matching[0];

  const token = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
  if (file && !token) return reject("Armazenamento privado indisponível.", 503);
  const organization = file ? await prisma.organization.findUnique({
    where: { id: schedule.organizationId },
    select: { documentStorageUsedBytes: true, documentStorageLimitBytes: true },
  }) : null;
  if (file && (!organization || organization.documentStorageUsedBytes + BigInt(file.size) > organization.documentStorageLimitBytes)) {
    return reject("Limite de armazenamento do clube atingido.", 413);
  }

  let bytes: Buffer | null = null;
  if (file) {
    bytes = Buffer.from(await file.arrayBuffer());
    if (!validSignature(bytes, file.type)) return reject("O arquivo não corresponde ao formato declarado.", 400);
  }

  let uploadedKey: string | null = null;
  try {
    if (file && bytes && token) {
      const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
      const path = `onzeup-private/${schedule.organizationId}/training-absence/${athleteId}/${crypto.randomUUID()}.${ext}`;
      const uploaded = await put(path, bytes, { access: "private", token, contentType: file.type, addRandomSuffix: false });
      uploadedKey = uploaded.pathname;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Bloqueia o treino durante a checagem para evitar pedidos simultâneos duplicados.
      await tx.$queryRaw`SELECT "id" FROM "TrainingSchedule" WHERE "id" = ${scheduleId} FOR UPDATE`;
      const existing = await tx.trainingAbsenceRequest.findFirst({
        where: { scheduleId, athleteId, status: { in: ["PENDING", "APPROVED"] } },
        select: { id: true },
      });
      if (existing) return { duplicate: true as const, id: existing.id };
      if (file) {
        const quota = await tx.organization.findUnique({
          where: { id: schedule.organizationId },
          select: { documentStorageUsedBytes: true, documentStorageLimitBytes: true },
        });
        if (!quota || quota.documentStorageUsedBytes + BigInt(file.size) > quota.documentStorageLimitBytes) {
          throw new Error("STORAGE_QUOTA_EXCEEDED");
        }
      }
      const created = await tx.trainingAbsenceRequest.create({
        data: {
          organizationId: schedule.organizationId, athleteId, scheduleId,
          submittedById: user.id, reason, details: details || null, status: "PENDING",
          events: { create: { actorId: user.id, action: "SUBMITTED" } },
          ...(file && bytes && uploadedKey ? {
            attachments: { create: {
              storageKey: uploadedKey, originalFileName: file.name.slice(0, 255),
              mimeType: file.type, sizeBytes: file.size,
              checksumSha256: crypto.createHash("sha256").update(bytes).digest("hex"),
            } },
          } : {}),
        },
        select: { id: true },
      });
      if (file) {
        await tx.organization.update({
          where: { id: schedule.organizationId },
          data: { documentStorageUsedBytes: { increment: BigInt(file.size) } },
        });
      }
      return { duplicate: false as const, id: created.id };
    });
    if (result.duplicate) {
      if (uploadedKey && token) await del(uploadedKey, { token }).catch(() => undefined);
      return reject("Já existe uma solicitação pendente ou aprovada para este treino.", 409);
    }
    return NextResponse.json({ id: result.id, status: "PENDING" }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (uploadedKey && token) await del(uploadedKey, { token }).catch(() => undefined);
    if (error instanceof Error && error.message === "STORAGE_QUOTA_EXCEEDED") return reject("Limite de armazenamento do clube atingido.", 413);
    // Não registrar motivo/observações/nomes de arquivos: podem conter dados médicos de crianças.
    console.error("TRAINING_ABSENCE_REQUEST_SAVE_FAILED");
    return reject("Não foi possível registrar a justificativa.", 500);
  }
}
