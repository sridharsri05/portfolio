"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

type Props = { id: string; kicker: string; title: string; className?: string };

/**
 * Oversized section title whose lines rise out of a mask when first scrolled
 * into view. The kicker carries the section's place in the page (e.g. "02 / Experience").
 */
export function SectionHeading({ id, kicker, title, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-line]", {
          yPercent: 110,
          duration: 1.1,
          ease: "expo.out",
          stagger: 0.08,
          scrollTrigger: { trigger: ref.current, start: "top 85%", once: true },
        });
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      <p className="mb-5 flex items-center gap-3 text-sm text-steel">
        <span aria-hidden className="h-px w-10 bg-signal" />
        {kicker}
      </p>
      <h2 id={id} className="display text-[clamp(2.4rem,7vw,7rem)]">
        {title.split("\n").map((line) => (
          <span key={line} className="block overflow-hidden pb-[0.05em]">
            <span data-line className="block">
              {line}
            </span>
          </span>
        ))}
      </h2>
    </div>
  );
}
