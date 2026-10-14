"use client";

import { useRef, type ReactNode, type RefObject } from "react";

type Tag = "div" | "section" | "article" | "ul" | "ol" | "li" | "p" | "span" | "h1" | "h2" | "h3" | "h4";
import { gsap, useGSAP } from "@/lib/gsap";

/*
 * Shared scroll-reveal primitives. Every section uses these instead of rolling its own,
 * so the whole site shares one easing language (expo-out entrances, short exits).
 * All content is visible without JS and under reduced motion — the "from" state is
 * only applied by GSAP once it runs.
 */

type RevealProps = {
  children: ReactNode;
  as?: Tag;
  className?: string;
  /** Animate direct children marked with [data-reveal-item] one after another instead of the whole block. */
  stagger?: number;
  y?: number;
  delay?: number;
  /** ScrollTrigger start, default "top 85%". */
  start?: string;
};

export function Reveal({ children, as = "div", className, stagger, y = 28, delay = 0, start = "top 85%" }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const el = ref.current;
        if (!el) return;
        const targets = stagger ? el.querySelectorAll("[data-reveal-item]") : [el];
        gsap.from(targets, {
          y,
          // opacity (not autoAlpha) keeps links/buttons focusable before the reveal fires;
          // the global focusin handler in lib/gsap completes the reveal when focus lands inside.
          opacity: 0,
          duration: 1.1,
          ease: "expo.out",
          delay,
          stagger: stagger ?? 0,
          scrollTrigger: { trigger: el, start, once: true },
        });
      });
    },
    { scope: ref },
  );

  // Cast keeps one ref type for every allowed tag (they are all plain HTMLElements).
  const El = as as "div";
  return (
    <El ref={ref as RefObject<HTMLDivElement>} className={className}>
      {children}
    </El>
  );
}

type SplitRevealProps = {
  children: ReactNode;
  as?: Tag;
  className?: string;
  id?: string;
  /** "lines" for headings, "chars" for display type. */
  by?: "lines" | "words" | "chars";
  delay?: number;
  start?: string;
  /** Start immediately on mount instead of on scroll (hero). */
  immediate?: boolean;
};

/**
 * Masked text reveal using GSAP SplitText (lines rise out of a mask). Screen readers
 * get the original text: SplitText sets aria-label on the element and hides the pieces.
 */
export function SplitReveal({ children, as = "h2", className, id, by = "lines", delay = 0, start = "top 85%", immediate = false }: SplitRevealProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const el = ref.current;
        if (!el) return;
        let split: { revert: () => void } | undefined;
        let cancelled = false;
        // Split only after web fonts load so line breaks are measured with the real font.
        document.fonts.ready.then(async () => {
          if (cancelled) return;
          const { SplitText } = await import("gsap/SplitText");
          gsap.registerPlugin(SplitText);
          if (cancelled) return;
          const s = SplitText.create(el, {
            type: by === "chars" ? "lines,chars" : by === "words" ? "lines,words" : "lines",
            mask: "lines",
            aria: "auto",
          });
          split = s;
          const pieces = by === "chars" ? s.chars : by === "words" ? s.words : s.lines;
          gsap.from(pieces, {
            yPercent: 110,
            duration: by === "chars" ? 1.15 : 1.1,
            ease: "expo.out",
            stagger: by === "chars" ? 0.022 : by === "words" ? 0.04 : 0.08,
            delay,
            scrollTrigger: immediate ? undefined : { trigger: el, start, once: true },
          });
        });
        return () => {
          cancelled = true;
          split?.revert();
        };
      });
    },
    { scope: ref },
  );

  const El = as as "div";
  return (
    <El ref={ref as RefObject<HTMLDivElement>} id={id} className={className}>
      {children}
    </El>
  );
}
