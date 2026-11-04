"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { etaLabel } from "@/lib/catalog";
import { api, copyText, storage, timeLeft } from "@/lib/client";
import { CURRENCY_SYMBOL, formatMoney, niceRound, parseMoney, type Currency } from "@/lib/money";
import { getTheme, themeStyle, type Theme } from "@/lib/themes";
import { Confetti } from "./confetti";

export interface TestPageData {
  slug: string | null;
  name: string;
  tagline: string;
  description: string;
  emoji: string;
  mode: "preorder" | "waitlist";
  priceCents: number;
  currency: Currency;
  perks: string[];
  cta: string;
  eta: string;
  theme: string;
  askPrice: boolean;
  imageUrl: string | null;
  status: "live" | "closed";
  endsAt: number | null;
  reservedCount: number;
}

type Variant = "public" | "preview";

const BUBBLES = [
  { left: 8, size: 26, dur: 14, delay: 0 },
  { left: 22, size: 14, dur: 11, delay: 3 },
  { left: 38, size: 34, dur: 17, delay: 6 },
  { left: 55, size: 18, dur: 12, delay: 1.5 },
  { left: 70, size: 28, dur: 15, delay: 8 },
  { left: 84, size: 16, dur: 10, delay: 4.5 },
  { left: 93, size: 22, dur: 13, delay: 10 },
];

const SPARKLES = [
  { left: 6, top: 12, size: 18, dur: 2.6, delay: 0 },
  { left: 88, top: 8, size: 24, dur: 3.2, delay: 0.8 },
  { left: 92, top: 38, size: 14, dur: 2.2, delay: 1.4 },
  { left: 4, top: 46, size: 22, dur: 3.6, delay: 0.4 },
  { left: 80, top: 66, size: 16, dur: 2.8, delay: 2 },
  { left: 12, top: 82, size: 20, dur: 3, delay: 1.1 },
];

