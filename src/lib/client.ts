"use client";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; field?: string; status: number };

/** fetch() wrapper that never throws and always gives a human error message. */
export async function api<T = Record<string, unknown>>(
  url: string,
  init: { method?: string; body?: unknown } = {},
): Promise<ApiResult<T>> {
  const hasBody = init.body !== undefined;
  try {
    const res = await fetch(url, {
      method: init.method ?? (hasBody ? "POST" : "GET"),
      headers: hasBody ? { "Content-Type": "application/json" } : undefined,
      body: hasBody ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
    });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!res.ok) {
      const d = (data ?? {}) as { error?: string; field?: string };
      return {
        ok: false,
        error: d.error ?? `Something went wrong (${res.status}). Try again.`,
        field: d.field,
        status: res.status,
      };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "You're offline or the server didn't answer. Try again.", status: 0 };
  }
}

/** localStorage that never throws (private mode, in-app browsers, blocked storage). */
export const storage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // storage full or blocked — fine, it's only a convenience
    }
  },
  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older in-app browsers: fall back to a hidden textarea.
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

/** Time left in plain words: "3d 4h", "5h 12m", "12m". */
export function timeLeft(ms: number): string {
  if (ms <= 0) return "0m";
  const m = Math.floor(ms / 60_000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const min = m % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${min}m`;
  return `${Math.max(1, min)}m`;
}
