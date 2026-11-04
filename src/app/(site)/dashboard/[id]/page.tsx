import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  AutoRefresh,
  CardToggle,
  CloseButton,
  DeleteTest,
  InterestButton,
  ReopenButtons,
  SignupsTable,
  type SignupView,
} from "@/components/dashboard/actions";
import { ProgressBar, StatTile, StatusChip, TestThumb, timeLeftServer } from "@/components/dashboard/bits";
import { DailyBars, DailyTable } from "@/components/dashboard/daily-chart";
import { ShareKit } from "@/components/dashboard/share-kit";
import { ConfidenceBadge, LeanMeter, OUTCOME_STYLE, Stamp } from "@/components/verdict-ui";
import { etaLabel } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { currentUser } from "@/lib/server/auth";
import { one } from "@/lib/server/db";
import { siteOrigin } from "@/lib/server/origin";
import { imageUrl } from "@/lib/server/present";
import { getStats, getTestById, verdictFor } from "@/lib/server/repo";
import { sourceLabel } from "@/lib/sources";
import { aBand, MIN_VISITORS, median, pct } from "@/lib/verdict";

export const metadata: Metadata = { title: "Your test", robots: { index: false } };

export default function TestDashboardRoute({ params, searchParams }: PageProps<"/dashboard/[id]">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <Suspense fallback={<DetailSkeleton />}>
        <Detail params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" className="space-y-6">
      <div className="h-6 w-28 animate-pulse rounded bg-paper-2" />
      <div className="h-20 animate-pulse rounded-[22px] bg-paper-2" />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="h-96 animate-pulse rounded-[22px] border-2 border-dashed border-ink/20" />
        <div className="h-96 animate-pulse rounded-[22px] border-2 border-dashed border-ink/20" />
      </div>
    </div>
  );
}

function ago(ts: number, now: number): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

