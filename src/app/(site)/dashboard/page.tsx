import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ProgressBar, StatusChip, TestThumb, timeLeftServer } from "@/components/dashboard/bits";
import { currentUser } from "@/lib/server/auth";
import { imageUrl } from "@/lib/server/present";
import { listTestsForUser } from "@/lib/server/repo";
import { pct } from "@/lib/verdict";

export const metadata: Metadata = { title: "My tests", robots: { index: false } };

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <Suspense fallback={<ListSkeleton />}>
        <DashboardList searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function ListSkeleton() {
  return (
    <div aria-busy="true">
      <div className="h-10 w-48 animate-pulse rounded-xl bg-paper-2" />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-[22px] border-2 border-dashed border-ink/20" />
        ))}
      </div>
    </div>
  );
}

async function DashboardList({ searchParams }: { searchParams: PageProps<"/dashboard">["searchParams"] }) {
  const sp = await searchParams;
  const moved = Number(typeof sp.moved === "string" ? sp.moved : 0) || 0;
  const user = await currentUser();
  const items = user ? await listTestsForUser(user.id) : [];
  const now = Date.now();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono text-muted">{user?.email ?? (user ? "Guest account" : "Not signed in")}</p>
          <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight">My tests</h1>
        </div>
        <Link href="/new" className="btn btn-ink">
          + New test
        </Link>
      </div>

      {moved > 0 && (
        <p className="mt-6 rounded-2xl border-2 border-ink bg-lime p-4 font-semibold">
          Moved {moved} {moved === 1 ? "test" : "tests"} from this device into your account.
        </p>
      )}

      {user?.isGuest && items.length > 0 && (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border-2 border-ink bg-sun p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold">
            You&apos;re on a guest account. Save it with an email and password so you can log in from any device and never lose
            your tests.
          </p>
          <Link href="/account" className="btn btn-ink btn-sm shrink-0">
            Save my account
          </Link>
        </div>
      )}

      {items.length === 0 ? (
        <div className="card mt-8 flex flex-col items-center px-6 py-14 text-center">
          <span className="text-5xl" aria-hidden="true">
            💡
          </span>
          <h2 className="mt-4 font-display text-2xl font-extrabold">No tests yet</h2>
          <p className="mt-2 max-w-md text-ink-2">
            Got an idea you keep thinking about? Put it in front of real people and find out if it&apos;s worth your time.
          </p>
          <Link href="/new" className="btn btn-pink btn-lg mt-6">
            Test my first idea →
          </Link>
          {!user || user.isGuest ? (
            <p className="mt-6 text-sm text-muted">
              Made tests on another device?{" "}
              <Link href="/login" className="font-bold text-ink underline underline-offset-2">
                Log in
              </Link>
            </p>
          ) : null}
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 md:grid-cols-2">
          {items.map(({ test, visitors, reservations }) => {
            const outcome = test.verdict?.outcome ?? null;
            return (
              <li key={test.id}>
                <Link
                  href={`/dashboard/${test.id}`}
                  className="card group block p-5 transition-transform hover:-translate-y-0.5 hover:shadow-brutal-lg"
                >
                  <div className="flex items-start gap-4">
                    <TestThumb emoji={test.emoji} imageUrl={imageUrl(test)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusChip status={test.status} outcome={outcome} hidden={test.hidden} />
                        <span className="text-xs font-semibold text-muted">
                          {test.status === "live" ? timeLeftServer(test.endsAt - now) : `closed ${new Date(test.closedAt ?? test.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                        </span>
                      </div>
                      <h2 className="mt-2 truncate font-display text-xl font-extrabold">{test.name}</h2>
                      <p className="truncate text-sm text-ink-2">{test.tagline}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-paper-2 py-2">
                      <p className="font-display text-xl font-extrabold tabular-nums">{visitors}</p>
                      <p className="text-xs font-semibold text-muted">visitors</p>
                    </div>
                    <div className="rounded-xl bg-paper-2 py-2">
                      <p className="font-display text-xl font-extrabold tabular-nums">{reservations}</p>
                      <p className="text-xs font-semibold text-muted">{test.mode === "waitlist" ? "joined" : "reserved"}</p>
                    </div>
                    <div className="rounded-xl bg-paper-2 py-2">
                      <p className="font-display text-xl font-extrabold tabular-nums">{visitors ? pct(reservations / visitors) : "–"}</p>
                      <p className="text-xs font-semibold text-muted">conversion</p>
                    </div>
                  </div>
                  {test.status === "live" && (
                    <div className="mt-4">
                      <ProgressBar value={visitors} max={test.targetVisitors} label="Visitor goal" />
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
