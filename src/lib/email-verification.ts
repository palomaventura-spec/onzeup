import crypto from "crypto";

export function createEmailVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashEmailVerificationToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
