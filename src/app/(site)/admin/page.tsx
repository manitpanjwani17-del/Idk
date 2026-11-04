import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminActions } from "@/components/admin-actions";
import { currentUser, isAdmin } from "@/lib/server/auth";
import { listReportedTests } from "@/lib/server/repo";

export const metadata: Metadata = { title: "Moderation", robots: { index: false } };

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-[22px] bg-paper-2" />}>
        <AdminContent />
      </Suspense>
    </main>
  );
}

async function AdminContent() {
  const user = await currentUser();
  if (!isAdmin(user)) notFound();
  const rows = await listReportedTests();
  return (
    <>
      <h1 className="font-display text-3xl font-extrabold">Reported pages</h1>
      <p className="mt-2 text-ink-2">Pages get hidden automatically after 3 reports. Restore the good ones, delete the bad ones.</p>
      {rows.length === 0 ? (
        <p className="card mt-8 p-6 text-center font-semibold">Nothing reported. Clean.</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {rows.map(({ test, reports, reasons }) => (
            <li key={test.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-bold">
                  {test.emoji} {test.name} {test.hidden ? <span className="ml-1 rounded bg-tomato px-1.5 text-xs">HIDDEN</span> : null}
                </p>
                <p className="truncate text-sm text-ink-2">{test.tagline}</p>
                <p className="text-xs text-muted">
                  {reports} reports · {Array.from(new Set(reasons.split(","))).join(", ")} ·{" "}
                  <a href={`/t/${test.slug}`} target="_blank" rel="noreferrer" className="underline">
                    /t/{test.slug}
                  </a>
                </p>
              </div>
              <AdminActions id={test.id} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
