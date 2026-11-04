"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { contentPayload, draftFromTest, draftPageData, priceCents, validateStep, type Draft, type EditableLike, type FieldErrors, type StepId } from "@/lib/draft";
import { PhoneFrame } from "../phone-frame";
import { TestPage } from "../test-page";
import { DealStep, IdeaStep, LookStep, PitchStep, type SetDraft } from "./fields";

const SECTIONS: Array<{ id: StepId; title: string; Body: typeof IdeaStep }> = [
  { id: "idea", title: "The idea", Body: IdeaStep },
  { id: "deal", title: "The deal", Body: DealStep },
  { id: "pitch", title: "The pitch", Body: PitchStep },
  { id: "look", title: "The look", Body: LookStep },
];

export function Editor({ test, live }: { test: EditableLike; live: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => draftFromTest(test, { retrial: false }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const set: SetDraft = useCallback((update) => {
    setDraft((prev) => (typeof update === "function" ? update(prev) : { ...prev, ...update }));
  }, []);

  const offerChanged =
    priceCents(draft) !== test.priceCents || draft.mode !== test.mode || draft.currency !== test.currency;

  async function save(e: FormEvent) {
    e.preventDefault();
    let all: FieldErrors = {};
    for (const s of SECTIONS) all = { ...all, ...validateStep(draft, s.id) };
    setErrors(all);
    if (Object.keys(all).length) {
      setFormError("Fix the highlighted bits first.");
      window.setTimeout(() => document.querySelector("[aria-invalid='true'], [role='alert']")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      return;
    }
    setSaving(true);
    setFormError(null);
    const res = await api(`/api/tests/${test.id}`, { method: "PATCH", body: contentPayload(draft) });
    setSaving(false);
    if (!res.ok) {
      setFormError(res.error);
      if (res.field) setErrors({ [res.field.split(".")[0]]: res.error });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    router.push(`/dashboard/${test.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 pb-28 pt-6 sm:px-6 lg:grid-cols-[1fr_380px] lg:pb-16">
      <form onSubmit={save} noValidate>
        <Link href={`/dashboard/${test.id}`} className="text-sm font-bold text-ink-2 hover:text-ink">
          ← Back to dashboard
        </Link>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Edit your page</h1>
        <p className="mt-2 text-ink-2">Fix a typo, swap the photo, tweak the vibe. Changes show up for visitors instantly.</p>

        {formError && (
          <p className="mt-5 rounded-2xl border-2 border-ink bg-tomato/20 px-4 py-3 font-semibold" role="alert">
            {formError}
          </p>
        )}

        {SECTIONS.map(({ id, title, Body }) => (
          <section key={id} className="mt-10 border-t-2 border-ink pt-6">
            <h2 className="mb-5 font-display text-xl font-extrabold">{title}</h2>
            <Body d={draft} set={set} errors={errors} />
            {id === "deal" && live && offerChanged && (
              <p className="mt-4 rounded-2xl border-2 border-ink bg-sun p-4 text-sm font-semibold">
                Heads up: changing the price or offer mid-test mixes two different deals in one result. For a clean read,{" "}
                <Link href={`/new?from=${test.id}`} className="underline underline-offset-2">
                  run a retrial
                </Link>{" "}
                instead.
              </p>
            )}
          </section>
        ))}

        <div className="sticky bottom-0 z-20 -mx-4 mt-10 border-t-2 border-ink bg-paper/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border-2">
          <div className="flex items-center justify-between gap-3">
            <Link href={`/dashboard/${test.id}`} className="btn btn-ghost">
              Cancel
            </Link>
            <button type="submit" className="btn btn-ink btn-lg" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </form>

      <aside className="hidden lg:block">
        <div className="sticky top-24">
          <p className="label-mono mb-3 text-center text-muted">Live preview</p>
          <PhoneFrame height={620}>
            <TestPage data={draftPageData(draft)} variant="preview" />
          </PhoneFrame>
        </div>
      </aside>

      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className="btn btn-lime fixed bottom-24 right-4 z-30 lg:hidden"
      >
        👀 Preview
      </button>
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-ink/95 p-4 lg:hidden" role="dialog" aria-modal="true" aria-label="Preview">
          <PhoneFrame height={Math.min(660, typeof window !== "undefined" ? window.innerHeight - 140 : 600)}>
            <TestPage data={draftPageData(draft)} variant="preview" />
          </PhoneFrame>
          <button type="button" className="btn btn-lime" onClick={() => setPreviewOpen(false)}>
            Close preview
          </button>
        </div>
      )}
    </div>
  );
}
