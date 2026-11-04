import Link from "next/link";

export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="6" y="8" width="52" height="52" rx="16" fill="#111" />
      <rect x="3" y="4" width="52" height="52" rx="16" fill="#c8ff2e" stroke="#111" strokeWidth="4" />
      <path
        d="M17 31l9 9 17-19"
        fill="none"
        stroke="#111"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2" aria-label="Validly home">
      <span className="transition-transform group-hover:-rotate-6">
        <LogoMark />
      </span>
      <span className="font-display text-[1.3rem] font-extrabold tracking-tight">validly</span>
    </Link>
  );
}
