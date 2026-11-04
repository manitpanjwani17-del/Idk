"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, storage } from "@/lib/client";
import {
  defaultDraft,
  draftFromTest,
  draftPageData,
  draftPayload,
  guessCurrency,
  STEP_FIELDS,
  validateStep,
  type Draft,
  type EditableLike,
  type FieldErrors,
  type StepId,
} from "@/lib/draft";
import { PhoneFrame } from "../phone-frame";
import { TestPage } from "../test-page";
import { DealStep, IdeaStep, LookStep, PitchStep, RulesStep, type SetDraft } from "./fields";

const DRAFT_KEY = "validly:draft:v1";

const STEPS: Array<{ id: StepId; label: string; title: string; sub: string }> = [
  { id: "idea", label: "Idea", title: "What's the idea?", sub: "Keep it simple. You can change everything later." },
  { id: "deal", label: "Deal", title: "What's the deal?", sub: "Real price, real timing. That's what makes the verdict real." },
  { id: "pitch", label: "Pitch", title: "Why would people want it?", sub: "This is what convinces a stranger in 5 seconds." },
  { id: "look", label: "Look", title: "Make it look good", sub: "Pick a vibe. Add a photo if you have one." },
  { id: "rules", label: "Rules", title: "Set the rules", sub: "How long it runs and how many people you'll aim for." },
];

