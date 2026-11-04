import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { VerdictReveal } from "@/components/verdict-reveal";
import { currentUser } from "@/lib/server/auth";
import { siteOrigin } from "@/lib/server/origin";
import { getTestById } from "@/lib/server/repo";

export const metadata: Metadata = { title: "The verdict", robots: { index: false } };

export default function VerdictRoute({ params }: PageProps<"/dashboard/[id]/verdict">) {
  return (
    <Suspense fallback={<div className="fixed inset-0 z-[80] bg-ink" aria-busy="true" />}>
      <Reveal params={params} />
    </Suspense>
  );
}

async function Reveal({ params }: { params: PageProps<"/dashboard/[id]/verdict">["params"] }) {
  const { id } = await params;
  const user = await currentUser();
  const test = user ? await getTestById(id) : null;
  if (!user || !test || test.userId !== user.id) redirect("/dashboard");
  if (test.status !== "closed" || !test.verdict) redirect(`/dashboard/${test.id}`);
  const origin = await siteOrigin();
  return (
    <VerdictReveal
      origin={origin}
      verdict={test.verdict}
      test={{
        id: test.id,
        slug: test.slug,
        name: test.name,
        emoji: test.emoji,
        cta: test.cta,
        mode: test.mode,
        cardPublic: test.cardPublic && !test.hidden,
      }}
    />
  );
}
