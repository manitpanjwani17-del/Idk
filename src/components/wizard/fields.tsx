"use client";

import { useRef, useState, type ReactNode } from "react";
import { CATEGORIES, CTA_OPTIONS, DURATIONS, EMOJIS, ETAS, TARGETS, suggestTaglines } from "@/lib/catalog";
import { processImage, priceCents, withCategory, withMode, type Draft, type FieldErrors } from "@/lib/draft";
import { CURRENCIES, CURRENCY_SYMBOL, formatMoney, type Currency } from "@/lib/money";
import { THEMES, type ThemeId } from "@/lib/themes";
import { getBar, pct } from "@/lib/verdict";

export type SetDraft = (update: Partial<Draft> | ((d: Draft) => Draft)) => void;

interface StepProps {
  d: Draft;
  set: SetDraft;
  errors: FieldErrors;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  counter,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  counter?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="label-mono">
          {label}
        </label>
        {counter && <span className="text-xs font-semibold text-muted tabular-nums">{counter}</span>}
      </div>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p className="mt-1.5 text-sm font-semibold text-[#b3260f]" role="alert" data-error-for={htmlFor}>
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function IdeaStep({ d, set, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <Field label="What's it called?" htmlFor="f-name" error={errors.name} counter={`${d.name.length}/40`}>
        <input
          id="f-name"
          className="input text-lg font-semibold"
          value={d.name}
          maxLength={40}
          autoComplete="off"
          placeholder="e.g. Moodcase"
          aria-invalid={errors.name ? true : undefined}
          onChange={(e) => set({ name: e.target.value })}
        />
      </Field>
      <Field
        label="What is it, in one line?"
        htmlFor="f-tagline"
        error={errors.tagline}
        counter={`${d.tagline.length}/90`}
        hint="Say what people get. This becomes your headline."
      >
        <input
          id="f-tagline"
          className="input"
          value={d.tagline}
          maxLength={90}
          autoComplete="off"
          placeholder="Crochet phone cases that match your vibe"
          aria-invalid={errors.tagline ? true : undefined}
          onChange={(e) => set({ tagline: e.target.value })}
        />
      </Field>
      <Field label="What kind of thing is it?" error={errors.category}>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Category">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={d.category === c.id}
              className="chip"
              onClick={() => set((prev) => withCategory(prev, c.id))}
            >
              <span aria-hidden="true">{c.emoji}</span> {c.label}
            </button>
          ))}
        </div>
      </Field>
    </div>
  );
}

export function DealStep({ d, set, errors }: StepProps) {
  const modes = [
    {
      id: "preorder" as const,
      title: "Pre-order",
      body: "People reserve at your price (no payment today). Strongest signal.",
      emoji: "🛒",
    },
    {
      id: "waitlist" as const,
      title: "Waitlist",
      body: "People join for free. Good for apps, events and services.",
      emoji: "📝",
    },
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Type of test">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={d.mode === m.id}
            onClick={() => set((prev) => withMode(prev, m.id))}
            className={`rounded-2xl border-2 border-ink p-4 text-left transition ${
              d.mode === m.id ? "bg-lime shadow-brutal" : "bg-card hover:bg-paper-2"
            }`}
          >
            <span className="text-2xl" aria-hidden="true">
              {m.emoji}
            </span>
            <p className="mt-2 font-display text-lg font-extrabold">{m.title}</p>
            <p className="mt-1 text-sm text-ink-2">{m.body}</p>
          </button>
        ))}
      </div>

      <Field
        label={d.mode === "preorder" ? "Price" : "Expected price (optional)"}
        htmlFor="f-price"
        error={errors.price}
        hint={
          d.mode === "preorder"
            ? "Use the real price you'd charge. Fake-cheap prices give fake verdicts."
            : "Leave it empty if it's free. Adding a price makes the test more honest."
        }
      >
        <div className="flex gap-2">
          <select
            aria-label="Currency"
            value={d.currency}
            onChange={(e) => set({ currency: e.target.value as Currency })}
            className="input w-[6.5rem] shrink-0 font-semibold"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {CURRENCY_SYMBOL[c]} {c}
              </option>
            ))}
          </select>
          <input
            id="f-price"
            className="input text-lg font-semibold"
            inputMode="decimal"
            autoComplete="off"
            placeholder={d.mode === "preorder" ? "25" : "optional"}
            value={d.price}
            aria-invalid={errors.price ? true : undefined}
            onChange={(e) => set({ price: e.target.value })}
          />
        </div>
      </Field>

      <Field label="When could it drop?" error={errors.eta} hint="Be honest. People who reserve will expect it around then.">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Launch timing">
          {ETAS.map((e) => (
            <button
              key={e.id}
              type="button"
              role="radio"
              aria-checked={d.eta === e.id}
              className="chip"
              onClick={() => set({ eta: e.id })}
            >
              {e.label}
            </button>
          ))}
        </div>
      </Field>
    </div>
  );
}

