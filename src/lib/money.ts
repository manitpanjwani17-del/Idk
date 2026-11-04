export const CURRENCIES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD"] as const;
export type Currency = (typeof CURRENCIES)[number];

/**
 * Rough USD value of one unit of each currency. Only used to pick a price band
 * for the verdict bar, so being a few percent off never changes an outcome much.
 */
export const USD_RATE: Record<Currency, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  INR: 0.012,
  CAD: 0.73,
  AUD: 0.66,
};

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  CAD: "CA$",
  AUD: "A$",
};

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}

/** Formats minor units (cents, paise…) as money: 2500 USD -> "$25", 1999 -> "$19.99". */
export function formatMoney(minor: number, currency: Currency): string {
  const major = minor / 100;
  const whole = Number.isInteger(major);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(major);
}

/** Parses what someone typed ("25", "19.99", "1,200") into minor units, or null. */
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[,\s]/g, "").replace(/[^0-9.]/g, "");
  if (!cleaned || !/^\d*\.?\d*$/.test(cleaned)) return null;
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

/** Rounds a price to something a human would actually charge. */
export function niceRound(minor: number): number {
  const major = minor / 100;
  if (major >= 100) return Math.round(major / 5) * 5 * 100;
  if (major >= 10) return Math.round(major) * 100;
  return Math.max(50, Math.round(major * 2) * 50);
}
