import { z } from "zod";
import { hashSecret, startSession, verifySecret } from "@/lib/server/auth";
import { batch, one } from "@/lib/server/db";
import { requireUser } from "@/lib/server/guard";
import { clientIp, fail, json, rateLimit, readJson, TOO_MANY } from "@/lib/server/http";
import { firstError, passwordSchema } from "@/lib/validation";

const schema = z.object({ current: z.string().min(1, "Enter your current password").max(200), next: passwordSchema });

/** Change password (signs out other devices). */
export async function POST(req: Request) {
  const body = await readJson(req, 4_000);
  if ("error" in body) return body.error;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  if (auth.user.isGuest) return fail("Save your account first.", 400);
  if (!rateLimit(`password:${clientIp(req)}`, 10, 600_000)) return fail(TOO_MANY, 429);
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) {
    const e = firstError(parsed.error);
    return fail(e.message, 400, e.field);
  }
  const row = await one<{ password_hash: string }>(`SELECT password_hash FROM users WHERE id = ?`, [auth.user.id]);
  if (!(await verifySecret(parsed.data.current, row?.password_hash))) {
    return fail("Current password is wrong.", 401, "current");
  }
  await batch([
    { sql: `UPDATE users SET password_hash = ? WHERE id = ?`, args: [await hashSecret(parsed.data.next), auth.user.id] },
    { sql: `DELETE FROM sessions WHERE user_id = ?`, args: [auth.user.id] },
  ]);
  await startSession(auth.user.id, req);
  return json({ ok: true });
}
