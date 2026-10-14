/**
 * Retired: the first-visit curtain is now the Seam preloader
 * (src/components/transition/Seam.tsx), mounted once in the root layout.
 * Kept only as a compatibility re-export for older imports.
 */
export { introScript, INTRO_MS } from "@/components/transition/intro";
export { Seam as PageIntro } from "@/components/transition/Seam";
