"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { copyText } from "@/lib/client";

const CHANNELS = [
  { id: "ig", label: "IG story", emoji: "📸" },
  { id: "tt", label: "TikTok", emoji: "🎵" },
  { id: "gc", label: "Group chat", emoji: "💬" },
  { id: "sc", label: "Snapchat", emoji: "👻" },
  { id: "x", label: "X", emoji: "𝕏" },
  { id: "li", label: "LinkedIn", emoji: "💼" },
  { id: "qr", label: "QR code", emoji: "🔳" },
] as const;

type ChannelId = (typeof CHANNELS)[number]["id"];

function caption(channel: ChannelId, name: string, tagline: string, link: string, waitlist: boolean): string {
  const action = waitlist ? "join the waitlist" : "reserve one";
  switch (channel) {
    case "ig":
      return `would you actually buy this? 👀\n${name}: ${tagline}\ntap the link to ${action} (no payment) ⬆️`;
    case "tt":
      return `testing an idea before i build it: ${name} 🫣 if you'd want one, ${action} at the link in my bio. no payment, just tells me if i should make it`;
    case "gc":
      return `ok be honest, would you get this? ${name}: ${tagline} takes 5 sec, no payment 👉 ${link}`;
    case "sc":
      return `would u buy this?? 👀 ${link}`;
    case "x":
      return `building in public: would you buy ${name}? ${tagline}\n\n${action} (free) 👇\n${link}`;
    case "li":
      return `I'm validating a new idea before building it: ${name}. ${tagline}\n\nIf it sounds useful, you can ${action} for free here: ${link}`;
    case "qr":
      return `Print it, stick it on your table at the market, flyer or locker. Scans are tracked separately.`;
  }
}

export function ShareKit({
  origin,
  slug,
  name,
  tagline,
  waitlist,
  highlight = false,
}: {
  origin: string;
  slug: string;
  name: string;
  tagline: string;
  waitlist: boolean;
  highlight?: boolean;
}) {
  const [channel, setChannel] = useState<ChannelId>("ig");
  const [copied, setCopied] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const base = `${origin}/t/${slug}`;
  const link = `${base}?s=${channel}`;
  const text = caption(channel, name, tagline, link, waitlist);

  useEffect(() => {
    if (channel !== "qr") return;
    let cancelled = false;
    QRCode.toDataURL(`${base}?s=qr`, { margin: 2, width: 720, color: { dark: "#111111", light: "#ffffff" } })
      .then((url) => !cancelled && setQr(url))
      .catch(() => !cancelled && setQr(null));
    return () => {
      cancelled = true;
    };
  }, [channel, base]);

  async function copy(value: string, what: string) {
    const ok = await copyText(value);
    setCopied(ok ? what : "Couldn't copy. Long-press to copy instead.");
    window.setTimeout(() => setCopied(null), 2200);
  }

  const openUrl =
    channel === "x"
      ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
      : channel === "gc"
        ? `https://wa.me/?text=${encodeURIComponent(text)}`
        : channel === "li"
          ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`
          : null;

  return (
    <section className={`card p-5 ${highlight ? "ring-4 ring-lime" : ""}`} aria-labelledby="share-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="share-title" className="font-display text-xl font-extrabold">
          Share your link
        </h2>
        <a href={base} target="_blank" rel="noreferrer" className="text-sm font-bold underline underline-offset-2">
          Open page ↗
        </a>
      </div>
      <div className="mt-3 flex gap-2">
        <input readOnly value={base} aria-label="Your test link" className="input !py-2.5 text-sm font-semibold" onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="btn btn-ink btn-sm shrink-0" onClick={() => copy(base, "Link copied!")}>
          Copy
        </button>
      </div>

      <p className="label-mono mt-5 text-muted">Where are you posting it?</p>
      <div className="scrollbar-none -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Channel">
        {CHANNELS.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={channel === c.id}
            data-on={channel === c.id}
            className="chip shrink-0 !text-sm"
            onClick={() => setChannel(c.id)}
          >
            <span aria-hidden="true">{c.emoji}</span> {c.label}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border-2 border-ink bg-paper-2 p-4" role="tabpanel">
        {channel === "qr" ? (
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            <div className="h-40 w-40 shrink-0 overflow-hidden rounded-xl border-2 border-ink bg-card">
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt={`QR code for ${name}`} className="h-full w-full" />
              ) : (
                <div className="h-full w-full animate-pulse bg-paper-2" />
              )}
            </div>
            <div className="text-sm">
              <p className="text-ink-2">{text}</p>
              {qr && (
                <a href={qr} download={`validly-${slug}-qr.png`} className="btn btn-sm mt-3">
                  Download QR
                </a>
              )}
            </div>
          </div>
        ) : (
          <>
            <p className="whitespace-pre-line text-sm leading-relaxed">{text}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn btn-sm btn-lime" onClick={() => copy(text, "Caption copied!")}>
                Copy caption
              </button>
              <button type="button" className="btn btn-sm" onClick={() => copy(link, "Tagged link copied!")}>
                Copy tagged link
              </button>
              {openUrl && (
                <a href={openUrl} target="_blank" rel="noreferrer" className="btn btn-sm">
                  Open {channel === "gc" ? "WhatsApp" : channel === "x" ? "X" : "LinkedIn"} ↗
                </a>
              )}
            </div>
            <p className="mt-3 text-xs text-muted">
              Tagged link: <span className="break-all font-semibold">{link}</span>
              <br />
              Use it {channel === "ig" ? "with a link sticker" : channel === "tt" ? "in your bio" : "when you post"} so we can tell
              you which crowd converts best.
            </p>
          </>
        )}
      </div>
      <p className="mt-3 h-5 text-sm font-bold text-[#2a6b00]" aria-live="polite">
        {copied}
      </p>
    </section>
  );
}
