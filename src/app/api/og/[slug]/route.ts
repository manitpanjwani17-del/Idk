import { renderPagePreview } from "@/lib/server/card-image";
import { getTestBySlug } from "@/lib/server/repo";
import { getTheme } from "@/lib/themes";

/** Link-preview image for a test page (1200×630). */
export async function GET(_req: Request, ctx: RouteContext<"/api/og/[slug]">) {
  const { slug } = await ctx.params;
  const test = await getTestBySlug(slug);
  if (!test || test.hidden) return new Response("Not found", { status: 404 });
  const t = getTheme(test.theme).vars;
  // Satori can't paint CSS gradients reliably on every theme; use the first colour.
  const bg = t.bg.startsWith("linear-gradient") ? (t.bg.match(/#[0-9a-f]{6}/i)?.[0] ?? "#111111") : t.bg;
  const border = t.border.startsWith("rgba") ? t.text : t.border;
  const image = await renderPagePreview(test, { bg, text: t.text, accent: t.accent, accentText: t.accentText, border });
  const headers = new Headers(image.headers);
  headers.set("Cache-Control", "public, max-age=600");
  return new Response(image.body, { status: 200, headers });
}
