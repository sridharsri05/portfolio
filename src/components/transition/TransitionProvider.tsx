"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ScrollTrigger } from "@/lib/gsap";
import { MOTION_EVENTS, prefersReducedMotion } from "@/lib/motion";
import { resolveScrollTarget, scrollToTarget, start as startScroll, stop as stopScroll } from "@/lib/scroll";
import { getSeam, registerNavigator } from "./seam-controller";

/** Max wait for the new route to render behind the curtain. After this the Seam opens regardless. */
const ROUTE_TIMEOUT_MS = 2500;

const normalize = (p: string) => (p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p);
const nextFrames = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

/** Rendered (not inside a hidden <Activity> / display:none subtree). */
const isShown = (el: Element) => el.getClientRects().length > 0;

/**
 * The destination's own content has rendered: a visible `[data-route-ready]` marker (case study)
 * or a visible `main h1`. Pathname alone isn't enough — with Cache Components the route can commit
 * with only its Suspense fallback while the URL-specific content is still streaming.
 */
const isRouteReady = () =>
  Array.from(document.querySelectorAll("#main [data-route-ready], main h1")).some(isShown);

/** Resolves true once the route content is ready, false after `timeout` ms (never traps the caller). */
const waitForReady = (timeout: number) =>
  new Promise<boolean>((resolve) => {
    if (isRouteReady()) return resolve(true);
    const root = document.getElementById("main") ?? document.body;
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      observer.disconnect();
      window.clearTimeout(timer);
      resolve(ok);
    };
    const observer = new MutationObserver(() => {
      if (isRouteReady()) finish(true);
    });
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "hidden", "class"] });
    const timer = window.setTimeout(() => finish(isRouteReady()), Math.max(0, timeout));
  });

/**
 * Runs page transitions for TransitionLink:
 *   close the Seam (destination label rising) → router.push(href, { scroll: false })
 *   → wait for usePathname to match and the route content to render (+2 frames, 2.5s timeout) → jump to hash/top
 *   → ScrollTrigger.refresh → split the Seam open → focus the new h1 + announce it.
 *
 * Reduced motion: no curtain — instant navigation, same focus + announcement.
 * Back/forward and plain links: no curtain; ScrollTriggers are refreshed and `route:enter` fires.
 *
 * Renders only a polite live region. Mount once in the root layout (inside <Suspense>).
 */
