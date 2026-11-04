import type { Currency } from "../money";
import { computeVerdict, type Mode, type SourceStat, type Verdict } from "../verdict";
import type { ContentInput, CreateTestInput } from "../validation";
import { all, batch, one, run } from "./db";
import { newId, newSlug } from "./ids";

const DAY = 86_400_000;
export const REPORTS_TO_HIDE = 3;

export type StoredVerdict = Verdict & { computedAt: number };

export interface TestRecord {
  id: string;
  slug: string;
  userId: string;
  parentId: string | null;
  status: "live" | "closed";
  name: string;
  tagline: string;
  description: string;
  category: string;
  emoji: string;
  mode: Mode;
  priceCents: number;
  currency: Currency;
  perks: string[];
  cta: string;
  eta: string;
  theme: string;
  askPrice: boolean;
  imageVersion: number;
  durationDays: number;
  targetVisitors: number;
  createdAt: number;
  updatedAt: number;
  endsAt: number;
  closedAt: number | null;
  verdict: StoredVerdict | null;
  cardPublic: boolean;
  hidden: boolean;
  offerChangedAt: number | null;
}

type Raw = Record<string, unknown>;

const num = (v: unknown): number => Number(v ?? 0);
const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapTest(r: Raw): TestRecord {
  return {
    id: String(r.id),
    slug: String(r.slug),
    userId: String(r.user_id),
    parentId: r.parent_id ? String(r.parent_id) : null,
    status: r.status === "closed" ? "closed" : "live",
    name: String(r.name),
    tagline: String(r.tagline),
    description: String(r.description ?? ""),
    category: String(r.category),
    emoji: String(r.emoji),
    mode: r.mode === "waitlist" ? "waitlist" : "preorder",
    priceCents: num(r.price_cents),
    currency: String(r.currency) as Currency,
    perks: parseJson<string[]>(r.perks, []),
    cta: String(r.cta),
    eta: String(r.eta),
    theme: String(r.theme),
    askPrice: num(r.ask_price) === 1,
    imageVersion: num(r.image_version),
    durationDays: num(r.duration_days),
    targetVisitors: num(r.target_visitors),
    createdAt: num(r.created_at),
    updatedAt: num(r.updated_at),
    endsAt: num(r.ends_at),
    closedAt: numOrNull(r.closed_at),
    verdict: parseJson<StoredVerdict | null>(r.verdict, null),
    cardPublic: num(r.card_public) === 1,
    hidden: num(r.hidden) === 1,
    offerChangedAt: numOrNull(r.offer_changed_at),
  };
}

// ---- images -----------------------------------------------------------------

export interface ImageBlob {
  mime: "image/jpeg" | "image/png" | "image/webp";
  data: Buffer;
}

export const MAX_IMAGE_BYTES = 1_500_000;

/** Decodes and sanity-checks an uploaded data URL. Returns an error string on failure. */
export function decodeImage(dataUrl: string): ImageBlob | string {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return "Use a JPG, PNG or WebP image.";
  const mime = match[1] as ImageBlob["mime"];
  const data = Buffer.from(match[2], "base64");
  if (data.length === 0) return "That image is empty.";
  if (data.length > MAX_IMAGE_BYTES) return "That image is too big (1.5 MB max after resizing).";
  const isJpeg = data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  const isPng = data.subarray(0, 4).toString("hex") === "89504e47";
  const isWebp = data.subarray(0, 4).toString() === "RIFF" && data.subarray(8, 12).toString() === "WEBP";
  const ok = (mime === "image/jpeg" && isJpeg) || (mime === "image/png" && isPng) || (mime === "image/webp" && isWebp);
  if (!ok) return "That file isn't a real image.";
  return { mime, data };
}

export async function getImage(testId: string): Promise<ImageBlob | null> {
  const row = await one<{ mime: string; data: ArrayBuffer | Uint8Array }>(
    `SELECT mime, data FROM test_images WHERE test_id = ?`,
    [testId],
  );
  if (!row) return null;
  const data = row.data instanceof Uint8Array ? Buffer.from(row.data) : Buffer.from(new Uint8Array(row.data));
  return { mime: row.mime as ImageBlob["mime"], data };
}

// ---- reads ------------------------------------------------------------------

export async function getTestById(id: string): Promise<TestRecord | null> {
  const row = await one<Raw>(`SELECT * FROM tests WHERE id = ?`, [id]);
  return row ? refreshLifecycle(mapTest(row)) : null;
}

