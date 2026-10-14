"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

type Props = {
  children: ReactNode;
  className?: string;
  /** Play right away (case-study cover) instead of when scrolled into view. */
  immediate?: boolean;
  delay?: number;
  /** Gentle scrubbed inner parallax (yPercent ±range). 0 disables it. */
  parallax?: number;
};

/**
 * Clip-path wipe (bottom → top) with the inner layer settling from a zoom, plus an
 * optional scrubbed parallax. Children are server-rendered and passed through untouched;
 * under reduced motion (or without JS) the media simply renders static.
 */
export function MediaReveal({ children, className = "", immediate = false, delay = 0, parallax = 6 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        { motion: "(prefers-reduced-motion: no-preference)", small: "(max-width: 767px)" },
        (ctx) => {
          const { motion, small } = ctx.conditions as { motion: boolean; small: boolean };
          const el = ref.current;
          const inner = el?.querySelector<HTMLElement>("[data-media-inner]");
          if (!motion || !el || !inner) return;

          const tl = gsap.timeline({
            delay,
            scrollTrigger: immediate ? undefined : { trigger: el, start: "top 85%", once: true },
            onComplete: () => gsap.set(el, { clearProps: "clipPath" }),
          });
          tl.fromTo(el, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: immediate ? 1.3 : 1.2, ease: "power4.inOut" });
          tl.fromTo(inner, { scale: 1.2 }, { scale: 1, duration: 1.6, ease: "expo.out" }, "-=1.0");

          if (parallax > 0) {
            // Parallax lives on a separate child so it never fights the zoom tween's transform.
            const drift = el.querySelector<HTMLElement>("[data-media-drift]");
            const range = small ? parallax / 2 : parallax;
            if (drift) {
              gsap.fromTo(
                drift,
                { yPercent: -range },
                { yPercent: range, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } },
              );
            }
          }
        },
      );
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <div data-media-inner className="size-full">
        {/* Oversized by the parallax range so the drift never exposes an edge. */}
        <div data-media-drift className={parallax > 0 ? "absolute inset-x-0 -inset-y-[8%]" : "size-full"}>
          {children}
        </div>
      </div>
    </div>
  );
}
