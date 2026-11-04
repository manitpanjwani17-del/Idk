"use client";

import { useEffect, useState, type CSSProperties } from "react";

const COLORS = ["#c8ff2e", "#ff5da2", "#ffd23f", "#8fd3ff", "#b9a6ff", "#ff5a36", "#111111"];

interface Piece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  dx: number;
  spin: number;
  w: number;
  h: number;
  round: boolean;
}

function makePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    duration: 2.2 + Math.random() * 1.8,
    color: COLORS[id % COLORS.length],
    dx: (Math.random() - 0.5) * 240,
    spin: 360 + Math.random() * 720,
    w: 7 + Math.random() * 7,
    h: 10 + Math.random() * 10,
    round: Math.random() > 0.7,
  }));
}

/** Fires a burst of confetti every time `trigger` changes to a new truthy value. */
export function Confetti({ trigger, count = 90 }: { trigger: number; count?: number }) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (!trigger) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    setPieces(makePieces(count));
    const t = window.setTimeout(() => setPieces([]), 4600);
    return () => window.clearTimeout(t);
  }, [trigger, count]);

  if (!pieces.length) return null;
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
      aria-hidden="true"
    >
      {pieces.map((p) => (
        <span
          key={p.id}
          style={
            {
              position: "absolute",
              top: 0,
              left: `${p.left}%`,
              width: p.w,
              height: p.round ? p.w : p.h,
              background: p.color,
              borderRadius: p.round ? "999px" : "2px",
              border: "1.5px solid #111",
              animation: `confetti-fall ${p.duration}s cubic-bezier(.25,.6,.4,1) ${p.delay}s both`,
              "--dx": `${p.dx}px`,
              "--spin": `${p.spin}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