export function Wizard() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(defaultDraft);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<{ kind: "restored" | "retrial"; text: string } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // Load: retrial (?from=id) > saved draft > fresh with a guessed currency.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const from = new URLSearchParams(window.location.search).get("from");
      if (from) {
        const res = await api<EditableLike>(`/api/tests/${encodeURIComponent(from)}`);
        if (!cancelled && res.ok) {
          setDraft(draftFromTest(res.data, { retrial: true }));
          setNotice({ kind: "retrial", text: `Retrial of “${res.data.name}”. Change ONE big thing, then relaunch.` });
          setReady(true);
          return;
        }
      }
      const saved = storage.get(DRAFT_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as { draft: Draft; step: number };
          if (!cancelled && parsed?.draft && (parsed.draft.name || parsed.draft.tagline)) {
            setDraft({ ...defaultDraft(), ...parsed.draft });
            setStep(Math.min(Math.max(0, parsed.step ?? 0), STEPS.length - 1));
            setNotice({ kind: "restored", text: "Picked up where you left off." });
            setReady(true);
            return;
          }
        } catch {
          storage.remove(DRAFT_KEY);
        }
      }
      if (!cancelled) {
        setDraft((d) => ({ ...d, currency: guessCurrency() }));
        setReady(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Autosave the draft (retrials aren't saved over a normal draft).
  useEffect(() => {
    if (!ready || draft.parentId) return;
    const t = window.setTimeout(() => storage.set(DRAFT_KEY, JSON.stringify({ draft, step })), 400);
    return () => window.clearTimeout(t);
  }, [draft, step, ready]);

  const set: SetDraft = useCallback((update) => {
    setDraft((prev) => (typeof update === "function" ? update(prev) : { ...prev, ...update }));
  }, []);

  // Clear a field's error as soon as it's edited.
  useEffect(() => {
    setErrors((prev) => (Object.keys(prev).length ? validateStepSubset(draft, STEPS[step].id, prev) : prev));
  }, [draft, step]);

  function scrollTop() {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function next() {
    const id = STEPS[step].id;
    const errs = validateStep(draft, id);
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = document.querySelector<HTMLElement>("[aria-invalid='true'], [role='alert']");
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setFormError(null);
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      scrollTop();
    } else {
      void launch();
    }
  }

  function back() {
    setErrors({});
    setFormError(null);
    if (step > 0) {
      setStep(step - 1);
      scrollTop();
    }
  }

  async function launch() {
    // Re-check every step so nothing slips through.
    for (let i = 0; i < STEPS.length; i++) {
      const errs = validateStep(draft, STEPS[i].id);
      if (Object.keys(errs).length) {
        setStep(i);
        setErrors(errs);
        setFormError("Fix the highlighted bits first.");
        scrollTop();
        return;
      }
    }
    setLaunching(true);
    setFormError(null);
    const res = await api<{ id: string; slug: string }>("/api/tests", { body: draftPayload(draft) });
    if (!res.ok) {
      setLaunching(false);
      setFormError(res.error);
      if (res.field) {
        const idx = STEPS.findIndex((s) => (STEP_FIELDS[s.id] as readonly string[]).includes(res.field!.split(".")[0]));
        if (idx >= 0) {
          setStep(idx);
          setErrors({ [res.field.split(".")[0]]: res.error });
        }
      }
      scrollTop();
      return;
    }
    if (!draft.parentId) storage.remove(DRAFT_KEY);
    router.push(`/dashboard/${res.data.id}?launched=1`);
  }

  function startOver() {
    storage.remove(DRAFT_KEY);
    setDraft({ ...defaultDraft(), currency: guessCurrency() });
    setStep(0);
    setErrors({});
    setNotice(null);
    if (window.location.search) router.replace("/new");
  }

  const current = STEPS[step];
  const StepBody = { idea: IdeaStep, deal: DealStep, pitch: PitchStep, look: LookStep, rules: RulesStep }[current.id];
  const pageData = draftPageData(draft);

  return (
    <div ref={topRef} className="mx-auto grid w-full max-w-6xl scroll-mt-20 gap-10 px-4 pb-28 pt-6 sm:px-6 lg:grid-cols-[1fr_380px] lg:pb-16">
      <div>
        {/* progress */}
        <ol className="flex gap-1.5" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li key={s.id} className="flex-1">
              <button
                type="button"
                onClick={() => i < step && (setErrors({}), setStep(i))}
                disabled={i >= step}
                className="group block w-full text-left disabled:cursor-default"
                aria-current={i === step ? "step" : undefined}
              >
                <span
                  className={`block h-2.5 rounded-full border-2 border-ink transition-colors ${
                    i < step ? "bg-ink" : i === step ? "bg-lime" : "bg-card"
                  }`}
                />
                <span className={`label-mono mt-1.5 hidden sm:block ${i === step ? "" : "text-muted"}`}>{s.label}</span>
              </button>
            </li>
          ))}
        </ol>

        {notice && (
          <div
            className={`mt-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-ink px-4 py-3 text-sm font-semibold ${
              notice.kind === "retrial" ? "bg-sun" : "bg-sky"
            }`}
          >
            <span>{notice.text}</span>
            <button type="button" className="underline underline-offset-2" onClick={startOver}>
              Start fresh instead
            </button>
          </div>
        )}

        <div key={current.id} className="animate-rise">
          <p className="label-mono mt-8 text-muted">
            Step {step + 1} of {STEPS.length}
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{current.title}</h1>
          <p className="mt-2 text-ink-2">{current.sub}</p>

          {formError && (
            <p className="mt-5 rounded-2xl border-2 border-ink bg-tomato/20 px-4 py-3 font-semibold" role="alert">
              {formError}
            </p>
          )}

          <form
            className="mt-8"
            onSubmit={(e) => {
              e.preventDefault();
              next();
            }}
            noValidate
          >
            {ready ? (
              <StepBody d={draft} set={set} errors={errors} />
            ) : (
              <div className="h-64 animate-pulse rounded-2xl border-2 border-dashed border-ink/20" />
            )}

            <div className="mt-10 flex items-center justify-between gap-3">
              {step > 0 ? (
                <button type="button" className="btn" onClick={back} disabled={launching}>
                  ← Back
                </button>
              ) : (
                <Link href="/" className="btn btn-ghost">
                  Cancel
                </Link>
              )}
              <button type="submit" className={`btn btn-lg ${step === STEPS.length - 1 ? "btn-pink" : "btn-ink"}`} disabled={launching || !ready}>
                {launching ? "Launching…" : step === STEPS.length - 1 ? "Launch my test 🚀" : "Next →"}
              </button>
            </div>
            {step === STEPS.length - 1 && (
              <p className="mt-4 text-right text-xs text-muted">
                No account needed. We&apos;ll keep your tests on this device. Save an account anytime.
              </p>
            )}
          </form>
        </div>
      </div>

      {/* desktop preview */}
      <aside className="hidden lg:block">
        <div className="sticky top-24">
          <p className="label-mono mb-3 text-center text-muted">Live preview</p>
          <PhoneFrame height={620}>
            <TestPage data={pageData} variant="preview" />
          </PhoneFrame>
        </div>
      </aside>

      {/* mobile preview */}
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className="btn btn-lime fixed bottom-5 right-4 z-30 lg:hidden"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        👀 Preview
      </button>
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-ink/95 p-4 lg:hidden" role="dialog" aria-modal="true" aria-label="Preview">
          <PhoneFrame height={Math.min(660, typeof window !== "undefined" ? window.innerHeight - 140 : 600)}>
            <TestPage data={pageData} variant="preview" />
          </PhoneFrame>
          <button type="button" className="btn btn-lime" onClick={() => setPreviewOpen(false)}>
            Close preview
          </button>
        </div>
      )}
    </div>
  );
}

/** Keeps only errors that are still wrong after an edit. */
function validateStepSubset(d: Draft, step: StepId, prev: FieldErrors): FieldErrors {
  const now = validateStep(d, step);
  const out: FieldErrors = {};
  for (const k of Object.keys(prev)) if (now[k]) out[k] = now[k];
  const same = Object.keys(out).length === Object.keys(prev).length && Object.keys(out).every((k) => out[k] === prev[k]);
  return same ? prev : out;
}
