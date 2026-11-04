/** Small helpers shared by every API route. */

export function json(data: unknown, status = 200, init?: ResponseInit): Response {
  return Response.json(data, { ...init, status });
}

export function fail(message: string, status = 400, field?: string): Response {
  return Response.json({ error: message, field }, { status });
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "local";
}

export function isHttps(req: Request): boolean {
  const proto = req.headers.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim() === "https";
  return new URL(req.url).protocol === "https:";
}

/**
 * Blocks cross-site form/fetch posts. Browsers always send Origin on
 * cross-origin POSTs; a missing Origin means a same-origin or non-browser call.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const MAX_BODY = 3_000_000;

/** Parses a JSON body safely. Returns a Response on failure so routes can bail early. */
export async function readJson(req: Request, maxBytes = MAX_BODY): Promise<{ data: unknown } | { error: Response }> {
  if (!isSameOrigin(req)) return { error: fail("Cross-site request blocked", 403) };
  const length = Number(req.headers.get("content-length") ?? "0");
  if (length > maxBytes) return { error: fail("That upload is too big", 413) };
  let text: string;
  try {
    text = await req.text();
  } catch {
    return { error: fail("Couldn't read the request", 400) };
  }
  if (text.length > maxBytes) return { error: fail("That upload is too big", 413) };
  if (!text) return { data: {} };
  try {
    return { data: JSON.parse(text) };
  } catch {
    return { error: fail("Invalid request body", 400) };
  }
}

// ---- in-memory rate limiting (per server instance) -------------------------

const buckets = new Map<string, number[]>();

/** Returns true if the action is allowed. Sliding window. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 20_000) {
    for (const [k, v] of buckets) if (!v.length || now - v[v.length - 1] > 3_600_000) buckets.delete(k);
  }
  return true;
}

export const TOO_MANY = "Slow down a sec — too many tries. Wait a minute and try again.";
