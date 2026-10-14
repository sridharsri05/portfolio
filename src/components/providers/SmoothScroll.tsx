"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { resolveScrollTarget, scrollToTarget, setLenis, tickVelocity } from "@/lib/scroll";

/**
 * Smooth wheel scrolling (Lenis) on the single gsap.ticker loop.
 *
 * - Wheel only: `syncTouch: false` keeps touch scrolling fully native.
 * - lerp 0.1 — light glide, not floaty (floatiness lives in the 3D camera damp).
 * - Not created at all under prefers-reduced-motion (native scroll + native anchors).
 * - Same-page anchors ("#x", "/#x" while on "/") scroll through Lenis with the header offset.
 * - Scrollable children that should scroll on their own need `data-lenis-prevent`
 *   (horizontal rails, the mobile menu, overflow panels).
 *
 * Renders nothing; mount once in the root layout.
 */
export function SmoothScroll() {
  // Re-measure every ScrollTrigger once webfonts have swapped in (line wraps change heights).
  useEffect(() => {
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let teardown: (() => void) | null = null;

    // Did the visitor scroll before we got a chance to correct the initial hash position?
    let userScrolled = false;
    const markUserScroll = () => {
      userScrolled = true;
    };
    window.addEventListener("wheel", markUserScroll, { passive: true, once: true });
    window.addEventListener("touchstart", markUserScroll, { passive: true, once: true });
    window.addEventListener("keydown", markUserScroll, { once: true });

    const setup = () => {
      teardown?.();
      teardown = null;
      if (mq.matches) return;

      const lenis = new Lenis({
        lerp: 0.1,
        wheelMultiplier: 1,
        syncTouch: false,
        autoRaf: false,
        // Anchors are handled below (we need preventDefault so next/link doesn't also jump).
        anchors: false,
        // Kill any running glide when a link leaves the page, so Next's scroll reset wins.
        stopInertiaOnNavigate: true,
      });
      setLenis(lenis);

      // One loop: GSAP's ticker drives Lenis, and Lenis drives ScrollTrigger.
      const raf = (time: number) => {
        lenis.raf(time * 1000);
        tickVelocity();
      };
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
      const offScroll = lenis.on("scroll", ScrollTrigger.update);

      const onClick = (e: MouseEvent) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const a = (e.target as Element | null)?.closest?.("a[href]");
        if (!(a instanceof HTMLAnchorElement)) return;
        if (a.hasAttribute("download") || (a.target && a.target !== "_self")) return;
        if (!(a.getAttribute("href") ?? "").includes("#")) return;

        const url = new URL(a.href, window.location.href);
        if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || url.search !== window.location.search) return;

        const target = resolveScrollTarget(url.hash || "#top");
        if (target === null) return; // unknown id: let the browser do whatever it would do

        // Runs in the window capture phase, before next/link's onClick, which bails on defaultPrevented.
        e.preventDefault();
        scrollToTarget(target);
        if (window.location.hash !== url.hash) {
          // null state lets Next's patched pushState keep its router in sync.
          window.history.pushState(null, "", url.hash || url.pathname);
        }
        // Keyboard activation (detail === 0): move focus like a native in-page jump would.
        if (e.detail === 0 && target instanceof HTMLElement) focusWithoutScroll(target);
      };
      window.addEventListener("click", onClick, { capture: true });

      // Initial hash: the browser already jumped natively, but layout (fonts, 3D, pins)
      // shifts afterwards. Re-align once ScrollTrigger has measured, unless the visitor moved.
      let raf2 = 0;
      let destroyed = false;
      if (window.location.hash) {
        const hash = window.location.hash;
        const align = () => {
          if (userScrolled || destroyed) return;
          ScrollTrigger.refresh();
          raf2 = requestAnimationFrame(() => {
            const el = resolveScrollTarget(hash);
            if (el !== null && !userScrolled && !destroyed) scrollToTarget(el, { immediate: true, force: true });
          });
        };
        if (document.fonts) document.fonts.ready.then(align);
        else align();
      }

      teardown = () => {
        destroyed = true;
        cancelAnimationFrame(raf2);
        window.removeEventListener("click", onClick, { capture: true });
        offScroll();
        gsap.ticker.remove(raf);
        gsap.ticker.lagSmoothing(500, 33);
        lenis.destroy();
        setLenis(null);
      };
    };

    setup();
    mq.addEventListener("change", setup);
    return () => {
      mq.removeEventListener("change", setup);
      window.removeEventListener("wheel", markUserScroll);
      window.removeEventListener("touchstart", markUserScroll);
      window.removeEventListener("keydown", markUserScroll);
      teardown?.();
    };
  }, []);

  return null;
}

/** Focus an element without scrolling; non-focusable targets get a temporary tabindex. */
function focusWithoutScroll(el: HTMLElement) {
  if (!el.hasAttribute("tabindex") && el.tabIndex < 0) {
    el.setAttribute("tabindex", "-1");
    el.addEventListener("blur", () => el.removeAttribute("tabindex"), { once: true });
  }
  el.focus({ preventScroll: true });
}
