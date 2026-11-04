import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/account/forms";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:py-16">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Welcome back</h1>
      <p className="mt-3 text-ink-2">Log in to see your tests. Anything you made as a guest on this device comes with you.</p>
      <div className="card mt-8 p-6">
        <LoginForm />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <Link href="/new" className="font-bold text-ink underline underline-offset-2">
          Start a test, no account needed
        </Link>
      </p>
    </main>
  );
}
