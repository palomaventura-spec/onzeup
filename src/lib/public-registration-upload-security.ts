/**
 * 11UP Club - 1.3A / Etapa 3C.1
 * Funcoes puras de seguranca para upload privado de inscricoes.
 * Nao executa uploads, nao acessa Prisma e nao expõe documentos.
 */
import crypto from "node:crypto";

export const PUBLIC_REGISTRATION_MAX_FILE_SIZE = 4 * 1024 * 1024;
export const PUBLIC_REGISTRATION_MAX_DOCUMENTS = 30;
export const PUBLIC_REGISTRATION_UPLOAD_TOKEN_BYTES = 32;
export const PUBLIC_REGISTRATION_UPLOAD_TOKEN_TTL_MS = 60 * 60 * 1000;

export type PublicRegistrationFileKind = "DOCUMENT" | "PHOTO";
export type ValidatedRegistrationFile = {
  mimeType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
  extension: "pdf" | "jpg" | "png" | "webp";
  sizeBytes: number;
};

function matchesSignature(bytes: Buffer, mime: string): boolean {
  if (mime === "application/pdf") {
    return bytes.length >= 5 && bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  }
  if (mime === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mime === "image/png") {
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return bytes.length >= sig.length && sig.every((part, i) => bytes[i] === part);
  }
  if (mime === "image/webp") {
    return bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  }
  return false;
}

/**
 * Detecta conteudo por assinatura. Nao confia na extensao do nome.
 * Esta e uma validacao preliminar, nao substitui varredura antivírus.
 */
export function validatePublicRegistrationFile(
  bytes: Buffer,
  declaredMime: string,
  kind: PublicRegistrationFileKind,
): ValidatedRegistrationFile | null {
  if (bytes.length <= 0 || bytes.length > PUBLIC_REGISTRATION_MAX_FILE_SIZE) return null;
  const candidates: ReadonlyArray<ValidatedRegistrationFile> = [
    { mimeType: "application/pdf", extension: "pdf", sizeBytes: bytes.length },
    { mimeType: "image/jpeg", extension: "jpg", sizeBytes: bytes.length },
    { mimeType: "image/png", extension: "png", sizeBytes: bytes.length },
    { mimeType: "image/webp", extension: "webp", sizeBytes: bytes.length },
  ];
  const allowed = candidates.find((value) => value.mimeType === declaredMime);
  if (!allowed || (kind === "PHOTO" && declaredMime === "application/pdf")) return null;
  if (!matchesSignature(bytes, declaredMime)) return null;
  return allowed;
}

/** Chave opaca exclusiva de uma inscricao, nunca usar o token publico do clube. */
export function createSubmissionUploadCredential() {
  const token = crypto.randomBytes(PUBLIC_REGISTRATION_UPLOAD_TOKEN_BYTES).toString("base64url");
  return {
    token,
    tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
    expiresAt: new Date(Date.now() + PUBLIC_REGISTRATION_UPLOAD_TOKEN_TTL_MS),
  };
}

export function verifySubmissionUploadCredential(
  token: unknown,
  storedHash: string | null | undefined,
  expiresAt: Date | null | undefined,
): boolean {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{40,64}$/.test(token)) return false;
  if (!storedHash || !/^[a-f0-9]{64}$/.test(storedHash)) return false;
  if (!(expiresAt instanceof Date) || !Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date()) return false;
  const actual = crypto.createHash("sha256").update(token).digest();
  const expected = Buffer.from(storedHash, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

/** Caminho interno aleatorio. Nunca incluir nome da pessoa ou do arquivo original. */
export function privateRegistrationBlobPath(
  organizationId: string,
  submissionId: string,
  extension: ValidatedRegistrationFile["extension"],
): string {
  if (!/^[a-zA-Z0-9_-]{10,64}$/.test(organizationId) || !/^[a-zA-Z0-9_-]{10,64}$/.test(submissionId)) {
    throw new Error("Identificador invalido.");
  }
  return `onzeup-private/${organizationId}/public-registrations/${submissionId}/${crypto.randomUUID()}.${extension}`;
}
