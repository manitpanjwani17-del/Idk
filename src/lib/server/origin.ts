import { headers } from "next/headers";

/** The public origin (https://example.com) for absolute links like OG images. */
export async function siteOrigin(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
    (/^(localhost|127\.|0\.0\.0\.0)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
