import type { TestPageData } from "@/components/test-page";
import { CATEGORIES, CTA_OPTIONS, suggestPerks, type CategoryId, type EtaId } from "./catalog";
import { isCurrency, parseMoney, type Currency } from "./money";
import type { ThemeId } from "./themes";
import { contentBase, rulesShape } from "./validation";
import { z } from "zod";

/** The wizard/editor state. Kept as typed strings until submit. */
export interface Draft {
  name: string;
  tagline: string;
  description: string;
  category: CategoryId | "";
  emoji: string;
  emojiTouched: boolean;
  mode: "preorder" | "waitlist";
  price: string;
  currency: Currency;
  perks: string[];
  perksTouched: boolean;
  cta: string;
  eta: EtaId;
  theme: ThemeId;
  askPrice: boolean;
  durationDays: 3 | 5 | 7 | 14;
  targetVisitors: 50 | 100 | 250;
  /** Newly picked photo as a data URL. */
  image: string | null;
  /** Photo already on the server (editing or a retrial). */
  imageUrl: string | null;
  keepImage: boolean;
  parentId: string | null;
}

export const defaultDraft = (): Draft => ({
  name: "",
  tagline: "",
  description: "",
  category: "",
  emoji: "✨",
  emojiTouched: false,
  mode: "preorder",
  price: "",
  currency: "USD",
  perks: [],
  perksTouched: false,
  cta: CTA_OPTIONS.preorder[0],
  eta: "1m",
  theme: "acid",
  askPrice: true,
  durationDays: 7,
  targetVisitors: 100,
  image: null,
  imageUrl: null,
  keepImage: false,
  parentId: null,
});

/** Best-guess currency from the browser language. */
export function guessCurrency(): Currency {
  const lang = (typeof navigator !== "undefined" ? navigator.language : "en-US").toLowerCase();
  if (lang.endsWith("-in") || lang.startsWith("hi")) return "INR";
  if (lang.endsWith("-gb")) return "GBP";
  if (lang.endsWith("-ca")) return "CAD";
  if (lang.endsWith("-au")) return "AUD";
  if (/^(de|fr|es|it|nl|pt|fi|el|ga|sk|sl|et|lv|lt)\b/.test(lang)) return "EUR";
  return "USD";
}

/** Applies a category pick, also filling the emoji and perks if the creator hasn't customised them. */
export function withCategory(d: Draft, category: CategoryId): Draft {
  const cat = CATEGORIES.find((c) => c.id === category);
  return {
    ...d,
    category,
    emoji: d.emojiTouched || !cat ? d.emoji : cat.emoji,
    perks: d.perksTouched ? d.perks : suggestPerks(category),
  };
}

/** Switching pre-order/waitlist also swaps the default button text. */
export function withMode(d: Draft, mode: Draft["mode"]): Draft {
  const wasDefault = (CTA_OPTIONS[d.mode] as readonly string[]).includes(d.cta);
  return { ...d, mode, cta: wasDefault ? CTA_OPTIONS[mode][0] : d.cta };
}

export function priceCents(d: Draft): number | null {
  if (d.price.trim() === "") return d.mode === "waitlist" ? 0 : null;
  return parseMoney(d.price);
}

export function draftPayload(d: Draft) {
  return {
    name: d.name,
    tagline: d.tagline,
    description: d.description,
    category: d.category,
    emoji: d.emoji,
    mode: d.mode,
    priceCents: priceCents(d) ?? 0,
    currency: d.currency,
    perks: d.perks.map((p) => p.trim()).filter(Boolean),
    cta: d.cta,
    eta: d.eta,
    theme: d.theme,
    askPrice: d.askPrice,
    durationDays: d.durationDays,
    targetVisitors: d.targetVisitors,
    image: d.image ? d.image : d.imageUrl && d.keepImage ? "keep" : null,
    parentId: d.parentId,
  };
}

/** Just the page content (for editing an existing test). */
export function contentPayload(d: Draft) {
  const p = draftPayload(d);
  return {
    name: p.name,
    tagline: p.tagline,
    description: p.description,
    category: p.category,
    emoji: p.emoji,
    mode: p.mode,
    priceCents: p.priceCents,
    currency: p.currency,
    perks: p.perks,
    cta: p.cta,
    eta: p.eta,
    theme: p.theme,
    askPrice: p.askPrice,
    image: p.image,
  };
}

