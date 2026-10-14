"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { gsap } from "@/lib/gsap";
import { DURATION, EASE, STAGGER, prefersReducedMotion } from "@/lib/motion";
import { profile } from "@/data/profile";
// Same geometric "SG" mark as the header logo, so the preloader hands off to the header seamlessly.
import { Monogram } from "@/components/layout/SiteHeader";
import { markSeamClosed, markSeamOpened, registerSeam, type SeamMode } from "./seam-controller";

/*
 * The Seam — one signature shape for the preloader and route transitions.
 *
 * Two full-viewport navy "plates" are clipped along the same faceted polyline
 * (angled like the crystal's facets). A glowing indigo→violet line draws along
 * that seam, then the plates split apart vertically. Route transitions close the
 * same plates with the destination's name rising in the seam.
 *
 * Safety:
 *  - aria-hidden and pointer-events: none — the real page is always usable underneath.
 *  - Without JS the overlay is display:none (it only shows under html[data-intro=play],
 *    which the inline head script sets). If JS sets that but hydration never happens,
 *    the `.page-intro` CSS failsafe in globals.css hides it after 3.2s.
 *  - Every close/open has a timer fallback so a stalled ticker can't trap the user.
 */

/** Seam vertices in viewport percent (x, y). Same path every time. */
const SEAM: ReadonlyArray<readonly [number, number]> = [
  [0, 53],
  [13, 49.5],
  [27, 52.5],
  [41, 46.5],
  [55, 51],
  [70, 47],
  [84, 51.5],
  [100, 48],
];

// The plates overlap by a hair so anti-aliasing never shows a gap of page between them.
const OVERLAP = 0.35;
const TOP_CLIP = `polygon(0% 0%, 100% 0%, ${[...SEAM]
  .reverse()
  .map(([x, y]) => `${x}% ${y + OVERLAP}%`)
  .join(", ")})`;
const BOTTOM_CLIP = `polygon(${SEAM.map(([x, y]) => `${x}% ${y - OVERLAP}%`).join(", ")}, 100% 100%, 0% 100%)`;
// SSR placeholder geometry (100x100); replaced with real pixel geometry on mount so strokes don't stretch.
const PLACEHOLDER_POINTS = SEAM.map(([x, y]) => `${x},${y}`).join(" ");

/** Same night sky as the page (navy wash + indigo glow centred on the seam). Both plates share it, so it reads as one surface. */
const PLATE_STYLE = (clipPath: string): CSSProperties => ({
  clipPath,
  background:
    "radial-gradient(55% 38% at 50% 50%, rgba(79, 70, 229, 0.16), transparent 70%)," +
    "radial-gradient(1200px 600px at 75% -10%, rgba(59, 90, 220, 0.22), transparent 60%)," +
    "radial-gradient(900px 500px at 10% 110%, rgba(99, 60, 220, 0.14), transparent 60%)," +
    "#03050d",
});

const LINE_GLOW: CSSProperties = {
  filter: "drop-shadow(0 0 4px rgba(129, 140, 248, 0.95)) drop-shadow(0 0 16px rgba(139, 92, 246, 0.6))",
};

function StrokeGradient({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="40%" stopColor="#6366f1" />
        <stop offset="70%" stopColor="#a78bfa" />
        <stop offset="100%" stopColor="#60a5fa" />
      </linearGradient>
    </defs>
  );
}

