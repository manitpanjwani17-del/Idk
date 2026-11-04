/** Where a visitor came from. Creators share links tagged with ?s=<id>. */
export const SOURCES = {
  ig: { label: "Instagram", short: "IG" },
  tt: { label: "TikTok", short: "TikTok" },
  gc: { label: "Group chats", short: "Chats" },
  sc: { label: "Snapchat", short: "Snap" },
  x: { label: "X", short: "X" },
  li: { label: "LinkedIn", short: "LinkedIn" },
  rd: { label: "Reddit", short: "Reddit" },
  yt: { label: "YouTube", short: "YouTube" },
  qr: { label: "QR code", short: "QR" },
  direct: { label: "Direct link", short: "Direct" },
} as const;

export type SourceId = keyof typeof SOURCES;

export function isSourceId(value: string): value is SourceId {
  return Object.prototype.hasOwnProperty.call(SOURCES, value);
}

export function sourceLabel(id: string): string {
  return isSourceId(id) ? SOURCES[id].label : id;
}

const REFERRER_MAP: Array<[RegExp, SourceId]> = [
  [/(^|\.)instagram\.com$/, "ig"],
  [/(^|\.)tiktok\.com$/, "tt"],
  [/(^|\.)snapchat\.com$/, "sc"],
  [/(^|\.)(x\.com|twitter\.com|t\.co)$/, "x"],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, "li"],
  [/(^|\.)reddit\.com$/, "rd"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "yt"],
  [/(^|\.)(whatsapp\.com|wa\.me|discord\.com|telegram\.org|t\.me)$/, "gc"],
];

/** Picks the visitor's source from the ?s= tag first, then the referrer. */
export function resolveSource(tag: string | null | undefined, referrer: string | null | undefined): SourceId {
  const clean = (tag ?? "").toLowerCase().trim();
  if (clean && isSourceId(clean)) return clean;
  if (referrer) {
    try {
      const host = new URL(referrer).hostname.toLowerCase();
      for (const [re, id] of REFERRER_MAP) if (re.test(host)) return id;
    } catch {
      // not a URL — ignore
    }
  }
  return "direct";
}
