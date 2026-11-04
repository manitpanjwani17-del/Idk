"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { api, copyText } from "@/lib/client";
import { Dialog } from "../dialog";

/**
 * Identity changes (login, logout, delete) use a full page load so nothing from
 * the previous person's session survives in memory on a shared device.
 */
function hardNavigate(url: string) {
  window.location.assign(url);
}

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  invalid?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        className="input pr-20"
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid ? true : undefined}
      />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-sm font-bold hover:bg-paper-2"
        onClick={() => setShow(!show)}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

function ErrorNote({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p className="rounded-xl border-2 border-ink bg-tomato/20 px-3 py-2 text-sm font-semibold" role="alert">
      {text}
    </p>
  );
}

/** Shown once after saving/recovering. The only way back in without email. */
export function RecoveryCode({ code, onDone, doneLabel = "I saved it, continue" }: { code: string; onDone: () => void; doneLabel?: string }) {
  const [copied, setCopied] = useState(false);
  const [ack, setAck] = useState(false);
  const file = `data:text/plain;charset=utf-8,${encodeURIComponent(
    `Validly recovery code\n\n${code}\n\nUse it at /recover if you ever forget your password. Each code works once.\n`,
  )}`;
  return (
    <div className="rounded-2xl border-2 border-ink bg-sun p-5">
      <p className="font-display text-lg font-extrabold">Save your recovery code</p>
      <p className="mt-1 text-sm">
        If you forget your password, this code is the only way back in. We&apos;ll never show it again. Screenshot it or save it to
        your notes.
      </p>
      <p className="mt-4 select-all rounded-xl border-2 border-ink bg-card px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.12em]" data-testid="recovery-code">
        {code}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-sm"
          onClick={async () => {
            setCopied(await copyText(code));
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        <a href={file} download="validly-recovery-code.txt" className="btn btn-sm">
          Download .txt
        </a>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="h-5 w-5 accent-[#111]" />
        I&apos;ve saved my recovery code somewhere safe
      </label>
      <button type="button" className="btn btn-ink mt-4 w-full" disabled={!ack} onClick={onDone}>
        {doneLabel}
      </button>
    </div>
  );
}

export function SaveAccountForm({ hasTests }: { hasTests: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [field, setField] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await api<{ recoveryCode: string }>("/api/auth/save", { body: { email, password } });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      setField(res.field ?? null);
      return;
    }
    setCode(res.data.recoveryCode);
  }

  if (code) {
    return (
      <RecoveryCode code={code} onDone={() => hardNavigate("/dashboard")} />
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <ErrorNote text={error} />
      <div>
        <label htmlFor="save-email" className="label-mono">
          Email
        </label>
        <input
          id="save-email"
          type="email"
          className="input mt-1.5"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={field === "email" ? true : undefined}
        />
      </div>
      <div>
        <label htmlFor="save-password" className="label-mono">
          Password (8+ characters)
        </label>
        <div className="mt-1.5">
          <PasswordInput id="save-password" value={password} onChange={setPassword} autoComplete="new-password" invalid={field === "password"} />
        </div>
      </div>
      <button type="submit" className="btn btn-ink btn-lg w-full" disabled={busy}>
        {busy ? "Saving…" : hasTests ? "Save my account & tests" : "Create my account"}
      </button>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-ink underline underline-offset-2">
          Log in
        </Link>
        {hasTests ? " and your tests from this device move over." : ""}
      </p>
    </form>
  );
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await api<{ moved: number }>("/api/auth/login", { body: { email, password } });
    if (!res.ok) {
      setBusy(false);
      setError(res.error);
      return;
    }
    hardNavigate(res.data.moved > 0 ? `/dashboard?moved=${res.data.moved}` : "/dashboard");
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <ErrorNote text={error} />
      <div>
        <label htmlFor="login-email" className="label-mono">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          className="input mt-1.5"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="login-password" className="label-mono">
            Password
          </label>
          <Link href="/recover" className="text-sm font-bold underline underline-offset-2">
            Forgot it?
          </Link>
        </div>
        <div className="mt-1.5">
          <PasswordInput id="login-password" value={password} onChange={setPassword} autoComplete="current-password" />
        </div>
      </div>
      <button type="submit" className="btn btn-ink btn-lg w-full" disabled={busy}>
        {busy ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}

export function RecoverForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCode, setNewCode] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await api<{ recoveryCode: string }>("/api/auth/recover", { body: { email, code, password } });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setNewCode(res.data.recoveryCode);
  }

  if (newCode) {
    return (
      <div className="space-y-4">
        <p className="rounded-xl border-2 border-ink bg-lime px-3 py-2 font-semibold">Password reset. You&apos;re logged in.</p>
        <p className="text-sm text-ink-2">Your old recovery code just stopped working. Here&apos;s your new one:</p>
        <RecoveryCode
          code={newCode}
          doneLabel="Go to my tests"
          onDone={() => hardNavigate("/dashboard")}
        />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <ErrorNote text={error} />
      <div>
        <label htmlFor="rec-email" className="label-mono">
          Email
        </label>
        <input id="rec-email" type="email" className="input mt-1.5" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label htmlFor="rec-code" className="label-mono">
          Recovery code
        </label>
        <input
          id="rec-code"
          className="input mt-1.5 font-mono uppercase tracking-widest"
          placeholder="XXXX-XXXX-XXXX"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="rec-password" className="label-mono">
          New password (8+ characters)
        </label>
        <div className="mt-1.5">
          <PasswordInput id="rec-password" value={password} onChange={setPassword} autoComplete="new-password" />
        </div>
      </div>
      <button type="submit" className="btn btn-ink btn-lg w-full" disabled={busy}>
        {busy ? "Checking…" : "Reset my password"}
      </button>
    </form>
  );
}

export function SignedInPanel({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [codePw, setCodePw] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeErr, setCodeErr] = useState<string | null>(null);
  const [freshCode, setFreshCode] = useState<string | null>(null);
  const [outBusy, setOutBusy] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPwBusy(true);
    setPwMsg(null);
    const res = await api("/api/auth/password", { body: { current, next } });
    setPwBusy(false);
    if (!res.ok) {
      setPwMsg({ ok: false, text: res.error });
      return;
    }
    setCurrent("");
    setNext("");
    setPwMsg({ ok: true, text: "Password changed. Other devices were signed out." });
  }

  async function regenerate(e: FormEvent) {
    e.preventDefault();
    setCodeBusy(true);
    setCodeErr(null);
    const res = await api<{ recoveryCode: string }>("/api/auth/recovery-code", { body: { password: codePw } });
    setCodeBusy(false);
    if (!res.ok) {
      setCodeErr(res.error);
      return;
    }
    setCodePw("");
    setFreshCode(res.data.recoveryCode);
  }

  async function logout() {
    setOutBusy(true);
    await api("/api/auth/logout", { body: {} });
    hardNavigate("/");
  }

  async function remove() {
    setDelBusy(true);
    setDelErr(null);
    const res = await api("/api/auth/delete", { body: { confirm } });
    if (!res.ok) {
      setDelBusy(false);
      setDelErr(res.error);
      return;
    }
    hardNavigate("/");
  }

  return (
    <div className="space-y-6">
      <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="label-mono text-muted">Signed in as</p>
          <p className="truncate text-lg font-bold" data-testid="account-email">
            {email}
          </p>
        </div>
        <button type="button" className="btn btn-sm" onClick={logout} disabled={outBusy}>
          {outBusy ? "Logging out…" : "Log out"}
        </button>
      </section>

      <section className="card p-5">
        <h2 className="font-display text-lg font-extrabold">Change password</h2>
        <form onSubmit={changePassword} className="mt-4 space-y-3" noValidate>
          <div>
            <label htmlFor="cur-pw" className="label-mono">
              Current password
            </label>
            <div className="mt-1.5">
              <PasswordInput id="cur-pw" value={current} onChange={setCurrent} autoComplete="current-password" />
            </div>
          </div>
          <div>
            <label htmlFor="new-pw" className="label-mono">
              New password (8+ characters)
            </label>
            <div className="mt-1.5">
              <PasswordInput id="new-pw" value={next} onChange={setNext} autoComplete="new-password" />
            </div>
          </div>
          {pwMsg && (
            <p className={`rounded-xl border-2 border-ink px-3 py-2 text-sm font-semibold ${pwMsg.ok ? "bg-lime" : "bg-tomato/20"}`} role="status">
              {pwMsg.text}
            </p>
          )}
          <button type="submit" className="btn btn-ink btn-sm" disabled={pwBusy}>
            {pwBusy ? "Saving…" : "Change password"}
          </button>
        </form>
      </section>

      <section className="card p-5">
        <h2 className="font-display text-lg font-extrabold">Recovery code</h2>
        <p className="mt-1 text-sm text-ink-2">Lost it? Make a new one. The old one stops working.</p>
        {freshCode ? (
          <div className="mt-4">
            <RecoveryCode code={freshCode} doneLabel="Done" onDone={() => setFreshCode(null)} />
          </div>
        ) : (
          <form onSubmit={regenerate} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" noValidate>
            <div className="flex-1">
              <label htmlFor="code-pw" className="label-mono">
                Confirm with your password
              </label>
              <div className="mt-1.5">
                <PasswordInput id="code-pw" value={codePw} onChange={setCodePw} autoComplete="current-password" />
              </div>
            </div>
            <button type="submit" className="btn btn-sm" disabled={codeBusy}>
              {codeBusy ? "…" : "New recovery code"}
            </button>
          </form>
        )}
        {codeErr && <p className="mt-2 text-sm font-semibold text-[#b3260f]">{codeErr}</p>}
      </section>

      <DeleteAccountSection open={delOpen} setOpen={setDelOpen} confirm={confirm} setConfirm={setConfirm} busy={delBusy} error={delErr} onDelete={remove} />
    </div>
  );
}