export async function getTestBySlug(slug: string): Promise<TestRecord | null> {
  const row = await one<Raw>(`SELECT * FROM tests WHERE slug = ?`, [slug.toLowerCase()]);
  return row ? refreshLifecycle(mapTest(row)) : null;
}

export interface TestSummary {
  test: TestRecord;
  visitors: number;
  reservations: number;
}

export async function listTestsForUser(userId: string): Promise<TestSummary[]> {
  const rows = await all<Raw>(`SELECT * FROM tests WHERE user_id = ? ORDER BY created_at DESC`, [userId]);
  const tests = await Promise.all(rows.map((r) => refreshLifecycle(mapTest(r))));
  if (!tests.length) return [];
  const ids = tests.map((t) => t.id);
  const marks = ids.map(() => "?").join(",");
  const views = await all<{ test_id: string; n: number }>(
    `SELECT test_id, COUNT(*) AS n FROM events WHERE type = 'view' AND test_id IN (${marks}) GROUP BY test_id`,
    ids,
  );
  const signups = await all<{ test_id: string; n: number }>(
    `SELECT test_id, COUNT(*) AS n FROM signups WHERE test_id IN (${marks}) GROUP BY test_id`,
    ids,
  );
  const v = new Map(views.map((r) => [r.test_id, num(r.n)]));
  const s = new Map(signups.map((r) => [r.test_id, num(r.n)]));
  return tests.map((test) => ({ test, visitors: v.get(test.id) ?? 0, reservations: s.get(test.id) ?? 0 }));
}

export interface SignupRow {
  id: number;
  email: string;
  wouldPay: number | null;
  source: string;
  createdAt: number;
}

export interface TestStats {
  visitors: number;
  clicks: number;
  reservations: number;
  wouldPay: number[];
  sources: Array<SourceStat & { clicks: number }>;
  daily: Array<{ day: number; visitors: number; reservations: number }>;
  signups: SignupRow[];
}

export async function getStats(test: TestRecord): Promise<TestStats> {
  const [counts, viewSources, clickSources, signupRows] = await Promise.all([
    all<{ type: string; n: number }>(`SELECT type, COUNT(*) AS n FROM events WHERE test_id = ? GROUP BY type`, [
      test.id,
    ]),
    all<{ source: string; n: number; d: number }>(
      `SELECT source, COUNT(*) AS n FROM events WHERE test_id = ? AND type = 'view' GROUP BY source`,
      [test.id],
    ),
    all<{ source: string; n: number }>(
      `SELECT source, COUNT(*) AS n FROM events WHERE test_id = ? AND type = 'click' GROUP BY source`,
      [test.id],
    ),
    all<Raw>(
      `SELECT id, email, would_pay_cents, source, created_at FROM signups WHERE test_id = ? ORDER BY created_at DESC`,
      [test.id],
    ),
  ]);

  const count = (type: string) => num(counts.find((c) => c.type === type)?.n);
  const signups: SignupRow[] = signupRows.map((r) => ({
    id: num(r.id),
    email: String(r.email),
    wouldPay: numOrNull(r.would_pay_cents),
    source: String(r.source),
    createdAt: num(r.created_at),
  }));

  const bySource = new Map<string, SourceStat & { clicks: number }>();
  const entry = (source: string) => {
    let e = bySource.get(source);
    if (!e) {
      e = { source, visitors: 0, clicks: 0, reservations: 0 };
      bySource.set(source, e);
    }
    return e;
  };
  for (const r of viewSources) entry(r.source).visitors += num(r.n);
  for (const r of clickSources) entry(r.source).clicks += num(r.n);
  for (const s of signups) entry(s.source).reservations += 1;

  // Day buckets counted from launch: "Day 1", "Day 2"…
  const viewDays = await all<{ d: number; n: number }>(
    `SELECT (created_at - ?) / ${DAY} AS d, COUNT(*) AS n FROM events
      WHERE test_id = ? AND type = 'view' GROUP BY d`,
    [test.createdAt, test.id],
  );
  const lastMoment = test.status === "closed" && test.closedAt ? test.closedAt : Math.min(Date.now(), test.endsAt);
  const totalDays = Math.max(1, Math.ceil((lastMoment - test.createdAt) / DAY));
  const daily = Array.from({ length: totalDays }, (_, day) => ({ day, visitors: 0, reservations: 0 }));
  const bucket = (d: number) => daily[Math.min(Math.max(0, d), daily.length - 1)];
  for (const r of viewDays) bucket(num(r.d)).visitors += num(r.n);
  for (const s of signups) bucket(Math.floor((s.createdAt - test.createdAt) / DAY)).reservations += 1;

  return {
    visitors: count("view"),
    clicks: count("click"),
    reservations: signups.length,
    wouldPay: signups.map((s) => s.wouldPay).filter((v): v is number => v !== null && v > 0),
    sources: Array.from(bySource.values()).sort((a, b) => b.visitors - a.visitors),
    daily,
    signups,
  };
}

