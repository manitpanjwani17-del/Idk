import type { Bar, Confidence, Outcome } from "@/lib/verdict";
import { pct } from "@/lib/verdict";

export const OUTCOME_STYLE: Record<Outcome, { bg: string; text: string; label: string; emoji: string; hex: string }> = {
  ship: { bg: "bg-lime", text: "text-ink", label: "SHIP IT", emoji: "🚀", hex: "#c8ff2e" },
  change: { bg: "bg-sun", text: "text-ink", label: "CHANGE IT", emoji: "🛠️", hex: "#ffd23f" },
  kill: { bg: "bg-tomato", text: "text-ink", label: "KILL IT", emoji: "🪦", hex: "#ff5a36" },
  more: { bg: "bg-lilac", text: "text-ink", label: "NEED MORE DATA", emoji: "🔍", hex: "#b9a6ff" },
};

export function Stamp({
  outcome,
  className = "",
  animate = false,
}: {
  outcome: Outcome;
  className?: string;
  animate?: boolean;
}) {
  return (
    <span className={`stamp ${animate ? "animate-slam" : ""} ${className}`} aria-label={OUTCOME_STYLE[outcome].label}>
      {OUTCOME_STYLE[outcome].label}
    </span>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const dots = confidence === "high" ? 3 : confidence === "medium" ? 2 : 1;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-card px-2.5 py-1 text-xs font-bold">
      <span className="flex gap-0.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`h-2 w-2 rounded-full border border-ink ${i < dots ? "bg-ink" : "bg-transparent"}`} />
        ))}
      </span>
      {confidence === "high" ? "High" : confidence === "medium" ? "Medium" : "Low"} confidence
    </span>
  );
}

/** Where the conversion rate sits between the kill line and the ship bar. */
export function LeanMeter({ rate, bar, compact = false }: { rate: number; bar: Bar; compact?: boolean }) {
  const max = Math.max(bar.ship * 1.75, rate * 1.15, 0.05);
  const at = (x: number) => `${Math.min(100, Math.max(0, (x / max) * 100))}%`;
  return (
    <div className={compact ? "" : "pt-1"}>
      <div
        className="relative h-5 overflow-hidden rounded-full border-2 border-ink"
        role="img"
        aria-label={`Conversion ${pct(rate)}. Kill line ${pct(bar.kill)}, ship bar ${pct(bar.ship)}.`}
      >
        <div className="absolute inset-y-0 left-0 bg-tomato" style={{ width: at(bar.kill) }} />
        <div className="absolute inset-y-0 bg-sun" style={{ left: at(bar.kill), width: `calc(${at(bar.ship)} - ${at(bar.kill)})` }} />
        <div className="absolute inset-y-0 right-0 bg-lime" style={{ left: at(bar.ship) }} />
        <div className="absolute inset-y-0 w-px bg-ink/40" style={{ left: at(bar.kill) }} />
        <div className="absolute inset-y-0 w-px bg-ink/40" style={{ left: at(bar.ship) }} />
      </div>
      <div className="relative h-0">
        <div
          className="absolute -top-[30px] flex -translate-x-1/2 flex-col items-center transition-[left] duration-700"
          style={{ left: at(rate) }}
        >
          <span className="h-[34px] w-[5px] rounded-full border-2 border-ink bg-card shadow-brutal-sm" />
        </div>
      </div>
      {!compact && (
        // A legend instead of labels pinned to the ticks: pinned labels collide when the scale stretches.
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-bold">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border-2 border-ink bg-tomato" aria-hidden="true" />
            Kill under {pct(bar.kill)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border-2 border-ink bg-sun" aria-hidden="true" />
            Change in between
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border-2 border-ink bg-lime" aria-hidden="true" />
            Ship at {pct(bar.ship)}+
          </span>
        </div>
      )}
    </div>
  );
}
