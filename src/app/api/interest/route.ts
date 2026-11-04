import { z } from "zod";
import { run } from "@/lib/server/db";
import { requireUser } from "@/lib/server/guard";
import { fail, json, readJson } from "@/lib/server/http";

const schema = z.object({ feature: z.enum(["ads", "payments"]) });

/** "Coming soon" buttons record who wants a feature, so we build the right thing next. */
export async function POST(req: Request) {
  const body = await readJson(req, 1_000);
  if ("error" in body) return body.error;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return fail("Unknown feature");
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  await run(`INSERT OR IGNORE INTO interest (user_id, feature, created_at) VALUES (?, ?, ?)`, [
    auth.user.id,
    parsed.data.feature,
    Date.now(),
  ]);
  return json({ ok: true });
}
