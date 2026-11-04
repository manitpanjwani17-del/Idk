import { formatMoney, niceRound, USD_RATE, type Currency } from "./money";
import { sourceLabel } from "./sources";

/**
 * The verdict engine. Pure and deterministic: same numbers in, same verdict out.
 *
 * How it decides:
 * 1. Every price band has a "ship bar" and a "kill line" — the share of visitors
 *    who must reserve. Cheaper things should convert better than expensive ones.
 * 2. We compare the reservation rate (with a 90% Wilson confidence interval, so
 *    small samples can't fake certainty) against those lines.
 * 3. We then explain *why*: hook problem (nobody taps) vs close problem
 *    (people tap but bail), price signals, and which source converts best.
 */

export type Outcome = "ship" | "change" | "kill" | "more";
export type Confidence = "high" | "medium" | "low";
export type Mode = "preorder" | "waitlist";

export interface SourceStat {
  source: string;
  visitors: number;
  reservations: number;
}

export interface VerdictInput {
  visitors: number;
  clicks: number;
  reservations: number;
  priceCents: number;
  currency: Currency;
  mode: Mode;
  /** "What would you pay?" answers from reservers, in minor units. */
  wouldPay: number[];
  sources: SourceStat[];
}

export interface Bar {
  ship: number;
  kill: number;
  band: string;
}

export interface Verdict {
  outcome: Outcome;
  confidence: Confidence;
  /** 0–100 "hype score". 70 = exactly on the ship bar. */
  score: number;
  rate: number;
  low: number;
  high: number;
  clickRate: number;
  closeRate: number | null;
  bar: Bar;
  title: string;
  summary: string;
  reasons: string[];
  moves: string[];
  priceHint: { minor: number; direction: "lower" | "higher" } | null;
  bestSource: { source: string; rate: number } | null;
  warm: boolean;
  stats: {
    visitors: number;
    clicks: number;
    reservations: number;
    medianWouldPay: number | null;
    wouldPayCount: number;
  };
}

/** Below this many unique visitors we refuse to call it. */
export const MIN_VISITORS = 30;
const Z_90 = 1.645;

export const OUTCOME_TITLE: Record<Outcome, string> = {
  ship: "SHIP IT",
  change: "CHANGE IT",
  kill: "KILL IT",
  more: "NEED MORE DATA",
};

export const OUTCOME_SUMMARY: Record<Outcome, string> = {
  ship: "People want this. Go make it.",
  change: "There's something here, just not this version.",
  kill: "The market said no. You just saved months.",
  more: "Not enough people have seen it yet.",
};

export function getBar(priceCents: number, currency: Currency, mode: Mode): Bar {
  const usd = (Math.max(0, priceCents) / 100) * USD_RATE[currency];
  let ship: number;
  let kill: number;
  let band: string;
  if (priceCents <= 0) {
    ship = 0.2;
    kill = 0.06;
    band = "free signup";
  } else if (usd < 20) {
    ship = 0.12;
    kill = 0.04;
    band = "impulse buy";
  } else if (usd < 75) {
    ship = 0.08;
    kill = 0.025;
    band = "treat-yourself buy";
  } else if (usd < 250) {
    ship = 0.05;
    kill = 0.015;
    band = "think-about-it buy";
  } else {
    ship = 0.03;
    kill = 0.01;
    band = "big purchase";
  }
  // A waitlist costs the visitor nothing, so it has to clear a higher bar.
  if (mode === "waitlist" && priceCents > 0) {
    ship = Math.min(0.2, ship * 1.5);
    kill = Math.min(0.06, kill * 1.5);
  }
  return { ship, kill, band };
}

/** "an impulse buy", "a big purchase". */
export function aBand(band: string): string {
  return `${/^[aeiou]/i.test(band) ? "an" : "a"} ${band}`;
}

/** 90% Wilson score interval for k successes out of n. */
export function wilson(k: number, n: number, z = Z_90): [number, number] {
  if (n <= 0) return [0, 1];
  const p = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return [Math.max(0, center - margin), Math.min(1, center + margin)];
}

export function median(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : Math.round((v[mid - 1] + v[mid]) / 2);
}

