import { describe, expect, it } from "vitest";
import { computeVerdict, getBar, median, MIN_VISITORS, pct, wilson, type VerdictInput } from "../../src/lib/verdict";
import { formatMoney, niceRound, parseMoney } from "../../src/lib/money";
import { resolveSource } from "../../src/lib/sources";

const base: VerdictInput = {
  visitors: 100,
  clicks: 30,
  reservations: 10,
  priceCents: 2500,
  currency: "USD",
  mode: "preorder",
  wouldPay: [],
  sources: [],
};

describe("getBar", () => {
  it("is stricter for cheap products and looser for expensive ones", () => {
    expect(getBar(1000, "USD", "preorder")).toMatchObject({ ship: 0.12, kill: 0.04 });
    expect(getBar(2500, "USD", "preorder")).toMatchObject({ ship: 0.08, kill: 0.025 });
    expect(getBar(10000, "USD", "preorder")).toMatchObject({ ship: 0.05, kill: 0.015 });
    expect(getBar(50000, "USD", "preorder")).toMatchObject({ ship: 0.03, kill: 0.01 });
  });
  it("treats free waitlists as the hardest bar", () => {
    expect(getBar(0, "USD", "waitlist")).toMatchObject({ ship: 0.2, kill: 0.06 });
  });
  it("raises the bar for priced waitlists", () => {
    const b = getBar(2500, "USD", "waitlist");
    expect(b.ship).toBeCloseTo(0.12);
    expect(b.kill).toBeCloseTo(0.0375);
  });
  it("converts currencies before banding", () => {
    // ₹1,500 ≈ $18 -> impulse band; ₹5,000 ≈ $60 -> treat band
    expect(getBar(150000, "INR", "preorder").ship).toBe(0.12);
    expect(getBar(500000, "INR", "preorder").ship).toBe(0.08);
  });
});

describe("wilson", () => {
  it("brackets the observed rate", () => {
    const [lo, hi] = wilson(10, 100);
    expect(lo).toBeLessThan(0.1);
    expect(hi).toBeGreaterThan(0.1);
    expect(lo).toBeGreaterThan(0);
  });
  it("handles zero visitors", () => {
    expect(wilson(0, 0)).toEqual([0, 1]);
  });
  it("narrows with more data", () => {
    const [a, b] = wilson(10, 100);
    const [c, d] = wilson(100, 1000);
    expect(d - c).toBeLessThan(b - a);
  });
});

