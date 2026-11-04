// Renders every theme + key screens to PNGs for a visual check.
// Usage: BASE_URL=http://localhost:3100 SHOTS=/dir node tests/e2e/screens.mjs
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const SHOTS = process.env.SHOTS ?? path.join(process.cwd(), "tests/e2e/output");
fs.mkdirSync(SHOTS, { recursive: true });
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

const browser = await chromium.launch();
const owner = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 900 } });
const problems = [];

const base = {
  tagline: "Small-batch thing you didn't know you needed",
  description: "Made by one person who cares way too much. First batch is tiny.",
  category: "other",
  emoji: "🔥",
  mode: "preorder",
  priceCents: 1800,
  currency: "USD",
  perks: ["Limited first batch", "Early-bird price", "Ships in 2 weeks"],
  cta: "Reserve mine",
  eta: "1m",
  askPrice: true,
  durationDays: 7,
  targetVisitors: 100,
  image: null,
};

const themes = ["acid", "bubblegum", "matcha", "chrome", "sunset", "clean"];
const slugs = {};
for (const theme of themes) {
  const res = await owner.request.post(`${BASE}/api/tests`, { data: { ...base, name: `${theme[0].toUpperCase()}${theme.slice(1)} drop`, theme } });
  if (!res.ok()) problems.push(`create ${theme}: ${res.status()} ${await res.text()}`);
  else slugs[theme] = (await res.json()).slug;
}

const phone = await browser.newContext({ ...devices["iPhone 13"], deviceScaleFactor: 1 });
const page = await phone.newPage();
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
for (const theme of themes) {
  await page.goto(`${BASE}/t/${slugs[theme]}`);
  await page.getByRole("button", { name: /Reserve mine/ }).waitFor();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SHOTS, `theme-${theme}-top.png`) });
  await page.mouse.wheel(0, 520);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SHOTS, `theme-${theme}-scrolled.png`) });
}

// owner screens (desktop)
const op = await owner.newPage();
op.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
const list = await (await owner.request.get(`${BASE}/dashboard`)).text();
void list;
await op.goto(`${BASE}/dashboard`);
await op.getByRole("heading", { name: "My tests" }).waitFor();
await op.screenshot({ path: path.join(SHOTS, "owner-list.png") });
const firstCard = op.locator('a[href^="/dashboard/"]').first();
await firstCard.click();
await op.getByText("Where it's leaning").waitFor();
await op.screenshot({ path: path.join(SHOTS, "owner-detail-top.png") });
await op.goto(`${BASE}/account`);
await op.getByRole("heading", { level: 1 }).waitFor();
await op.screenshot({ path: path.join(SHOTS, "owner-account.png") });
const og = await owner.request.get(`${BASE}/api/og/${slugs.sunset}`);
fs.writeFileSync(path.join(SHOTS, "og-sunset.png"), await og.body());

await browser.close();
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("screens written to", SHOTS);
