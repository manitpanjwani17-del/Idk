import { z } from "zod";
import { adoptGuest, currentUser, endSession, fakeVerify, hashSecret, startSession, verifySecret } from "@/lib/server/auth";
import { batch, one } from "@/lib/server/db";
import { clientIp, fail, json, rateLimit, readJson, TOO_MANY } from "@/lib/server/http";
import { newRecoveryCode, normalizeRecoveryCode } from "@/lib/server/ids";
import { emailSchema, firstError, passwordSchema } from "@/lib/validation";

const schema = z.object({
  email: emailSchema,
  code: z.string().trim().min(12, "Enter the full recovery code").max(20),
  password: passwordSchema,
});

/** Forgot password: email + recovery code -> new password (and a fresh code). */
export async function POST(req: Request) {
  const body = await readJson(req, 4_000);
  if ("error" in body) return body.error;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) {
    const e = firstError(parsed.error);
    return fail(e.message, 400, e.field);
  }
  const { email, code, password } = parsed.data;
  if (!rateLimit(`recover-ip:${clientIp(req)}`, 10, 600_000) || !rateLimit(`recover-email:${email}`, 5, 600_000)) {
    return fail(TOO_MANY, 429);
  }

  const account = await one<{ id: string; recovery_hash: string | null }>(
    `SELECT id, recovery_hash FROM users WHERE email = ?`,
    [email],
  );
  if (!account) {
    await fakeVerify();
    return fail("That email and recovery code don't match.", 401);
  }
  if (!(await verifySecret(normalizeRecoveryCode(code), account.recovery_hash))) {
    return fail("That email and recovery code don't match.", 401);
  }

  const recoveryCode = newRecoveryCode();
  const [passwordHash, recoveryHash] = await Promise.all([
    hashSecret(password),
    hashSecret(normalizeRecoveryCode(recoveryCode)),
  ]);
  // Sign out every other device: whoever had the old password is out.
  await batch([
    { sql: `UPDATE users SET password_hash = ?, recovery_hash = ? WHERE id = ?`, args: [passwordHash, recoveryHash, account.id] },
    { sql: `DELETE FROM sessions WHERE user_id = ?`, args: [account.id] },
  ]);

  const current = await currentUser();
  if (current?.isGuest) await adoptGuest(current.id, account.id);
  else if (current) await endSession();
  await startSession(account.id, req);
  return json({ ok: true, recoveryCode });
}
