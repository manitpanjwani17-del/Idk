import Link from "next/link";
import { Logo } from "@/components/brand";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <Logo />
      <span className="stamp mt-6 text-4xl text-ink">404</span>
      <h1 className="mt-6 font-display text-3xl font-extrabold">This page doesn&apos;t exist</h1>
      <p className="max-w-sm text-ink-2">
        The link might be wrong, or the creator deleted their test. Ideas come and go. Maybe it&apos;s your turn?
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn">
          Home
        </Link>
        <Link href="/new" className="btn btn-ink">
          Test my own idea
        </Link>
      </div>
    </main>
  );
}