async function Detail({
  params,
  searchParams,
}: {
  params: PageProps<"/dashboard/[id]">["params"];
  searchParams: PageProps<"/dashboard/[id]">["searchParams"];
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await currentUser();
  const test = user ? await getTestById(id) : null;

  if (!user || !test || test.userId !== user.id) {
    return (
      <div className="card mx-auto max-w-lg px-6 py-12 text-center">
        <span className="text-5xl" aria-hidden="true">
          🔒
        </span>
        <h1 className="mt-4 font-display text-2xl font-extrabold">Can&apos;t find that test</h1>
        <p className="mt-2 text-ink-2">
          It might belong to another account, or it was deleted. If you made it on another device, log in there first.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/dashboard" className="btn">
            My tests
          </Link>
          <Link href="/login" className="btn btn-ink">
            Log in
          </Link>
        </div>
      </div>
    );
  }

  const stats = await getStats(test);
  const live = test.status === "live";
  const verdict = live ? verdictFor(test, stats) : test.verdict;
  const origin = await siteOrigin();
  const interest = await one(`SELECT 1 AS ok FROM interest WHERE user_id = ? AND feature = 'ads'`, [user.id]);
  const now = Date.now();
  const launched = sp.launched === "1";
  const noun = test.mode === "waitlist" ? "joined" : "reserved";
  const medianPay = median(stats.wouldPay);
  const signupRows: SignupView[] = stats.signups.map((s) => ({
    id: s.id,
    email: s.email,
    wouldPay: s.wouldPay ? formatMoney(s.wouldPay, test.currency) : null,
    source: sourceLabel(s.source),
    when: ago(s.createdAt, now),
  }));
  const goalHit = live && stats.visitors >= test.targetVisitors;

  return (
    <>
      {live && <AutoRefresh />}
      <Link href="/dashboard" className="text-sm font-bold text-ink-2 hover:text-ink">
        ← My tests
      </Link>

      <header className="mt-4 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <TestThumb emoji={test.emoji} imageUrl={imageUrl(test)} size={68} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={test.status} outcome={test.verdict?.outcome} hidden={test.hidden} />
              <span className="text-sm font-semibold text-muted">
                {live ? timeLeftServer(test.endsAt - now) : `Closed ${ago(test.closedAt ?? test.updatedAt, now)}`}
              </span>
              {live && <span className="text-xs font-semibold text-muted">· updates live</span>}
            </div>
            <h1 className="mt-1 truncate font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{test.name}</h1>
            <p className="truncate text-ink-2">{test.tagline}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/t/${test.slug}`} target="_blank" rel="noreferrer" className="btn btn-sm">
            Open page ↗
          </a>
          <Link href={`/dashboard/${test.id}/edit`} className="btn btn-sm">
            Edit page
          </Link>
          <Link href={`/new?from=${test.id}`} className="btn btn-sm">
            Run a retrial
          </Link>
        </div>
      </header>

      {launched && live && (
        <div className="mt-6 rounded-2xl border-2 border-ink bg-lime p-5 shadow-brutal animate-rise">
          <p className="font-display text-xl font-extrabold">🎉 You&apos;re live!</p>
          <p className="mt-1 font-medium">
            Your page is up. Now get it in front of {test.targetVisitors} people. The share kit has a tagged link and a caption for
            every app. Your own visits don&apos;t count, so check it as much as you like.
          </p>
        </div>
      )}
      {test.hidden && (
        <div className="mt-6 rounded-2xl border-2 border-ink bg-tomato p-4 font-semibold">
          Your page is hidden because several visitors reported it. It stays offline until a moderator reviews it.
        </div>
      )}
      {live && test.offerChangedAt && (
        <div className="mt-6 rounded-2xl border-2 border-ink bg-sky p-4 text-sm font-semibold">
          You changed the price or offer during this test, so visitors saw different deals. For a clean read, run a retrial.
        </div>
      )}
      {user.isGuest && (
        <div className="mt-6 flex flex-col gap-2 rounded-2xl border-2 border-dashed border-ink/40 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="font-semibold">Guest account: this test only lives on this device until you save your account.</span>
          <Link href="/account" className="font-bold underline underline-offset-2">
            Save my account →
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          {/* VERDICT / LEAN */}
          {verdict && !live ? (
            <section className={`card overflow-hidden ${OUTCOME_STYLE[verdict.outcome].bg}`} aria-labelledby="verdict-title">
              <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="label-mono">The verdict</p>
                  <h2 id="verdict-title" className="mt-2 font-display text-2xl font-extrabold">
                    {verdict.summary}
                  </h2>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <ConfidenceBadge confidence={verdict.confidence} />
                    <span className="rounded-full border-2 border-ink bg-card px-2.5 py-1 text-xs font-bold">
                      Hype score {verdict.score}/100
                    </span>
                  </div>
                </div>
                <Stamp outcome={verdict.outcome} className="self-center text-3xl sm:text-4xl" />
              </div>
              <div className="grid gap-6 border-t-2 border-ink bg-card p-6 md:grid-cols-2">
                <div>
                  <h3 className="label-mono">Why</h3>
                  <ul className="mt-3 space-y-2.5">
                    {verdict.reasons.map((r) => (
                      <li key={r} className="flex gap-2 leading-snug">
                        <span aria-hidden="true">→</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="label-mono">Your next moves</h3>
                  <ol className="mt-3 space-y-2.5">
                    {verdict.moves.map((m, i) => (
                      <li key={m} className="flex gap-2.5 leading-snug">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-lime text-xs font-extrabold">
                          {i + 1}
                        </span>
                        <span>{m}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
              <div className="space-y-4 border-t-2 border-ink bg-card p-6">
                <div className="flex flex-wrap gap-2">
                  <Link href={`/dashboard/${test.id}/verdict`} className="btn btn-sm btn-ink">
                    ▶ Replay the reveal
                  </Link>
                  <a href={`/api/card/${test.slug}?format=story&download=1`} className="btn btn-sm">
                    ⬇ Story image
                  </a>
                  <a href={`/api/card/${test.slug}?format=wide&download=1`} className="btn btn-sm">
                    ⬇ Post image
                  </a>
                  {test.cardPublic && !test.hidden && (
                    <a href={`/v/${test.slug}`} target="_blank" rel="noreferrer" className="btn btn-sm">
                      Card link ↗
                    </a>
                  )}
                </div>
                <CardToggle id={test.id} initial={test.cardPublic} />
                <div className="flex flex-col gap-3 border-t-2 border-dashed border-ink/20 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`/new?from=${test.id}`} className="btn btn-pink btn-sm">
                    Run a retrial →
                  </Link>
                  <ReopenButtons id={test.id} />
                </div>
              </div>
            </section>
          ) : verdict ? (
            <section className="card p-6" aria-labelledby="lean-title">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="label-mono text-muted">Where it&apos;s leaning (not final)</p>
                  <h2 id="lean-title" className="mt-2 font-display text-2xl font-extrabold">
                    {stats.visitors < MIN_VISITORS
                      ? `Too early to call: ${stats.visitors}/${MIN_VISITORS} visitors`
                      : `Leaning ${OUTCOME_STYLE[verdict.outcome].label}`}
                  </h2>
                </div>
                {stats.visitors >= MIN_VISITORS && (
                  <span className={`rounded-full border-2 border-ink px-3 py-1 text-sm font-extrabold ${OUTCOME_STYLE[verdict.outcome].bg}`}>
                    {pct(verdict.rate)} converting
                  </span>
                )}
              </div>
              <div className="mt-8">
                <LeanMeter rate={verdict.rate} bar={verdict.bar} />
              </div>
              <p className="mt-3 text-sm text-ink-2">
                {stats.reservations} of {stats.visitors} visitors {noun} ({pct(verdict.rate)}). For {aBand(verdict.bar.band)}, SHIP IT
                needs {pct(verdict.bar.ship)}+ and under {pct(verdict.bar.kill)} is KILL IT.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <ProgressBar value={stats.visitors} max={test.targetVisitors} label="Visitor goal" />
                <ProgressBar
                  value={Math.min(test.durationDays, Math.max(0, Math.floor((now - test.createdAt) / 86_400_000)))}
                  max={test.durationDays}
                  label="Days done"
                />
              </div>
              {goalHit && (
                <p className="mt-5 rounded-xl border-2 border-ink bg-lime px-4 py-3 text-sm font-bold">
                  🎯 You hit your visitor goal! Close it now for the verdict, or keep collecting for more confidence.
                </p>
              )}
              <div className="mt-6">
                <CloseButton id={test.id} visitors={stats.visitors} minVisitors={MIN_VISITORS} big />
                <p className="mt-2 text-center text-xs text-muted">
                  It closes on its own in {timeLeftServer(test.endsAt - now).replace(" left", "")}.
                </p>
              </div>
            </section>
          ) : null}

          {/* STATS */}
          <section aria-label="Numbers" className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Visitors" value={stats.visitors} sub="unique people" />
            <StatTile
              label="Tapped button"
              value={stats.clicks}
              sub={stats.visitors ? `${pct(stats.clicks / stats.visitors)} of visitors` : "no visitors yet"}
            />
            <StatTile
              label={test.mode === "waitlist" ? "Joined" : "Reserved"}
              value={stats.reservations}
              sub={stats.visitors ? `${pct(stats.reservations / stats.visitors)} conversion` : "–"}
              accent="bg-lime"
            />
            <StatTile
              label="Would pay"
              value={medianPay !== null ? formatMoney(medianPay, test.currency) : "–"}
              sub={stats.wouldPay.length ? `median of ${stats.wouldPay.length}` : test.askPrice ? "no answers yet" : "question off"}
            />
          </section>

          {/* DAILY */}
          <section className="card p-6" aria-labelledby="daily-title">
            <h2 id="daily-title" className="font-display text-xl font-extrabold">
              Day by day
            </h2>
            <div className="mt-5 grid gap-8 sm:grid-cols-2">
              <DailyBars title="New visitors" unit="visitors" color="#3d5ccc" values={stats.daily.map((d) => d.visitors)} />
              <DailyBars
                title={test.mode === "waitlist" ? "Joined" : "Reservations"}
                unit={noun}
                color="#d6246e"
                values={stats.daily.map((d) => d.reservations)}
              />
            </div>
            <DailyTable rows={stats.daily} reservedLabel={test.mode === "waitlist" ? "Joined" : "Reserved"} />
          </section>

          {/* SOURCES */}
          <section className="card p-6" aria-labelledby="sources-title">
            <h2 id="sources-title" className="font-display text-xl font-extrabold">
              Where people came from
            </h2>
            {stats.sources.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No visitors yet. Use the tagged links in the share kit to see what works.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-ink">
                      <th className="py-2 font-bold">Source</th>
                      <th className="py-2 text-right font-bold">Visitors</th>
                      <th className="py-2 text-right font-bold">Tapped</th>
                      <th className="py-2 text-right font-bold">{test.mode === "waitlist" ? "Joined" : "Reserved"}</th>
                      <th className="py-2 text-right font-bold">Conversion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.sources.map((s) => (
                      <tr key={s.source} className="border-b border-ink/10">
                        <td className="py-2 font-semibold">{sourceLabel(s.source)}</td>
                        <td className="py-2 text-right tabular-nums">{s.visitors}</td>
                        <td className="py-2 text-right tabular-nums">{s.clicks}</td>
                        <td className="py-2 text-right tabular-nums">{s.reservations}</td>
                        <td className="py-2 text-right tabular-nums">{s.visitors ? pct(s.reservations / s.visitors) : "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* RESERVATIONS */}
          <section className="card p-6" aria-labelledby="people-title">
            <h2 id="people-title" className="font-display text-xl font-extrabold">
              {test.mode === "waitlist" ? "Your waitlist" : "People who reserved"}{" "}
              <span className="text-muted">({stats.reservations})</span>
            </h2>
            <p className="mt-1 text-sm text-muted">Only you can see these emails.</p>
            <div className="mt-4">
              <SignupsTable testId={test.id} rows={signupRows} canDelete={live} />
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-6">
          {live && !test.hidden ? (
            <ShareKit
              origin={origin}
              slug={test.slug}
              name={test.name}
              tagline={test.tagline}
              waitlist={test.mode === "waitlist"}
              highlight={launched}
            />
          ) : (
            <section className="card p-5">
              <h2 className="font-display text-lg font-extrabold">Your page is closed</h2>
              <p className="mt-1 text-sm text-ink-2">
                Visitors see a &ldquo;test has wrapped&rdquo; note. Reopen to collect more, or run a retrial with changes.
              </p>
            </section>
          )}

          <section className="card bg-sun p-5">
            <p className="label-mono">Coming soon</p>
            <h2 className="mt-1 font-display text-lg font-extrabold">We run $20 of ads for you</h2>
            <p className="mt-1 text-sm">
              One tap and we put your page in front of strangers who match your audience. No ad account needed.
            </p>
            <div className="mt-4">
              <InterestButton feature="ads" initial={Boolean(interest)} label="Notify me when it's ready" />
            </div>
          </section>

          <section className="card p-5 text-sm">
            <h2 className="font-display text-lg font-extrabold">Test details</h2>
            <dl className="mt-3 space-y-2">
              {[
                ["Type", test.mode === "preorder" ? "Pre-order" : "Waitlist"],
                ["Price", test.priceCents > 0 ? formatMoney(test.priceCents, test.currency) : "Free"],
                ["Drops", etaLabel(test.eta)],
                ["Length", `${test.durationDays} days`],
                ["Visitor goal", `${test.targetVisitors}`],
                ["Started", new Date(test.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })],
                ["Link", `/t/${test.slug}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-ink/10 pb-2">
                  <dt className="text-muted">{k}</dt>
                  <dd className="truncate text-right font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            {test.parentId && (
              <Link href={`/dashboard/${test.parentId}`} className="mt-3 inline-block font-bold underline underline-offset-2">
                ← See the original test
              </Link>
            )}
            <div className="mt-5">
              <DeleteTest id={test.id} name={test.name} />
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