export function Seam() {
  const rootRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const top = topRef.current;
    const bottom = bottomRef.current;
    const label = labelRef.current;
    const counter = counterRef.current;
    if (!root || !top || !bottom || !label || !counter) return;

    const q = gsap.utils.selector(root);
    const lines = q("[data-seam-line]");
    const edges = q("[data-seam-edge]");
    const verts = q("[data-seam-vertex]");
    const introEls = q("[data-seam-intro]");

    // Pixel-space geometry: pathLength=1 dash drawing stays exact and the stroke never stretches.
    const layout = () => {
      const w = root.clientWidth || window.innerWidth; // excludes the scrollbar, like the fixed overlay
      const h = root.clientHeight || window.innerHeight;
      const pts = SEAM.map(([x, y]) => `${((x / 100) * w).toFixed(1)},${((y / 100) * h).toFixed(1)}`).join(" ");
      root.querySelectorAll("svg[data-seam-geo]").forEach((svg) => svg.setAttribute("viewBox", `0 0 ${w} ${h}`));
      root.querySelectorAll("polyline").forEach((p) => p.setAttribute("points", pts));
    };
    // Time since the document (and so the overlay) started arriving — not since navigation start,
    // so a slow server response doesn't eat the preloader's budget.
    const nav = performance.getEntriesByType?.("navigation")[0] as PerformanceNavigationTiming | undefined;
    const t0 = nav?.responseStart || 0;
    const elapsed = () => performance.now() - t0;
    // JS owns the overlay from here on; the CSS failsafe is only for "JS never hydrated".
    // If the CSS failsafe (3.2s after first paint) already hid the overlay, don't bring it back.
    const rootStyle = getComputedStyle(root);
    const lateHydration = rootStyle.visibility === "hidden" || parseFloat(rootStyle.opacity) < 0.98;
    if (lateHydration) gsap.set(root, { autoAlpha: 0 });
    root.style.animation = "none";
    root.style.display = "block";
    layout();
    window.addEventListener("resize", layout);

    let active: gsap.core.Timeline | null = null;
    const timers: number[] = [];
    let raf = 0;
    let introDone = true;
    let finishIntro = () => {};
    let bumpTo: ((n: number) => void) | null = null;
    const proxy = { v: 0 };

    const resetOpen = () => {
      gsap.set(root, { autoAlpha: 0 });
      gsap.set(top, { yPercent: -100 });
      gsap.set(bottom, { yPercent: 100 });
      gsap.set(lines, { strokeDashoffset: 1, autoAlpha: 1 });
      gsap.set(edges, { autoAlpha: 0 });
      gsap.set(verts, { autoAlpha: 0, scale: 0 });
      gsap.set(introEls, { autoAlpha: 0 });
      label.replaceChildren();
    };

    /** Split the plates apart from the closed state. `seam:opened` fires as the split starts. */
    const addSplit = (tl: gsap.core.Timeline, at: number, mode: SeamMode, duration: number) => {
      tl.add(() => markSeamOpened(mode), at);
      // The plates' own edges light up so each half carries a sliver of the glow away.
      tl.to(edges, { autoAlpha: 1, duration: 0.2, ease: "none" }, at);
      tl.to(top, { yPercent: -100, duration, ease: EASE.seam }, at);
      tl.to(bottom, { yPercent: 100, duration, ease: EASE.seam }, at + 0.06);
      tl.to([...lines, ...verts], { autoAlpha: 0, duration: 0.3, ease: "power1.out" }, at + 0.1);
    };

    /** Destination label as masked chars (built imperatively — no React state per transition). */
    const setLabel = (text?: string): HTMLElement[] => {
      label.replaceChildren();
      const chars: HTMLElement[] = [];
      if (!text) return chars;
      text
        .trim()
        .split(/\s+/)
        .forEach((word, i) => {
          if (i) label.append(" ");
          const mask = document.createElement("span");
          mask.style.cssText = "display:inline-block;overflow:hidden;vertical-align:bottom;padding-bottom:0.12em;margin-bottom:-0.12em";
          for (const ch of Array.from(word)) {
            const c = document.createElement("span");
            c.style.display = "inline-block";
            c.dataset.seamChar = "";
            c.textContent = ch;
            mask.append(c);
            chars.push(c);
          }
          label.append(mask);
        });
      return chars;
    };

    const runIntro = () => {
      introDone = false;
      markSeamClosed();
      gsap.set(root, { autoAlpha: 1 });
      gsap.set([top, bottom], { yPercent: 0 });
      gsap.set(lines, { strokeDashoffset: 1, autoAlpha: 1 });
      gsap.set(edges, { autoAlpha: 0 });
      gsap.set(verts, { autoAlpha: 0, scale: 0 });
      gsap.set(introEls, { autoAlpha: 1, yPercent: 0 });

      const mobile = window.matchMedia("(max-width: 767px)").matches;
      // Budget (ms since the document arrived): counter is forced to 100 at CAP, the seam
      // splits ~0.4s later and is fully open ~0.9s after that — the whole intro ends by ~2.6s.
      const CAP = mobile ? 1000 : 1150;
      const MIN = 800; // ms on screen at the very least, so the counter never just blinks
      let goal = 0;
      let exiting = false;
      proxy.v = 0;
      const render = () => {
        counter.textContent = String(Math.round(proxy.v)).padStart(2, "0");
      };
      render();

      const exit = () => {
        if (exiting) return;
        exiting = true;
        gsap.killTweensOf(proxy);
        proxy.v = 100;
        render();
        const tl = gsap.timeline({
          onComplete: () => {
            introDone = true;
            active = null;
            resetOpen();
          },
        });
        active = tl;
        tl.to(introEls, { yPercent: -100, duration: DURATION.exit, ease: EASE.exit, stagger: 0.04 }, 0);
        tl.to(lines, { strokeDashoffset: 0, duration: 0.4, ease: EASE.out }, 0.05);
        tl.to(verts, { autoAlpha: 1, scale: 1, duration: 0.25, ease: EASE.out, stagger: 0.03 }, 0.1);
        addSplit(tl, 0.4, "intro", 0.9);
      };

      const maybeExit = () => {
        if (proxy.v < 100) return;
        timers.push(window.setTimeout(exit, Math.max(0, MIN - elapsed())));
      };

      // Adaptive counter: small jumps tick quickly, big ones glide (never a fake 90% hold).
      const bump = (n: number, fast = false) => {
        if (n <= goal || exiting) return;
        goal = n;
        const jump = n - proxy.v;
        const duration = fast ? 0.25 : jump <= 10 ? 0.3 : jump <= 30 ? 0.45 : 0.6;
        gsap.to(proxy, { v: n, duration, ease: "power2.out", overwrite: true, onUpdate: render, onComplete: n >= 100 ? maybeExit : undefined });
      };

      bumpTo = bump;
      finishIntro = () => {
        if (introDone) return;
        exit();
        active?.progress(1);
      };

      // Readiness milestones: hydrated → fonts → window load. Hard cap regardless.
      if (elapsed() > CAP) {
        exit();
        return;
      }
      bump(30);
      document.fonts?.ready.then(() => bump(70));
      if (document.readyState === "complete") bump(100);
      else window.addEventListener("load", onLoad, { once: true });
      timers.push(window.setTimeout(() => bump(100, true), Math.max(0, CAP - elapsed())));
      // Last-resort: whatever happens, the overlay is gone within ~3.5s of hydrating.
      timers.push(window.setTimeout(() => finishIntro(), 3500));
    };
    const onLoad = () => bumpTo?.(100);

    // The intro plays once per session (decided by the inline head script before paint).
    const play = document.documentElement.dataset.intro === "play" && !prefersReducedMotion() && !lateHydration;
    if (play) {
      runIntro();
    } else {
      resetOpen();
      // Next frame, so listeners mounted in this same commit (the hero) still hear it.
      raf = requestAnimationFrame(() => markSeamOpened("skip"));
    }

    const close = (text?: string) =>
      new Promise<void>((resolve) => {
        finishIntro();
        active?.kill();
        markSeamClosed();
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        gsap.set(root, { autoAlpha: 1 });
        gsap.set(introEls, { autoAlpha: 0 });
        gsap.set(edges, { autoAlpha: 0 });
        gsap.set(lines, { strokeDashoffset: 1, autoAlpha: 1 });
        gsap.set(verts, { autoAlpha: 0, scale: 0 });
        const chars = setLabel(text);
        gsap.set(chars, { yPercent: 110 });

        const tl = gsap.timeline();
        active = tl;
        tl.to([top, bottom], { yPercent: 0, duration: DURATION.seamClose, ease: EASE.exit }, 0);
        tl.to(lines, { strokeDashoffset: 0, duration: 0.35, ease: EASE.out }, 0.3);
        tl.to(verts, { autoAlpha: 1, scale: 1, duration: 0.3, ease: EASE.out, stagger: 0.03 }, 0.35);
        if (chars.length) tl.to(chars, { yPercent: 0, duration: 0.7, ease: EASE.out, stagger: STAGGER.chars }, 0.3);
        // Resolve as soon as the page is covered; the label keeps rising while the route loads.
        tl.add(done, DURATION.seamClose + 0.05);
        // Never let a stalled ticker (background tab) hold the navigation.
        timers.push(window.setTimeout(done, 1200));
      });

    const open = () =>
      new Promise<void>((resolve) => {
        active?.kill();
        const chars = Array.from(label.querySelectorAll<HTMLElement>("[data-seam-char]"));
        const tl = gsap.timeline({
          onComplete: () => {
            if (active === tl) active = null;
            resetOpen();
            resolve();
          },
        });
        active = tl;
        // If the close was cut short (timeout path), finish covering before splitting.
        const covered = gsap.getProperty(top, "yPercent") === 0 && gsap.getProperty(bottom, "yPercent") === 0;
        if (!covered) tl.to([top, bottom], { yPercent: 0, duration: 0.2, ease: "power2.out" }, 0);
        tl.set(lines, { strokeDashoffset: 0, autoAlpha: 1 }, 0);
        if (chars.length) tl.to(chars, { yPercent: -110, duration: 0.35, ease: EASE.exit, stagger: 0.01 }, 0);
        addSplit(tl, chars.length || !covered ? 0.2 : 0, "route", 0.9);
        timers.push(
          window.setTimeout(() => {
            if (active === tl) tl.progress(1);
          }, 2500),
        );
      });

    registerSeam({ close, open });

    return () => {
      registerSeam(null);
      window.removeEventListener("resize", layout);
      window.removeEventListener("load", onLoad);
      cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
      active?.kill();
      gsap.killTweensOf(proxy);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      data-seam
      aria-hidden
      className="page-intro pointer-events-none fixed inset-0 z-[70] hidden [html[data-intro=play]_&]:block"
    >
      {/* Upper plate */}
      <div ref={topRef} className="absolute inset-0 will-change-transform" style={PLATE_STYLE(TOP_CLIP)}>
        <div className="stars absolute inset-0 opacity-60" />
        <svg data-seam-geo data-seam-edge className="absolute inset-0 size-full opacity-0" viewBox="0 0 100 100" preserveAspectRatio="none" style={LINE_GLOW}>
          <StrokeGradient id="seam-edge-top" />
          <polyline points={PLACEHOLDER_POINTS} fill="none" stroke="url(#seam-edge-top)" strokeWidth="3" strokeLinejoin="miter" />
        </svg>
      </div>

      {/* Lower plate */}
      <div ref={bottomRef} className="absolute inset-0 will-change-transform" style={PLATE_STYLE(BOTTOM_CLIP)}>
        <div className="stars absolute inset-0 opacity-60" />
        <svg data-seam-geo data-seam-edge className="absolute inset-0 size-full opacity-0" viewBox="0 0 100 100" preserveAspectRatio="none" style={LINE_GLOW}>
          <StrokeGradient id="seam-edge-bottom" />
          <polyline points={PLACEHOLDER_POINTS} fill="none" stroke="url(#seam-edge-bottom)" strokeWidth="3" strokeLinejoin="miter" />
        </svg>
      </div>

      {/* The glowing seam line (indigo → violet, white-hot core) */}
      <svg data-seam-geo className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={LINE_GLOW}>
        <StrokeGradient id="seam-line" />
        <polyline
          data-seam-line
          points={PLACEHOLDER_POINTS}
          fill="none"
          stroke="url(#seam-line)"
          strokeWidth="2.5"
          strokeLinejoin="miter"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset="1"
        />
        <polyline
          data-seam-line
          points={PLACEHOLDER_POINTS}
          fill="none"
          stroke="#eef1ff"
          strokeOpacity="0.85"
          strokeWidth="0.8"
          strokeLinejoin="miter"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset="1"
        />
      </svg>

      {/* Facet vertices: tiny lit diamonds where the seam changes direction */}
      {SEAM.slice(1, -1).map(([x, y]) => (
        <span
          key={x}
          data-seam-vertex
          className="absolute size-1.5 rotate-45 bg-lilac opacity-0 shadow-[0_0_10px_2px_rgba(139,92,246,0.85)]"
          style={{ left: `${x}%`, top: `${y}%`, marginLeft: -3, marginTop: -3 }}
        />
      ))}

      {/* Route-transition label: the destination's name rises just above the seam */}
      <div className="absolute inset-x-0 top-1/2 flex -translate-y-full justify-center px-5 pb-[clamp(1.25rem,4vh,2.5rem)]">
        <p
          ref={labelRef}
          className="max-w-[18ch] text-balance text-center font-display text-[clamp(1.6rem,5vw,3.6rem)] font-bold uppercase leading-[1.05] tracking-tight text-ink [text-shadow:0_0_30px_rgba(99,102,241,0.45)] sm:max-w-none"
        />
      </div>

      {/* Preloader chrome: monogram + counter bottom-left, hero kicker bottom-right */}
      <div className="shell absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 pb-[clamp(1.5rem,6vh,3.5rem)]">
        <div className="flex flex-col gap-2">
          <div className="overflow-hidden">
            <div data-seam-intro className="flex items-center gap-3">
              <Monogram className="h-7 w-auto" />
              <span className="font-display text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-ink/90">{profile.wordmark}</span>
            </div>
          </div>
          <div className="overflow-hidden">
            <div data-seam-intro className="font-display text-[clamp(3.5rem,11vw,7.5rem)] font-semibold leading-[0.95] tracking-tight text-ink tabular-nums">
              <span ref={counterRef}>00</span>
            </div>
          </div>
        </div>
        <div className="hidden overflow-hidden sm:block">
          <p data-seam-intro className="kicker">
            {profile.heroLabel} <span className="text-dim">·</span> <span className="text-lilac">{profile.heroLabelAccent}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
