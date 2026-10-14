"use client";

import { useEffect, useMemo } from "react";
import { BlendFunction, Effect } from "postprocessing";

/*
 * Why this exists: the crystal canvases are transparent (alpha) so each section's CSS
 * backdrop shows through. Additive glows (halos, flares, neon ring cores, stars, Bloom) add
 * colour but almost no alpha, and the browser composites the canvas as PREMULTIPLIED — any
 * pixel whose rgb exceeds its alpha gets clamped, which turned the blue halos into grey haze.
 *
 * Fix: raise alpha to at least the brightest channel. sqrt-ish gamma (1/2.2) because the
 * composer encodes to sRGB after this effect and the encoded rgb must still be ≤ alpha.
 * Visually the glow then composites like a "screen" over the page background.
 */
const fragment = /* glsl */ `
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float peak = max(max(inputColor.r, inputColor.g), inputColor.b);
  float a = max(inputColor.a, pow(clamp(peak, 0.0, 1.0), 1.0 / 2.2));
  outputColor = vec4(inputColor.rgb, clamp(a, 0.0, 1.0));
}
`;

class AlphaFromColorEffect extends Effect {
  constructor() {
    super("AlphaFromColorEffect", fragment, { blendFunction: BlendFunction.SRC });
  }
}

/** Place LAST inside <EffectComposer>, after <ToneMapping /> (needs rgb in 0..1). */
export function AlphaFromColor() {
  const effect = useMemo(() => new AlphaFromColorEffect(), []);
  useEffect(() => () => effect.dispose(), [effect]);
  return <primitive object={effect} dispose={null} />;
}
