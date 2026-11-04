import { z } from "zod";
import { ownedTest } from "@/lib/server/guard";
import { fail, json, readJson } from "@/lib/server/http";
import { reopenTest } from "@/lib/server/repo";

const schema = z.object({ days: z.union([z.literal(3), z.literal(5), z.literal(7)]) });

/** Re-open a closed test for a few more days (e.g. "need more data"). */
export async function POST(req: Request, ctx: RouteContext<"/api/tests/[id]/reopen">) {
  const body = await readJson(req);
  if ("error" in body) return body.error;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return fail("Pick 3, 5 or 7 more days");
  const { id } = await ctx.params;
  const owned = await ownedTest(id);
  if ("error" in owned) return owned.error;
  const test = await reopenTest(owned.test, parsed.data.days);
  return json({ ok: true, endsAt: test.endsAt });
}
