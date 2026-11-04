import { ownedTest } from "@/lib/server/guard";
import { json, readJson } from "@/lib/server/http";
import { closeTest } from "@/lib/server/repo";

/** "Close the case": freeze the numbers and compute the final verdict now. */
export async function POST(req: Request, ctx: RouteContext<"/api/tests/[id]/close">) {
  const body = await readJson(req);
  if ("error" in body) return body.error;
  const { id } = await ctx.params;
  const owned = await ownedTest(id);
  if ("error" in owned) return owned.error;
  const closed = await closeTest(owned.test);
  return json({ ok: true, verdict: closed.verdict });
}
