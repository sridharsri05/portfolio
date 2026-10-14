import type Lenis from "lenis";

/**
 * Scroll singleton. SmoothScroll (src/components/providers/SmoothScroll.tsx)
 * registers the Lenis instance here; everything else reads it through these
 * helpers so no component needs React state per scroll frame.
 *
 * Under reduced motion there is no Lenis instance and every helper falls back
 * to native scrolling, so callers never have to branch.
 *
 * Nested scrollable children (horizontal rails, the mobile menu, code blocks)
 * must carry `data-lenis-prevent` so wheel events inside them scroll natively.
 */

/** Fixed header height, used as the anchor offset (matches section[id] scroll-margin-top: 4.5rem). */
export const HEADER_OFFSET = -72;

let lenis: Lenis | null = null;
let smoothedVelocity = 0;
let lockCount = 0;

export type ScrollTarget = number | string | HTMLElement;

export type ScrollToOptions = {
  /** Pixels added to the target position. Defaults to HEADER_OFFSET for element/hash targets, 0 for numbers. */
  offset?: number;
  /** Jump without animating. */
  immediate?: boolean;
  /** Seconds (Lenis only). When omitted Lenis uses its lerp. */
  duration?: number;
  /** Easing (Lenis only), t in 0..1. */
  easing?: (t: number) => number;
  /** Scroll even while scrolling is stopped (e.g. behind the Seam). */
  force?: boolean;
  onComplete?: () => void;
};

export type ScrollState = {
  scroll: number;
  /** Smoothed velocity in px/frame (positive = down). 0 when there is no Lenis. */
  velocity: number;
  /** 1 = down, -1 = up, 0 = idle/unknown. */
  direction: 1 | -1 | 0;
  /** 0..1 page progress. */
  progress: number;
};

/** @internal used by SmoothScroll. */
export function setLenis(instance: Lenis | null) {
  lenis = instance;
  smoothedVelocity = 0;
  // Re-apply any lock that was requested before Lenis existed.
  if (lenis && lockCount > 0) {
    document.documentElement.style.removeProperty("overflow");
    lenis.stop();
  }
}

/** @internal called once per gsap.ticker frame by SmoothScroll. */
export function tickVelocity() {
  if (!lenis) {
    smoothedVelocity = 0;
    return;
  }
  // Light low-pass so consumers (3D spin, skews) don't jitter on single wheel ticks.
  smoothedVelocity += (lenis.velocity - smoothedVelocity) * 0.15;
  if (Math.abs(smoothedVelocity) < 0.001) smoothedVelocity = 0;
}

export function getLenis(): Lenis | null {
  return lenis;
}

/** Smoothed scroll velocity (px/frame). Read it inside a ticker/useFrame; never store it in React state. */
export function getVelocity(): number {
  return smoothedVelocity;
}

/** Resolve "#id", a selector, an element or a number into something scrollable. `null` if not found. */
export function resolveScrollTarget(target: ScrollTarget): number | HTMLElement | null {
  if (typeof target === "number") return target;
  if (typeof target !== "string") return target;
  if (target === "" || target === "#" || target === "#top") return 0;
  if (target.startsWith("#")) {
    let id = target.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      /* keep raw id */
    }
    return document.getElementById(id);
  }
  try {
    return document.querySelector<HTMLElement>(target);
  } catch {
    return null;
  }
}

function scrollMarginOf(el: HTMLElement): number {
  const m = Number.parseFloat(getComputedStyle(el).scrollMarginTop);
  return Number.isFinite(m) ? m : 0;
}

/** Smooth-scroll (Lenis) or native-scroll to a target. Returns false if the target wasn't found. */
export function scrollToTarget(target: ScrollTarget, opts: ScrollToOptions = {}): boolean {
  if (typeof window === "undefined") return false;
  const resolved = resolveScrollTarget(target);
  if (resolved === null) return false;
  // Elements: land `offset` px from their top. Default = the element's own scroll-margin-top
  // (section[id] carries 4.5rem) or the header height, so the fixed header never covers it.
  const margin = typeof resolved === "number" ? 0 : scrollMarginOf(resolved);
  const offset = opts.offset ?? (typeof resolved === "number" ? 0 : margin > 0 ? -margin : HEADER_OFFSET);

  if (lenis) {
    // Lenis clamps targets to its cached limit, which only re-measures on a 250ms-debounced
    // ResizeObserver. Jumps usually follow a route change / layout shift: measure now.
    if (opts.immediate) lenis.resize();
    lenis.scrollTo(resolved, {
      // Lenis already subtracts the target's scroll-margin-top itself; compensate so the result matches `offset`.
      offset: offset + margin,
      immediate: opts.immediate,
      duration: opts.duration,
      easing: opts.easing,
      force: opts.force,
      onComplete: opts.onComplete ? () => opts.onComplete?.() : undefined,
    });
    return true;
  }

  const top = typeof resolved === "number" ? resolved + offset : resolved.getBoundingClientRect().top + window.scrollY + offset;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: Math.max(0, top), behavior: opts.immediate || reduced ? "instant" : "smooth" });
  opts.onComplete?.();
  return true;
}

/**
 * Stop user scrolling (mobile menu, Seam curtain). Calls are counted, so two
 * overlapping locks need two start() calls.
 */
export function stop() {
  lockCount += 1;
  if (lockCount > 1) return;
  if (lenis) lenis.stop();
  else document.documentElement.style.overflow = "hidden";
}

export function start() {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount > 0) return;
  if (lenis) lenis.start();
  document.documentElement.style.removeProperty("overflow");
}

/** True while stop() is in effect. */
export function isStopped() {
  return lockCount > 0;
}

/**
 * Subscribe to scroll updates (Lenis "scroll" event, or native scroll without Lenis).
 * Returns an unsubscribe function. Handlers run per frame — keep them cheap and ref-based.
 */
export function subscribeScroll(cb: (state: ScrollState) => void): () => void {
  if (typeof window === "undefined") return () => {};
  let last = window.scrollY;

  const emitNative = () => {
    const y = window.scrollY;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const direction = y > last ? 1 : y < last ? -1 : 0;
    last = y;
    cb({ scroll: y, velocity: 0, direction, progress: Math.min(1, Math.max(0, y / max)) });
  };

  let bound: Lenis | null = null;
  let offLenis: (() => void) | null = null;
  const bind = () => {
    if (bound === lenis) return;
    offLenis?.();
    offLenis = null;
    bound = lenis;
    if (bound) {
      const l = bound;
      offLenis = l.on("scroll", () => {
        cb({ scroll: l.scroll, velocity: smoothedVelocity, direction: l.direction === 1 ? 1 : l.direction === -1 ? -1 : 0, progress: l.progress });
      });
    }
  };

  // Lenis may be created after a subscriber mounts (or destroyed when reduced motion toggles),
  // so the native listener stays as the source whenever there is no Lenis instance.
  const onNative = () => {
    bind();
    if (!bound) emitNative();
  };
  bind();
  window.addEventListener("scroll", onNative, { passive: true });
  return () => {
    window.removeEventListener("scroll", onNative);
    offLenis?.();
  };
}