/** 0.142 -> "14%", 0.042 -> "4.2%", 0 -> "0%". */
export function pct(x: number): string {
  const v = Math.max(0, x) * 100;
  if (v === 0) return "0%";
  if (v < 10) return `${Number(v.toFixed(1))}%`;
  return `${Math.round(v)}%`;
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function computeVerdict(input: VerdictInput): Verdict {
  const visitors = Math.max(0, Math.floor(input.visitors));
  const reservations = clamp(Math.floor(input.reservations), 0, visitors);
  // Every reservation implies a tap; nobody can tap without visiting.
  const clicks = clamp(Math.floor(input.clicks), reservations, visitors);
  const bar = getBar(input.priceCents, input.currency, input.mode);
  const money = (minor: number) => formatMoney(minor, input.currency);

  const rate = visitors ? reservations / visitors : 0;
  const [low, high] = wilson(reservations, visitors);
  const clickRate = visitors ? clicks / visitors : 0;
  const closeRate = clicks ? reservations / clicks : null;
  const medianWouldPay = median(input.wouldPay);
  const score = clamp(Math.round((rate / bar.ship) * 70), 0, 100);

  let outcome: Outcome;
  let confidence: Confidence;
  const big = visitors >= 150;
  if (visitors < MIN_VISITORS) {
    outcome = "more";
    confidence = "low";
  } else if (low >= bar.ship) {
    outcome = "ship";
    confidence = big ? "high" : "medium";
  } else if (rate >= bar.ship) {
    outcome = "ship";
    confidence = big ? "medium" : "low";
  } else if (high < bar.kill) {
    outcome = "kill";
    confidence = big ? "high" : "medium";
  } else if (rate < bar.kill) {
    outcome = "kill";
    confidence = big ? "medium" : "low";
  } else {
    outcome = "change";
    confidence = visitors >= 100 ? "medium" : "low";
  }

  const reasons: string[] = [];
  const moves: string[] = [];

  // 1. The headline number.
  if (outcome === "ship") {
    reasons.push(
      `${pct(rate)} of visitors reserved. For ${aBand(bar.band)}, the bar is ${pct(bar.ship)}. You cleared it.`,
    );
  } else if (outcome === "change") {
    reasons.push(
      `${pct(rate)} of visitors reserved. That's above the kill line (${pct(bar.kill)}) but under the ship bar (${pct(bar.ship)}).`,
    );
  } else if (outcome === "kill") {
    reasons.push(
      `Only ${pct(rate)} of visitors reserved. For ${aBand(bar.band)}, anything under ${pct(bar.kill)} is a no.`,
    );
  } else {
    reasons.push(
      `${plural(visitors, "visitor")} so far. A fair verdict needs at least ${MIN_VISITORS}, so share it more.`,
    );
  }

  // 2. Hook problem vs close problem.
  if (outcome === "change" || outcome === "kill") {
    if (clickRate < bar.kill * 2) {
      reasons.push(
        `Hook problem: only ${pct(clickRate)} of visitors even tapped the button. The page isn't grabbing people.`,
      );
      moves.push("Rewrite the headline around what people get, not what the thing is.");
      moves.push("Swap the emoji for a real photo or mockup. Real images feel legit.");
    } else if (clicks >= 5 && closeRate !== null && closeRate < 0.5) {
      reasons.push(
        `Close problem: ${pct(clickRate)} tapped the button but only ${pct(closeRate)} of them reserved. They were curious, then something stopped them.`,
      );
      moves.push(
        input.priceCents > 0
          ? "Try a lower price or a launch discount for reservers."
          : "Say exactly what people get and when. Vague offers don't close.",
      );
      moves.push("Add one line about who's behind it. Trust closes.");
    }
  }

  // 3. Price signal from "what would you pay?".
  let priceHint: Verdict["priceHint"] = null;
  if (input.priceCents > 0 && input.wouldPay.length >= 5 && medianWouldPay !== null) {
    if (medianWouldPay < input.priceCents * 0.8) {
      const target = niceRound(medianWouldPay);
      priceHint = { minor: target, direction: "lower" };
      reasons.push(
        `Price check: reservers would pay about ${money(medianWouldPay)}. You asked ${money(input.priceCents)}.`,
      );
      moves.push(`Run a retrial at ${money(target)}.`);
    } else if (medianWouldPay >= input.priceCents * 1.25) {
      const target = niceRound(medianWouldPay);
      priceHint = { minor: target, direction: "higher" };
      reasons.push(
        `Underpriced? Reservers said they'd pay about ${money(medianWouldPay)}. You asked ${money(input.priceCents)}.`,
      );
      moves.push(`Next time, test ${money(target)}. You might be leaving money on the table.`);
    }
  }

  // 4. Which crowd converts best.
  let bestSource: Verdict["bestSource"] = null;
  if (outcome !== "more") {
    const eligible = input.sources.filter((s) => s.visitors >= 10);
    if (eligible.length >= 2) {
      const best = eligible
        .map((s) => ({ ...s, rate: s.reservations / s.visitors }))
        .sort((a, b) => b.rate - a.rate)[0];
      if (best.reservations >= 2 && best.rate > rate * 1.3) {
        bestSource = { source: best.source, rate: best.rate };
        const label = sourceLabel(best.source);
        reasons.push(`Your crowd is on ${label}: ${pct(best.rate)} reserved there vs ${pct(rate)} overall.`);
        moves.push(`Double down on ${label}. Post there again.`);
      }
    }
  }

  // 5. Friends are generous. Flag it.
  const warmVisitors = input.sources
    .filter((s) => s.source === "gc")
    .reduce((sum, s) => sum + s.visitors, 0);
  const warm = visitors >= MIN_VISITORS && warmVisitors / visitors > 0.6;
  if (warm && outcome === "ship") {
    reasons.push(
      "Heads up: most visitors came from group chats. Friends are generous, so get a few strangers to confirm before going big.",
    );
  }

  // 6. Default next moves per outcome.
  if (outcome === "ship") {
    moves.unshift(
      `Message your ${plural(reservations, "reserver")} within 48 hours while they're hot.`,
      "Make a small first batch. Don't overbuild.",
    );
    moves.push("Ask 3 reservers why they tapped, and use their words in your launch post.");
  } else if (outcome === "change") {
    moves.push("Change ONE thing (headline, price or photo) and run a retrial.");
  } else if (outcome === "kill") {
    moves.push("Don't polish this version. Change the offer or the audience.");
    moves.push("Ask 2–3 people who visited but didn't reserve: what would make it a yes?");
  } else {
    moves.push('Post the link in your story with a question sticker: "would you buy this?"');
    moves.push("Drop it in 3 group chats. Ask for honest reactions, not favours.");
    moves.push("Print the QR code and put it where your people hang out.");
  }

  return {
    outcome,
    confidence,
    score,
    rate,
    low,
    high,
    clickRate,
    closeRate,
    bar,
    title: OUTCOME_TITLE[outcome],
    summary: OUTCOME_SUMMARY[outcome],
    reasons,
    moves: Array.from(new Set(moves)).slice(0, 4),
    priceHint,
    bestSource,
    warm,
    stats: {
      visitors,
      clicks,
      reservations,
      medianWouldPay,
      wouldPayCount: input.wouldPay.length,
    },
  };
}

export const CONFIDENCE_COPY: Record<Confidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};
