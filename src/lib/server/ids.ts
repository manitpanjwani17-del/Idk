import { createHash, randomBytes } from "node:crypto";

// No 0/o/1/l/i so links and codes are easy to read out loud.
const LOWER = "abcdefghjkmnpqrstuvwxyz23456789";
const UPPER = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Unbiased random string from an alphabet (rejection sampling). */
export function randomString(length: number, alphabet = LOWER): string {
  const limit = 256 - (256 % alphabet.length);
  let out = "";
  while (out.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte < limit) out += alphabet[byte % alphabet.length];
      if (out.length === length) break;
    }
  }
  return out;
}

export const newId = () => randomString(16);
export const newSlug = () => randomString(7);
export const newVisitorId = () => randomString(20);
export const newToken = () => randomBytes(32).toString("base64url");

export function newRecoveryCode(): string {
  const raw = randomString(12, UPPER);
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
}

export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
