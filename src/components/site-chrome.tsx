import Link from "next/link";
import { Logo } from "./brand";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
          <Link href="/#how" className="btn btn-ghost btn-sm hidden md:inline-flex">
            How it works
          </Link>
          <Link href="/dashboard" className="btn btn-ghost btn-sm">
            My tests
          </Link>
          <Link href="/account" className="btn btn-ghost btn-sm hidden sm:inline-flex">
            Account
          </Link>
          <Link href="/new" className="btn btn-ink btn-sm">
            <span className="sm:hidden">+ New</span>
            <span className="hidden sm:inline">Start a test</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t-2 border-ink bg-ink text-paper">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <p className="font-display text-2xl font-extrabold">validly</p>
          <p className="mt-2 max-w-sm text-sm text-paper/70">
            Find out if your idea will sell before you spend months building it. Real people, real signal, zero
            guessing.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold" aria-label="Footer">
          <Link href="/new" className="hover:text-lime">
            Start a test
          </Link>
          <Link href="/#how" className="hover:text-lime">
            How it works
          </Link>
          <Link href="/#rules" className="hover:text-lime">
            How verdicts work
          </Link>
          <Link href="/#faq" className="hover:text-lime">
            FAQ
          </Link>
          <Link href="/dashboard" className="hover:text-lime">
            My tests
          </Link>
          <Link href="/account" className="hover:text-lime">
            Account
          </Link>
        </nav>
      </div>
    </footer>
  );
}
