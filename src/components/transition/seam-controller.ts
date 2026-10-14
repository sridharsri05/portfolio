import { MOTION_EVENTS } from "@/lib/motion";

/**
 * Module-level wiring between the Seam overlay, the TransitionProvider and
 * TransitionLink. No React context: TransitionLink can live anywhere (server
 * pages render it directly) and still reach the single overlay.
 */

export type SeamMode = "intro" | "skip" | "route";

export type SeamApi = {
  /** Close the curtain over the page with `label` rising in the seam. Resolves once the page is covered. */
  close: (label?: string) => Promise<void>;
  /** Split the curtain open. Resolves when fully open. Fires `seam:opened` as the split starts. */
  open: () => Promise<void>;
};

export type Navigator = (href: string, label?: string) => void;

let seam: SeamApi | null = null;
let navigateFn: Navigator | null = null;

export function registerSeam(api: SeamApi | null) {
  seam = api;
}

export function getSeam(): SeamApi | null {
  return seam;
}

export function registerNavigator(fn: Navigator | null) {
  navigateFn = fn;
}

/** Hand a cross-route navigation to the TransitionProvider. Returns false if it isn't mounted (caller falls back to next/link). */
export function navigateWithSeam(href: string, label?: string): boolean {
  if (!navigateFn) return false;
  navigateFn(href, label);
  return true;
}

/** Mark the curtain as open and broadcast it (html[data-seam-open] lets late subscribers start immediately). */
export function markSeamOpened(mode: SeamMode) {
  document.documentElement.setAttribute("data-seam-open", "");
  window.dispatchEvent(new CustomEvent(MOTION_EVENTS.seamOpened, { detail: { mode } }));
}

export function markSeamClosed() {
  document.documentElement.removeAttribute("data-seam-open");
}

export function isSeamOpen(): boolean {
  return typeof document !== "undefined" && document.documentElement.hasAttribute("data-seam-open");
}

/**
 * Run `cb` once the Seam is open — immediately (next microtask) if it already is.
 * Use this instead of a bare `seam:opened` listener to avoid missing the event.
 * Returns an unsubscribe function.
 */
export function whenSeamOpened(cb: () => void): () => void {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    window.removeEventListener(MOTION_EVENTS.seamOpened, run);
    cb();
  };
  if (isSeamOpen()) queueMicrotask(run);
  else window.addEventListener(MOTION_EVENTS.seamOpened, run);
  return () => {
    done = true;
    window.removeEventListener(MOTION_EVENTS.seamOpened, run);
  };
}
