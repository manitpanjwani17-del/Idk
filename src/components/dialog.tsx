"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Small accessible modal: Esc closes, focus moves inside, background scroll locked. */
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = panel.current?.querySelector<HTMLElement>("input, button, a[href], textarea, select");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-ink/55 animate-[fade-in_0.15s_ease]" onClick={onClose} />
      <div
        ref={panel}
        className="relative w-full max-w-md rounded-t-[26px] border-2 border-ink bg-card p-6 shadow-brutal-lg animate-rise sm:rounded-[26px]"
      >
        <h2 className="font-display text-xl font-extrabold">{title}</h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