export function draftPageData(d: Draft): TestPageData {
  return {
    slug: null,
    name: d.name,
    tagline: d.tagline,
    description: d.description,
    emoji: d.emoji,
    mode: d.mode,
    priceCents: priceCents(d) ?? 0,
    currency: d.currency,
    perks: d.perks.map((p) => p.trim()).filter(Boolean),
    cta: d.cta || "Reserve mine",
    eta: d.eta,
    theme: d.theme,
    askPrice: d.askPrice,
    imageUrl: d.image ?? (d.keepImage ? d.imageUrl : null),
    status: "live",
    endsAt: null,
    reservedCount: 0,
  };
}

export interface EditableLike {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  emoji: string;
  mode: "preorder" | "waitlist";
  priceCents: number;
  currency: string;
  perks: string[];
  cta: string;
  eta: string;
  theme: string;
  askPrice: boolean;
  durationDays: number;
  targetVisitors: number;
  imageUrl: string | null;
}

export function draftFromTest(t: EditableLike, opts: { retrial: boolean }): Draft {
  const base = defaultDraft();
  return {
    ...base,
    name: t.name,
    tagline: t.tagline,
    description: t.description,
    category: (CATEGORIES.some((c) => c.id === t.category) ? t.category : "other") as CategoryId,
    emoji: t.emoji,
    emojiTouched: true,
    mode: t.mode,
    price: t.priceCents > 0 ? String(t.priceCents / 100) : "",
    currency: isCurrency(t.currency) ? t.currency : "USD",
    perks: t.perks,
    perksTouched: true,
    cta: t.cta,
    eta: t.eta as EtaId,
    theme: t.theme as ThemeId,
    askPrice: t.askPrice,
    durationDays: ([3, 5, 7, 14].includes(t.durationDays) ? t.durationDays : 7) as Draft["durationDays"],
    targetVisitors: ([50, 100, 250].includes(t.targetVisitors) ? t.targetVisitors : 100) as Draft["targetVisitors"],
    imageUrl: t.imageUrl,
    keepImage: Boolean(t.imageUrl),
    parentId: opts.retrial ? t.id : null,
  };
}

export type FieldErrors = Partial<Record<string, string>>;

function collect(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export const STEP_FIELDS = {
  idea: ["name", "tagline", "category"],
  deal: ["mode", "price", "currency", "eta"],
  pitch: ["perks", "cta", "description"],
  look: ["emoji", "theme", "image"],
  rules: ["durationDays", "targetVisitors", "askPrice"],
} as const;

export type StepId = keyof typeof STEP_FIELDS;

/** Validates just the fields of one step, with the same rules the server uses. */
export function validateStep(d: Draft, step: StepId): FieldErrors {
  const p = draftPayload(d);
  switch (step) {
    case "idea": {
      const r = contentBase.pick({ name: true, tagline: true, category: true }).safeParse(p);
      return r.success ? {} : collect(r.error);
    }
    case "deal": {
      const errors: FieldErrors = {};
      const cents = priceCents(d);
      if (cents === null) errors.price = d.price.trim() ? "Enter a price like 25 or 19.99" : "Enter a price";
      else if (d.mode === "preorder" && cents < 100) errors.price = "Pre-orders need a price (at least 1).";
      else if (cents > 10_000_000) errors.price = "That price is too high to test here";
      const r = contentBase.pick({ mode: true, currency: true, eta: true }).safeParse(p);
      return { ...(r.success ? {} : collect(r.error)), ...errors };
    }
    case "pitch": {
      const r = contentBase.pick({ perks: true, cta: true, description: true }).safeParse(p);
      if (r.success) return {};
      const errors = collect(r.error);
      return errors;
    }
    case "look": {
      const r = contentBase.pick({ emoji: true, theme: true }).safeParse(p);
      return r.success ? {} : collect(r.error);
    }
    case "rules": {
      const r = z.object(rulesShape).safeParse(p);
      return r.success ? {} : collect(r.error);
    }
  }
}

/** Shrinks a photo in the browser to ≤1200px JPEG so uploads are fast on mobile data. */
export async function processImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("That file isn't an image.");
  if (file.size > 20_000_000) throw new Error("That image is huge (20 MB+). Pick a smaller one.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Couldn't read that image. Try a JPG or PNG."));
      el.src = url;
    });
    const max = 1200;
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser couldn't process that image.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let quality = 0.86;
    let data = canvas.toDataURL("image/jpeg", quality);
    while (data.length * 0.75 > 1_400_000 && quality > 0.4) {
      quality -= 0.15;
      data = canvas.toDataURL("image/jpeg", quality);
    }
    if (data.length * 0.75 > 1_450_000) throw new Error("That image is too detailed to upload. Try another.");
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}
