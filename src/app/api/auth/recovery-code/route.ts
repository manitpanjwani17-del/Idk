import { z } from "zod";
import { hashSecret, verifySecret } from "@/lib/server/auth";
import { one, run } from "@/lib/server/db";
import { requireUser } from "@/lib/server/guard";
import { clientIp, fail, json, rateLimit, readJson, TOO_MANY } from "@/lib/server/http";
import { newRecoveryCode, normalizeRecoveryCode } from "@/lib/server/ids";

const schema = z.object({ password: z.string().min(1, "Enter your password").max(200) });

/** Lost your recovery code? Prove it's you and get a new one (old one stops working). */
export async function POST(req: Request) {
  const body = await readJson(req, 2_000);
  if ("error" in body) return body.error;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  if (auth.user.isGuest) return fail("Save your account first.", 400);
  if (!rateLimit(`recode:${clientIp(req)}`, 10, 600_000)) return fail(TOO_MANY, 429);
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return fail("Enter your password", 400, "password");
  const row = await one<{ password_hash: string }>(`SELECT password_hash FROM users WHERE id = ?`, [auth.user.id]);
  if (!(await verifySecret(parsed.data.password, row?.password_hash))) return fail("Wrong password.", 401, "password");
  const recoveryCode = newRecoveryCode();
  await run(`UPDATE users SET recovery_hash = ? WHERE id = ?`, [
    await hashSecret(normalizeRecoveryCode(recoveryCode)),
    auth.user.id,
  ]);
  return json({ ok: true, recoveryCode });
}
