import { endSession } from "@/lib/server/auth";
import { json, readJson } from "@/lib/server/http";

export async function POST(req: Request) {
  const body = await readJson(req, 1_000);
  if ("error" in body) return body.error;
  await endSession();
  return json({ ok: true });
}
