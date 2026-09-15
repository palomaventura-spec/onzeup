import "server-only";

import crypto from "node:crypto";

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function encryptionKey() {
  const configured = process.env.PRIVATE_DATA_ENCRYPTION_KEY?.trim();

  if (!configured) {
    throw new Error(
      "PRIVATE_DATA_ENCRYPTION_KEY não foi configurada no servidor."
    );
  }

  let key: Buffer;

  if (/^[a-f0-9]{64}$/i.test(configured)) {
    key = Buffer.from(configured, "hex");
  } else {
    key = Buffer.from(configured, "base64");
  }

  if (key.length !== 32) {
    throw new Error(
      "PRIVATE_DATA_ENCRYPTION_KEY deve possuir exatamente 32 bytes."
    );
  }

  return key;
}

function encode(value: Buffer) {
  return value.toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url");
}

export function encryptPrivateData(value: string | null | undefined) {
  const normalized = value?.trim();

  if (!normalized) return null;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(normalized, "utf8"),
    cipher.final(),
  ]);
  const authenticationTag = cipher.getAuthTag();

  return [
    VERSION,
    encode(iv),
    encode(authenticationTag),
    encode(encrypted),
  ].join(".");
}

export function decryptPrivateData(value: string | null | undefined) {
  if (!value) return null;

  const [version, encodedIv, encodedTag, encodedContent, ...extra] =
    value.split(".");

  if (
    version !== VERSION ||
    !encodedIv ||
    !encodedTag ||
    !encodedContent ||
    extra.length
  ) {
    throw new Error("Formato de dado privado inválido ou não reconhecido.");
  }

  const iv = decode(encodedIv);
  const authenticationTag = decode(encodedTag);
  const encrypted = decode(encodedContent);

  if (iv.length !== IV_LENGTH || authenticationTag.length !== 16) {
    throw new Error("Dado privado corrompido.");
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    encryptionKey(),
    iv
  );
  decipher.setAuthTag(authenticationTag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

export function safeDecryptPrivateData(value: string | null | undefined) {
  if (!value) return null;

  try {
    return decryptPrivateData(value);
  } catch (error) {
    console.error(
      "PRIVATE_DATA_DECRYPTION_ERROR",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}
