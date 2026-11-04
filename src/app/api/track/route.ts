import { currentUser } from "@/lib/server/auth";
import { batch } from "@/lib/server/db";
import { isBot, visitorId } from "@/lib/server/guard";
import { clientIp, fail, json, rateLimit, readJson } from "@/lib/server/http";
import { getTestBySlug } from "@/lib/server/repo";
import { resolveSource } from "@/lib/sources";
import { trackSchema } from "@/lib/validation";

/**
 * Records a unique view or button tap. Each visitor counts once per test, and
 * the creator's own visits never count (they'd skew the verdict).
 */
export async function POST(req: Request) {
  const body = await readJson(req, 4_000);
  if ("error" in body) return body.error;
  const parsed = trackSchema.safeParse(body.data);
  if (!parsed.success) return fail("Invalid event");

  const test = await getTestBySlug(parsed.data.slug);
  if (!test) return fail("Not found", 404);
  if (test.status !== "live" || test.hidden) return json({ counted: false, reason: "closed" });
  if (isBot(req)) return json({ counted: false, reason: "bot" });

  const user = await currentUser();
  if (user && user.id === test.userId) return json({ counted: false, reason: "owner" });
  if (!rateLimit(`track:${clientIp(req)}`, 600, 600_000)) return json({ counted: false, reason: "rate" });

  const vid = await visitorId(req);
  const source = resolveSource(parsed.data.source, parsed.data.referrer);
  const now = Date.now();
  const view = {
    sql: `INSERT OR IGNORE INTO events (test_id, type, visitor_id, source, created_at) VALUES (?, 'view', ?, ?, ?)`,
    args: [test.id, vid, source, now],
  };
  if (parsed.data.type === "view") {
    await batch([view]);
  } else {
    // A tap implies a view; keep the visitor's original source for both.
    await batch([
      view,
      {
        sql: `INSERT OR IGNORE INTO events (test_id, type, visitor_id, source, created_at)
              VALUES (?, 'click', ?, COALESCE((SELECT source FROM events WHERE test_id = ? AND visitor_id = ? AND type = 'view'), ?), ?)`,
        args: [test.id, vid, test.id, vid, source, now],
      },
    ]);
  }
  return json({ counted: true });
}
