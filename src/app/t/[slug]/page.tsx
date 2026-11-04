import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TestPage } from "@/components/test-page";
import { currentUser } from "@/lib/server/auth";
import { siteOrigin } from "@/lib/server/origin";
import { pageData } from "@/lib/server/present";
import { countSignups, getTestBySlug } from "@/lib/server/repo";

export async function generateMetadata({ params }: PageProps<"/t/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const test = await getTestBySlug(slug);
  if (!test || test.hidden) return { title: "Page not found", robots: { index: false, follow: false } };
  const origin = await siteOrigin();
  const image = `${origin}/api/og/${test.slug}`;
  return {
    title: test.name,
    description: test.tagline,
    robots: { index: false, follow: false },
    openGraph: {
      title: `${test.emoji} ${test.name}`,
      description: test.tagline,
      url: `${origin}/t/${test.slug}`,
      images: [{ url: image, width: 1200, height: 630, alt: test.name }],
      type: "website",
    },
    twitter: { card: "summary_large_image", title: `${test.emoji} ${test.name}`, description: test.tagline, images: [image] },
  };
}

export default function PublicTestRoute({ params }: PageProps<"/t/[slug]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh animate-pulse bg-paper-2" aria-busy="true" />}>
      <PublicTest params={params} />
    </Suspense>
  );
}

async function PublicTest({ params }: { params: PageProps<"/t/[slug]">["params"] }) {
  const { slug } = await params;
  const test = await getTestBySlug(slug);
  if (!test) notFound();
  const user = await currentUser();
  const isOwner = user?.id === test.userId;

  if (test.hidden && !isOwner) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-5xl" aria-hidden="true">
          🚧
        </span>
        <h1 className="font-display text-2xl font-extrabold">This page is under review</h1>
        <p className="max-w-sm text-ink-2">A few people flagged it, so it&apos;s hidden for now while we take a look.</p>
        <Link href="/" className="btn btn-ink mt-2">
          What is Validly?
        </Link>
      </main>
    );
  }

  const reserved = await countSignups(test.id);
  return <TestPage data={pageData(test, reserved)} variant="public" isOwner={isOwner} ownerHref={`/dashboard/${test.id}`} />;
}
