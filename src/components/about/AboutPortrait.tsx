"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { profile } from "@/data/profile";
import { CrystalCanvas } from "@/components/three/crystal/CrystalCanvas";

/*
 * Portrait column from the reference: a tall portrait lit with a blue rim light,
 * with translucent glass shards layered behind it. The shards are pure CSS so the
 * composition holds even when no image is available.
 *
 * Source: profile.portrait (the owner's real photo) ?? profile.portraitPlaceholder
 * (an abstract illustration — never presented as a real photo). If the file fails
 * to load, an abstract silhouette SVG is drawn instead of a broken image.
 */
/*
 * Feather every edge so the figure melts into the night background like the reference,
 * instead of reading as a framed rectangle (the illustration has its own dark backdrop).
 */
const PORTRAIT_FADE = "radial-gradient(ellipse 50% 48% at 50% 44%, #000 50%, rgba(0,0,0,0.8) 70%, transparent 100%)";
/*
 * Real photo: the face sits on the right of the frame (profile looking right), so the fade
 * is anchored right-of-centre and kept solid over the face, melting away to the left/bottom.
 */
const PHOTO_FADE = "radial-gradient(ellipse 78% 62% at 62% 40%, #000 55%, rgba(0,0,0,0.85) 72%, transparent 100%)";
// Extra straight fades on the right and top edges so the photo's backdrop never shows a hard box edge.
const PHOTO_EDGES = "linear-gradient(to right, #000 84%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 10%)";
const PHOTO_MASK: CSSProperties = {
  maskImage: `${PHOTO_EDGES}, ${PHOTO_FADE}`,
  WebkitMaskImage: `${PHOTO_EDGES}, ${PHOTO_FADE}`,
  maskComposite: "intersect",
  WebkitMaskComposite: "source-in",
};
const PORTRAIT_MASK: CSSProperties = { maskImage: PORTRAIT_FADE, WebkitMaskImage: PORTRAIT_FADE };
// Cutout: only the bottom fades, so the figure settles into the rocky ground of the backdrop.
const CUTOUT_FADE = "linear-gradient(to bottom, #000 78%, transparent 100%)";
const CUTOUT_MASK: CSSProperties = { maskImage: CUTOUT_FADE, WebkitMaskImage: CUTOUT_FADE };

export function AboutPortrait() {
  const isPlaceholder = !profile.portrait;
  const src = profile.portrait ?? profile.portraitPlaceholder;
  const [failed, setFailed] = useState(false);

  // A transparent cutout of the real photo is staged in front of the 3D "about" backdrop
  // (luminous glass panels, rocks, particles) like the reference.
  if (profile.portrait && profile.portraitIsCutout && !failed) {
    return (
      // Box keeps roughly the photo's proportion (10:17) so the figure fills it head-to-waist like the reference.
      <div className="relative mx-auto aspect-[4/5] w-full max-w-[22rem] lg:mx-0 lg:aspect-[10/17] lg:max-w-none">
        <div aria-hidden className="absolute inset-0 lg:-right-[6%]">
          <CrystalCanvas preset="about" />
        </div>
        <div className="absolute inset-x-0 bottom-0 top-0 lg:-right-[6%]" style={CUTOUT_MASK}>
          <Image
            src={profile.portrait}
            alt={`Portrait of ${profile.name}`}
            fill
            sizes="(min-width: 1024px) 34vw, (min-width: 640px) 22rem, 90vw"
            className="object-cover object-[60%_0%] [filter:drop-shadow(-8px_0_18px_rgba(59,130,246,0.55))_drop-shadow(0_0_2px_rgba(147,197,253,0.55))]"
            onError={() => setFailed(true)}
            priority={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto aspect-[4/5] w-full max-w-[19rem] lg:mx-0 lg:aspect-auto lg:h-full lg:min-h-[40rem] lg:max-w-none">
      {/* Glass shards behind the portrait (decorative). */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <span className="absolute -left-[4%] top-[8%] h-[34%] w-[34%] -skew-y-[14deg] rounded-sm border border-indigo/40 bg-gradient-to-br from-indigo/35 via-blue/15 to-transparent shadow-[0_0_40px_-10px_rgba(99,102,241,0.6)]" />
        <span className="absolute left-0 top-[42%] h-[24%] w-[18%] skew-y-[10deg] rounded-sm border border-cyan/35 bg-gradient-to-b from-cyan/30 to-blue/5" />
        <span className="absolute -left-[2%] bottom-[9%] h-[30%] w-[46%] skew-y-[12deg] rounded-sm border border-violet/40 bg-gradient-to-tr from-violet/35 via-indigo/20 to-transparent shadow-[0_0_50px_-12px_rgba(139,92,246,0.6)]" />
        {/* Blue rim light from the right, as in the reference. */}
        <span className="absolute inset-y-[8%] -right-[12%] w-[85%] bg-[radial-gradient(closest-side,rgba(59,130,246,0.26),transparent)]" />
      </div>

      <div
        className="absolute inset-y-0 left-[6%] right-0 overflow-hidden lg:-right-[8%]"
        style={isPlaceholder ? PORTRAIT_MASK : PHOTO_MASK}
      >
        {failed ? (
          <PortraitSilhouette />
        ) : (
          <Image
            src={src}
            alt={isPlaceholder ? "Portrait placeholder" : `Portrait of ${profile.name}`}
            fill
            sizes="(min-width: 1024px) 34vw, (min-width: 640px) 22rem, 90vw"
            // Keep the face (right side of the photo) in frame when the column is narrower than the image.
            className={isPlaceholder ? "object-cover object-[center_top]" : "object-cover object-[82%_12%]"}
            onError={() => setFailed(true)}
          />
        )}
        {/* Rim-light wash over the image edge. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,transparent_55%,rgba(96,165,250,0.18)_85%,rgba(139,92,246,0.12))]"
        />
      </div>
    </div>
  );
}

/** Abstract head-and-shoulders silhouette — clearly an illustration, not a face. */
function PortraitSilhouette() {
  return (
    <svg viewBox="0 0 300 400" role="img" aria-label="Portrait placeholder" className="size-full" preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="about-sil-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1a2550" />
          <stop offset="1" stopColor="#070b1c" />
        </linearGradient>
        <linearGradient id="about-sil-rim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0.4" stopColor="#6366f1" stopOpacity="0" />
          <stop offset="1" stopColor="#60a5fa" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <g fill="url(#about-sil-fill)" stroke="url(#about-sil-rim)" strokeWidth="2">
        <circle cx="150" cy="140" r="62" />
        <path d="M30 400 C 40 290, 90 240, 150 240 C 210 240, 260 290, 270 400 Z" />
      </g>
    </svg>
  );
}
