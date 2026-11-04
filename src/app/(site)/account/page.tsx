import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GuestDeleteLink, SaveAccountForm, SignedInPanel } from "@/components/account/forms";
import { currentUser } from "@/lib/server/auth";
import { one } from "@/lib/server/db";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

export default function AccountPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:py-14">
      <Suspense fallback={<div className="h-80 animate-pulse rounded-[22px] bg-paper-2" aria-busy="true" />}>
        <AccountContent />
      </Suspense>
    </main>
  );
}

async function AccountContent() {
  const user = await currentUser();
  const tests = user ? await one<{ n: number }>(`SELECT COUNT(*) AS n FROM tests WHERE user_id = ?`, [user.id]) : null;
  const testCount = Number(tests?.n ?? 0);

  if (user && !user.isGuest && user.email) {
    return (
      <>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Account</h1>
        <div className="mt-8">
          <SignedInPanel email={user.email} />
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="font-display text-4xl font-extrabold tracking-tight">
        {testCount > 0 ? "Save your account" : "Create an account"}
      </h1>
      <p className="mt-3 text-ink-2">
        {testCount > 0
          ? `You have ${testCount} ${testCount === 1 ? "test" : "tests"} on a guest account. Add an email and password so you can log in from any device and never lose them.`
          : "You don't need one to start a test, but an account lets you log in from any device."}
      </p>
      <div className="card mt-8 p-6">
        <SaveAccountForm hasTests={testCount > 0} />
      </div>
      {!user && (
        <p className="mt-6 text-center text-sm text-muted">
          Just want to try it?{" "}
          <Link href="/new" className="font-bold text-ink underline underline-offset-2">
            Start a test without an account
          </Link>
        </p>
      )}
      {user && (
        <div className="mt-10">
          <GuestDeleteLink />
        </div>
      )}
    </>
  );
}
