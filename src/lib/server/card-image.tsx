import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { formatMoney } from "../money";
import { pct, type Outcome } from "../verdict";
import type { StoredVerdict, TestRecord } from "./repo";

export const OUTCOME_COLORS: Record<Outcome, { bg: string; ink: string; stamp: string }> = {
  ship: { bg: "#c8ff2e", ink: "#111111", stamp: "#111111" },
  change: { bg: "#ffd23f", ink: "#111111", stamp: "#111111" },
  kill: { bg: "#ff5a36", ink: "#111111", stamp: "#111111" },
  more: { bg: "#b9a6ff", ink: "#111111", stamp: "#111111" },
};

let fontCache: Promise<Array<{ name: string; data: Buffer; weight: 500 | 700 | 800; style: "normal" }>> | null = null;

function fonts() {
  if (!fontCache) {
    const dir = path.join(process.cwd(), "src", "assets", "fonts");
    fontCache = Promise.all([
      readFile(path.join(dir, "Unbounded-ExtraBold.ttf")),
      readFile(path.join(dir, "SpaceGrotesk-Medium.ttf")),
      readFile(path.join(dir, "SpaceGrotesk-Bold.ttf")),
    ]).then(([unbounded, groteskMedium, groteskBold]) => [
      { name: "Unbounded", data: unbounded, weight: 800 as const, style: "normal" as const },
      { name: "Grotesk", data: groteskMedium, weight: 500 as const, style: "normal" as const },
      { name: "Grotesk", data: groteskBold, weight: 700 as const, style: "normal" as const },
    ]);
    fontCache.catch(() => {
      fontCache = null;
    });
  }
  return fontCache;
}

