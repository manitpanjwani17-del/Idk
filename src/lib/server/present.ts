import type { TestPageData } from "@/components/test-page";
import type { TestRecord } from "./repo";

/** URL of a test's uploaded photo, versioned so browsers can cache it forever. */
export function imageUrl(test: Pick<TestRecord, "slug" | "imageVersion">): string | null {
  return test.imageVersion > 0 ? `/api/img/${test.slug}?v=${test.imageVersion}` : null;
}

/** The editable content of a test, as the wizard/editor expects it. */
export function editableTest(test: TestRecord) {
  return {
    id: test.id,
    slug: test.slug,
    status: test.status,
    name: test.name,
    tagline: test.tagline,
    description: test.description,
    category: test.category,
    emoji: test.emoji,
    mode: test.mode,
    priceCents: test.priceCents,
    currency: test.currency,
    perks: test.perks,
    cta: test.cta,
    eta: test.eta,
    theme: test.theme,
    askPrice: test.askPrice,
    durationDays: test.durationDays,
    targetVisitors: test.targetVisitors,
    imageUrl: imageUrl(test),
  };
}

export type EditableTest = ReturnType<typeof editableTest>;

/** What the public test page needs, and nothing private. */
export function pageData(test: TestRecord, reservedCount: number): TestPageData {
  return {
    slug: test.slug,
    name: test.name,
    tagline: test.tagline,
    description: test.description,
    emoji: test.emoji,
    mode: test.mode,
    priceCents: test.priceCents,
    currency: test.currency,
    perks: test.perks,
    cta: test.cta,
    eta: test.eta,
    theme: test.theme,
    askPrice: test.askPrice,
    imageUrl: imageUrl(test),
    status: test.status,
    endsAt: test.endsAt,
    reservedCount,
  };
}
