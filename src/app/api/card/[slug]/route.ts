import { currentUser } from "@/lib/server/auth";
import { renderCard } from "@/lib/server/card-image";
import { getTestBySlug } from "@/lib/server/repo";

/**
 * The verdict as a PNG. ?format=story (1080×1920, for IG/TikTok stories) or
 * wide (1200×630, link previews). ?download=1 saves it as a file.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/card/[slug]">) {
  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const test = await getTestBySlug(slug);
  if (!test || test.status !== "closed" || !test.verdict) return new Response("Not found", { status: 404 });

  const publicCard = test.cardPublic && !test.hidden;
  if (!publicCard) {
    const user = await currentUser();
    if (!user || user.id !== test.userId) return new Response("Not found", { status: 404 });
  }

  const format = url.searchParams.get("format") === "story" ? "story" : "wide";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const image = await renderCard({ test, verdict: test.verdict, host }, format);

  const headers = new Headers(image.headers);
  headers.set("Cache-Control", publicCard ? "public, max-age=300" : "private, no-store");
  if (url.searchParams.get("download") === "1") {
    const base = test.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "idea";
    headers.set("Content-Disposition", `attachment; filename="validly-${base}-${format}.png"`);
  }
  return new Response(image.body, { status: 200, headers });
}
