import { z } from "zod";
import { ensureUser, hashSecret } from "@/lib/server/auth";
import { one, run } from "@/lib/server/db";
import { clientIp, fail, json, rateLimit, readJson, TOO_MANY } from "@/lib/server/http";
import { newRecoveryCode, normalizeRecoveryCode } from "@/lib/server/ids";
import { emailSchema, firstError, passwordSchema } from "@/lib/validation";

const schema = z.object({ email: emailSchema, password: passwordSchema });

/**
 * Turns a guest into a real account (email + password). Returns a one-time
 * recovery code because we don't send emails.
 */
export async function POST(req: Request) {
  const body = await readJson(req, 4_000);
  if ("error" in body) return body.error;
  if (!rateLimit(`save:${clientIp(req)}`, 10, 600_000)) return fail(TOO_MANY, 429);
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) {
    const e = firstError(parsed.error);
    return fail(e.message, 400, e.field);
  }
  const { email, password } = parsed.data;

  const user = await ensureUser(req);
  if (!user.isGuest) return fail("Your account is already saved.", 409);

  const taken = await one(`SELECT id FROM users WHERE email = ?`, [email]);
  if (taken) return fail("That email already has an account. Log in instead, and your tests will move over.", 409, "email");

  const recoveryCode = newRecoveryCode();
  const [passwordHash, recoveryHash] = await Promise.all([
    hashSecret(password),
    hashSecret(normalizeRecoveryCode(recoveryCode)),
  ]);
  try {
    await run(`UPDATE users SET email = ?, password_hash = ?, recovery_hash = ? WHERE id = ? AND email IS NULL`, [
      email,
      passwordHash,
      recoveryHash,
      user.id,
    ]);
  } catch (err) {
    if (String(err).includes("UNIQUE")) return fail("That email already has an account. Log in instead.", 409, "email");
    throw err;
  }
  return json({ ok: true, email, recoveryCode });
}
