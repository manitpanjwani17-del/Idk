/** Everything a creator picks from in the wizard, plus the copy suggestions. */

export const CATEGORIES = [
  { id: "fashion", label: "Fashion & merch", emoji: "👕" },
  { id: "beauty", label: "Beauty & self-care", emoji: "💄" },
  { id: "food", label: "Food & drinks", emoji: "🍜" },
  { id: "digital", label: "App, template or tool", emoji: "📱" },
  { id: "service", label: "A service", emoji: "🛠️" },
  { id: "learning", label: "Course or coaching", emoji: "🎓" },
  { id: "art", label: "Art & handmade", emoji: "🎨" },
  { id: "event", label: "Event or experience", emoji: "🎟️" },
  { id: "other", label: "Something else", emoji: "✨" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];

export const EMOJIS = [
  "👕", "🧢", "👟", "💍", "👜", "💄", "🧴", "🕯️",
  "🍜", "🧋", "🍪", "☕", "🌶️", "🥗", "📱", "💻",
  "🎧", "🎮", "📚", "🎓", "🎨", "🧶", "📸", "🎟️",
  "🪴", "🐶", "🏋️", "🧘", "💸", "🚀", "🔥", "✨",
] as const;

export const ETAS = [
  { id: "1w", label: "Next week" },
  { id: "1m", label: "In 2–4 weeks" },
  { id: "2m", label: "In 1–2 months" },
  { id: "later", label: "Later this year" },
] as const;

export type EtaId = (typeof ETAS)[number]["id"];
export const ETA_IDS = ETAS.map((e) => e.id) as [EtaId, ...EtaId[]];

export function etaLabel(id: string): string {
  return ETAS.find((e) => e.id === id)?.label ?? "Soon";
}

export const DURATIONS = [3, 5, 7, 14] as const;
export const TARGETS = [50, 100, 250] as const;

const TAGLINES: Record<CategoryId, string[]> = {
  fashion: [
    "Fits that start conversations.",
    "Limited drop. Unlimited compliments.",
    "Wear something nobody else has.",
    "Your new favourite thing to wear.",
  ],
  beauty: [
    "Main-character glow, no filter needed.",
    "Self-care that actually feels like care.",
    "Your routine, upgraded.",
    "Made for your skin, not the algorithm.",
  ],
  food: [
    "Taste first, thank us later.",
    "Your new 3pm craving.",
    "Small batch. Big flavour.",
    "Snacks worth leaving the house for.",
  ],
  digital: [
    "Do the thing in half the time.",
    "The shortcut you wish you had last week.",
    "Built for people who hate busywork.",
    "Less scrolling. More doing.",
  ],
  service: [
    "You do you. We'll handle the rest.",
    "Done properly, done on time.",
    "The help you've been putting off finding.",
    "One message and it's sorted.",
  ],
  learning: [
    "Learn it from someone who actually did it.",
    "Skip the 40-hour course. Get the good part.",
    "From zero to dangerous in a weekend.",
    "The class you'll actually finish.",
  ],
  art: [
    "Made by hand. Made for you.",
    "One of one. Like you.",
    "Art that makes your room feel like you.",
    "Tiny batch, big feelings.",
  ],
  event: [
    "The night everyone talks about after.",
    "Come for the vibe, stay for the people.",
    "Limited spots. Zero regrets.",
    "Your next favourite memory.",
  ],
  other: [
    "Something new is dropping.",
    "You didn't know you needed this.",
    "Built for people like you.",
    "Be first. Brag later.",
  ],
};

const PERKS: Record<CategoryId, string[]> = {
  fashion: ["Limited first batch", "Early-bird price for reservers", "First pick of colours"],
  beauty: ["Early-bird price for reservers", "First batch ships to you first", "Made in small batches"],
  food: ["First taste before anyone else", "Launch-week discount", "Small-batch fresh"],
  digital: ["Free early access", "Founding-member price, locked forever", "Shape what gets built"],
  service: ["Priority booking for reservers", "Launch discount", "Quick turnaround"],
  learning: ["Founding-student price", "Small first cohort", "Direct access to me"],
  art: ["First pick from the drop", "Reserver-only pieces", "Signed and numbered"],
  event: ["First access to tickets", "Reserver-only price", "Limited spots"],
  other: ["First access when it drops", "Early-bird price", "Shape the final version"],
};

export const CTA_OPTIONS = {
  preorder: ["Reserve mine", "I want one", "Lock my spot", "Count me in"],
  waitlist: ["Join the waitlist", "Get early access", "Notify me", "I'm interested"],
} as const;

function sentence(value: string): string {
  const v = value.trim().replace(/\s+/g, " ");
  if (!v) return "";
  const cap = v[0].toUpperCase() + v.slice(1);
  return /[.!?…]$/.test(cap) ? cap : `${cap}.`;
}

/** Headline ideas: the creator's own one-liner first, then category lines. */
export function suggestTaglines(category: CategoryId, oneLiner: string): string[] {
  const own = sentence(oneLiner);
  const list = [own, ...TAGLINES[category]].filter((t) => t && t.length <= 90);
  return Array.from(new Set(list));
}

export function suggestPerks(category: CategoryId): string[] {
  return [...PERKS[category]];
}

export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? "Something else";
}
