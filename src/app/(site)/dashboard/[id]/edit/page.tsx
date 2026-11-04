import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Editor } from "@/components/wizard/editor";
import { currentUser } from "@/lib/server/auth";
import { editableTest } from "@/lib/server/present";
import { getTestById } from "@/lib/server/repo";

export const metadata: Metadata = { title: "Edit page", robots: { index: false } };

export default function EditRoute({ params }: PageProps<"/dashboard/[id]/edit">) {
  return (
    <main className="flex-1">
      <Suspense fallback={<div className="mx-auto mt-10 h-96 max-w-6xl animate-pulse rounded-[22px] bg-paper-2" aria-busy="true" />}>
        <EditLoader params={params} />
      </Suspense>
    </main>
  );
}

async function EditLoader({ params }: { params: PageProps<"/dashboard/[id]/edit">["params"] }) {
  const { id } = await params;
  const user = await currentUser();
  const test = user ? await getTestById(id) : null;
  if (!user || !test || test.userId !== user.id) redirect("/dashboard");
  return <Editor test={editableTest(test)} live={test.status === "live"} />;
}