function Effects({ theme }: { theme: Theme }) {
  // Fixed: covers the viewport on the live page, or the phone screen in a preview.
  const pos = "fixed";
  if (theme.effect === "grain") {
    return <div className={`grain pointer-events-none ${pos} inset-0 opacity-[0.12] mix-blend-overlay`} aria-hidden="true" />;
  }
  if (theme.effect === "bubbles") {
    return (
      <div className={`pointer-events-none ${pos} inset-0 overflow-hidden`} aria-hidden="true">
        {BUBBLES.map((b, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${b.left}%`,
              bottom: -40,
              width: b.size,
              height: b.size,
              borderRadius: 999,
              background: "rgba(255,255,255,0.6)",
              border: "2px solid rgba(59,11,64,0.12)",
              animation: `drift-up ${b.dur}s linear ${b.delay}s infinite`,
            }}
          />
        ))}
      </div>
    );
  }
  if (theme.effect === "sparkle") {
    return (
      <div className={`pointer-events-none ${pos} inset-0 overflow-hidden`} aria-hidden="true">
        {SPARKLES.map((s, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${s.left}%`,
              top: `${s.top}%`,
              fontSize: s.size,
              color: "var(--t-accent)",
              animation: `twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
            }}
          >
            ✦
          </span>
        ))}
      </div>
    );
  }
  return null;
}

function priceLines(data: TestPageData) {
  const price = data.priceCents > 0 ? formatMoney(data.priceCents, data.currency) : "Free";
  const note =
    data.mode === "preorder"
      ? "pre-order price · pay nothing today"
      : data.priceCents > 0
        ? "expected price · joining is free"
        : "free to join";
  return { price, note };
}

function faqs(data: TestPageData) {
  return [
    {
      q: "Is this real?",
      a: "Yes. It's a real idea from a real person, still pre-launch. If enough people are in, it gets made and you hear first.",
    },
    {
      q: "Do I pay anything now?",
      a:
        data.mode === "preorder"
          ? "No. Reserving is free. You'll get the launch link (and the early-bird price) when it drops."
          : "No. Joining the waitlist is free.",
    },
    { q: "When does it drop?", a: `${etaLabel(data.eta)}, if enough people are in.` },
    {
      q: "What happens to my email?",
      a: "Only the creator sees it, and only to tell you when it launches. No spam, no selling it.",
    },
  ];
}

function sourceTag(): string | undefined {
  try {
    return new URLSearchParams(window.location.search).get("s") ?? undefined;
  } catch {
    return undefined;
  }
}

export function TestPage({
  data,
  variant,
  isOwner = false,
  ownerHref,
}: {
  data: TestPageData;
  variant: Variant;
  isOwner?: boolean;
  ownerHref?: string;
}) {
  const theme = getTheme(data.theme);
  const contained = variant === "preview";
  const live = data.status === "live";
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reserved, setReserved] = useState<{ position: number } | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const tracked = useRef(false);
  const { price, note } = priceLines(data);
  const headingFont = theme.font === "serif" ? "font-serif font-normal tracking-tight" : "font-display font-extrabold tracking-tight";
  const Title = variant === "public" ? "h1" : "h2";

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (variant !== "public" || !data.slug) return;
    const saved = storage.get(`validly:reserved:${data.slug}`);
    if (saved) {
      try {
        setReserved(JSON.parse(saved) as { position: number });
      } catch {
        storage.remove(`validly:reserved:${data.slug}`);
      }
    }
    if (tracked.current || isOwner || !live) return;
    tracked.current = true;
    void api("/api/track", {
      body: { slug: data.slug, type: "view", source: sourceTag(), referrer: document.referrer || undefined },
    });
  }, [variant, data.slug, isOwner, live]);

  function openSheet() {
    setSheetOpen(true);
    if (variant === "public" && data.slug && !isOwner && live) {
      void api("/api/track", {
        body: { slug: data.slug, type: "click", source: sourceTag(), referrer: document.referrer || undefined },
      });
    }
  }

  const ctaLabel = data.mode === "preorder" && data.priceCents > 0 ? `${data.cta} · ${price}` : data.cta;
  const closesIn = now && data.endsAt && live ? timeLeft(data.endsAt - now) : null;

  return (
    <div
      className={`relative isolate ${contained ? "min-h-full" : "min-h-dvh"} w-full`}
      style={{ ...themeStyle(theme), background: "var(--t-end)", color: "var(--t-text)" } as CSSProperties}
    >
      {/* Background pinned to the viewport (or phone screen) so the bottom colour is always --t-end. */}
      <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: "var(--t-bg)" }} aria-hidden="true" />
      <Effects theme={theme} />

      {variant === "public" && isOwner && (
        <div className="relative z-10 border-b-2 border-ink bg-sun px-4 py-2.5 text-center text-sm font-semibold text-ink">
          👀 This is your page. Your visits don&apos;t count and reserving here is just a preview.{" "}
          {ownerHref && (
            <Link href={ownerHref} className="underline underline-offset-2">
              Back to your dashboard
            </Link>
          )}
        </div>
      )}

      <main className="relative mx-auto w-full max-w-md px-5 pb-8 pt-5">
        <div className="flex items-center justify-between gap-2 text-xs font-bold">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ background: "var(--t-chip)", border: "1.5px solid var(--t-border)" }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: live ? "var(--t-accent)" : "var(--t-muted)" }}
              aria-hidden="true"
            />
            {live ? "PRE-LAUNCH" : "TEST CLOSED"}
          </span>
          {closesIn && (
            <span className="rounded-full px-3 py-1.5" style={{ background: "var(--t-chip)", border: "1.5px solid var(--t-border)" }}>
              closes in {closesIn}
            </span>
          )}
        </div>

        <div className="mt-5">
          {data.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.imageUrl}
              alt={data.name}
              className="aspect-square w-full rounded-[28px] object-cover"
              style={{ border: "2px solid var(--t-border)" }}
            />
          ) : (
            <div
              className="flex aspect-[4/3] w-full items-center justify-center rounded-[28px]"
              style={{ background: "var(--t-surface)", border: "2px solid var(--t-border)" }}
            >
              <span className="animate-float select-none text-[7.5rem] leading-none" style={{ "--r": "-6deg" } as CSSProperties}>
                {data.emoji}
              </span>
            </div>
          )}
        </div>

        {/* Previews sit inside other pages, so only the live page gets the h1. */}
        <Title className={`mt-6 text-[2.35rem] leading-[1.02] break-words ${headingFont}`}>{data.name || "Your idea"}</Title>
        <p className="mt-3 text-lg leading-snug" style={{ color: "var(--t-text)" }}>
          {data.tagline || "Your one-line pitch goes here."}
        </p>

        <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-2">
          <span className={`text-4xl leading-none ${headingFont}`}>{price}</span>
          <span className="pb-1 text-sm" style={{ color: "var(--t-muted)" }}>
            {note}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
          <span className="rounded-full px-3 py-1.5" style={{ background: "var(--t-chip)", border: "1.5px solid var(--t-border)" }}>
            🗓 Drops: {etaLabel(data.eta)}
          </span>
          {data.reservedCount >= 10 && (
            <span className="rounded-full px-3 py-1.5" style={{ background: "var(--t-chip)", border: "1.5px solid var(--t-border)" }}>
              🔥 {data.reservedCount} {data.mode === "preorder" ? "reserved" : "joined"}
            </span>
          )}
        </div>

        {data.perks.filter(Boolean).length > 0 && (
          <ul className="mt-6 space-y-2.5">
            {data.perks.filter(Boolean).map((perk, i) => (
              <li
                key={`${perk}-${i}`}
                className="flex items-start gap-3 rounded-2xl px-4 py-3 font-medium"
                style={{ background: "var(--t-surface)", border: "1.5px solid var(--t-border)" }}
              >
                <span style={{ color: "var(--t-accent)" }} aria-hidden="true" className="mt-px">
                  ✦
                </span>
                <span>{perk}</span>
              </li>
            ))}
          </ul>
        )}

        {data.description && (
          <p className="mt-6 whitespace-pre-line text-[1.02rem] leading-relaxed" style={{ color: "var(--t-text)" }}>
            {data.description}
          </p>
        )}

        <div className="mt-8 space-y-2">
          {faqs(data).map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl px-4 py-3"
              style={{ background: "var(--t-surface)", border: "1.5px solid var(--t-border)" }}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="mt-2 text-[0.95rem] leading-relaxed" style={{ color: "var(--t-muted)" }}>
                {f.a}
              </p>
            </details>
          ))}
        </div>

        <footer className="mt-10 space-y-2 text-center text-xs" style={{ color: "var(--t-muted)" }}>
          <p>Pre-launch demand test. Nobody is charged.</p>
          <p>
            <Link href="/" className="font-bold underline underline-offset-2" style={{ color: "var(--t-text)" }}>
              Made with Validly
            </Link>
            {" · "}
            {variant === "public" ? (
              <button type="button" onClick={() => setReportOpen(true)} className="underline underline-offset-2">
                Report this page
              </button>
            ) : (
              <span>Report this page</span>
            )}
          </p>
        </footer>
      </main>

      <div
        className="sticky bottom-0 z-20 w-full"
        style={{
          paddingBottom: contained ? 0 : "env(safe-area-inset-bottom)",
          background: "linear-gradient(to top, var(--t-end) 62%, color-mix(in srgb, var(--t-end) 0%, transparent))",
        }}
      >
        <div className="mx-auto w-full max-w-md px-4 pb-4 pt-6">
          {!live ? (
            <div
              className="rounded-2xl px-4 py-3.5 text-center text-sm font-semibold"
              style={{ background: "var(--t-surface)", border: "2px solid var(--t-border)", backdropFilter: "blur(8px)" }}
            >
              {reserved
                ? "You're on the list. You'll hear first when it drops ✓"
                : "This drop test has wrapped. Thanks for the interest!"}
            </div>
          ) : reserved && !isOwner ? (
            <div
              className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
              style={{ background: "var(--t-surface)", border: "2px solid var(--t-border)", backdropFilter: "blur(8px)" }}
            >
              <span className="text-sm font-bold">
                ✓ You&apos;re on the list{reserved.position ? ` (#${reserved.position})` : ""}
              </span>
              <button type="button" onClick={openSheet} className="text-sm font-semibold underline underline-offset-2">
                Change email
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openSheet}
              className="w-full rounded-2xl px-5 py-4 text-[1.05rem] font-extrabold shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition-transform active:scale-[0.98]"
              style={{ background: "var(--t-accent)", color: "var(--t-accent-text)", border: "2px solid var(--t-border)" }}
            >
              {ctaLabel}
            </button>
          )}
        </div>
      </div>

      {sheetOpen && (
        <ReserveSheet
          data={data}
          variant={variant}
          contained={contained}
          headingFont={headingFont}
          onClose={() => setSheetOpen(false)}
          onReserved={(position) => setReserved({ position })}
        />
      )}
      {reportOpen && data.slug && <ReportDialog slug={data.slug} onClose={() => setReportOpen(false)} />}
    </div>
  );
}

function payOptions(priceCents: number): number[] {
  if (priceCents <= 0) return [];
  const raw = [0.5, 0.75, 1, 1.5].map((m) => (m === 1 ? priceCents : niceRound(priceCents * m)));
  return Array.from(new Set(raw)).sort((a, b) => a - b);
}

function ReserveSheet({
  data,
  variant,
  contained,
  headingFont,
  onClose,
  onReserved,
}: {
  data: TestPageData;
  variant: Variant;
  contained: boolean;
  headingFont: string;
  onClose: () => void;
  onReserved: (position: number) => void;
}) {
  const [email, setEmail] = useState("");
  const [pay, setPay] = useState<number | "other" | null>(null);
  const [customPay, setCustomPay] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ position: number; preview?: boolean; already?: boolean; updated?: boolean } | null>(
    null,
  );
  const [burst, setBurst] = useState(0);
  const [shared, setShared] = useState<string | null>(null);
  const options = payOptions(data.priceCents);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    if (contained) return () => window.removeEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [contained, onClose]);

  function wouldPayValue(): number | null {
    if (!data.askPrice) return null;
    if (pay === "other") return parseMoney(customPay);
    return typeof pay === "number" ? pay : null;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const clean = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) {
      setError("That email doesn't look right.");
      return;
    }
    if (pay === "other" && customPay && parseMoney(customPay) === null) {
      setError("Enter a number for the price, or skip it.");
      return;
    }
    if (variant === "preview" || !data.slug) {
      setResult({ position: Math.max(1, data.reservedCount + 1), preview: true });
      setBurst(Date.now());
      return;
    }
    setBusy(true);
    const res = await api<{ position: number; preview?: boolean; already?: boolean; updated?: boolean }>("/api/reserve", {
      body: {
        slug: data.slug,
        email: clean,
        wouldPay: wouldPayValue(),
        source: sourceTag(),
        referrer: document.referrer || undefined,
      },
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setResult(res.data);
    if (!res.data.preview) {
      storage.set(`validly:reserved:${data.slug}`, JSON.stringify({ position: res.data.position }));
      onReserved(res.data.position);
    }
    setBurst(Date.now());
  }

  async function share() {
    const url = `${window.location.origin}/t/${data.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: data.name, text: data.tagline, url });
        return;
      } catch {
        // cancelled — fall through to copy
      }
    }
    setShared((await copyText(url)) ? "Link copied!" : url);
  }

  const verb = data.mode === "preorder" ? "reserve" : "join";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={data.mode === "preorder" ? "Reserve" : "Join the waitlist"}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/45 animate-[fade-in_0.2s_ease]"
        onClick={onClose}
      />
      <Confetti trigger={burst} count={70} />
      <div
        className="relative w-full max-w-md rounded-t-[28px] px-5 pb-6 pt-3 animate-[sheet-up_0.28s_cubic-bezier(0.2,0.9,0.3,1)]"
        style={{
          background: "var(--t-surface-solid, #fff)",
          color: "#111",
          paddingBottom: contained ? undefined : "calc(1.5rem + env(safe-area-inset-bottom))",
        }}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-black/15" aria-hidden="true" />
        {result ? (
          <div className="py-2 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink bg-lime text-3xl shadow-brutal">
              ✓
            </div>
            <h2 className={`mt-4 text-2xl ${headingFont}`}>
              {result.already ? "You're already in!" : result.updated ? "Email updated!" : "You're in!"}
            </h2>
            {result.preview ? (
              <p className="mt-2 text-sm text-black/70">
                Preview only. Nothing was recorded. This is what visitors will see.
              </p>
            ) : (
              <p className="mt-2 text-[0.95rem] text-black/70">
                {result.position ? (
                  <>
                    You&apos;re <b className="text-black">#{result.position}</b> on the list.{" "}
                  </>
                ) : null}
                No payment taken. You&apos;ll hear first when {data.name} drops.
              </p>
            )}
            <div className="mt-5 rounded-2xl border-2 border-dashed border-black/20 p-4">
              <p className="text-sm font-semibold">Know someone who&apos;d want this?</p>
              <button
                type="button"
                onClick={share}
                disabled={variant === "preview"}
                className="btn btn-sm mt-3"
              >
                Send it to them ↗
              </button>
              {shared && <p className="mt-2 break-all text-xs text-black/60">{shared}</p>}
            </div>
            <button type="button" onClick={onClose} className="mt-4 text-sm font-semibold underline underline-offset-2">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <h2 className={`text-2xl leading-tight ${headingFont}`}>
              {data.mode === "preorder" ? `Reserve ${data.name}` : `Join the ${data.name} waitlist`}
            </h2>
            <p className="mt-1 text-sm text-black/65">
              {data.mode === "preorder"
                ? "No payment today. You'll get first dibs and the launch link."
                : "Free. You'll hear first when it drops."}
            </p>

            <label htmlFor="reserve-email" className="label-mono mt-5 block">
              Your email
            </label>
            <input
              id="reserve-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input mt-1.5"
              aria-invalid={error ? true : undefined}
            />

            {data.askPrice && (
              <fieldset className="mt-5">
                <legend className="label-mono">What would you honestly pay? (optional)</legend>
                {options.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {options.map((o) => (
                      <button
                        key={o}
                        type="button"
                        className="chip"
                        aria-pressed={pay === o}
                        onClick={() => setPay(pay === o ? null : o)}
                      >
                        {formatMoney(o, data.currency)}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="chip"
                      aria-pressed={pay === "other"}
                      onClick={() => setPay(pay === "other" ? null : "other")}
                    >
                      Other
                    </button>
                  </div>
                ) : null}
                {(options.length === 0 || pay === "other") && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-bold">{CURRENCY_SYMBOL[data.currency]}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={customPay}
                      onChange={(e) => {
                        setCustomPay(e.target.value);
                        if (options.length === 0) setPay("other");
                      }}
                      placeholder="e.g. 20"
                      className="input"
                      aria-label="Amount you'd pay"
                    />
                  </div>
                )}
              </fieldset>
            )}

            {error && (
              <p className="mt-3 rounded-xl bg-tomato/15 px-3 py-2 text-sm font-semibold text-[#a3260f]" role="alert">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn btn-ink btn-lg mt-5 w-full">
              {busy ? "Saving your spot…" : data.mode === "preorder" ? "Reserve my spot" : "Join the waitlist"}
            </button>
            <p className="mt-3 text-center text-xs text-black/55">
              Only the creator sees your email. They&apos;ll use it to tell you when it&apos;s out. You can {verb} once.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

function ReportDialog({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [reason, setReason] = useState<"scam" | "offensive" | "spam" | "other" | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const reasons = [
    { id: "scam", label: "Looks like a scam" },
    { id: "offensive", label: "Offensive or hateful" },
    { id: "spam", label: "Spam" },
    { id: "other", label: "Something else" },
  ] as const;

  async function send() {
    if (!reason) return;
    setState("busy");
    const res = await api("/api/report", { body: { slug, reason } });
    if (!res.ok) {
      setError(res.error);
      setState("idle");
      return;
    }
    setState("done");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Report page">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="card relative w-full max-w-sm p-5 text-ink">
        {state === "done" ? (
          <>
            <h2 className="font-display text-xl font-extrabold">Thanks for flagging</h2>
            <p className="mt-2 text-sm text-muted">We&apos;ll take a look. Pages with several reports get hidden automatically.</p>
            <button type="button" className="btn btn-ink mt-4 w-full" onClick={onClose}>
              Close
            </button>
          </>
        ) : (
          <>
            <h2 className="font-display text-xl font-extrabold">Report this page</h2>
            <div className="mt-4 grid gap-2" role="radiogroup" aria-label="Reason">
              {reasons.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={reason === r.id}
                  className="chip justify-start"
                  onClick={() => setReason(r.id)}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {error && <p className="mt-3 text-sm font-semibold text-[#a3260f]">{error}</p>}
            <div className="mt-5 flex gap-2">
              <button type="button" className="btn btn-ghost flex-1" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="btn btn-tomato flex-1" disabled={!reason || state === "busy"} onClick={send}>
                {state === "busy" ? "Sending…" : "Report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
