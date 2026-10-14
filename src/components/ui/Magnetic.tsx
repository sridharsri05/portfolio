"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { DURATION, EASE, pulseSignal } from "@/lib/motion";

/**
 * Pulls its child a few pixels toward the cursor and springs back elastically on leave.
 * Only active for fine pointers without reduced motion — on touch it's a plain wrapper.
 *
 * Optional inner layer: put `data-magnetic-label` on an element inside (e.g. the
 * button text) and it follows at half the strength, so the label lags the button.
 */
export function Magnetic({ children, strength = 0.28, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        const label = el.querySelector<HTMLElement>("[data-magnetic-label]");

        const onMove = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          // Measure from the resting centre (remove the current offset) so the pull doesn't feed back on itself.
          const cx = r.left + r.width / 2 - Number(gsap.getProperty(el, "x"));
          const cy = r.top + r.height / 2 - Number(gsap.getProperty(el, "y"));
          const dx = e.clientX - cx;
          const dy = e.clientY - cy;
          // One short tween per move (overwrite:auto) — cheap for a couple of CTAs, and it hands over cleanly to the elastic return.
          gsap.to(el, { x: dx * strength, y: dy * strength, duration: 0.5, ease: "power3.out", overwrite: "auto" });
          if (label) gsap.to(label, { x: dx * strength * 0.5, y: dy * strength * 0.5, duration: 0.6, ease: "power3.out", overwrite: "auto" });
        };
        const onEnter = () => pulseSignal();
        const onLeave = () => {
          gsap.to(el, { x: 0, y: 0, duration: DURATION.magneticReturn, ease: EASE.return, overwrite: "auto" });
          if (label) gsap.to(label, { x: 0, y: 0, duration: DURATION.magneticReturn, ease: EASE.return, overwrite: "auto" });
        };

        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerenter", onEnter);
        el.addEventListener("pointerleave", onLeave);
        return () => {
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerenter", onEnter);
          el.removeEventListener("pointerleave", onLeave);
          gsap.set(label ? [el, label] : el, { clearProps: "transform" });
        };
      });
    },
    { scope: ref, dependencies: [strength] },
  );

  return (
    <div ref={ref} className={className} style={{ display: "inline-flex" }}>
      {children}
    </div>
  );
}
