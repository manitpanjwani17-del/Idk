import { z } from "zod";
import { CATEGORY_IDS, EMOJIS, ETA_IDS } from "./catalog";
import { CURRENCIES } from "./money";
import { THEME_IDS } from "./themes";

/** Shared by the wizard (client) and the API (server) so rules never drift. */

const LINK_RE =
  /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|co|app|xyz|ly|gg|me|shop|store|link|site|info|biz|ru|tk)\b)/i;
export const LINK_MESSAGE = "Links aren't allowed on test pages (it keeps scammers out).";
export const hasLink = (s: string) => LINK_RE.test(s);

const text = (label: string, min: number, max: number) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(min, min <= 1 ? `${label} is required` : `${label} needs at least ${min} characters`)
    .max(max, `${label} can be ${max} characters max`)
    .refine((s) => !hasLink(s), LINK_MESSAGE);

export const contentBase = z.object({
  name: text("Name", 2, 40),
  tagline: text("Headline", 4, 90),
  description: z
    .string()
    .trim()
    .max(600, "Keep the description under 600 characters")
    .refine((s) => !hasLink(s), LINK_MESSAGE),
  category: z.enum(CATEGORY_IDS, { error: "Pick a category" }),
  emoji: z.string().refine((e) => (EMOJIS as readonly string[]).includes(e), "Pick an emoji from the list"),
  mode: z.enum(["preorder", "waitlist"]),
  priceCents: z
    .number({ error: "Enter a price" })
    .int()
    .min(0, "Price can't be negative")
    .max(10_000_000, "That price is too high to test here"),
  currency: z.enum(CURRENCIES),
  perks: z
    .array(text("Perk", 2, 60))
    .min(1, "Add at least one reason to want it")
    .max(4, "Four perks max"),
  cta: text("Button text", 2, 28),
  eta: z.enum(ETA_IDS, { error: "Pick when it drops" }),
  theme: z.enum(THEME_IDS, { error: "Pick a vibe" }),
  askPrice: z.boolean(),
});

export const rulesShape = {
  durationDays: z.union([z.literal(3), z.literal(5), z.literal(7), z.literal(14)], {
    error: "Pick how long the test runs",
  }),
  targetVisitors: z.union([z.literal(50), z.literal(100), z.literal(250)], {
    error: "Pick a visitor goal",
  }),
};

/** null = no image / remove it, "keep" = leave as is, data URL = new image. */
export const imageField = z
  .union([z.null(), z.literal("keep"), z.string().startsWith("data:image/").max(2_400_000, "That image is too big")])
  .optional();

type PriceCheck = { mode: "preorder" | "waitlist"; priceCents: number };
const priceRule = (v: PriceCheck, ctx: z.RefinementCtx) => {
  if (v.mode === "preorder" && v.priceCents < 100) {
    ctx.addIssue({ code: "custom", path: ["priceCents"], message: "Pre-orders need a price (at least 1)." });
  }
};

export const createTestSchema = contentBase
  .extend(rulesShape)
  .extend({ image: imageField, parentId: z.string().max(32).nullish() })
  .superRefine(priceRule);

export const updateTestSchema = contentBase.extend({ image: imageField }).superRefine(priceRule);

export type CreateTestInput = z.infer<typeof createTestSchema>;
export type ContentInput = z.infer<typeof contentBase>;

export const emailSchema = z
  .string({ error: "Enter your email" })
  .trim()
  .toLowerCase()
  .max(254, "That email is too long")
  .pipe(z.email("That email doesn't look right"));

export const passwordSchema = z
  .string({ error: "Enter a password" })
  .min(8, "Password needs at least 8 characters")
  .max(200, "Password is too long");

export const reserveSchema = z.object({
  slug: z.string().min(3).max(32),
  email: emailSchema,
  wouldPay: z.number().int().min(0).max(10_000_000).nullish(),
  source: z.string().max(24).optional(),
  referrer: z.string().max(500).optional(),
});

export const trackSchema = z.object({
  slug: z.string().min(3).max(32),
  type: z.enum(["view", "click"]),
  source: z.string().max(24).optional(),
  referrer: z.string().max(500).optional(),
});

export const reportSchema = z.object({
  slug: z.string().min(3).max(32),
  reason: z.enum(["scam", "offensive", "spam", "other"]),
});

/** First human-readable error from a failed parse. */
export function firstError(error: z.ZodError): { message: string; field?: string } {
  const issue = error.issues[0];
  return { message: issue?.message ?? "Something's off with that input", field: issue?.path?.join(".") || undefined };
}
