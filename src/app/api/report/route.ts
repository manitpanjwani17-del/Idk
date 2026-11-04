import { currentUser } from "@/lib/server/auth";
import { run } from "@/lib/server/db";
import { visitorId } from "@/lib/server/guard";
import { clientIp, fail, json, rateLimit, readJson, TOO_MANY } from "@/lib/server/http";
import { getTestBySlug, reportCount, REPORTS_TO_HIDE } from "@/lib/server/repo";
import { reportSchema } from "@/lib/validation";

/** Anyone can flag a page. Enough distinct reports hide it until an admin looks. */
export async function POST(req: Request) {
  const body = await readJson(req, 2_000);
  if ("error" in body) return body.error;
  const parsed = reportSchema.safeParse(body.data);
  if (!parsed.success) return fail("Pick a reason");
  if (!rateLimit(`report:${clientIp(req)}`, 10, 3_600_000)) return fail(TOO_MANY, 429);

  const test = await getTestBySlug(parsed.data.slug);
  if (!test) return fail("Not found", 404);
  const user = await currentUser();
  if (user && user.id === test.userId) return json({ ok: true });

  const vid = await visitorId(req);
  await run(`INSERT OR IGNORE INTO reports (test_id, visitor_id, reason, created_at) VALUES (?, ?, ?, ?)`, [
    test.id,
    vid,
    parsed.data.reason,
    Date.now(),
  ]);
  if ((await reportCount(test.id)) >= REPORTS_TO_HIDE) {
    await run(`UPDATE tests SET hidden = 1 WHERE id = ?`, [test.id]);
  }
  return json({ ok: true });
}