export function PitchStep({ d, set, errors }: StepProps) {
  const ideas = d.category ? suggestTaglines(d.category, "").slice(0, 4) : [];
  const perks = d.perks.length ? d.perks : [""];
  const setPerks = (next: string[]) => set({ perks: next, perksTouched: true });

  return (
    <div className="space-y-7">
      <Field label="Headline" htmlFor="f-tagline-2" error={errors.tagline} counter={`${d.tagline.length}/90`}>
        <input
          id="f-tagline-2"
          className="input"
          value={d.tagline}
          maxLength={90}
          autoComplete="off"
          onChange={(e) => set({ tagline: e.target.value })}
        />
        {ideas.length > 0 && (
          <div className="mt-2.5">
            <p className="text-xs font-bold text-muted">Need a punchier one? Tap to use:</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {ideas.map((t) => (
                <button key={t} type="button" className="chip text-left !text-[0.85rem]" onClick={() => set({ tagline: t })}>
                  ✨ {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </Field>

      <Field
        label="Why would someone want it?"
        error={errors.perks}
        hint="Up to 4 quick reasons. Perks for early people work great."
      >
        <div className="space-y-2">
          {perks.map((perk, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="input"
                value={perk}
                maxLength={60}
                aria-label={`Reason ${i + 1}`}
                placeholder={["Limited first batch", "Early-bird price", "Ships in 2 weeks", "Made by hand"][i]}
                onChange={(e) => setPerks(perks.map((p, j) => (j === i ? e.target.value : p)))}
              />
              {perks.length > 1 && (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost shrink-0 !px-3"
                  aria-label={`Remove reason ${i + 1}`}
                  onClick={() => setPerks(perks.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {perks.length < 4 && (
            <button type="button" className="btn btn-sm" onClick={() => setPerks([...perks, ""])}>
              + Add a reason
            </button>
          )}
        </div>
      </Field>

      <Field label="Button text" htmlFor="f-cta" error={errors.cta}>
        <div className="flex flex-wrap gap-2">
          {CTA_OPTIONS[d.mode].map((c) => (
            <button key={c} type="button" className="chip" aria-pressed={d.cta === c} onClick={() => set({ cta: c })}>
              {c}
            </button>
          ))}
        </div>
        <input
          id="f-cta"
          className="input mt-2"
          value={d.cta}
          maxLength={28}
          aria-label="Custom button text"
          onChange={(e) => set({ cta: e.target.value })}
        />
      </Field>

      <Field
        label="More details (optional)"
        htmlFor="f-desc"
        error={errors.description}
        counter={`${d.description.length}/600`}
        hint="Who made it, what's inside, sizes, anything that builds trust."
      >
        <textarea
          id="f-desc"
          className="input min-h-[110px] resize-y"
          value={d.description}
          maxLength={600}
          onChange={(e) => set({ description: e.target.value })}
        />
      </Field>
    </div>
  );
}

export function LookStep({ d, set, errors }: StepProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const shownImage = d.image ?? (d.keepImage ? d.imageUrl : null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setImageError(null);
    setBusy(true);
    try {
      const data = await processImage(file);
      set({ image: data });
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Couldn't use that image.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-7">
      <Field
        label="Photo (optional, but it helps)"
        error={imageError ?? errors.image}
        hint="A real photo, sketch or mockup feels legit and usually converts better than an emoji."
      >
        <div className="flex items-center gap-4">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-ink bg-paper-2 text-4xl">
            {shownImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shownImage} alt="Your photo" className="h-full w-full object-cover" />
            ) : (
              <span aria-hidden="true">{d.emoji}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              id="f-photo"
              onChange={(e) => pick(e.target.files?.[0])}
            />
            <label htmlFor="f-photo" className="btn btn-sm cursor-pointer" aria-disabled={busy}>
              {busy ? "Processing…" : shownImage ? "Change photo" : "Add a photo"}
            </label>
            {shownImage && (
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => set({ image: null, keepImage: false })}>
                Remove
              </button>
            )}
          </div>
        </div>
      </Field>

      <Field label={shownImage ? "Emoji (used in your link previews)" : "Pick an emoji"} error={errors.emoji}>
        <div className="grid grid-cols-8 gap-1.5" role="radiogroup" aria-label="Emoji">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              role="radio"
              aria-checked={d.emoji === e}
              aria-label={`Emoji ${e}`}
              onClick={() => set({ emoji: e, emojiTouched: true })}
              className={`flex aspect-square items-center justify-center rounded-xl border-2 text-2xl transition ${
                d.emoji === e ? "border-ink bg-lime shadow-brutal-sm" : "border-transparent hover:border-ink/30 hover:bg-paper-2"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Pick a vibe" error={errors.theme}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Theme">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={d.theme === t.id}
              onClick={() => set({ theme: t.id as ThemeId })}
              className={`overflow-hidden rounded-2xl border-2 border-ink text-left transition ${
                d.theme === t.id ? "shadow-brutal ring-4 ring-pink/50" : "hover:-translate-y-0.5"
              }`}
            >
              <div className="flex h-16 items-end justify-between p-2.5" style={{ background: t.vars.bg }}>
                <span
                  className="rounded-full px-2.5 py-1 text-[0.7rem] font-extrabold"
                  style={{ background: t.vars.accent, color: t.vars.accentText, border: `1.5px solid ${t.vars.border}` }}
                >
                  Reserve
                </span>
                <span
                  className={`text-lg leading-none ${t.font === "serif" ? "font-serif" : "font-display font-extrabold"}`}
                  style={{ color: t.vars.text }}
                >
                  Aa
                </span>
              </div>
              <div className="border-t-2 border-ink bg-card px-2.5 py-2">
                <p className="text-sm font-bold">{t.name}</p>
                <p className="text-xs text-muted">{t.vibe}</p>
              </div>
            </button>
          ))}
        </div>
      </Field>
    </div>
  );
}

export function RulesStep({ d, set, errors }: StepProps) {
  const cents = priceCents(d) ?? 0;
  const bar = getBar(cents, d.currency, d.mode);
  const shipCount = Math.ceil(bar.ship * d.targetVisitors);
  return (
    <div className="space-y-7">
      <Field label="How long should the test run?" error={errors.durationDays} hint="A week is the sweet spot. Long enough to share, short enough to stay hyped.">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Test length">
          {DURATIONS.map((n) => (
            <button key={n} type="button" role="radio" aria-checked={d.durationDays === n} className="chip" onClick={() => set({ durationDays: n })}>
              {n} days
            </button>
          ))}
        </div>
      </Field>

      <Field
        label="Visitor goal"
        error={errors.targetVisitors}
        hint="How many people you'll try to get to the page. More visitors = more confident verdict. You need 30+ for any verdict."
      >
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Visitor goal">
          {TARGETS.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={d.targetVisitors === n}
              className="chip"
              onClick={() => set({ targetVisitors: n })}
            >
              {n} visitors {n === 100 ? "· recommended" : ""}
            </button>
          ))}
        </div>
      </Field>

      <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border-2 border-ink bg-card p-4">
        <span>
          <span className="block font-bold">Ask &ldquo;what would you pay?&rdquo;</span>
          <span className="mt-0.5 block text-sm text-muted">Optional question after someone reserves. Powers the price check.</span>
        </span>
        <input
          type="checkbox"
          className="peer sr-only"
          checked={d.askPrice}
          onChange={(e) => set({ askPrice: e.target.checked })}
        />
        <span
          aria-hidden="true"
          className="relative mt-1 h-7 w-12 shrink-0 rounded-full border-2 border-ink bg-paper-2 transition peer-checked:bg-lime peer-focus-visible:ring-4 peer-focus-visible:ring-pink/50 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border-2 after:border-ink after:bg-card after:transition-transform peer-checked:after:translate-x-5"
        />
      </label>

      <div className="rounded-2xl border-2 border-ink bg-ink p-5 text-paper">
        <p className="label-mono text-lime">Your bar</p>
        <p className="mt-2 text-lg leading-snug">
          For a{" "}
          <b>
            {cents > 0 ? formatMoney(cents, d.currency) : "free"} {d.mode === "waitlist" ? "waitlist" : "pre-order"}
          </b>{" "}
          ({bar.band}), you get <span className="font-bold text-lime">SHIP IT</span> if at least{" "}
          <b>{pct(bar.ship)}</b> of visitors {d.mode === "waitlist" ? "join" : "reserve"}.
        </p>
        <p className="mt-2 text-paper/75">
          With {d.targetVisitors} visitors that&apos;s about <b className="text-paper">{shipCount} people</b>. Under {pct(bar.kill)} is
          KILL IT.
        </p>
      </div>
    </div>
  );
}
