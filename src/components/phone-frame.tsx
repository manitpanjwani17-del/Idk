import type { ReactNode } from "react";

/**
 * A phone mockup. The screen has a transform, which makes it the containing
 * block for `position: fixed` children, so sheets/overlays inside a preview stay
 * inside the screen instead of covering the whole website.
 */
export function PhoneFrame({ children, height = 600, className = "" }: { children: ReactNode; height?: number; className?: string }) {
  return (
    <div
      className={`relative mx-auto w-full max-w-[340px] rounded-[46px] border-[3px] border-ink bg-ink p-[9px] shadow-brutal-lg ${className}`}
    >
      <div className="absolute left-1/2 top-[14px] z-30 h-[22px] w-[92px] -translate-x-1/2 rounded-full bg-ink" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-[37px] bg-paper [transform:translateZ(0)]" style={{ height }}>
        <div className="scrollbar-none h-full overflow-y-auto overflow-x-hidden overscroll-contain">{children}</div>
      </div>
    </div>
  );
}