describe("computeVerdict", () => {
  it("asks for more data under the minimum visitors", () => {
    const v = computeVerdict({ ...base, visitors: MIN_VISITORS - 1, reservations: 20, clicks: 25 });
    expect(v.outcome).toBe("more");
    expect(v.title).toBe("NEED MORE DATA");
    expect(v.moves.length).toBeGreaterThan(0);
  });

  it("ships a clear winner with high confidence on a big sample", () => {
    const v = computeVerdict({ ...base, visitors: 400, clicks: 120, reservations: 60 });
    expect(v.outcome).toBe("ship");
    expect(v.confidence).toBe("high");
    expect(v.score).toBeGreaterThanOrEqual(70);
    expect(v.title).toBe("SHIP IT");
  });

  it("ships on the point estimate with lower confidence on a small sample", () => {
    const v = computeVerdict({ ...base, visitors: 40, clicks: 10, reservations: 4 }); // 10% vs 8% bar
    expect(v.outcome).toBe("ship");
    expect(v.confidence).toBe("low");
  });

  it("says change it between the lines", () => {
    const v = computeVerdict({ ...base, visitors: 200, clicks: 40, reservations: 10 }); // 5%
    expect(v.outcome).toBe("change");
    expect(v.score).toBeGreaterThan(0);
    expect(v.score).toBeLessThan(70);
  });

  it("kills a flop", () => {
    const v = computeVerdict({ ...base, visitors: 300, clicks: 6, reservations: 1 });
    expect(v.outcome).toBe("kill");
    expect(v.confidence).toBe("high");
    expect(v.title).toBe("KILL IT");
  });

  it("kills 0 reservations at the minimum sample, with low confidence", () => {
    const v = computeVerdict({ ...base, visitors: MIN_VISITORS, clicks: 0, reservations: 0 });
    expect(v.outcome).toBe("kill");
    expect(v.confidence).toBe("low");
  });

  it("diagnoses a hook problem when nobody taps", () => {
    const v = computeVerdict({ ...base, visitors: 200, clicks: 4, reservations: 2 });
    expect(v.reasons.join(" ")).toMatch(/Hook problem/);
  });

  it("diagnoses a close problem when people tap but bail", () => {
    const v = computeVerdict({ ...base, visitors: 200, clicks: 60, reservations: 8 });
    expect(v.reasons.join(" ")).toMatch(/Close problem/);
    expect(v.moves.join(" ")).toMatch(/lower price/);
  });

  it("suggests a lower price when reservers would pay less", () => {
    const v = computeVerdict({ ...base, wouldPay: [1000, 1200, 1500, 1500, 1800] });
    expect(v.priceHint).toEqual({ minor: 1500, direction: "lower" });
  });

  it("flags underpricing", () => {
    const v = computeVerdict({ ...base, wouldPay: [4000, 4500, 5000, 3500, 4000] });
    expect(v.priceHint?.direction).toBe("higher");
  });

  it("ignores the price signal with too few answers", () => {
    const v = computeVerdict({ ...base, wouldPay: [100, 100] });
    expect(v.priceHint).toBeNull();
  });

  it("finds the best source", () => {
    const v = computeVerdict({
      ...base,
      visitors: 100,
      reservations: 10,
      clicks: 30,
      sources: [
        { source: "tt", visitors: 50, reservations: 9 },
        { source: "ig", visitors: 50, reservations: 1 },
      ],
    });
    expect(v.bestSource?.source).toBe("tt");
    expect(v.reasons.join(" ")).toMatch(/TikTok/);
  });

  it("warns when a ship mostly came from friends", () => {
    const v = computeVerdict({
      ...base,
      visitors: 100,
      reservations: 30,
      clicks: 40,
      sources: [{ source: "gc", visitors: 80, reservations: 28 }],
    });
    expect(v.outcome).toBe("ship");
    expect(v.warm).toBe(true);
  });

  it("never lets reservations exceed visitors or clicks drop below reservations", () => {
    const v = computeVerdict({ ...base, visitors: 50, clicks: 2, reservations: 80 });
    expect(v.stats.reservations).toBe(50);
    expect(v.stats.clicks).toBe(50);
    expect(v.rate).toBe(1);
  });

  it("is deterministic", () => {
    expect(computeVerdict(base)).toEqual(computeVerdict(base));
  });
});

describe("helpers", () => {
  it("formats percents like a human", () => {
    expect(pct(0)).toBe("0%");
    expect(pct(0.042)).toBe("4.2%");
    expect(pct(0.04)).toBe("4%");
    expect(pct(0.142)).toBe("14%");
  });
  it("computes medians", () => {
    expect(median([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(3);
  });
  it("formats and parses money", () => {
    expect(formatMoney(2500, "USD")).toBe("$25");
    expect(formatMoney(1999, "USD")).toBe("$19.99");
    expect(formatMoney(150000, "INR")).toBe("₹1,500");
    expect(parseMoney("19.99")).toBe(1999);
    expect(parseMoney("1,200")).toBe(120000);
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("abc")).toBeNull();
    expect(niceRound(1234)).toBe(1200);
    expect(niceRound(12345)).toBe(12500);
    expect(niceRound(333)).toBe(350);
  });
  it("resolves sources from tags and referrers", () => {
    expect(resolveSource("tt", null)).toBe("tt");
    expect(resolveSource("TT", null)).toBe("tt");
    expect(resolveSource("nonsense", "https://l.instagram.com/x")).toBe("ig");
    expect(resolveSource(null, "https://t.co/abc")).toBe("x");
    expect(resolveSource(null, "not a url")).toBe("direct");
    expect(resolveSource(null, null)).toBe("direct");
  });
});

describe("copy", () => {
  it("uses the right article for each band", async () => {
    const { aBand } = await import("../../src/lib/verdict");
    expect(aBand("impulse buy")).toBe("an impulse buy");
    expect(aBand("big purchase")).toBe("a big purchase");
    const v = computeVerdict({ ...base, priceCents: 1000, visitors: 100, reservations: 20, clicks: 30 });
    expect(v.reasons[0]).toMatch(/For an impulse buy/);
  });
});
