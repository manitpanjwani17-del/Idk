import { cookies } from "next/headers";
import { currentUser, type SessionUser } from "./auth";
import { fail, isHttps } from "./http";
import { newVisitorId } from "./ids";
import { getTestById, type TestRecord } from "./repo";

export const VISITOR_COOKIE = "vl_vid";

/** Loads a test only if the signed-in user owns it. */
export async function ownedTest(id: string): Promise<{ user: SessionUser; test: TestRecord } | { error: Response }> {
  const user = await currentUser();
  if (!user) return { error: fail("You're not signed in. Log in to see your tests.", 401) };
  const test = await getTestById(id);
  if (!test || test.userId !== user.id) return { error: fail("Test not found", 404) };
  return { user, test };
}

export async function requireUser(): Promise<{ user: SessionUser } | { error: Response }> {
  const user = await currentUser();
  if (!user) return { error: fail("You're not signed in.", 401) };
  return { user };
}

/** Anonymous visitor id (random, no personal data). Set on first visit. */
export async function visitorId(req: Request): Promise<string> {
  const store = await cookies();
  let vid = store.get(VISITOR_COOKIE)?.value;
  if (!vid || !/^[a-z0-9]{20}$/.test(vid)) {
    vid = newVisitorId();
    store.set(VISITOR_COOKIE, vid, {
      httpOnly: true,
      sameSite: "lax",
      secure: isHttps(req),
      path: "/",
      maxAge: 365 * 86_400,
    });
  }
  return vid;
}

const BOT_RE =
  /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|headless|lighthouse|pingdom|monitor|curl|wget|python-requests|axios|node-fetch|go-http-client|java\//i;

export function isBot(req: Request): boolean {
  const ua = req.headers.get("user-agent") ?? "";
  return !ua || BOT_RE.test(ua);
}
