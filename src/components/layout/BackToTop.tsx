"use client";

import { ArrowUp } from "lucide-react";
import { useCurrentMonthIndex } from "@/hooks/useClientEnv";
import { profile } from "@/data/profile";

/**
 * "© {year} …" — the year is read on the client after mount (no `new Date()` during
 * prerender, which this Next version rejects). The server/first paint omits the year.
 */
export function Copyright({ className }: { className?: string }) {
  const monthIndex = useCurrentMonthIndex();
  const year = monthIndex === null ? null : Math.floor(monthIndex / 12);
  return (
    <p className={className}>
      © {year !== null && `${year} `}
      {profile.name}. All rights reserved.
    </p>
  );
}

export function BackToTop() {
  return (
    <button
      type="button"
      onClick={() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        // Native smooth scroll; when the Lenis layer is mounted it keeps the native scroll
        // position in sync, so this stays correct either way.
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
        // Move focus to the top so keyboard users continue from the start of the page.
        document.getElementById("main")?.focus({ preventScroll: true });
      }}
      className="group flex items-center gap-2.5 text-[0.8rem] text-soft transition-colors hover:text-ink"
    >
      <span className="grid size-7 place-items-center rounded-full border border-edge-strong bg-deep/60 text-ink transition-colors group-hover:border-sky group-hover:text-sky">
        <ArrowUp aria-hidden className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5" />
      </span>
      Back to top
    </button>
  );
}
