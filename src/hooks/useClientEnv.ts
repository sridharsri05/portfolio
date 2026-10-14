"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

// Stable subscribe functions per query so useSyncExternalStore doesn't resubscribe each render.
const mediaSubscribers = new Map<string, (cb: () => void) => () => void>();
function subscribeMedia(query: string) {
  let sub = mediaSubscribers.get(query);
  if (!sub) {
    sub = (cb: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    };
    mediaSubscribers.set(query, sub);
  }
  return sub;
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)") ?? false;
}

/** Media query state; `null` during SSR so callers can render a neutral first pass. */
export function useMediaQuery(query: string): boolean | null {
  return useSyncExternalStore(
    subscribeMedia(query),
    () => window.matchMedia(query).matches,
    () => null,
  );
}

let webglSupport: boolean | undefined;
function detectWebGL() {
  if (webglSupport === undefined) {
    try {
      const canvas = document.createElement("canvas");
      webglSupport = !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}

/** `null` on the server, then true/false once detected in the browser. */
export function useWebGLSupport(): boolean | null {
  return useSyncExternalStore(noopSubscribe, detectWebGL, () => null);
}

export type DeviceTier = "high" | "low";

function detectTier(): DeviceTier {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const small = window.matchMedia("(max-width: 767px)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const cores = nav.hardwareConcurrency ?? 8;
  const memory = nav.deviceMemory ?? 8;
  return small || coarse || cores <= 4 || memory <= 4 ? "low" : "high";
}

/**
 * Rough rendering budget. "low" drops post-processing, particle counts and DPR.
 * Re-evaluated when the viewport crosses the mobile breakpoint.
 */
export function useDeviceTier(): DeviceTier | null {
  return useSyncExternalStore(subscribeMedia("(max-width: 767px)"), detectTier, () => null);
}

/** Current month as an absolute index (year * 12 + month0); null during prerender. */
export function useCurrentMonthIndex(): number | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => {
      const d = new Date();
      return d.getFullYear() * 12 + d.getMonth();
    },
    () => null,
  );
}
