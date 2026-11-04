import { z } from "zod";
import { endSession } from "@/lib/server/auth";
import { all, batch } from "@/lib/server/db";
import { requireUser } from "@/lib/server/guard";
import { fail, json, readJson } from "@/lib/server/http";
import { deleteTestCascade } from "@/lib/server/repo";

const schema = z.object({ confirm: z.literal("DELETE") });

/** Deletes the account, every test, and every reservation they collected. */
export async function POST(req: Request) {
  const body = await readJson(req, 1_000);
  if ("error" in body) return body.error;
  if (!schema.safeParse(body.data).success) return fail('Type DELETE to confirm', 400, "confirm");
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const tests = await all<{ id: string }>(`SELECT id FROM tests WHERE user_id = ?`, [auth.user.id]);
  for (const t of tests) await deleteTestCascade(t.id);
  await endSession();
  await batch([
    { sql: `DELETE FROM interest WHERE user_id = ?`, args: [auth.user.id] },
    { sql: `DELETE FROM sessions WHERE user_id = ?`, args: [auth.user.id] },
    { sql: `DELETE FROM users WHERE id = ?`, args: [auth.user.id] },
  ]);
  return json({ ok: true });
}
