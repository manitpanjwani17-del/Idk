"use client";

import { useState } from "react";
import { CURRENCY_SYMBOL, formatMoney } from "@/lib/money";
import { getBar, pct, type Mode } from "@/lib/verdict";
import { LeanMeter } from "./verdict-ui";

const STEPS = [0, 5, 10, 15, 20, 25, 35, 50, 75, 100, 150, 250, 400, 600, 1000];

/** Interactive explainer: drag a price, see what it takes to get SHIP IT. */
export function BarExplorer() {
  const [step, setStep] = useState(5);
  const [mode, setMode] = useState<Mode>("preorder");
  const priceCents = (mode === "preorder" ? Math.max(5, STEPS[step]) : STEPS[step]) * 100;
  const bar = getBar(priceCents, "USD", mode);
  const shipPer100 = Math.ceil(bar.ship * 100);
  const killPer100 = Math.ceil(bar.kill * 100);

  return (
    <div className="card overflow-hidden">
      <div className="grid gap-0 md:grid-cols-[1.1fr_1fr]">
        <div className="border-b-2 border-ink p-5 sm:p-7 md:border-b-0 md:border-r-2">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Type of test">
            {(["preorder", "waitlist"] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} className="chip" onClick={() => setMode(m)}>
                {m === "preorder" ? "Pre-order" : "Waitlist"}
              </button>
            ))}
          </div>
          <label htmlFor="bar-price" className="label-mono mt-6 block">
            Your price
          </label>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="font-display text-5xl font-extrabold">
              {mode === "waitlist" && priceCents === 0 ? "Free" : `${CURRENCY_SYMBOL.USD}${priceCents / 100}`}
            </span>
            <span className="text-sm font-semibold text-muted">{bar.band}</span>
          </div>
          <input
            id="bar-price"
            type="range"
            min={0}
            max={STEPS.length - 1}
            value={step}
            onChange={(e) => setStep(Number(e.target.value))}
            className="mt-4 w-full accent-[#111]"
            aria-valuetext={formatMoney(priceCents, "USD")}
          />
          <p className="mt-3 text-sm text-muted">
            Selling in ₹, €, £ or A$? We convert first, so the bar always matches the real value.
          </p>
        </div>
        <div className="bg-paper-2 p-5 sm:p-7">
          <p className="label-mono">Out of every 100 visitors</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border-2 border-ink bg-lime p-4">
              <p className="font-display text-4xl font-extrabold">{shipPer100}+</p>
              <p className="mt-1 text-sm font-bold">reserve → SHIP IT</p>
            </div>
            <div className="rounded-2xl border-2 border-ink bg-tomato p-4">
              <p className="font-display text-4xl font-extrabold">&lt;{killPer100}</p>
              <p className="mt-1 text-sm font-bold">reserve → KILL IT</p>
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold">Anything in between: CHANGE IT.</p>
          <div className="mt-8">
            <LeanMeter rate={bar.ship * 0.7} bar={bar} />
          </div>
          <p className="mt-2 text-xs text-muted">
            Ship bar {pct(bar.ship)} · kill line {pct(bar.kill)}. Cheaper things should convert better, so the bar is higher.
          </p>
        </div>
      </div>
    </div>
  );
}
