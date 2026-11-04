import { z } from "zod";
import { currentUser, isAdmin } from "@/lib/server/auth";
import { fail, json, readJson } from "@/lib/server/http";
import { deleteTestCascade, restoreTest } from "@/lib/server/repo";

const schema = z.object({ action: z.enum(["restore", "delete"]) });

/** Moderation for people listed in ADMIN_EMAILS. */
export async function POST(req: Request, ctx: RouteContext<"/api/admin/tests/[id]">) {
  const body = await readJson(req, 1_000);
  if ("error" in body) return body.error;
  const user = await currentUser();
  if (!isAdmin(user)) return fail("Not allowed", 403);
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return fail("Unknown action");
  const { id } = await ctx.params;
  if (parsed.data.action === "restore") await restoreTest(id);
  else await deleteTestCascade(id);
  return json({ ok: true });
}