export function TransitionProvider() {
  const pathname = usePathname();
  const router = useRouter();
  const pathRef = useRef(pathname);
  const waiters = useRef(new Set<(p: string) => void>());
  const busy = useRef(false);
  /**
   * Set when a TransitionLink navigation is in flight, so the pathname effect knows who's in charge.
   * `late` (a hash, possibly "") means the pathname effect must also land the scroll once the route renders.
   */
  const pending = useRef<{ label?: string; curtain: boolean; late?: string; path?: string } | null>(null);
  const live = useRef<HTMLParagraphElement>(null);
  const firstRun = useRef(true);

  // Track the rendered pathname; resolve anyone waiting for it.
  useEffect(() => {
    pathRef.current = pathname;
    waiters.current.forEach((w) => w(pathname));
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const stored = pending.current;
    if (stored?.curtain) return; // the curtain flow handles refresh/focus itself

    // A pending entry only applies to the route it was created for. Anything else (e.g. Back
    // pressed while a timed-out route was still loading) is a plain navigation: drop it.
    const p = stored && (stored.path === undefined || stored.path === normalize(pathname)) ? stored : null;
    if (stored && !p) pending.current = null;

    // Back/forward, plain links, or a reduced-motion TransitionLink: no curtain.
    let cancelled = false;
    waitForReady(ROUTE_TIMEOUT_MS)
      .then(nextFrames)
      .then(() => {
        if (cancelled) return;
        // A curtain navigation whose route arrived after the curtain had already given up waiting:
        // land on the hash/top now (router.push used scroll: false).
        if (p?.late !== undefined) {
          ScrollTrigger.refresh();
          if (!(p.late && scrollToTarget(p.late, { immediate: true, force: true }))) scrollToTarget(0, { immediate: true, force: true });
        }
        ScrollTrigger.refresh();
        window.dispatchEvent(new CustomEvent(MOTION_EVENTS.routeEnter, { detail: { pathname } }));
        if (p) {
          if (pending.current === p) pending.current = null;
          focusHeading(p.late);
          announce(live.current, p.label);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    const waitForPath = (target: string) =>
      new Promise<boolean>((resolve) => {
        if (normalize(pathRef.current) === target) return resolve(true);
        const timer = window.setTimeout(() => {
          waiters.current.delete(check);
          resolve(false);
        }, ROUTE_TIMEOUT_MS);
        const check = (p: string) => {
          if (normalize(p) !== target) return;
          window.clearTimeout(timer);
          waiters.current.delete(check);
          resolve(true);
        };
        waiters.current.add(check);
      });

    const navigate = async (href: string, label?: string) => {
      if (busy.current) return; // ignore double clicks while the curtain is moving
      const url = new URL(href, window.location.href);
      const path = url.pathname + url.search + url.hash;
      const seam = getSeam();

      if (prefersReducedMotion() || !seam) {
        pending.current = { label, curtain: false, late: url.hash, path: normalize(url.pathname) };
        router.push(path, { scroll: false });
        return;
      }

      busy.current = true;
      pending.current = { label, curtain: true };
      document.documentElement.setAttribute("data-awaiting-enter", "");
      router.prefetch(url.pathname + url.search);
      stopScroll();
      let arrivedInTime = true;
      try {
        const startedAt = performance.now();
        await seam.close(label);
        // The page is covered: reset to the top now so the new page's once-only scroll reveals
        // are measured from 0 rather than firing (off-screen) at the old page's offset.
        scrollToTarget(0, { immediate: true, force: true });
        const arrived = waitForPath(normalize(url.pathname));
        router.push(path, { scroll: false });
        arrivedInTime = await arrived;
        if (!arrivedInTime) throw new Error("route timeout");
        // The URL matched; now wait for the route's own content (not just its Suspense fallback),
        // within what's left of the budget. If it's still missing, open anyway.
        await waitForReady(ROUTE_TIMEOUT_MS - (performance.now() - startedAt));
        await nextFrames();
        // Measure the new page first (pins add spacers), then land on the hash or the top.
        ScrollTrigger.refresh();
        if (!(url.hash && scrollToTarget(url.hash, { immediate: true, force: true }))) {
          scrollToTarget(0, { immediate: true, force: true });
        }
      } catch {
        /* fall through: the curtain must open no matter what */
      } finally {
        startScroll();
        document.documentElement.removeAttribute("data-awaiting-enter");
        const opened = seam.open();
        if (arrivedInTime) {
          window.dispatchEvent(new CustomEvent(MOTION_EVENTS.routeEnter, { detail: { pathname: pathRef.current } }));
          focusHeading(url.hash);
          announce(live.current, label);
          pending.current = null;
        } else {
          // The route is still loading: don't focus/announce the old page. The pathname effect
          // takes over (scroll, refresh, route:enter, focus, announcement) once it renders.
          pending.current = { label, curtain: false, late: url.hash, path: normalize(url.pathname) };
        }
        busy.current = false;
        await opened.catch(() => {});
      }
    };

    registerNavigator((href, label) => void navigate(href, label));
    return () => registerNavigator(null);
  }, [router]);

  return <p ref={live} aria-live="polite" aria-atomic="true" className="sr-only" />;
}

/**
 * Move focus without scrolling to where the visitor landed: the hash target's heading
 * (e.g. "/#work" → the Projects h2), otherwise the new page's h1 (or main).
 */
function focusHeading(hash?: string) {
  const section = hash ? resolveScrollTarget(hash) : null;
  const target =
    (section instanceof HTMLElement ? (section.querySelector<HTMLElement>("h1, h2") ?? section) : null) ??
    firstShown<HTMLElement>("main h1") ??
    firstShown<HTMLElement>("h1") ??
    document.getElementById("main");
  if (!target) return;
  if (!target.hasAttribute("tabindex")) {
    target.setAttribute("tabindex", "-1");
    // It's a heading, not a control: no focus ring when focus is moved programmatically.
    target.style.outline = "none";
    target.addEventListener(
      "blur",
      () => {
        target.removeAttribute("tabindex");
        target.style.removeProperty("outline");
      },
      { once: true },
    );
  }
  target.focus({ preventScroll: true });
}

/** First match that is actually rendered (skips routes kept hidden by <Activity>). */
function firstShown<T extends Element>(selector: string): T | null {
  return Array.from(document.querySelectorAll<T>(selector)).find(isShown) ?? null;
}

function announce(region: HTMLElement | null, label?: string) {
  if (!region) return;
  const name = label?.trim() || document.title;
  region.textContent = "";
  // Clear then set on the next tick so repeated announcements are still read.
  window.setTimeout(() => {
    region.textContent = `${name} loaded`;
  }, 60);
}
