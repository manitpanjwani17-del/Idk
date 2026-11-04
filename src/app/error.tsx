"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="text-5xl" aria-hidden="true">
        🫠
      </span>
      <h1 className="font-display text-3xl font-extrabold">Something broke on our side</h1>
      <p className="max-w-sm text-ink-2">Your data is safe. Try again, and if it keeps happening, refresh the page.</p>
      <div className="flex gap-3">
        <button type="button" className="btn btn-ink" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="btn">
          Home
        </Link>
      </div>
    </main>
  );
}
