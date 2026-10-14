/*
 * Window-level inputs shared by every crystal canvas, kept in module singletons and read
 * from useFrame (never React state) so pointer moves and scroll cause zero re-renders.
 *
 * Loose coupling by design — these are plain window events, so this package never imports
 * modules owned by other packages:
 *  - "signal:pulse"   → glow pulse through the core (dispatch from CTA hovers / src/lib/signal.ts).
 *  - "hero:progress"  → CustomEvent<number> 0..1 hero pin progress; dollies the hero camera.
 *  - "seam:opened"    → the preloader split; the hero crystal's intro starts here.
 * Scroll velocity is measured locally from window.scrollY, so it works with or without Lenis.
 */

const pointer = { x: 0, y: 0 };
let pointerUsers = 0;

function onPointerMove(e: PointerEvent) {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
}

/** Ref-counted window listener: one listener no matter how many canvases are mounted. */
export function subscribePointer() {
  if (pointerUsers++ === 0) window.addEventListener("pointermove", onPointerMove, { passive: true });
  return () => {
    if (--pointerUsers === 0) window.removeEventListener("pointermove", onPointerMove);
  };
}

export function readPointer(): Readonly<{ x: number; y: number }> {
  return pointer;
}

let lastPulse = -Infinity;
let heroProgress = 0;
let eventUsers = 0;

const onPulse = () => {
  lastPulse = performance.now();
};
const onProgress = (e: Event) => {
  const d = (e as CustomEvent<number>).detail;
  if (typeof d === "number" && Number.isFinite(d)) heroProgress = Math.min(1, Math.max(0, d));
};

export function subscribeSignals() {
  if (eventUsers++ === 0) {
    window.addEventListener("signal:pulse", onPulse);
    window.addEventListener("hero:progress", onProgress);
  }
  return () => {
    if (--eventUsers === 0) {
      window.removeEventListener("signal:pulse", onPulse);
      window.removeEventListener("hero:progress", onProgress);
    }
  };
}

/** 1 right after a pulse, decaying linearly to 0 over 600ms (motion spec item 4). */
export function readPulse(now = performance.now()) {
  return Math.max(0, 1 - (now - lastPulse) / 600);
}

export function readHeroProgress() {
  return heroProgress;
}

/**
 * Resolves when the hero intro may start: immediately unless the Seam preloader is
 * playing (html[data-intro="play"]), then on "seam:opened" with a 3.2s failsafe that
 * mirrors the preloader's CSS failsafe, so the crystal can never stay hidden. If the Seam
 * has already split (html[data-seam-open], e.g. a late lazy mount or browser Back), the
 * event was missed, so start immediately.
 */
export function onIntroGate(start: () => void) {
  const html = document.documentElement;
  if (html.dataset.intro !== "play" || html.hasAttribute("data-seam-open")) {
    start();
    return () => {};
  }
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    window.clearTimeout(timer);
    window.removeEventListener("seam:opened", go);
    start();
  };
  const timer = window.setTimeout(go, 3200);
  window.addEventListener("seam:opened", go);
  return () => {
    done = true;
    window.clearTimeout(timer);
    window.removeEventListener("seam:opened", go);
  };
}
