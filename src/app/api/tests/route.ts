import { ensureUser } from "@/lib/server/auth";
import { clientIp, fail, json, rateLimit, readJson, TOO_MANY } from "@/lib/server/http";
import { copyParentImage, createTest, decodeImage, getTestById, type ImageBlob } from "@/lib/server/repo";
import { createTestSchema, firstError } from "@/lib/validation";

/** Launch a new test. Creates a guest account on the fly if needed. */
export async function POST(req: Request) {
  const body = await readJson(req);
  if ("error" in body) return body.error;
  if (!rateLimit(`create:${clientIp(req)}`, 20, 3_600_000)) return fail(TOO_MANY, 429);

  const parsed = createTestSchema.safeParse(body.data);
  if (!parsed.success) {
    const e = firstError(parsed.error);
    return fail(e.message, 400, e.field);
  }

  let image: ImageBlob | null = null;
  if (typeof parsed.data.image === "string" && parsed.data.image !== "keep") {
    const decoded = decodeImage(parsed.data.image);
    if (typeof decoded === "string") return fail(decoded, 400, "image");
    image = decoded;
  }

  const user = await ensureUser(req);

  // Only link a retrial to a parent test the same person owns.
  let parentId = parsed.data.parentId ?? null;
  if (parentId) {
    const parent = await getTestById(parentId);
    if (!parent || parent.userId !== user.id) parentId = null;
  }

  const test = await createTest(user.id, { ...parsed.data, parentId }, image);
  if (!image && parsed.data.image === "keep" && parentId) await copyParentImage(parentId, test.id);
  return json({ id: test.id, slug: test.slug });
}
