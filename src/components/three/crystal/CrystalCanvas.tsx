"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useDeviceTier, usePrefersReducedMotion, useWebGLSupport } from "@/hooks/useClientEnv";

/**
 * CONTRACT:
 *   <CrystalCanvas preset="hero" | "skills" | "contact" | "about" className? />
 * - Fills its positioned parent (absolute inset-0 inside a relative box).
 * - Lazy-loads three.js, shows a CSS fallback while loading / without WebGL,
 *   pauses rendering when off-screen, respects reduced motion and device tier.
 * - Purely decorative: aria-hidden, pointer-events none (parallax reads the window pointer).
 * - Transparent canvas: the parent section's background shows through.
 * - Window events (optional, see ./input.ts): "signal:pulse", "hero:progress", "seam:opened";
 *   dispatches "crystal:ready" (detail: preset) after its first WebGL frame.
 */
import type { CrystalPreset } from "./presets";
export type { CrystalPreset };

// three.js + R3F + postprocessing stay out of the initial bundle; the CSS crystal covers the gap.
const CrystalScene = dynamic(() => import("./CrystalScene"), { ssr: false });

const RING = "absolute rounded-[50%] border";
const PANEL =
  "absolute rounded-[2px] border border-[rgba(190,220,255,0.85)] bg-[linear-gradient(to_top,rgba(47,107,255,0.75),rgba(143,186,255,0.6))] shadow-[0_0_36px_rgba(59,130,246,0.6),inset_0_0_24px_rgba(191,219,254,0.35)]";

/*
 * Feathered canvas edges. The alpha pass gives faint bloom a little opacity, which tints the
 * navy behind it; without a feather the canvas bounds read as a darker box (most visible on the
 * square skills canvas). The hero canvas is full-bleed, so it needs none.
 */
const EDGE_MASK: Record<CrystalPreset, string | undefined> = {
  hero: undefined,
  skills: "radial-gradient(closest-side, #000 84%, transparent 100%)",
  contact: "linear-gradient(to right, transparent 0%, #000 14%, #000 100%)",
  // Portrait column: melt into the page on the right (toward the text) and top, a hint at the bottom.
  about: "linear-gradient(to left, transparent 0%, #000 18%, #000 95%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 12%, #000 94%, transparent 100%)",
};

/** Mask style for a preset; multi-layer masks intersect (each gradient fades its own edge). */
function edgeMaskStyle(mask: string | undefined): CSSProperties | undefined {
  if (!mask) return undefined;
  return { maskImage: mask, WebkitMaskImage: mask, maskComposite: "intersect", WebkitMaskComposite: "source-in" };
}

/**
 * CSS stand-in drawn in the same palette and placement as each 3D composition: shown while the
 * scene loads and permanently when WebGL is unavailable.
 */
