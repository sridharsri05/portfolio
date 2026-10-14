"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { CustomEase } from "gsap/CustomEase";
import { Flip } from "gsap/Flip";
import { useGSAP } from "@gsap/react";

/*
 * Animation responsibilities:
 *  - GSAP + ScrollTrigger: anything tied to scroll position or orchestrated
 *    timelines (preloader/Seam, hero entrance, text splits, scrubs).
 *  - Motion (motion/react): component state transitions — menus, panels,
 *    steppers, hover previews, copy feedback. Wrapped in <MotionConfig reducedMotion="user">.
 *  - Lenis (src/lib/scroll.ts): smooth wheel scroll, driven by gsap.ticker so
 *    there is exactly one rAF loop for scroll + tweens.
 *
 * Shared eases (mirrored as CSS vars in globals.css):
 *  - "signal.out"   cubic-bezier(0.16,1,0.3,1)  — every entrance
 *  - "seam.inOut"   cubic-bezier(0.86,0,0.07,1) — Seam open/close, curtains, menu
 *  - "signal.inOut" cubic-bezier(0.76,0,0.24,1) — media wipes, reel slides
 *  Exits use "power3.in"; the magnetic spring-back uses "elastic.out(1,0.45)".
 */
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, CustomEase, Flip, useGSAP);
  // Guard so HMR / double module evaluation doesn't re-create the eases.
  if (!gsap.parseEase("signal.out")) {
    CustomEase.create("signal.out", "0.16,1,0.3,1");
    CustomEase.create("seam.inOut", "0.86,0,0.07,1");
    CustomEase.create("signal.inOut", "0.76,0,0.24,1");
  }
  // Keyboard safety net for scroll reveals: when focus lands inside a trigger whose
  // reveal hasn't played yet, jump that animation to its end so focused content is
  // never transparent. Registered once (flag survives HMR re-evaluation).
  const w = window as Window & { __revealFocusGuard?: boolean };
  if (!w.__revealFocusGuard) {
    w.__revealFocusGuard = true;
    document.addEventListener("focusin", (e) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      ScrollTrigger.getAll().forEach((st) => {
        const trigger = st.trigger;
        const anim = st.animation;
        if (!trigger || !anim || st.vars.scrub || !trigger.contains(target)) return;
        if (anim.progress() < 1) anim.progress(1);
      });
    });
  }
}

export { gsap, ScrollTrigger, SplitText, ScrambleTextPlugin, CustomEase, Flip, useGSAP };
