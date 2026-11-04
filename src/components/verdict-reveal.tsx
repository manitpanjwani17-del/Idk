"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { copyText } from "@/lib/client";
import { aBand, pct, type Verdict } from "@/lib/verdict";
import { Confetti } from "./confetti";
import { ConfidenceBadge, LeanMeter, OUTCOME_STYLE, Stamp } from "./verdict-ui";

export interface RevealTest {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  cta: string;
  mode: "preorder" | "waitlist";
  cardPublic: boolean;
}

function CountUp({ to, duration = 1000 }: { to: number; duration?: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setValue(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{value}</>;
}

interface Slide {
  key: string;
  bg: string;
  text: string;
  ms: number | null; // auto-advance after ms, null = stays
  body: ReactNode;
}

export function VerdictReveal({ test, verdict, origin }: { test: RevealTest; verdict: Verdict; origin: string }) {
  const [i, setI] = useState(0);
  const [burst, setBurst] = useState(0);
  const [copied, setCopied] = useState(false);
  const finalRef = useRef<HTMLDivElement>(null);
  const s = verdict.stats;
  const style = OUTCOME_STYLE[verdict.outcome];
  const noun = test.mode === "waitlist" ? "joined the waitlist" : "reserved";

  const slides: Slide[] = [
    {
      key: "intro",
      bg: "bg-ink",
      text: "text-paper",
      ms: 2400,
      body: (
        <>
          <span className="animate-float text-8xl" aria-hidden="true">
            {test.emoji}
          </span>
          <p className="mt-8 font-display text-3xl font-extrabold leading-tight sm:text-5xl">
            The verdict for <span className="text-lime">{test.name}</span> is in.
          </p>
          <p className="mt-4 text-paper/70">Let&apos;s see what people said…</p>
        </>
      ),
    },
    {
      key: "visitors",
      bg: "bg-sky",
      text: "text-ink",
      ms: 2600,
      body: (
        <>
          <p className="font-display text-[7rem] font-extrabold leading-none sm:text-[10rem]">
            <CountUp to={s.visitors} />
          </p>
          <p className="mt-4 text-2xl font-bold">{s.visitors === 1 ? "person saw your page" : "people saw your page"}</p>
        </>
      ),
    },
    {
      key: "clicks",
      bg: "bg-pink",
      text: "text-ink",
      ms: 2600,
      body: (
        <>
          <p className="font-display text-[7rem] font-extrabold leading-none sm:text-[10rem]">
            <CountUp to={s.clicks} />
          </p>
          <p className="mt-4 text-2xl font-bold">tapped &ldquo;{test.cta}&rdquo;</p>
        </>
      ),
    },
    {
      key: "reservations",
      bg: "bg-lilac",
      text: "text-ink",
      ms: 2600,
      body: (
        <>
          <p className="font-display text-[7rem] font-extrabold leading-none sm:text-[10rem]">
            <CountUp to={s.reservations} />
          </p>
          <p className="mt-4 text-2xl font-bold">{noun}</p>
        </>
      ),
    },
    {
      key: "rate",
      bg: "bg-paper",
      text: "text-ink",
      ms: 3600,
      body: (
        <div className="w-full max-w-lg">
          <p className="font-display text-7xl font-extrabold sm:text-8xl">{pct(verdict.rate)}</p>
          <p className="mt-3 text-xl font-bold">converted</p>
          <div className="mt-12 text-left">
            <LeanMeter rate={verdict.rate} bar={verdict.bar} />
          </div>
          <p className="mt-6 text-ink-2">
            For {aBand(verdict.bar.band)}, the ship bar is {pct(verdict.bar.ship)} and the kill line is {pct(verdict.bar.kill)}.
          </p>
        </div>
      ),
    },
    {
      key: "drumroll",
      bg: "bg-ink",
      text: "text-paper",
      ms: 1900,
      body: (
        <p className="font-display text-4xl font-extrabold sm:text-6xl">
          And the verdict is
          <span className="inline-flex gap-1 pl-1" aria-hidden="true">
            {[0, 1, 2].map((d) => (
              <span key={d} className="animate-bounce" style={{ animationDelay: `${d * 0.15}s` }}>
                .
              </span>
            ))}
          </span>
        </p>
      ),
    },
    {
      key: "final",
      bg: style.bg,
      text: "text-ink",
      ms: null,
      body: null,
    },
  ];

  const last = slides.length - 1;
  const current = slides[i];
  const go = useCallback((n: number) => setI(Math.max(0, Math.min(last, n))), [last]);

  useEffect(() => {
    if (current.ms === null) return;
    const t = window.setTimeout(() => go(i + 1), current.ms);
    return () => window.clearTimeout(t);
  }, [i, current.ms, go]);

  useEffect(() => {
    if (i === last && verdict.outcome === "ship") setBurst(Date.now());
    if (i === last) finalRef.current?.scrollTo({ top: 0 });
  }, [i, last, verdict.outcome]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") go(i + 1);
      if (e.key === "ArrowLeft") go(i - 1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [i, go]);

  async function copyCard() {
    const ok = await copyText(`${origin}/v/${test.slug}`);
    setCopied(ok);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`fixed inset-0 z-[80] ${current.bg} ${current.text} transition-colors duration-500`} role="dialog" aria-modal="true" aria-label="Verdict reveal">
      <Confetti trigger={burst} count={140} />
      {/* story progress */}
      <div className="absolute inset-x-0 top-0 z-20 flex gap-1.5 px-4 pt-[max(12px,env(safe-area-inset-top))]">
        {slides.map((sl, n) => (
          <span
            key={sl.key}
            className="h-1.5 flex-1 overflow-hidden rounded-full"
            style={{ backgroundColor: "color-mix(in srgb, currentColor 25%, transparent)" }}
          >
            <span
              className="block h-full rounded-full bg-current"
              style={
                n < i || (n === i && !sl.ms)
                  ? { width: "100%" }
                  : n === i
                    ? { width: "0%", animation: `story-fill ${sl.ms}ms linear forwards` }
                    : { width: "0%" }
              }
            />
          </span>
        ))}
      </div>
      <div className="absolute right-3 top-[calc(max(12px,env(safe-area-inset-top))+14px)] z-20 flex gap-2">
        {i < last && (
          <button type="button" className="rounded-full border-2 border-current px-3 py-1 text-sm font-bold" onClick={() => go(last)}>
            Skip
          </button>
        )}
        <Link href={`/dashboard/${test.id}`} className="rounded-full border-2 border-current px-3 py-1 text-sm font-bold" aria-label="Close">
          ✕
        </Link>
      </div>

      {i < last ? (
        <>
          <div key={current.key} className="flex h-full flex-col items-center justify-center px-6 text-center animate-rise">
            {current.body}
          </div>
          {/* tap zones */}
          <button type="button" aria-label="Previous" className="absolute inset-y-16 left-0 z-10 w-1/3" onClick={() => go(i - 1)} />
          <button type="button" aria-label="Next" className="absolute inset-y-16 right-0 z-10 w-2/3" onClick={() => go(i + 1)} />
          <p className="pointer-events-none absolute inset-x-0 bottom-6 text-center text-xs font-semibold opacity-60">Tap to continue</p>
        </>
      ) : (
        <div ref={finalRef} className="h-full overflow-y-auto">
          <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center px-5 pb-16 pt-24 text-center">
            <p className="label-mono">{test.name}</p>
            <div className={`mt-10 ${verdict.outcome === "kill" ? "animate-shake" : ""}`}>
              <Stamp outcome={verdict.outcome} animate className="text-5xl sm:text-7xl" />
            </div>
            <p className="mt-12 font-display text-2xl font-extrabold sm:text-3xl">{verdict.summary}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <ConfidenceBadge confidence={verdict.confidence} />
              <span className="rounded-full border-2 border-ink bg-card px-2.5 py-1 text-xs font-bold">Hype score {verdict.score}/100</span>
            </div>

            <div className="card mt-10 w-full p-6 text-left">
              <h2 className="label-mono">Why</h2>
              <ul className="mt-3 space-y-2.5">
                {verdict.reasons.map((r) => (
                  <li key={r} className="flex gap-2 leading-snug">
                    <span aria-hidden="true">→</span>
                    {r}
                  </li>
                ))}
              </ul>
              <h2 className="label-mono mt-6">Your next moves</h2>
              <ol className="mt-3 space-y-2.5">
                {verdict.moves.map((m, n) => (
                  <li key={m} className="flex gap-2.5 leading-snug">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-lime text-xs font-extrabold">
                      {n + 1}
                    </span>
                    {m}
                  </li>
                ))}
              </ol>
            </div>

            <div className="card mt-6 w-full p-6 text-left">
              <h2 className="font-display text-lg font-extrabold">Post your verdict</h2>
              <p className="mt-1 text-sm text-ink-2">Story-sized for IG and TikTok. Building in public gets you your first customers.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={`/api/card/${test.slug}?format=story&download=1`} className="btn btn-ink btn-sm">
                  ⬇ Story image
                </a>
                <a href={`/api/card/${test.slug}?format=wide&download=1`} className="btn btn-sm">
                  ⬇ Post image
                </a>
                {test.cardPublic && (
                  <button type="button" className="btn btn-sm" onClick={copyCard}>
                    {copied ? "Copied!" : "Copy card link"}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {verdict.outcome !== "ship" && (
                <Link href={`/new?from=${test.id}`} className="btn btn-pink">
                  {verdict.outcome === "more" ? "Try a new version" : "Run a retrial →"}
                </Link>
              )}
              <Link href={`/dashboard/${test.id}`} className="btn">
                Back to dashboard
              </Link>
              <button type="button" className="btn btn-ghost" onClick={() => go(0)}>
                ↺ Replay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
