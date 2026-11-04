import { cookies } from "next/headers";
import { connection } from "next/server";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { batch, one, run } from "./db";
import { isHttps } from "./http";
import { newId, newToken, sha256 } from "./ids";

/**
 * Accounts are guest-first: the first time someone launches a test we quietly
 * create a guest account and a session cookie. Later they can "save" it with an
 * email + password (and get a one-time recovery code, since we don't send email).
 */

export const SESSION_COOKIE = "vl_session";
const SESSION_DAYS = 400;

export interface SessionUser {
  id: string;
  email: string | null;
  isGuest: boolean;
}

// ---- passwords & recovery codes (scrypt) -----------------------------------

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

function scryptKey(secret: string, salt: Buffer, n = N, r = R, p = P): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(secret, salt, KEYLEN, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptKey(secret, salt);
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifySecret(secret: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, keyB64] = parts;
  const expected = Buffer.from(keyB64, "base64");
  const actual = await scryptKey(secret, Buffer.from(saltB64, "base64"), Number(n), Number(r), Number(p));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Burns comparable CPU when the email doesn't exist, so timing doesn't leak accounts. */
export async function fakeVerify(): Promise<void> {
  await scryptKey("not-a-real-password", randomBytes(16));
}

// ---- sessions ----------------------------------------------------------------

export async function userForToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const row = await one<{ user_id: string; expires_at: number; email: string | null }>(
    `SELECT s.user_id, s.expires_at, u.email
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = ?`,
    [sha256(token)],
  );
  if (!row || Number(row.expires_at) < Date.now()) return null;
  return { id: row.user_id, email: row.email ?? null, isGuest: !row.email };
}

/** The signed-in user (guest or saved), or null. Works in pages and routes. */
export async function currentUser(): Promise<SessionUser | null> {
  // Sessions are per-request, and callers often read the clock right after.
  await connection();
  const store = await cookies();
  return userForToken(store.get(SESSION_COOKIE)?.value);
}

export async function startSession(userId: string, req: Request): Promise<void> {
  const token = newToken();
  const now = Date.now();
  await run(`INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`, [
    sha256(token),
    userId,
    now,
    now + SESSION_DAYS * 86_400_000,
  ]);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps(req),
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await run(`DELETE FROM sessions WHERE id = ?`, [sha256(token)]);
  store.delete(SESSION_COOKIE);
}

/** Returns the current user, creating a guest account + session if needed. */
export async function ensureUser(req: Request): Promise<SessionUser> {
  const existing = await currentUser();
  if (existing) return existing;
  const id = newId();
  await run(`INSERT INTO users (id, created_at) VALUES (?, ?)`, [id, Date.now()]);
  await startSession(id, req);
  return { id, email: null, isGuest: true };
}

/** Moves everything a guest made into a real account, then deletes the guest. */
export async function adoptGuest(guestId: string, ownerId: string): Promise<number> {
  if (guestId === ownerId) return 0;
  const guest = await one<{ email: string | null }>(`SELECT email FROM users WHERE id = ?`, [guestId]);
  if (!guest || guest.email) return 0;
  const moved = await one<{ n: number }>(`SELECT COUNT(*) AS n FROM tests WHERE user_id = ?`, [guestId]);
  await batch([
    { sql: `UPDATE tests SET user_id = ? WHERE user_id = ?`, args: [ownerId, guestId] },
    {
      sql: `INSERT OR IGNORE INTO interest (user_id, feature, created_at)
            SELECT ?, feature, created_at FROM interest WHERE user_id = ?`,
      args: [ownerId, guestId],
    },
    { sql: `DELETE FROM interest WHERE user_id = ?`, args: [guestId] },
    { sql: `DELETE FROM sessions WHERE user_id = ?`, args: [guestId] },
    { sql: `DELETE FROM users WHERE id = ?`, args: [guestId] },
  ]);
  return Number(moved?.n ?? 0);
}

export function isAdmin(user: SessionUser | null): boolean {
  if (!user?.email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(user.email);
}
