import type { Metadata } from "next";
import { Wizard } from "@/components/wizard/wizard";

export const metadata: Metadata = {
  title: "Start a test",
  description: "Build a pre-launch page for your idea in 2 minutes.",
};

export default function NewTestPage() {
  return (
    <main className="flex-1">
      <Wizard />
    </main>
  );
}
