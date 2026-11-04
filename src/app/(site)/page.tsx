import Link from "next/link";
import type { CSSProperties } from "react";
import { BarExplorer } from "@/components/bar-explorer";
import { PhoneFrame } from "@/components/phone-frame";
import { TestPage, type TestPageData } from "@/components/test-page";
import { Stamp } from "@/components/verdict-ui";

const EXAMPLE: TestPageData = {
  slug: null,
  name: "Moodcase",
  tagline: "Crochet phone cases that match your vibe, made to order.",
  description: "",
  emoji: "🧶",
  mode: "preorder",
  priceCents: 2400,
  currency: "USD",
  perks: ["Pick your colours", "Early-bird price for the first 50", "Ships in 2 weeks"],
  cta: "Reserve mine",
  eta: "1m",
  theme: "bubblegum",
  askPrice: true,
  imageUrl: null,
  status: "live",
  endsAt: null,
  reservedCount: 17,
};

const STEPS = [
  {
    n: "01",
    title: "Pitch it",
    body: "Name it, price it, add a photo or an emoji. We build a clean pre-launch page in about 2 minutes.",
    color: "bg-pink",
    emoji: "✍️",
  },
  {
    n: "02",
    title: "Share it",
    body: "Post the link in your story, group chats or TikTok bio. Each link is tagged, so you see which crowd bites.",
    color: "bg-sky",
    emoji: "📲",
  },
  {
    n: "03",
    title: "Get the verdict",
    body: "We compare reservations to the bar for your price and tell you straight: ship it, change it or kill it, with reasons.",
    color: "bg-lime",
    emoji: "⚖️",
  },
];

const EXAMPLES = [
  { outcome: "ship" as const, name: "Crochet phone cases", price: "$24", stat: "41 of 290 reserved · 14%", bg: "bg-lime" },
  { outcome: "change" as const, name: "AI study planner", price: "$9/mo", stat: "11 of 210 reserved · 5.2%", bg: "bg-sun" },
  { outcome: "kill" as const, name: "Luxury dog hoodies", price: "$120", stat: "1 of 180 reserved · 0.6%", bg: "bg-tomato" },
];

const FAQ = [
  { q: "Is it free?", a: "Yes, while we're in beta. No card needed." },
  {
    q: "Do you run ads for me?",
    a: "Not yet. For now you share your link yourself: story, group chats, TikTok bio, a QR code on a flyer. One-tap ad tests are coming soon.",
  },
  {
    q: "Will my visitors be charged?",
    a: "Never. They reserve with an email. You get a list of real people who want the thing, which is exactly who you sell to at launch.",
  },
  {
    q: "What counts as a visitor?",
    a: "A unique person who opened your page. Bots, link previews and your own visits don't count, so the verdict stays honest.",
  },
  { q: "How many visitors do I need?", a: "At least 30 for any verdict. 100+ for a confident one. More traffic = more confidence." },
  { q: "Who sees the emails?", a: "Only you. Download them as a CSV whenever you want." },
  {
    q: "Do I need an account?",
    a: "No. Start straight away. Save your account later with an email and password so you can log in from any device.",
  },
  {
    q: "Is a verdict a guarantee?",
    a: "No. It's a strong signal from real people, way better than asking friends 'would you buy this?'. Use it to decide what to do next.",
  },
];

