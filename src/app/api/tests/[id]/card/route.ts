import { z } from "zod";
import { ownedTest } from "@/lib/server/guard";
import { fail, json, readJson } from "@/lib/server/http";
import { setCardPublic } from "@/lib/server/repo";

const schema = z.object({ public: z.boolean() });

/** Show or hide the public verdict card link. */
export async function POST(req: Request, ctx: RouteContext<"/api/tests/[id]/card">) {
  const body = await readJson(req);
  if ("error" in body) return body.error;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return fail("Invalid request");
  const { id } = await ctx.params;
  const owned = await ownedTest(id);
  if ("error" in owned) return owned.error;
  await setCardPublic(owned.test.id, parsed.data.public);
  return json({ ok: true, public: parsed.data.public });
}