function DeleteAccountSection({
  open,
  setOpen,
  confirm,
  setConfirm,
  busy,
  error,
  onDelete,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  confirm: string;
  setConfirm: (v: string) => void;
  busy: boolean;
  error: string | null;
  onDelete: () => void;
}) {
  return (
    <section className="rounded-[22px] border-2 border-dashed border-[#b3260f]/60 p-5">
      <h2 className="font-display text-lg font-extrabold">Delete account</h2>
      <p className="mt-1 text-sm text-ink-2">Deletes your account, every test, and every email you collected. Forever.</p>
      <button type="button" className="btn btn-sm btn-tomato mt-4" onClick={() => setOpen(true)}>
        Delete my account
      </button>
      <Dialog open={open} onClose={() => !busy && setOpen(false)} title="Delete everything?">
        <p className="text-ink-2">
          Type <b>DELETE</b> to confirm. All your tests go offline and all reservations are erased.
        </p>
        <input className="input mt-4" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label="Type DELETE to confirm" autoComplete="off" />
        {error && <p className="mt-2 text-sm font-semibold text-[#b3260f]">{error}</p>}
        <div className="mt-5 flex gap-2">
          <button type="button" className="btn flex-1" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-tomato flex-1" onClick={onDelete} disabled={busy || confirm !== "DELETE"}>
            {busy ? "Deleting…" : "Delete forever"}
          </button>
        </div>
      </Dialog>
    </section>
  );
}

export function GuestDeleteLink() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function remove() {
    setBusy(true);
    const res = await api("/api/auth/delete", { body: { confirm } });
    if (!res.ok) {
      setBusy(false);
      setError(res.error);
      return;
    }
    hardNavigate("/");
  }
  return <DeleteAccountSection open={open} setOpen={setOpen} confirm={confirm} setConfirm={setConfirm} busy={busy} error={error} onDelete={remove} />;
}