export default function Home() {
  return (
    <main className="overflow-x-clip">
      {/* HERO */}
      <section className="relative">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pb-24 lg:pt-16">
          <div className="animate-rise">
            <span className="inline-flex -rotate-2 items-center gap-2 rounded-full border-2 border-ink bg-sun px-3 py-1.5 text-sm font-bold shadow-brutal-sm">
              ⚡ for people with ideas and zero patience
            </span>
            <h1 className="mt-6 font-display text-[2.7rem] font-extrabold leading-[0.98] tracking-tight sm:text-6xl lg:text-[4.4rem]">
              Will your idea{" "}
              <span className="relative inline-block">
                <span className="absolute inset-x-[-0.12em] bottom-[0.06em] top-[0.3em] -z-10 -rotate-1 rounded-md bg-lime" aria-hidden="true" />
                actually sell?
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2 sm:text-xl">
              Make a pre-launch page in 2 minutes. Share the link. Real people reserve with their email. You get the
              verdict: <b className="text-ink">SHIP IT</b>, <b className="text-ink">CHANGE IT</b> or{" "}
              <b className="text-ink">KILL IT</b>.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/new" className="btn btn-ink btn-lg">
                Test my idea, free →
              </Link>
              <Link href="#how" className="btn btn-lg">
                How it works
              </Link>
            </div>
            <p className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-muted">
              <span>✓ No card</span>
              <span>✓ No code</span>
              <span>✓ Visitors never pay</span>
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-[380px] lg:mr-0">
            <div className="absolute -left-6 top-48 z-20 hidden rotate-[-8deg] rounded-2xl border-2 border-ink bg-card px-3 py-2 text-sm font-bold shadow-brutal sm:block animate-float" style={{ "--r": "-8deg" } as CSSProperties}>
              🔥 17 reserved
            </div>
            <div className="absolute -right-3 top-[30%] z-20 rounded-2xl border-2 border-ink bg-lime px-2 py-1 shadow-brutal sm:-right-10">
              <Stamp outcome="ship" className="text-2xl !border-[4px]" />
            </div>
            <span className="label-mono absolute -top-6 right-2 text-muted">Example · try tapping it</span>
            <PhoneFrame height={590}>
              <TestPage data={EXAMPLE} variant="preview" />
            </PhoneFrame>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="-rotate-1 border-y-2 border-ink bg-ink py-3 text-lime" aria-hidden="true">
        <div className="flex w-max animate-marquee gap-8 whitespace-nowrap font-display text-xl font-extrabold">
          {Array.from({ length: 2 }).map((_, k) => (
            <div key={k} className="flex gap-8">
              {["SHIP IT", "CHANGE IT", "KILL IT", "NO CODE", "NO CARD", "REAL PEOPLE", "REAL VERDICT", "2 MINUTES"].map((w) => (
                <span key={w} className="flex items-center gap-8">
                  {w} <span className="text-pink">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* HOW */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6">
        <p className="label-mono text-muted">How it works</p>
        <h2 className="mt-2 max-w-2xl font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Stop asking friends &ldquo;would you buy this?&rdquo;
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-ink-2">
          Friends say yes to be nice. Strangers tapping &ldquo;reserve&rdquo; with their real email is the closest thing to a
          sale before you have a product.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.n} className={`card p-6 ${i === 1 ? "md:translate-y-6" : ""}`}>
              <div className="flex items-center justify-between">
                <span className={`rounded-full border-2 border-ink ${s.color} px-3 py-1 font-display text-sm font-extrabold`}>{s.n}</span>
                <span className="text-3xl" aria-hidden="true">
                  {s.emoji}
                </span>
              </div>
              <h3 className="mt-5 font-display text-2xl font-extrabold">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-2">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* THE BAR */}
      <section id="rules" className="scroll-mt-20 border-y-2 border-ink bg-paper-2">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="label-mono text-muted">How verdicts work</p>
          <h2 className="mt-2 max-w-3xl font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Every price has a bar. Clear it and you ship.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-ink-2">
            A $5 sticker should convert way better than a $300 jacket. So the bar moves with your price. Drag it.
          </p>
          <div className="mt-10">
            <BarExplorer />
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["👀", "Your visits don't count", "We spot you and skip you, so you can check your page all day."],
              ["🧮", "Real stats, not vibes", "Small samples can't fake certainty. Every verdict shows its confidence."],
              ["🫶", "Friends are flagged", "If most people came from your group chats, we warn you before you go big."],
              ["💸", "Price check included", "Reservers say what they'd pay. We tell you if you're too high or too low."],
            ].map(([emoji, title, body]) => (
              <li key={title} className="rounded-2xl border-2 border-ink bg-card p-5">
                <span className="text-2xl" aria-hidden="true">
                  {emoji}
                </span>
                <p className="mt-3 font-bold">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* EXAMPLES */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <p className="label-mono text-muted">Example verdicts</p>
        <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-5xl">Three ideas walk into a test…</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {EXAMPLES.map((e, i) => (
            <div
              key={e.name}
              className={`card relative overflow-hidden ${e.bg} p-6`}
              style={{ transform: `rotate(${[-1.5, 1, -0.5][i]}deg)` }}
            >
              <span className="label-mono rounded-full border-2 border-ink bg-card px-2 py-0.5">Example</span>
              <p className="mt-5 font-display text-2xl font-extrabold leading-tight">{e.name}</p>
              <p className="mt-1 font-semibold">{e.price}</p>
              <div className="my-8 flex justify-center">
                <Stamp outcome={e.outcome} className="text-3xl" />
              </div>
              <p className="text-sm font-bold">{e.stat}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-muted">Every verdict comes with reasons and next moves, plus a card you can post.</p>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t-2 border-ink bg-card">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <p className="label-mono text-muted">FAQ</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-5xl">Fair questions.</h2>
          </div>
          <div className="space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl border-2 border-ink bg-paper px-5 py-4 open:bg-card open:shadow-brutal">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="text-2xl transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="mt-3 leading-relaxed text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="border-t-2 border-ink bg-pink">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
          <h2 className="max-w-xl font-display text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-5xl">
            Stop overthinking it. Test it.
          </h2>
          <Link href="/new" className="btn btn-ink btn-lg">
            Start my test →
          </Link>
        </div>
      </section>
    </main>
  );
}