/** Emoji need a network font fetch in the renderer; drop them so cards always render. */
function plain(text: string): string {
  return text
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}\u{1F3FB}-\u{1F3FF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export interface CardData {
  test: TestRecord;
  verdict: StoredVerdict;
  host: string | null;
}

function Stamp({ title, size, color }: { title: string; size: number; color: string }) {
  return (
    <div
      style={{
        display: "flex",
        border: `${Math.round(size / 9)}px solid ${color}`,
        borderRadius: Math.round(size / 3),
        padding: `${Math.round(size / 5)}px ${Math.round(size / 2.6)}px`,
        transform: "rotate(-7deg)",
        fontFamily: "Unbounded",
        fontSize: size,
        lineHeight: 1,
        color,
        letterSpacing: -2,
      }}
    >
      {title}
    </div>
  );
}

/** Link preview for a live test page (what people see in group chats). */
export async function renderPagePreview(test: TestRecord, theme: { bg: string; text: string; accent: string; accentText: string; border: string }): Promise<ImageResponse> {
  const name = truncate(plain(test.name) || "New drop", 36);
  const tagline = truncate(plain(test.tagline), 100);
  const price =
    test.priceCents > 0
      ? `${formatMoney(test.priceCents, test.currency)}${test.mode === "preorder" ? " · pre-order" : ""}`
      : "Free waitlist";
  const fontList = await fonts();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: theme.bg,
          color: theme.text,
          padding: "70px 80px",
          fontFamily: "Grotesk",
        }}
      >
        <div style={{ display: "flex" }}>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 3,
              border: `3px solid ${theme.border}`,
              borderRadius: 999,
              padding: "8px 22px",
            }}
          >
            PRE-LAUNCH
          </div>
        </div>
        <div style={{ display: "flex", fontFamily: "Unbounded", fontSize: name.length > 20 ? 70 : 92, lineHeight: 1.02, marginTop: 44 }}>
          {name}
        </div>
        <div style={{ display: "flex", fontSize: 36, marginTop: 24, lineHeight: 1.3, fontWeight: 500, maxWidth: 980 }}>{tagline}</div>
        <div style={{ display: "flex", flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>{price}</div>
          <div
            style={{
              display: "flex",
              background: theme.accent,
              color: theme.accentText,
              border: `3px solid ${theme.border}`,
              borderRadius: 24,
              padding: "18px 34px",
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            {truncate(plain(test.cta) || "Reserve", 24)}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: fontList },
  );
}

export async function renderCard({ test, verdict, host }: CardData, format: "wide" | "story"): Promise<ImageResponse> {
  const colors = OUTCOME_COLORS[verdict.outcome];
  const name = truncate(plain(test.name) || "My idea", 40);
  const tagline = truncate(plain(test.tagline), 90);
  const price = test.priceCents > 0 ? formatMoney(test.priceCents, test.currency) : "Free waitlist";
  const footer = host && !/^(localhost|127\.|0\.0\.0\.0)/.test(host) ? host : "validly";
  const s = verdict.stats;
  const stats = [
    { label: "visitors", value: String(s.visitors) },
    { label: test.mode === "waitlist" ? "joined" : "reserved", value: String(s.reservations) },
    { label: "conversion", value: pct(verdict.rate) },
  ];
  const fontList = await fonts();

  if (format === "story") {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            background: colors.bg,
            color: colors.ink,
            padding: "110px 90px",
            fontFamily: "Grotesk",
          }}
        >
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, letterSpacing: 6 }}>THE VERDICT IS IN</div>
          <div
            style={{
              display: "flex",
              fontFamily: "Unbounded",
              fontSize: name.length > 22 ? 78 : 104,
              lineHeight: 1.05,
              marginTop: 40,
            }}
          >
            {name}
          </div>
          <div style={{ display: "flex", fontSize: 40, marginTop: 28, fontWeight: 500, lineHeight: 1.3 }}>{tagline}</div>
          <div style={{ display: "flex", fontSize: 36, marginTop: 26, fontWeight: 700 }}>{price}</div>
          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Stamp title={verdict.title} size={verdict.title.length > 9 ? 92 : 132} color={colors.stamp} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {stats.map((st) => (
              <div
                key={st.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  borderTop: `5px solid ${colors.ink}`,
                  paddingTop: 18,
                }}
              >
                <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>{st.label}</div>
                <div style={{ display: "flex", fontFamily: "Unbounded", fontSize: 88 }}>{st.value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 60, fontSize: 34, fontWeight: 700 }}>
            <div style={{ display: "flex" }}>{`Hype score ${verdict.score}/100`}</div>
            <div style={{ display: "flex" }}>{footer}</div>
          </div>
        </div>
      ),
      { width: 1080, height: 1920, fonts: fontList },
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: colors.bg,
          color: colors.ink,
          padding: "64px 72px",
          fontFamily: "Grotesk",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 40 }}>
          <div style={{ display: "flex", fontSize: 22, fontWeight: 700, letterSpacing: 4 }}>THE VERDICT IS IN</div>
          <div
            style={{
              display: "flex",
              fontFamily: "Unbounded",
              fontSize: name.length > 18 ? 52 : 68,
              lineHeight: 1.05,
              marginTop: 22,
            }}
          >
            {name}
          </div>
          <div style={{ display: "flex", fontSize: 28, marginTop: 18, fontWeight: 500, lineHeight: 1.3 }}>{tagline}</div>
          <div style={{ display: "flex", flex: 1 }} />
          <div style={{ display: "flex", gap: 40 }}>
            {stats.map((st) => (
              <div key={st.label} style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontFamily: "Unbounded", fontSize: 52 }}>{st.value}</div>
                <div style={{ display: "flex", fontSize: 24, fontWeight: 700 }}>{st.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 22, fontWeight: 700 }}>{`${price} · ${footer}`}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 420 }}>
          <Stamp title={verdict.title} size={verdict.title.length > 9 ? 50 : 78} color={colors.stamp} />
          <div style={{ display: "flex", marginTop: 46, fontSize: 30, fontWeight: 700 }}>{`Hype score ${verdict.score}/100`}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: fontList },
  );
}
