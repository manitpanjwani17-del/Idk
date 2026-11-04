// End-to-end test of every Validly user flow against a running server.
// Usage: BASE_URL=http://localhost:3100 DATABASE_URL=file:/path/e2e.db SHOTS=/dir node tests/e2e/flow.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");
const { createClient } = require("@libsql/client");

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const SHOTS = process.env.SHOTS ?? path.join(process.cwd(), "tests/e2e/output");
const db = createClient({ url: process.env.DATABASE_URL });
fs.mkdirSync(SHOTS, { recursive: true });

// Headless Chrome announces itself as a bot (we filter those), so use a normal UA.
const UA_DESKTOP =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const IPHONE = { ...devices["iPhone 13"] };

const errors = [];
const client4xx = [];
let step = 0;
const log = (msg) => console.log(`\n[${String(++step).padStart(2, "0")}] ${msg}`);
const ok = (msg) => console.log(`     ✓ ${msg}`);

const browser = await chromium.launch();

function watch(page, label) {
  page.setDefaultTimeout(15_000);
  page.on("pageerror", (e) => errors.push(`[${label}] pageerror: ${e.message}`));
  page.on("console", (m) => {
    // Expected 4xx responses (validation errors we trigger on purpose) are listed separately below.
    if (m.type() === "error" && !/Failed to load resource: the server responded with a status of 4\d\d/.test(m.text())) {
      errors.push(`[${label}] console.error: ${m.text()}`);
    }
  });
  page.on("response", (r) => {
    if (r.status() >= 500) errors.push(`[${label}] HTTP ${r.status()} ${r.url()}`);
    else if (r.status() >= 400) client4xx.push(`[${label}] ${r.status()} ${r.request().method()} ${r.url().replace(BASE, "")}`);
  });
  return page;
}

async function newPage(label, opts = {}) {
  const context = await browser.newContext({ userAgent: UA_DESKTOP, viewport: { width: 1280, height: 900 }, ...opts });
  const page = watch(await context.newPage(), label);
  return { context, page };
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: false });
}

async function stat(page, label) {
  const tile = page.locator('section[aria-label="Numbers"] > div', { hasText: label }).first();
  return Number((await tile.locator("p").nth(1).innerText()).trim());
}

