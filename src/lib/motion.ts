/**
 * Global motion tokens (see scratchpad motion spec §1). Import these instead of
 * hard-coding numbers so the site moves as one system.
 *
 * Durations are asymmetric on purpose: things arrive slowly and leave quickly.
 */

/** GSAP ease names registered in src/lib/gsap.ts. */
export const EASE = {
  /** Every entrance (expo-out). */
  out: "signal.out",
  /** Seam open/close, curtains, menu (quint-in-out). */
  seam: "seam.inOut",
  /** Media wipes, reel slides (quart-in-out). */
  inOut: "signal.inOut",
  /** Every exit. */
  exit: "power3.in",
  /** Magnetic spring-back only — never on content. */
  return: "elastic.out(1,0.45)",
} as const;

/** CSS equivalents for Motion / CSS transitions. */
export const EASE_CSS = {
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
  seam: [0.86, 0, 0.07, 1] as [number, number, number, number],
  inOut: [0.76, 0, 0.24, 1] as [number, number, number, number],
} as const;

/** Seconds. */
export const DURATION = {
  /** Text / element entrances. */
  enter: 1.15,
  /** Large media entrances. */
  media: 1.5,
  /** Exits. */
  exit: 0.4,
  /** Hover / press micro-interactions. */
  micro: 0.35,
  /** Seam curtain closing over the page (route transition). */
  seamClose: 0.6,
  /** Seam curtain splitting open. */
  seamOpen: 1.1,
  /** Magnetic elastic return. */
  magneticReturn: 1.1,
} as const;

/** Seconds between siblings. */
export const STAGGER = {
  chars: 0.022,
  words: 0.04,
  lines: 0.08,
  rows: 0.06,
} as const;

/** Follow-on tweens in a timeline overlap the previous one by this much (use as "-=0.7"). */
export const OVERLAP = "-=0.7";

/** Window events used to hand off between the Seam, the hero and route pages. */
export const MOTION_EVENTS = {
  /** Fired when the Seam starts splitting open (first load, skip, and after each route transition). */
  seamOpened: "seam:opened",
  /** Fired after a client-side route change has rendered (curtain or not). */
  routeEnter: "route:enter",
  /** Optional "something was touched" pulse (magnetic CTAs) the 3D crystal may listen to. */
  pulse: "signal:pulse",
} as const;

/** Non-hook reduced-motion check for event handlers and effects. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Fire the "signal" pulse (cheap window event; listeners decide what to do with it). */
export function pulseSignal() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(MOTION_EVENTS.pulse));
}
