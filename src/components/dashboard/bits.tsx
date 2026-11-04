import type { ReactNode } from "react";
import type { Outcome } from "@/lib/verdict";
import { OUTCOME_STYLE } from "../verdict-ui";

export function StatusChip({ status, outcome, hidden }: { status: "live" | "closed"; outcome?: Outcome | null; hidden?: boolean }) {
  if (hidden) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-tomato px-2.5 py-0.5 text-xs font-extrabold">
        HIDDEN
      </span>
    );
  }
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-ink px-2.5 py-0.5 text-xs font-extrabold text-lime">
        <span className="h-2 w-2 animate-pulse-dot rounded-full bg-lime" aria-hidden="true" />
        LIVE
      </span>
    );
  }
  const style = outcome ? OUTCOME_STYLE[outcome] : null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-extrabold ${style?.bg ?? "bg-card"}`}>
      {style ? style.label : "CLOSED"}
    </span>
  );
}

export function StatTile({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: ReactNode; accent?: string }) {
  return (
    <div className={`rounded-2xl border-2 border-ink p-4 ${accent ?? "bg-card"}`}>
      <p className="label-mono text-ink-2">{label}</p>
      <p className="mt-1 font-display text-3xl font-extrabold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs font-semibold text-ink-2">{sub}</p>}
    </div>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const p = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm font-semibold">
        <span>{label}</span>
        <span className="tabular-nums">
          {value} / {max}
        </span>
      </div>
      <div className="mt-1.5 h-3 overflow-hidden rounded-full border-2 border-ink bg-card" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
        <div className="h-full rounded-full bg-ink transition-[width] duration-700" style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

export function TestThumb({ emoji, imageUrl, size = 56 }: { emoji: string; imageUrl: string | null; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-ink bg-paper-2"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{emoji}</span>
      )}
    </div>
  );
}

export function timeLeftServer(ms: number): string {
  if (ms <= 0) return "ending now";
  const m = Math.floor(ms / 60_000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m % 60}m left`;
  return `${Math.max(1, m % 60)}m left`;
}
