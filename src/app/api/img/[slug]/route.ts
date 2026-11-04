import { currentUser } from "@/lib/server/auth";
import { getImage, getTestBySlug } from "@/lib/server/repo";

/** Serves a test's photo. Versioned URLs (?v=) are cached forever. */
export async function GET(req: Request, ctx: RouteContext<"/api/img/[slug]">) {
  const { slug } = await ctx.params;
  const test = await getTestBySlug(slug);
  if (!test || test.imageVersion === 0) return new Response("Not found", { status: 404 });
  if (test.hidden) {
    const user = await currentUser();
    if (!user || user.id !== test.userId) return new Response("Not found", { status: 404 });
  }
  const image = await getImage(test.id);
  if (!image) return new Response("Not found", { status: 404 });
  const versioned = new URL(req.url).searchParams.get("v") === String(test.imageVersion);
  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mime,
      "Content-Length": String(image.data.length),
      "Cache-Control": versioned ? "public, max-age=31536000, immutable" : "public, max-age=60",
    },
  });
}
