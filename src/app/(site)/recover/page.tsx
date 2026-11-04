import type { Metadata } from "next";
import Link from "next/link";
import { RecoverForm } from "@/components/account/forms";

export const metadata: Metadata = { title: "Reset password" };

export default function RecoverPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:py-16">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Forgot your password?</h1>
      <p className="mt-3 text-ink-2">
        Use the recovery code you saved when you created your account. It looks like <b className="font-mono">ABCD-EFGH-JKLM</b>.
      </p>
      <div className="card mt-8 p-6">
        <RecoverForm />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-bold text-ink underline underline-offset-2">
          Log in
        </Link>
      </p>
    </main>
  );
}