export function verdictFor(test: TestRecord, stats: TestStats): Verdict {
  return computeVerdict({
    visitors: stats.visitors,
    clicks: stats.clicks,
    reservations: stats.reservations,
    priceCents: test.priceCents,
    currency: test.currency,
    mode: test.mode,
    wouldPay: stats.wouldPay,
    sources: stats.sources,
  });
}

// ---- writes -----------------------------------------------------------------

function contentArgs(input: ContentInput) {
  return [
    input.name,
    input.tagline,
    input.description ?? "",
    input.category,
    input.emoji,
    input.mode,
    input.priceCents,
    input.currency,
    JSON.stringify(input.perks),
    input.cta,
    input.eta,
    input.theme,
    input.askPrice ? 1 : 0,
  ];
}

export async function createTest(userId: string, input: CreateTestInput, image: ImageBlob | null): Promise<TestRecord> {
  const now = Date.now();
  const id = newId();
  // Retry on the (astronomically unlikely) slug collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = newSlug();
    try {
      const statements: Array<{ sql: string; args: (string | number | null | Buffer)[] }> = [
        {
          sql: `INSERT INTO tests (id, slug, user_id, parent_id, status, name, tagline, description, category, emoji, mode,
                  price_cents, currency, perks, cta, eta, theme, ask_price, image_version, duration_days, target_visitors,
                  created_at, updated_at, ends_at)
                VALUES (?, ?, ?, ?, 'live', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            id,
            slug,
            userId,
            input.parentId ?? null,
            ...contentArgs(input),
            image ? 1 : 0,
            input.durationDays,
            input.targetVisitors,
            now,
            now,
            now + input.durationDays * DAY,
          ],
        },
      ];
      if (image) {
        statements.push({
          sql: `INSERT INTO test_images (test_id, mime, data) VALUES (?, ?, ?)`,
          args: [id, image.mime, image.data],
        });
      }
      await batch(statements);
      const created = await getTestById(id);
      if (!created) throw new Error("Test vanished after insert");
      return created;
    } catch (err) {
      if (String(err).includes("UNIQUE") && String(err).includes("slug")) continue;
      throw err;
    }
  }
  throw new Error("Couldn't create a unique link. Try again.");
}

/**
 * Updates page content. `image`: undefined/"keep" = unchanged, null = remove, blob = replace.
 * Changing price or mode mid-test is allowed but flagged, because it mixes data.
 */
export async function updateTest(
  test: TestRecord,
  input: ContentInput,
  image: ImageBlob | null | undefined,
): Promise<TestRecord> {
  const now = Date.now();
  const offerChanged = test.priceCents !== input.priceCents || test.mode !== input.mode || test.currency !== input.currency;
  const statements: Array<{ sql: string; args: (string | number | null | Buffer)[] }> = [
    {
      sql: `UPDATE tests SET name = ?, tagline = ?, description = ?, category = ?, emoji = ?, mode = ?, price_cents = ?,
              currency = ?, perks = ?, cta = ?, eta = ?, theme = ?, ask_price = ?, updated_at = ?,
              offer_changed_at = CASE WHEN ? = 1 THEN ? ELSE offer_changed_at END
            WHERE id = ?`,
      args: [...contentArgs(input), now, offerChanged ? 1 : 0, now, test.id],
    },
  ];
  if (image === null) {
    statements.push({ sql: `DELETE FROM test_images WHERE test_id = ?`, args: [test.id] });
    statements.push({ sql: `UPDATE tests SET image_version = 0 WHERE id = ?`, args: [test.id] });
  } else if (image) {
    statements.push({
      sql: `INSERT INTO test_images (test_id, mime, data) VALUES (?, ?, ?)
            ON CONFLICT(test_id) DO UPDATE SET mime = excluded.mime, data = excluded.data`,
      args: [test.id, image.mime, image.data],
    });
    statements.push({
      sql: `UPDATE tests SET image_version = image_version + 1 WHERE id = ?`,
      args: [test.id],
    });
  }
  await batch(statements);
  return (await getTestById(test.id)) as TestRecord;
}

/** Retrials reuse the original test's photo unless the creator picks a new one. */
export async function copyParentImage(parentId: string, testId: string): Promise<void> {
  const copied = await run(
    `INSERT OR REPLACE INTO test_images (test_id, mime, data) SELECT ?, mime, data FROM test_images WHERE test_id = ?`,
    [testId, parentId],
  );
  if (copied > 0) await run(`UPDATE tests SET image_version = 1 WHERE id = ?`, [testId]);
}

export async function deleteTestCascade(testId: string): Promise<void> {
  await batch([
    { sql: `DELETE FROM events WHERE test_id = ?`, args: [testId] },
    { sql: `DELETE FROM signups WHERE test_id = ?`, args: [testId] },
    { sql: `DELETE FROM reports WHERE test_id = ?`, args: [testId] },
    { sql: `DELETE FROM test_images WHERE test_id = ?`, args: [testId] },
    { sql: `UPDATE tests SET parent_id = NULL WHERE parent_id = ?`, args: [testId] },
    { sql: `DELETE FROM tests WHERE id = ?`, args: [testId] },
  ]);
}

/** Freezes the verdict. Safe to call twice: only a live test gets closed. */
export async function closeTest(test: TestRecord, at = Date.now()): Promise<TestRecord> {
  if (test.status === "closed") return test;
  const stats = await getStats({ ...test, status: "closed", closedAt: at });
  const verdict: StoredVerdict = { ...verdictFor(test, stats), computedAt: at };
  await run(
    `UPDATE tests SET status = 'closed', closed_at = ?, verdict = ?, updated_at = ? WHERE id = ? AND status = 'live'`,
    [at, JSON.stringify(verdict), Date.now(), test.id],
  );
  const row = await one<Raw>(`SELECT * FROM tests WHERE id = ?`, [test.id]);
  return row ? mapTest(row) : test;
}

export async function reopenTest(test: TestRecord, days: number): Promise<TestRecord> {
  const now = Date.now();
  await run(
    `UPDATE tests SET status = 'live', closed_at = NULL, verdict = NULL, ends_at = ?, updated_at = ? WHERE id = ?`,
    [now + days * DAY, now, test.id],
  );
  return (await getTestById(test.id)) as TestRecord;
}

/** Lazily closes tests whose deadline passed — no cron job needed. */
export async function refreshLifecycle(test: TestRecord): Promise<TestRecord> {
  if (test.status === "live" && Date.now() >= test.endsAt) return closeTest(test, test.endsAt);
  return test;
}

export async function setCardPublic(testId: string, value: boolean): Promise<void> {
  await run(`UPDATE tests SET card_public = ?, updated_at = ? WHERE id = ?`, [value ? 1 : 0, Date.now(), testId]);
}

export async function deleteSignup(testId: string, signupId: number): Promise<boolean> {
  return (await run(`DELETE FROM signups WHERE id = ? AND test_id = ?`, [signupId, testId])) > 0;
}

export async function countSignups(testId: string): Promise<number> {
  const row = await one<{ n: number }>(`SELECT COUNT(*) AS n FROM signups WHERE test_id = ?`, [testId]);
  return num(row?.n);
}

export async function reportCount(testId: string): Promise<number> {
  const row = await one<{ n: number }>(`SELECT COUNT(*) AS n FROM reports WHERE test_id = ?`, [testId]);
  return num(row?.n);
}

export async function listReportedTests(): Promise<Array<{ test: TestRecord; reports: number; reasons: string }>> {
  const rows = await all<Raw>(
    `SELECT t.*, COUNT(r.visitor_id) AS report_count, GROUP_CONCAT(r.reason) AS reasons
       FROM tests t JOIN reports r ON r.test_id = t.id
      GROUP BY t.id ORDER BY t.hidden DESC, report_count DESC LIMIT 200`,
  );
  return rows.map((r) => ({ test: mapTest(r), reports: num(r.report_count), reasons: String(r.reasons ?? "") }));
}

export async function restoreTest(testId: string): Promise<void> {
  await batch([
    { sql: `DELETE FROM reports WHERE test_id = ?`, args: [testId] },
    { sql: `UPDATE tests SET hidden = 0 WHERE id = ?`, args: [testId] },
  ]);
}

export { DAY };