function CrystalFallback({ preset, visible }: { preset: CrystalPreset; visible: boolean }) {
  const gem = (
    <div
      className="absolute inset-0 bg-[linear-gradient(150deg,#dbe4ff_0%,#8b9cff_28%,#5b4bf0_58%,#2a1a8f_100%)] shadow-[0_0_40px_rgba(99,102,241,0.6)] [clip-path:polygon(50%_0,82%_30%,90%_46%,62%_100%,38%_100%,10%_46%,18%_30%)]"
    />
  );
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 transition-opacity duration-1000 ${visible ? "opacity-100" : "opacity-0"}`}>
      {preset === "hero" && (
        // Mirrors HERO_DESKTOP / HERO_MOBILE in presets.ts (centre 73%/42%, ring span ~40vw).
        <div className="absolute left-[82%] top-[64%] aspect-square w-[70vw] -translate-x-1/2 -translate-y-1/2 md:left-[73%] md:top-[42%] md:w-[min(40vw,64vh)]">
          <div className="absolute inset-[22%] rounded-full bg-[radial-gradient(circle,rgba(129,140,248,0.55)_0%,rgba(99,102,241,0.18)_40%,transparent_70%)] blur-md" />
          <div className={`${RING} inset-x-0 top-[25%] h-[48%] -rotate-[11deg] border-[3px] border-[rgba(147,160,255,0.55)] shadow-[0_0_22px_rgba(96,165,250,0.35),inset_0_0_14px_rgba(96,165,250,0.25)]`} />
          <div className={`${RING} inset-y-[2%] left-[29%] w-[42%] rotate-[13deg] border-2 border-[rgba(180,194,255,0.45)] shadow-[0_0_16px_rgba(129,140,248,0.3)]`} />
          <div className={`${RING} inset-x-[30%] top-[40%] h-[20%] rotate-[18deg] border-[rgba(169,182,255,0.35)]`} />
          <div className="absolute left-1/2 top-1/2 h-[26%] w-[19%] -translate-x-1/2 -translate-y-1/2">{gem}</div>
        </div>
      )}
      {preset === "skills" && (
        <div className="absolute left-1/2 top-1/2 aspect-square w-[min(76%,76vh)] -translate-x-1/2 -translate-y-1/2">
          <div className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle,rgba(96,140,255,0.6)_0%,rgba(80,90,230,0.2)_45%,transparent_70%)] blur-md" />
          <div className={`${RING} inset-x-[6%] top-[30%] h-[40%] rotate-[18deg] border-2 border-[rgba(143,155,255,0.5)]`} />
          <div className={`${RING} inset-y-[8%] left-[28%] w-[44%] -rotate-[30deg] border-[rgba(168,181,255,0.4)]`} />
          <div className="absolute inset-[30%] rounded-full bg-[radial-gradient(circle_at_50%_45%,#3b6dff_0%,#1e2a8a_55%,#0b1030_100%)] shadow-[0_0_50px_rgba(59,130,246,0.55),inset_0_0_18px_rgba(147,197,253,0.5)]" />
        </div>
      )}
      {preset === "about" && (
        // Mirrors ABOUT_PANELS / aboutRocks in presets.ts: luminous blue panels + dark ground.
        <div className="absolute inset-0" style={edgeMaskStyle(EDGE_MASK.about)}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_45%_35%,rgba(47,107,255,0.28),transparent_70%)]" />
          <div className={`${PANEL} left-[4%] top-[5%] h-[50%] w-[30%] [transform:perspective(600px)_rotateY(24deg)_skewY(14deg)]`} />
          <div className={`${PANEL} left-[36%] top-[6%] h-[54%] w-[56%] [transform:perspective(600px)_rotateY(-18deg)_skewY(-10deg)]`} />
          <div className={`${PANEL} left-[58%] top-[56%] h-[28%] w-[40%] [transform:perspective(600px)_rotateY(-20deg)_skewY(-12deg)]`} />
          <div className="absolute inset-x-0 bottom-0 h-[30%] bg-[linear-gradient(to_top,#04050b_0%,#060812_70%,#16245c_100%)] [clip-path:polygon(0_0,22%_8%,45%_38%,70%_42%,100%_52%,100%_100%,0_100%)]" />
        </div>
      )}
      {preset === "contact" && (
        <div className="absolute inset-0" style={{ containerType: "size" }}>
          {/* Wide canvas → gem at 75%/40% (CONTACT_WIDE); narrow → centred (CONTACT_NARROW). */}
          <div className="absolute left-1/2 top-[40%] aspect-square w-[min(56%,52cqh)] -translate-x-1/2 -translate-y-1/2 @min-[56rem]:left-[75%] @min-[56rem]:w-[min(26%,56cqh)]">
            <div className="absolute inset-[5%] rounded-full bg-[radial-gradient(circle,rgba(220,230,255,0.8)_0%,rgba(99,102,241,0.3)_30%,transparent_68%)] blur-md" />
            <div className="absolute inset-[18%] rotate-[38deg] skew-x-[-6deg] rounded-[6%] bg-[linear-gradient(135deg,#e6ecff_0%,#8b9cff_30%,#5b3cf0_65%,#25147a_100%)] opacity-90 shadow-[0_0_60px_rgba(129,140,248,0.6)]" />
            <div className={`${RING} -inset-x-[30%] top-[78%] h-[22%] border-[rgba(184,196,255,0.5)] shadow-[0_0_14px_rgba(129,140,248,0.35)]`} />
          </div>
        </div>
      )}
    </div>
  );
}

export function CrystalCanvas({ preset, className = "" }: { preset: CrystalPreset; className?: string }) {
  const webgl = useWebGLSupport();
  const tier = useDeviceTier();
  const reducedMotion = usePrefersReducedMotion();
  const container = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [seen, setSeen] = useState(false);
  const [ready, setReady] = useState(false);

  // Off-screen canvases stop rendering (frameloop "never"); the scene chunk + WebGL context are
  // only created the first time the box comes within 300px of the viewport.
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setSeen(true);
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const canRender = webgl === true && tier !== null && seen;

  const handleReady = () => {
    setReady(true);
    window.dispatchEvent(new CustomEvent("crystal:ready", { detail: preset }));
  };

  return (
    <div ref={container} aria-hidden data-crystal-preset={preset} className={`pointer-events-none absolute inset-0 ${className}`}>
      <CrystalFallback preset={preset} visible={!ready} />
      {canRender && (
        <div
          className={`absolute inset-0 transition-opacity duration-[1200ms] ${ready ? "opacity-100" : "opacity-0"}`}
          style={edgeMaskStyle(EDGE_MASK[preset])}
        >
          <CrystalScene preset={preset} tier={tier} reducedMotion={reducedMotion} active={inView} onReady={handleReady} />
        </div>
      )}
    </div>
  );
}
