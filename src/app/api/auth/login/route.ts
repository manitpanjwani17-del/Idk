import { z } from "zod";
import { adoptGuest, currentUser, endSession, fakeVerify, startSession, verifySecret } from "@/lib/server/auth";
import { one } from "@/lib/server/db";
import { clientIp, fail, json, rateLimit, readJson, TOO_MANY } from "@/lib/server/http";
import { emailSchema, firstError } from "@/lib/validation";

const schema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password").max(200) });

export async function POST(req: Request) {
  const body = await readJson(req, 4_000);
  if ("error" in body) return body.error;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) {
    const e = firstError(parsed.error);
    return fail(e.message, 400, e.field);
  }
  const { email, password } = parsed.data;
  if (!rateLimit(`login-ip:${clientIp(req)}`, 20, 600_000) || !rateLimit(`login-email:${email}`, 10, 600_000)) {
    return fail(TOO_MANY, 429);
  }

  const account = await one<{ id: string; password_hash: string | null }>(
    `SELECT id, password_hash FROM users WHERE email = ?`,
    [email],
  );
  if (!account) {
    await fakeVerify();
    return fail("Wrong email or password.", 401);
  }
  if (!(await verifySecret(password, account.password_hash))) return fail("Wrong email or password.", 401);

  // If they made tests as a guest on this device, bring those along.
  const current = await currentUser();
  let moved = 0;
  if (current && current.id !== account.id) {
    if (current.isGuest) moved = await adoptGuest(current.id, account.id);
    else await endSession();
  }
  if (!current || current.id !== account.id) await startSession(account.id, req);
  return json({ ok: true, moved });
}
