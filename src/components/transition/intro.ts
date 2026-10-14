/**
 * Inline <head> script (plain string, safe to import from the server layout).
 * Runs before first paint and decides whether the Seam preloader plays:
 * once per browser session, never under prefers-reduced-motion.
 *
 *   html[data-intro="play"] → the preloader overlay is shown (CSS) and animated (Seam.tsx)
 *   html[data-intro="skip"] → the overlay is display:none from the first paint
 *   (no JS)                 → attribute never set → overlay hidden, content visible
 */
export const introScript = `try{var d=document.documentElement,s=sessionStorage.getItem("sg-intro")==="1",r=matchMedia("(prefers-reduced-motion: reduce)").matches;d.dataset.intro=s||r?"skip":"play";sessionStorage.setItem("sg-intro","1")}catch(e){document.documentElement.dataset.intro="skip"}`;

/** Typical time (ms) from first paint until the Seam starts opening on a first visit. Prefer the `seam:opened` event. */
export const INTRO_MS = 1200;
