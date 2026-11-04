import { currentUser } from "@/lib/server/auth";
import { batch, one, run } from "@/lib/server/db";
import { visitorId } from "@/lib/server/guard";
import { clientIp, fail, json, rateLimit, readJson, TOO_MANY } from "@/lib/server/http";
import { getTestBySlug } from "@/lib/server/repo";
import { resolveSource } from "@/lib/sources";
import { firstError, reserveSchema } from "@/lib/validation";

async function position(testId: string, signupId: number): Promise<number> {
  const row = await one<{ n: number }>(`SELECT COUNT(*) AS n FROM signups WHERE test_id = ? AND id <= ?`, [
    testId,
    signupId,
  ]);
  return Number(row?.n ?? 1);
}

/**
 * A visitor reserves (pre-order or waitlist). Nobody is charged — it's a
 * signal of intent. One reservation per person: same email or same device.
 */
export async function POST(req: Request) {
  const body = await readJson(req, 4_000);
  if ("error" in body) return body.error;
  const parsed = reserveSchema.safeParse(body.data);
  if (!parsed.success) {
    const e = firstError(parsed.error);
    return fail(e.message, 400, e.field);
  }
  const { slug, email } = parsed.data;

  const test = await getTestBySlug(slug);
  if (!test) return fail("This page doesn't exist anymore.", 404);
  if (test.hidden) return fail("This page is under review.", 410);
  if (test.status !== "live") return fail("This drop test has wrapped up. Thanks for the interest!", 410);

  // The creator trying their own form: show the success screen, store nothing.
  const user = await currentUser();
  if (user && user.id === test.userId) return json({ ok: true, preview: true, position: 0 });

  if (!rateLimit(`reserve:${clientIp(req)}:${test.id}`, 60, 600_000)) return fail(TOO_MANY, 429);

  const vid = await visitorId(req);
  const wouldPay = test.askPrice && parsed.data.wouldPay ? parsed.data.wouldPay : null;
  const viewSource = await one<{ source: string }>(
    `SELECT source FROM events WHERE test_id = ? AND visitor_id = ? AND type = 'view'`,
    [test.id, vid],
  );
  const source = viewSource?.source ?? resolveSource(parsed.data.source, parsed.data.referrer);

  const byEmail = await one<{ id: number }>(`SELECT id FROM signups WHERE test_id = ? AND email = ?`, [test.id, email]);
  if (byEmail) return json({ ok: true, already: true, position: await position(test.id, Number(byEmail.id)) });

  const byVisitor = await one<{ id: number }>(`SELECT id FROM signups WHERE test_id = ? AND visitor_id = ?`, [
    test.id,
    vid,
  ]);
  if (byVisitor) {
    // Same person fixing a typo in their email. Don't double count.
    await run(`UPDATE signups SET email = ?, would_pay_cents = COALESCE(?, would_pay_cents) WHERE id = ?`, [
      email,
      wouldPay,
      byVisitor.id,
    ]);
    return json({ ok: true, updated: true, position: await position(test.id, Number(byVisitor.id)) });
  }

  const now = Date.now();
  try {
    await batch([
      // Reserving implies they saw the page and tapped the button.
      {
        sql: `INSERT OR IGNORE INTO events (test_id, type, visitor_id, source, created_at) VALUES (?, 'view', ?, ?, ?)`,
        args: [test.id, vid, source, now],
      },
      {
        sql: `INSERT OR IGNORE INTO events (test_id, type, visitor_id, source, created_at) VALUES (?, 'click', ?, ?, ?)`,
        args: [test.id, vid, source, now],
      },
      {
        sql: `INSERT INTO signups (test_id, email, would_pay_cents, visitor_id, source, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [test.id, email, wouldPay, vid, source, now],
      },
    ]);
  } catch (err) {
    if (String(err).includes("UNIQUE")) {
      const again = await one<{ id: number }>(`SELECT id FROM signups WHERE test_id = ? AND email = ?`, [test.id, email]);
      return json({ ok: true, already: true, position: again ? await position(test.id, Number(again.id)) : 1 });
    }
    throw err;
  }
  const created = await one<{ id: number }>(`SELECT id FROM signups WHERE test_id = ? AND email = ?`, [test.id, email]);
  return json({ ok: true, position: created ? await position(test.id, Number(created.id)) : 1 });
}
