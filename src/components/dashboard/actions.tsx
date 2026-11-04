"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, copyText } from "@/lib/client";
import { Dialog } from "../dialog";

/** Refreshes server data every few seconds while the tab is visible. */
export function AutoRefresh({ every = 15_000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = window.setInterval(tick, every);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, every]);
  return null;
}

export function CloseButton({ id, visitors, minVisitors, big = false }: { id: string; visitors: number; minVisitors: number; big?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const low = visitors < minVisitors;

  async function close() {
    setBusy(true);
    setError(null);
    const res = await api(`/api/tests/${id}/close`, { body: {} });
    if (!res.ok) {
      setBusy(false);
      setError(res.error);
      return;
    }
    router.push(`/dashboard/${id}/verdict`);
  }

  return (
    <>
      <button type="button" className={`btn btn-ink ${big ? "btn-lg w-full" : "btn-sm"}`} onClick={() => setOpen(true)}>
        ⚖️ Close &amp; get the verdict
      </button>
      <Dialog open={open} onClose={() => !busy && setOpen(false)} title={low ? "Not enough visitors yet" : "Ready for the verdict?"}>
        <p className="text-ink-2">
          {low
            ? `Only ${visitors} ${visitors === 1 ? "person has" : "people have"} seen your page. With fewer than ${minVisitors}, the verdict will be “NEED MORE DATA”. You can reopen the test later.`
            : "This freezes the numbers and gives you the final verdict. You can reopen it later if you want more data."}
        </p>
        {error && <p className="mt-3 font-semibold text-[#b3260f]">{error}</p>}
        <div className="mt-6 flex gap-2">
          <button type="button" className="btn flex-1" onClick={() => setOpen(false)} disabled={busy}>
            {low ? "Keep collecting" : "Not yet"}
          </button>
          <button type="button" className="btn btn-ink flex-1" onClick={close} disabled={busy}>
            {busy ? "Closing…" : low ? "Close anyway" : "Show me"}
          </button>
        </div>
      </Dialog>
    </>
  );
}

export function ReopenButtons({ id, compact = false }: { id: string; compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function reopen(days: 3 | 5 | 7) {
    setBusy(days);
    setError(null);
    const res = await api(`/api/tests/${id}/reopen`, { body: { days } });
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push(`/dashboard/${id}`);
    router.refresh();
  }
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {!compact && <span className="text-sm font-semibold">Reopen for</span>}
        {([3, 5, 7] as const).map((d) => (
          <button key={d} type="button" className="btn btn-sm" onClick={() => reopen(d)} disabled={busy !== null}>
            {busy === d ? "…" : `+${d} days`}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-[#b3260f]">{error}</p>}
    </div>
  );
}

export function CardToggle({ id, initial }: { id: string; initial: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  async function toggle() {
    const next = !on;
    setOn(next);
    setBusy(true);
    const res = await api(`/api/tests/${id}/card`, { body: { public: next } });
    setBusy(false);
    if (!res.ok) setOn(!next);
    else router.refresh();
  }
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold">
      <span>Public card link {on ? "on" : "off"}</span>
      <input type="checkbox" className="peer sr-only" checked={on} onChange={toggle} disabled={busy} />
      <span
        aria-hidden="true"
        className="relative h-6 w-11 shrink-0 rounded-full border-2 border-ink bg-paper-2 transition peer-checked:bg-lime peer-focus-visible:ring-4 peer-focus-visible:ring-pink/50 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:border-2 after:border-ink after:bg-card after:transition-transform peer-checked:after:translate-x-5"
      />
    </label>
  );
}

export function DeleteTest({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function remove() {
    setBusy(true);
    const res = await api(`/api/tests/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setBusy(false);
      setError(res.error);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }
  return (
    <>
      <button type="button" className="text-sm font-bold text-[#b3260f] underline underline-offset-2" onClick={() => setOpen(true)}>
        Delete this test
      </button>
      <Dialog open={open} onClose={() => !busy && setOpen(false)} title={`Delete “${name}”?`}>
        <p className="text-ink-2">The page goes offline and every visit and reservation is deleted. This can&apos;t be undone.</p>
        {error && <p className="mt-3 font-semibold text-[#b3260f]">{error}</p>}
        <div className="mt-6 flex gap-2">
          <button type="button" className="btn flex-1" onClick={() => setOpen(false)} disabled={busy}>
            Keep it
          </button>
          <button type="button" className="btn btn-tomato flex-1" onClick={remove} disabled={busy}>
            {busy ? "Deleting…" : "Delete forever"}
          </button>
        </div>
      </Dialog>
    </>
  );
}

export function InterestButton({ feature, initial, label }: { feature: "ads" | "payments"; initial: boolean; label: string }) {
  const [done, setDone] = useState(initial);
  const [busy, setBusy] = useState(false);
  async function join() {
    setBusy(true);
    const res = await api("/api/interest", { body: { feature } });
    setBusy(false);
    if (res.ok) setDone(true);
  }
  return done ? (
    <p className="text-sm font-bold">✓ You&apos;re on the list. We&apos;ll tell you when it&apos;s ready.</p>
  ) : (
    <button type="button" className="btn btn-sm btn-sun" onClick={join} disabled={busy}>
      {busy ? "…" : label}
    </button>
  );
}

export interface SignupView {
  id: number;
  email: string;
  wouldPay: string | null;
  source: string;
  when: string;
}

export function SignupsTable({ testId, rows, canDelete }: { testId: string; rows: SignupView[]; canDelete: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? rows : rows.slice(0, 8);

  async function remove(id: number) {
    setBusy(id);
    const res = await api(`/api/tests/${testId}/signups/${id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) setNote(res.error);
    else router.refresh();
  }

  async function copyAll() {
    const ok = await copyText(rows.map((r) => r.email).join(", "));
    setNote(ok ? `Copied ${rows.length} emails. Paste them into BCC.` : "Couldn't copy. Use the CSV instead.");
    window.setTimeout(() => setNote(null), 3000);
  }

  if (!rows.length) {
    return <p className="text-sm text-muted">Nobody yet. Share your link and they&apos;ll show up here live.</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-sm" onClick={copyAll}>
          Copy all emails
        </button>
        <a href={`/api/tests/${testId}/export`} className="btn btn-sm">
          Download CSV
        </a>
      </div>
      {note && (
        <p className="mt-2 text-sm font-semibold" aria-live="polite">
          {note}
        </p>
      )}
      <ul className="mt-4 divide-y-2 divide-ink/10">
        {visible.map((r) => (
          <li key={r.id} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{r.email}</p>
              <p className="text-xs text-muted">
                {r.source} · {r.when}
                {r.wouldPay ? ` · would pay ${r.wouldPay}` : ""}
              </p>
            </div>
            {canDelete && (
              <button
                type="button"
                className="btn btn-ghost btn-sm !px-2.5 text-xs"
                onClick={() => remove(r.id)}
                disabled={busy === r.id}
                aria-label={`Remove ${r.email}`}
                title="Remove (spam or a test entry)"
              >
                {busy === r.id ? "…" : "✕"}
              </button>
            )}
          </li>
        ))}
      </ul>
      {rows.length > 8 && (
        <button type="button" className="mt-2 text-sm font-bold underline underline-offset-2" onClick={() => setShowAll(!showAll)}>
          {showAll ? "Show fewer" : `Show all ${rows.length}`}
        </button>
      )}
    </div>
  );
}
