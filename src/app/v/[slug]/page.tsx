import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/brand";
import { ConfidenceBadge, OUTCOME_STYLE, Stamp } from "@/components/verdict-ui";
import { formatMoney } from "@/lib/money";
import { currentUser } from "@/lib/server/auth";
import { siteOrigin } from "@/lib/server/origin";
import { getTestBySlug, type TestRecord } from "@/lib/server/repo";
import { pct } from "@/lib/verdict";

async function loadCard(slug: string): Promise<{ test: TestRecord; isOwner: boolean } | null> {
  const test = await getTestBySlug(slug);
  if (!test || test.status !== "closed" || !test.verdict) return null;
  const user = await currentUser();
  const isOwner = user?.id === test.userId;
  if ((!test.cardPublic || test.hidden) && !isOwner) return null;
  return { test, isOwner };
}

export async function generateMetadata({ params }: PageProps<"/v/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const card = await loadCard(slug);
  if (!card || !card.test.verdict) return { title: "Verdict not found", robots: { index: false } };
  const { test } = card;
  const verdict = test.verdict!;
  const origin = await siteOrigin();
  const title = `${verdict.title}: ${test.name}`;
  const description = `${verdict.stats.visitors} people saw it, ${verdict.stats.reservations} ${test.mode === "waitlist" ? "joined" : "reserved"}. Tested on Validly.`;
  const image = `${origin}/api/card/${test.slug}?format=wide`;
  return {
    title,
    description,
    robots: { index: false },
    openGraph: { title, description, images: [{ url: image, width: 1200, height: 630, alt: title }], type: "article" },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function CardRoute({ params }: PageProps<"/v/[slug]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh animate-pulse bg-paper-2" aria-busy="true" />}>
      <Card params={params} />
    </Suspense>
  );
}

async function Card({ params }: { params: PageProps<"/v/[slug]">["params"] }) {
  const { slug } = await params;
  const card = await loadCard(slug);
  if (!card) notFound();
  const { test, isOwner } = card;
  const verdict = test.verdict!;
  const style = OUTCOME_STYLE[verdict.outcome];
  const noun = test.mode === "waitlist" ? "joined" : "reserved";

  return (
    <main className="flex min-h-dvh flex-col items-center px-4 py-8">
      <div className="flex w-full max-w-xl items-center justify-between">
        <Logo />
        <Link href="/new" className="btn btn-ink btn-sm">
          Test your idea
        </Link>
      </div>

      <article className={`card mt-8 w-full max-w-xl overflow-hidden ${style.bg}`}>
        <div className="p-6 sm:p-8">
          <p className="label-mono">The verdict is in</p>
          <h1 className="mt-3 break-words font-display text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-5xl">
            {test.emoji} {test.name}
          </h1>
          <p className="mt-3 text-lg font-medium">{test.tagline}</p>
          <p className="mt-2 font-bold">{test.priceCents > 0 ? formatMoney(test.priceCents, test.currency) : "Free waitlist"}</p>
          <div className="my-12 flex justify-center">
            <Stamp outcome={verdict.outcome} animate className="text-5xl sm:text-6xl" />
          </div>
          <div className="grid grid-cols-3 gap-3 border-t-[3px] border-ink pt-5 text-center">
            <div>
              <p className="font-display text-3xl font-extrabold">{verdict.stats.visitors}</p>
              <p className="text-sm font-bold">visitors</p>
            </div>
            <div>
              <p className="font-display text-3xl font-extrabold">{verdict.stats.reservations}</p>
              <p className="text-sm font-bold">{noun}</p>
            </div>
            <div>
              <p className="font-display text-3xl font-extrabold">{pct(verdict.rate)}</p>
              <p className="text-sm font-bold">conversion</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <ConfidenceBadge confidence={verdict.confidence} />
            <span className="rounded-full border-2 border-ink bg-card px-2.5 py-1 text-xs font-bold">Hype score {verdict.score}/100</span>
          </div>
        </div>
      </article>

      {isOwner && (
        <div className="mt-6 w-full max-w-xl rounded-2xl border-2 border-dashed border-ink/40 p-4 text-sm">
          <p className="font-semibold">
            This is your card.{" "}
            {test.cardPublic ? "Anyone with this link can see it (never the emails)." : "It's private right now, so only you can see it."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={`/api/card/${test.slug}?format=story&download=1`} className="btn btn-sm btn-ink">
              ⬇ Story image
            </a>
            <Link href={`/dashboard/${test.id}`} className="btn btn-sm">
              Back to dashboard
            </Link>
          </div>
        </div>
      )}

      <section className="mt-10 w-full max-w-xl text-center">
        <h2 className="font-display text-2xl font-extrabold">Got an idea of your own?</h2>
        <p className="mt-2 text-ink-2">
          Make a pre-launch page in 2 minutes, share it, and let real people tell you if it&apos;s worth building.
        </p>
        <Link href="/new" className="btn btn-pink btn-lg mt-5">
          Put my idea to the test →
        </Link>
      </section>
    </main>
  );
}
