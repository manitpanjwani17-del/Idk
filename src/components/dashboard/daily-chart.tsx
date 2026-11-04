"use client";

import { useState } from "react";

/**
 * Single-series daily bar chart (one per measure — visitors and reservations
 * live on different scales, so they get separate charts, never a dual axis).
 * Spec: 4px rounded data-ends on the baseline, surface gaps between bars, one
 * recessive gridline, the peak labelled, full-column hover targets.
 */
export function DailyBars({
  title,
  unit,
  color,
  values,
}: {
  title: string;
  unit: string;
  color: string;
  values: number[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...values);
  const peak = values.indexOf(Math.max(...values));
  const total = values.reduce((a, b) => a + b, 0);
  const plotH = 120;
  const showEvery = values.length > 8 ? 2 : 1;

  return (
    <figure className="min-w-0">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="font-bold">{title}</span>
        <span className="text-sm text-muted">
          {total} {unit} total
        </span>
      </figcaption>
      <div className="relative mt-3" onMouseLeave={() => setHover(null)}>
        {/* recessive gridline at the max */}
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-ink/10" style={{ height: plotH }} aria-hidden="true">
          <span className="absolute -top-2.5 right-0 bg-card pl-1 text-[0.68rem] font-semibold text-muted">{max}</span>
        </div>
        <div className="relative flex items-end gap-[3px]" style={{ height: plotH }} role="img" aria-label={`${title}: ${values.map((v, i) => `day ${i + 1} ${v}`).join(", ")}`}>
          {values.map((v, i) => {
            const h = v === 0 ? 2 : Math.max(4, (v / max) * (plotH - 14));
            return (
              <div
                key={i}
                className="relative flex h-full flex-1 cursor-default items-end justify-center"
                onMouseEnter={() => setHover(i)}
                onTouchStart={() => setHover(i)}
              >
                {i === peak && v > 0 && hover === null && (
                  <span className="absolute text-[0.7rem] font-bold" style={{ bottom: h + 4 }}>
                    {v}
                  </span>
                )}
                <div
                  className="w-full max-w-[44px] transition-opacity"
                  style={{
                    height: h,
                    background: v === 0 ? "rgb(17 17 17 / 0.12)" : color,
                    borderRadius: "4px 4px 0 0",
                    opacity: hover === null || hover === i ? 1 : 0.45,
                  }}
                />
                {hover === i && (
                  <div
                    className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-xs font-semibold text-paper shadow-brutal-sm"
                    style={{ bottom: h + 8 }}
                    role="tooltip"
                  >
                    Day {i + 1} · {v} {unit}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="border-t-2 border-ink" aria-hidden="true" />
        <div className="mt-1 flex gap-[3px]" aria-hidden="true">
          {values.map((_, i) => (
            <span key={i} className="flex-1 text-center text-[0.68rem] font-semibold text-muted">
              {i % showEvery === 0 ? `D${i + 1}` : ""}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}

export function DailyTable({ rows, reservedLabel }: { rows: Array<{ visitors: number; reservations: number }>; reservedLabel: string }) {
  return (
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer font-semibold underline underline-offset-2">View as table</summary>
      <table className="mt-2 w-full text-left">
        <thead>
          <tr className="border-b-2 border-ink">
            <th className="py-1.5 font-bold">Day</th>
            <th className="py-1.5 text-right font-bold">New visitors</th>
            <th className="py-1.5 text-right font-bold">{reservedLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-ink/10">
              <td className="py-1.5">Day {i + 1}</td>
              <td className="py-1.5 text-right tabular-nums">{r.visitors}</td>
              <td className="py-1.5 text-right tabular-nums">{r.reservations}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
