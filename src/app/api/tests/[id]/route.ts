import { ownedTest } from "@/lib/server/guard";
import { fail, isSameOrigin, json, readJson } from "@/lib/server/http";
import { editableTest } from "@/lib/server/present";
import { decodeImage, deleteTestCascade, updateTest, type ImageBlob } from "@/lib/server/repo";
import { firstError, updateTestSchema } from "@/lib/validation";

export async function GET(_req: Request, ctx: RouteContext<"/api/tests/[id]">) {
  const { id } = await ctx.params;
  const owned = await ownedTest(id);
  if ("error" in owned) return owned.error;
  return json(editableTest(owned.test));
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/tests/[id]">) {
  const { id } = await ctx.params;
  const body = await readJson(req);
  if ("error" in body) return body.error;
  const owned = await ownedTest(id);
  if ("error" in owned) return owned.error;

  const parsed = updateTestSchema.safeParse(body.data);
  if (!parsed.success) {
    const e = firstError(parsed.error);
    return fail(e.message, 400, e.field);
  }

  let image: ImageBlob | null | undefined;
  const raw = parsed.data.image;
  if (raw === undefined || raw === "keep") image = undefined;
  else if (raw === null) image = null;
  else {
    const decoded = decodeImage(raw);
    if (typeof decoded === "string") return fail(decoded, 400, "image");
    image = decoded;
  }

  const updated = await updateTest(owned.test, parsed.data, image);
  return json(editableTest(updated));
}

export async function DELETE(req: Request, ctx: RouteContext<"/api/tests/[id]">) {
  if (!isSameOrigin(req)) return fail("Cross-site request blocked", 403);
  const { id } = await ctx.params;
  const owned = await ownedTest(id);
  if ("error" in owned) return owned.error;
  await deleteTestCascade(owned.test.id);
  return json({ ok: true });
}