function pngSize(buf) {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

const PRICE_LABEL = "$24";
// Unique per run so the suite can be re-run against the same database.
const RUN = Date.now().toString(36);
const EMAIL = `creator-${RUN}@example.com`;

try {
  // ------------------------------------------------------------------ home
  log("Home page renders and the example page is interactive");
  const creator = await newPage("creator");
  const cp = creator.page;
  await cp.goto(BASE);
  await cp.getByRole("heading", { level: 1 }).filter({ hasText: "Will your idea" }).waitFor();
  await shot(cp, "01-home-desktop");
  await cp.getByRole("button", { name: /Reserve mine · \$24/ }).click();
  await cp.locator("#reserve-email").fill("preview@example.com");
  await cp.getByRole("button", { name: "Reserve my spot" }).click();
  await cp.getByText("Preview only. Nothing was recorded.").waitFor();
  await cp.getByRole("button", { name: "Done" }).click();
  ok("example reservation works in preview mode without recording anything");
  const slider = cp.locator("#bar-price");
  await slider.fill("12");
  await cp.getByText("reserve → SHIP IT").waitFor();
  ok("bar explorer responds");

  // ---------------------------------------------------------------- wizard
  log("Wizard validates each step and launches a test");
  await cp.goto(`${BASE}/new`);
  await cp.locator("#f-name").waitFor();
  await cp.getByRole("button", { name: "Next →" }).click();
  await cp.getByText("Name needs at least 2 characters").waitFor();
  await cp.getByText("Pick a category").waitFor();
  ok("empty step 1 shows errors");
  await cp.locator("#f-name").fill("Moodcase");
  await cp.locator("#f-tagline").fill("Crochet phone cases that match your vibe");
  await cp.getByRole("radio", { name: /Fashion & merch/ }).click();
  await cp.getByRole("button", { name: "Next →" }).click();

  await cp.locator("#f-price").waitFor();
  await cp.getByRole("button", { name: "Next →" }).click();
  await cp.getByText("Enter a price", { exact: true }).waitFor();
  await cp.locator("#f-price").fill("abc");
  await cp.getByRole("button", { name: "Next →" }).click();
  await cp.getByText("Enter a price like 25 or 19.99").waitFor();
  await cp.locator("#f-price").fill("24");
  ok("price validation works");
  await cp.getByRole("button", { name: "Next →" }).click();

  await cp.locator("#f-desc").waitFor();
  const perkValue = await cp.getByRole("textbox", { name: "Reason 1", exact: true }).inputValue();
  assert.equal(perkValue, "Limited first batch", "fashion perks should be pre-filled");
  await cp.locator("#f-desc").fill("Order at www.scam-site.com");
  await cp.getByRole("button", { name: "Next →" }).click();
  await cp.getByText("Links aren't allowed on test pages").first().waitFor();
  await cp.locator("#f-desc").fill("Hand-made in small batches by me, a 19 y/o who can't stop crocheting.");
  ok("links are blocked, perks pre-filled");
  await cp.getByRole("button", { name: "Next →" }).click();

  // a real image: a screenshot is a valid PNG
  const pngBuffer = await cp.screenshot({ clip: { x: 0, y: 0, width: 600, height: 600 } });
  await cp.locator("#f-photo").setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: pngBuffer });
  await cp.getByRole("button", { name: "Change photo" }).waitFor();
  await cp.getByRole("radio", { name: /Bubblegum/ }).click();
  ok("photo processed in the browser, theme picked");
  await cp.getByRole("button", { name: "Next →" }).click();
  await cp.getByText("Your bar").waitFor();
  await shot(cp, "02-wizard-rules");
  await cp.getByRole("button", { name: /Launch my test/ }).click();
  await cp.waitForURL(/\/dashboard\/[a-z0-9]+\?launched=1/);
  await cp.getByText("You're live!").waitFor();
  const testId = cp.url().split("/dashboard/")[1].split("?")[0];
  const slug = (await cp.locator('header a:has-text("Open page")').getAttribute("href")).split("/t/")[1];
  ok(`launched test ${testId} at /t/${slug}`);
  await shot(cp, "03-dashboard-launched");
  assert.equal(await stat(cp, "Visitors"), 0);

  // draft is cleared after launch
  await cp.goto(`${BASE}/new`);
  await cp.locator("#f-name").waitFor();
  assert.equal(await cp.locator("#f-name").inputValue(), "", "draft should be cleared after launch");
  ok("draft cleared after launch");

  // ---------------------------------------------------------- owner visit
  log("Owner visits their own page: not counted, preview-only reservations");
  let ownerTracked = false;
  const onReq = (r) => r.url().includes("/api/track") && (ownerTracked = true);
  cp.on("request", onReq);
  await cp.goto(`${BASE}/t/${slug}`);
  await cp.getByText("This is your page.").waitFor();
  await cp.waitForTimeout(800);
  cp.off("request", onReq);
  assert.equal(ownerTracked, false, "owner's browser shouldn't even send a view");
  const direct = await cp.request.post(`${BASE}/api/track`, { data: { slug, type: "view" } });
  assert.deepEqual(await direct.json(), { counted: false, reason: "owner" });
  await cp.getByRole("button", { name: /Reserve mine/ }).click();
  await cp.locator("#reserve-email").fill("me@example.com");
  await cp.getByRole("button", { name: "Reserve my spot" }).click();
  await cp.getByText("Preview only. Nothing was recorded.").waitFor();
  await cp.keyboard.press("Escape");
  const img = await cp.request.get(`${BASE}/api/img/${slug}?v=1`);
  assert.equal(img.status(), 200);
  assert.equal(img.headers()["content-type"], "image/jpeg");
  ok("owner excluded; uploaded photo served as JPEG");

  // ------------------------------------------------------------- visitors
  log("40 different visitors from different sources");
  const sources = ["ig", "tt", "gc", "x", null];
  let reserved = 0;
  let clicked = 0;
  let visitors = 0;
  let keepVisitor = null;
  for (let i = 0; i < 40; i++) {
    const mobile = i % 2 === 0;
    const { context, page } = await newPage(`visitor${i}`, mobile ? IPHONE : {});
    const src = sources[i % sources.length];
    const view = page.waitForResponse((r) => r.url().includes("/api/track"));
    await page.goto(`${BASE}/t/${slug}${src ? `?s=${src}` : ""}`);
    const v = await (await view).json();
    assert.equal(v.counted, true, `visitor ${i} view should count`);
    visitors++;
    if (i < 20) {
      const click = page.waitForResponse((r) => r.url().includes("/api/track") && r.request().postData().includes('"click"'));
      await page.getByRole("button", { name: /Reserve mine · \$24/ }).click();
      await click;
      clicked++;
      if (i < 14) {
        await page.locator("#reserve-email").fill(`fan${i}@example.com`);
        if (i % 3 === 0) await page.getByRole("button", { name: PRICE_LABEL, exact: true }).click();
        if (i % 3 === 1) await page.getByRole("button", { name: "$18", exact: true }).click();
        await page.getByRole("button", { name: "Reserve my spot" }).click();
        await page.getByText("You're in!").waitFor();
        reserved++;
        if (i === 0) await shot(page, "04-visitor-reserved-mobile");
      } else {
        await page.keyboard.press("Escape");
      }
    } else if (i === 20) {
      await shot(page, "05-visitor-page-mobile");
    }
    if (i === 1) keepVisitor = { context, page };
    else await context.close();
  }
  ok(`${visitors} visitors, ${clicked} taps, ${reserved} reservations`);

  log("Edge cases: invalid email, same device, duplicate email, returning visitor");
  {
    const { page } = keepVisitor;
    await page.reload();
    await page.getByText("You're on the list").waitFor();
    ok("returning visitor sees they're already on the list");
    await page.getByRole("button", { name: "Change email" }).click();
    await page.locator("#reserve-email").fill("not-an-email");
    await page.getByRole("button", { name: "Reserve my spot" }).click();
    await page.getByText("That email doesn't look right.").waitFor();
    ok("invalid email rejected in the browser");
    await page.locator("#reserve-email").fill("fan1-fixed@example.com");
    await page.getByRole("button", { name: "Reserve my spot" }).click();
    await page.getByText("Email updated!").waitFor();
    ok("same device fixing a typo updates the email, no double count");
    await keepVisitor.context.close();
  }
  {
    const { context, page } = await newPage("dupe", IPHONE);
    await page.goto(`${BASE}/t/${slug}?s=ig`);
    visitors++;
    await page.getByRole("button", { name: /Reserve mine/ }).click();
    clicked++;
    await page.locator("#reserve-email").fill("FAN2@example.com ");
    await page.getByRole("button", { name: "Reserve my spot" }).click();
    await page.getByText("You're already in!").waitFor();
    ok("duplicate email (different case, new device) is not double counted");
    const bad = await page.request.post(`${BASE}/api/reserve`, { data: { slug, email: "nope" } });
    assert.equal(bad.status(), 400);
    ok("server rejects invalid email too");
    await context.close();
  }

  // ------------------------------------------------------------ dashboard
  log("Dashboard numbers match exactly");
  await cp.goto(`${BASE}/dashboard/${testId}`);
  assert.equal(await stat(cp, "Visitors"), visitors);
  assert.equal(await stat(cp, "Tapped button"), clicked);
  assert.equal(await stat(cp, "Reserved"), reserved);
  ok(`visitors=${visitors} tapped=${clicked} reserved=${reserved}`);
  for (const label of ["Instagram", "TikTok", "Group chats", "X", "Direct link"]) {
    await cp.locator("table").getByRole("cell", { name: label, exact: true }).waitFor();
  }
  ok("all sources attributed");
  await cp.getByRole("button", { name: `Show all ${reserved}` }).click();
  await cp.getByText("fan1-fixed@example.com").waitFor();
  await cp.getByRole("button", { name: "Show fewer" }).click();
  await cp.getByText("Leaning SHIP IT").waitFor();
  ok("live lean shows SHIP IT");
  await shot(cp, "06-dashboard-live");

  log("Share kit: tagged links, captions, QR");
  await cp.getByRole("tab", { name: /Group chat/ }).click();
  await cp.getByText(`?s=gc`).first().waitFor();
  await cp.getByRole("tab", { name: /QR code/ }).click();
  await cp.getByRole("img", { name: /QR code for Moodcase/ }).waitFor();
  ok("QR code generated");

  log("Remove a junk reservation");
  await cp.getByRole("button", { name: "Remove fan13@example.com" }).click();
  await cp.getByText("fan13@example.com").waitFor({ state: "detached" });
  reserved--;
  assert.equal(await stat(cp, "Reserved"), reserved);
  ok("reservation removed and counts updated");

  log("CSV export");
  const csv = await cp.request.get(`${BASE}/api/tests/${testId}/export`);
  assert.equal(csv.status(), 200);
  const csvText = await csv.text();
  assert.match(csv.headers()["content-disposition"], /moodcase-reservations\.csv/);
  assert.equal(csvText.trim().split("\r\n").length, reserved + 1);
  assert.match(csvText, /fan0@example.com/);
  const anonCsv = await (await browser.newContext()).request.get(`${BASE}/api/tests/${testId}/export`);
  assert.equal(anonCsv.status(), 401);
  ok("CSV has every reservation; strangers can't download it");

  log("Edit the page (copy + price change warning)");
  await cp.goto(`${BASE}/dashboard/${testId}/edit`);
  await cp.locator("#f-tagline").fill("Crochet phone cases that match your exact vibe");
  await cp.locator("#f-price").fill("26");
  await cp.getByText("changing the price or offer mid-test").waitFor();
  await cp.getByRole("button", { name: "Save changes" }).click();
  await cp.waitForURL(new RegExp(`/dashboard/${testId}$`));
  await cp.getByText("You changed the price or offer during this test").waitFor();
  await cp.getByText("Crochet phone cases that match your exact vibe").first().waitFor();
  ok("edit saved, mid-test offer change flagged");
  // put the price back
  await cp.goto(`${BASE}/dashboard/${testId}/edit`);
  await cp.locator("#f-price").fill("24");
  await cp.getByRole("button", { name: "Save changes" }).click();
  await cp.waitForURL(new RegExp(`/dashboard/${testId}$`));

  // ---------------------------------------------------------------- close
  log("Close the case and watch the reveal");
  await cp.getByRole("button", { name: /Close & get the verdict/ }).click();
  await cp.getByRole("button", { name: "Show me" }).click();
  await cp.waitForURL(new RegExp(`/dashboard/${testId}/verdict`));
  await cp.getByText("is in.").waitFor();
  await shot(cp, "07-reveal-intro");
  await cp.getByRole("button", { name: "Skip" }).click();
  await cp.getByLabel("SHIP IT").first().waitFor();
  await cp.waitForTimeout(800);
  await shot(cp, "08-reveal-final");
  ok("reveal ends on SHIP IT");

  log("Verdict cards: PNGs, public page, privacy toggle");
  const story = await cp.request.get(`${BASE}/api/card/${slug}?format=story`);
  assert.equal(story.status(), 200);
  assert.equal(story.headers()["content-type"], "image/png");
  assert.deepEqual(pngSize(await story.body()), { w: 1080, h: 1920 });
  fs.writeFileSync(path.join(SHOTS, "09-card-story.png"), await story.body());
  const wide = await cp.request.get(`${BASE}/api/card/${slug}?format=wide&download=1`);
  assert.deepEqual(pngSize(await wide.body()), { w: 1200, h: 630 });
  assert.match(wide.headers()["content-disposition"], /attachment; filename="validly-moodcase-wide.png"/);
  fs.writeFileSync(path.join(SHOTS, "10-card-wide.png"), await wide.body());
  const og = await cp.request.get(`${BASE}/api/og/${slug}`);
  assert.equal(og.status(), 200);
  fs.writeFileSync(path.join(SHOTS, "11-og-preview.png"), await og.body());
  ok("story 1080×1920, post 1200×630, link preview OK");

  const stranger = await newPage("stranger", IPHONE);
  await stranger.page.goto(`${BASE}/v/${slug}`);
  await stranger.page.getByLabel("SHIP IT").first().waitFor();
  const ogImage = await stranger.page.locator('meta[property="og:image"]').first().getAttribute("content");
  assert.match(ogImage, new RegExp(`/api/card/${slug}\\?format=wide`));
  await shot(stranger.page, "12-public-card-mobile");
  ok("public card page with OG image");

  await cp.goto(`${BASE}/dashboard/${testId}`);
  await cp.locator("label", { hasText: "Public card link" }).click();
  await cp.locator("label", { hasText: "Public card link off" }).waitFor();
  const hidden = await stranger.page.goto(`${BASE}/v/${slug}`);
  await stranger.page.getByText("This page doesn't exist").waitFor();
  const hiddenPng = await stranger.context.request.get(`${BASE}/api/card/${slug}`);
  assert.equal(hiddenPng.status(), 404);
  ok(`private card hidden from strangers (page status ${hidden.status()})`);
  await cp.locator("label", { hasText: "Public card link" }).click();
  await cp.locator("label", { hasText: "Public card link on" }).waitFor();

  log("Closed page tells visitors it wrapped and refuses new reservations");
  await stranger.page.goto(`${BASE}/t/${slug}`);
  await stranger.page.getByText("This drop test has wrapped").waitFor();
  const late = await stranger.context.request.post(`${BASE}/api/reserve`, { data: { slug, email: "late@example.com" } });
  assert.equal(late.status(), 410);
  ok("closed test blocks reservations");

  log("Reopen for 3 more days");
  await cp.getByRole("button", { name: "+3 days" }).click();
  await cp.getByText("Leaning SHIP IT").waitFor();
  await cp.locator("span", { hasText: /^LIVE$/ }).first().waitFor();
  ok("test is live again");

  // -------------------------------------------------------------- retrial
  log("Retrial pre-fills from the original");
  await cp.goto(`${BASE}/new?from=${testId}`);
  await cp.getByText("Retrial of “Moodcase”").waitFor();
  assert.equal(await cp.locator("#f-name").inputValue(), "Moodcase");
  await cp.locator("#f-name").fill("Moodcase v2");
  for (let s = 0; s < 4; s++) await cp.getByRole("button", { name: "Next →" }).click();
  await cp.getByRole("button", { name: /Launch my test/ }).click();
  await cp.waitForURL(/\/dashboard\/[a-z0-9]+\?launched=1/);
  const retrialId = cp.url().split("/dashboard/")[1].split("?")[0];
  const retrialSlug = (await cp.locator('header a:has-text("Open page")').getAttribute("href")).split("/t/")[1];
  await cp.getByText("See the original test").waitFor();
  const retrialImg = await cp.request.get(`${BASE}/api/img/${retrialSlug}?v=1`);
  assert.equal(retrialImg.status(), 200);
  ok("retrial launched, linked to original, photo carried over");

  // ------------------------------------------------------------- accounts
  log("Save the guest account (recovery code shown once)");
  await cp.goto(`${BASE}/account`);
  await cp.getByText("You have 2 tests on a guest account").waitFor();
  await cp.locator("#save-email").fill(`Creator-${RUN}@Example.com`);
  await cp.locator("#save-password").fill("short");
  await cp.getByRole("button", { name: /Save my account/ }).click();
  await cp.getByText("Password needs at least 8 characters").waitFor();
  await cp.locator("#save-password").fill("supersecret1");
  await cp.getByRole("button", { name: /Save my account/ }).click();
  const code = (await cp.getByTestId("recovery-code").innerText()).trim();
  assert.match(code, /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  await shot(cp, "13-recovery-code");
  await cp.getByLabel("I've saved my recovery code somewhere safe").check();
  await cp.getByRole("button", { name: "I saved it, continue" }).click();
  await cp.waitForURL(/\/dashboard$/);
  await cp.getByText(EMAIL).waitFor();
  ok(`account saved (email normalised), code ${code}`);

  log("Log out, wrong password, log back in");
  await cp.goto(`${BASE}/account`);
  await cp.getByRole("button", { name: "Log out" }).click();
  await cp.waitForURL(BASE + "/");
  await cp.goto(`${BASE}/dashboard`);
  await cp.getByText("No tests yet").waitFor();
  await cp.goto(`${BASE}/login`);
  await cp.locator("#login-email").fill(EMAIL);
  await cp.locator("#login-password").fill("wrong-password");
  await cp.getByRole("button", { name: "Log in" }).click();
  await cp.getByText("Wrong email or password.").waitFor();
  await cp.locator("#login-password").fill("supersecret1");
  await cp.getByRole("button", { name: "Log in" }).click();
  await cp.waitForURL(/\/dashboard/);
  await cp.getByText("Moodcase v2").waitFor();
  ok("logout / bad password / login all behave");

  log("Forgot password: recovery code flow");
  const other = await newPage("recover");
  await other.page.goto(`${BASE}/recover`);
  await other.page.locator("#rec-email").fill(EMAIL);
  await other.page.locator("#rec-code").fill("AAAA-BBBB-CCCC");
  await other.page.locator("#rec-password").fill("brandnewpass1");
  await other.page.getByRole("button", { name: "Reset my password" }).click();
  await other.page.getByText("That email and recovery code don't match.").waitFor();
  await other.page.locator("#rec-code").fill(code.toLowerCase());
  await other.page.getByRole("button", { name: "Reset my password" }).click();
  await other.page.getByText("Password reset. You're logged in.").waitFor();
  const newCode = (await other.page.getByTestId("recovery-code").innerText()).trim();
  assert.notEqual(newCode, code);
  ok("recovery works, old code replaced");
  // the creator's old session was signed out by the reset
  await cp.goto(`${BASE}/dashboard`);
  await cp.getByText("No tests yet").waitFor();
  ok("other devices signed out after reset");
  const reuse = await other.context.request.post(`${BASE}/api/auth/recover`, {
    data: { email: EMAIL, code, password: "anotherpass1" },
  });
  assert.equal(reuse.status(), 401);
  ok("old recovery code no longer works");
  await other.context.close();

  log("Guest merge: tests made before logging in move into the account");
  const guest = await newPage("guest");
  const quick = {
    name: "Matcha tin",
    tagline: "Ceremonial matcha in a tin you'll keep",
    description: "",
    category: "food",
    emoji: "🧋",
    mode: "waitlist",
    priceCents: 0,
    currency: "GBP",
    perks: ["First taste before anyone else"],
    cta: "Join the waitlist",
    eta: "2m",
    theme: "matcha",
    askPrice: true,
    durationDays: 5,
    targetVisitors: 50,
    image: null,
  };
  const created = await guest.context.request.post(`${BASE}/api/tests`, { data: quick, headers: { origin: BASE } });
  assert.equal(created.status(), 200);
  const matcha = await created.json();
  const evil = await guest.context.request.post(`${BASE}/api/tests`, {
    data: quick,
    headers: { origin: "https://evil.example" },
  });
  assert.equal(evil.status(), 403);
  ok("cross-site POST blocked");
  await guest.page.goto(`${BASE}/login`);
  await guest.page.locator("#login-email").fill(EMAIL);
  await guest.page.locator("#login-password").fill("brandnewpass1");
  await guest.page.getByRole("button", { name: "Log in" }).click();
  await guest.page.getByText("Moved 1 test from this device into your account.").waitFor();
  await guest.page.getByText("Matcha tin").waitFor();
  await guest.page.getByText("Moodcase v2").waitFor();
  ok("guest test merged into the account");

  log("Waitlist page in GBP, matcha theme");
  const w = await newPage("waitlist-visitor", IPHONE);
  await w.page.goto(`${BASE}/t/${matcha.slug}`);
  await w.page.getByRole("button", { name: "Join the waitlist" }).click();
  await w.page.locator("#reserve-email").fill("tea@example.com");
  await w.page.getByLabel("Amount you'd pay").fill("12.50");
  await w.page.getByRole("button", { name: "Join the waitlist" }).last().click();
  await w.page.getByText("You're in!").waitFor();
  await shot(w.page, "14-waitlist-matcha-mobile");
  const pay = await db.execute({ sql: "SELECT would_pay_cents FROM signups WHERE email = 'tea@example.com'", args: [] });
  assert.equal(Number(pay.rows[0].would_pay_cents), 1250);
  ok("waitlist join with custom 'would pay' stored as £12.50");
  await w.context.close();

  log("Deadline passes: test closes itself (no cron)");
  await db.execute({ sql: "UPDATE tests SET ends_at = ? WHERE id = ?", args: [Date.now() - 1000, matcha.id] });
  await guest.page.goto(`${BASE}/dashboard/${matcha.id}`);
  await guest.page.getByText("Not enough people have seen it yet.").waitFor();
  await guest.page.getByText("Your page is closed").waitFor();
  ok("expired test closed lazily with NEED MORE DATA");

  log("Reports hide a page after 3 different people flag it");
  for (let r = 0; r < 3; r++) {
    const rep = await newPage(`reporter${r}`);
    await rep.page.goto(`${BASE}/t/${retrialSlug}`);
    await rep.page.getByRole("button", { name: "Report this page" }).click();
    await rep.page.getByRole("radio", { name: "Spam" }).click();
    await rep.page.getByRole("button", { name: "Report", exact: true }).click();
    await rep.page.getByText("Thanks for flagging").waitFor();
    await rep.context.close();
  }
  const anon = await newPage("anon");
  await anon.page.goto(`${BASE}/t/${retrialSlug}`);
  await anon.page.getByText("This page is under review").waitFor();
  await guest.page.goto(`${BASE}/dashboard/${retrialId}`);
  await guest.page.getByText("Your page is hidden because several visitors reported it").waitFor();
  ok("page hidden for visitors, owner told why");

  log("Delete a test");
  await guest.page.getByRole("button", { name: "Delete this test" }).click();
  await guest.page.getByRole("button", { name: "Delete forever" }).click();
  await guest.page.waitForURL(/\/dashboard$/);
  await guest.page.getByRole("heading", { name: "My tests" }).waitFor();
  // Next keeps the previous page in the DOM (hidden) for instant back-navigation, so only count visible matches.
  assert.equal(await guest.page.locator('text="Moodcase v2" >> visible=true').count(), 0);
  const gone = await anon.page.goto(`${BASE}/t/${retrialSlug}`);
  await anon.page.getByText("This page doesn't exist").waitFor();
  ok(`deleted test is gone (status ${gone.status()})`);

  log("Delete account wipes everything");
  const temp = await newPage("temp");
  const t2 = await temp.context.request.post(`${BASE}/api/tests`, { data: { ...quick, name: "Temp idea" } });
  const t2json = await t2.json();
  await temp.page.goto(`${BASE}/account`);
  await temp.page.getByRole("button", { name: "Delete my account" }).click();
  await temp.page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await temp.page.getByRole("button", { name: "Delete forever" }).click();
  await temp.page.waitForURL(BASE + "/");
  const left = await db.execute({ sql: "SELECT COUNT(*) AS n FROM tests WHERE id = ?", args: [t2json.id] });
  assert.equal(Number(left.rows[0].n), 0);
  ok("guest account + tests deleted");

  log("Mobile screenshots of key screens");
  const m = await newPage("mobile", IPHONE);
  await m.page.goto(BASE);
  assert.equal(await m.page.getByRole("heading", { level: 1 }).count(), 1, "exactly one h1 on the home page");
  await shot(m.page, "15-home-mobile");
  await m.page.goto(`${BASE}/new`);
  await m.page.locator("#f-name").waitFor();
  await shot(m.page, "16-wizard-mobile");
  await m.page.getByRole("button", { name: "👀 Preview" }).click();
  await m.page.waitForTimeout(400);
  await shot(m.page, "17-wizard-preview-mobile");
} catch (err) {
  console.error("\n✗ FAILED at step", step, "\n", err);
  errors.push(`FAILED: ${err.message}`);
  for (const ctx of browser.contexts()) {
    for (const p of ctx.pages()) {
      try {
        await p.screenshot({ path: path.join(SHOTS, `fail-${ctx.pages().indexOf(p)}-${Date.now()}.png`) });
        console.error("   page at failure:", p.url());
      } catch {}
    }
  }
} finally {
  await browser.close();
}

console.log(`\nExpected 4xx responses seen in browsers (${client4xx.length}):`);
for (const r of client4xx) console.log("   ", r);

if (errors.length) {
  console.error(`\n${errors.length} problem(s):`);
  for (const e of errors) console.error(" -", e);
  process.exit(1);
}
console.log("\nALL E2E CHECKS PASSED");
