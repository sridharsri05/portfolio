/*
 * Preset compositions for <CrystalCanvas preset="hero" | "skills" | "contact" | "about" />.
 *
 * Everything a visual-polish pass is likely to touch lives in the UPPER_CASE tuning
 * constants at the top of each preset block. Units:
 *  - "cluster units": the local space of the crystal + rings group before layout scaling.
 *  - nx / ny: position as a fraction of the visible viewport at z=0, centred
 *    (nx 0.18 → 68% from the left edge; ny 0.08 → 42% from the top edge).
 *  - Colours given as [r, g, b] tuples are LINEAR HDR values (> 1 blooms on the high tier).
 */

export type CrystalPreset = "hero" | "skills" | "contact" | "about";
export type Vec3 = [number, number, number];
export type Viewport = { width: number; height: number; aspect: number };

export type GemKind = "diamond" | "chunky" | "orb";
export type GemSpec = {
  kind: GemKind;
  /** Height (diamond) / edge length (chunky) / diameter (orb) in cluster units. */
  size: number;
  position: Vec3;
  rotation: Vec3;
  /** Idle spin around the gem's local Y axis, rad/s. */
  spin: number;
  /** Outer shell tint (front faces) and inner-facet tint (back faces). */
  tint: string;
  innerTint: string;
  /** Glowing inner core: same silhouette, scaled down, unlit HDR colour. */
  core: { color: Vec3; scale: number };
  edgeColor: Vec3;
  halo: { size: number; color: Vec3; opacity: number };
  light: { color: string; intensity: number; distance: number };
  /**
   * Optional slow back-and-forth sway (rad, rad/s) used INSTEAD of the continuous spin, so a
   * chosen corner keeps facing the camera.
   */
  sway?: { amp: number; speed: number };
  /**
   * Optional "clear glass" look: facets graded `top` (light lilac/ice) → `mid` → `bottom` (deep
   * violet) in screen space (after `rotation`), a more transparent shell, and see-through
   * internal facet lines at `innerEdges` opacity.
   */
  glass?: { top: string; mid: string; bottom: string; innerEdges: number };
};

export type RingSpec = {
  radius: number;
  tube: number;
  /** X stretch of the ring (1 = circle; perspective + tilt already make it read elliptical). */
  ellipse: number;
  /** Applied X first, then Y, then Z (Euler order "ZYX"), so Z is the on-screen roll. */
  tilt: Vec3;
  position?: Vec3;
  /** Amplitude (rad) and speed of the slow precession wobble. */
  wobble: number;
  wobbleSpeed: number;
  /** Beads travel along the ring at this angular speed (rad/s, sign = direction). */
  beadSpin: number;
  color: string;
  opacity: number;
  /** HDR colour of the neon core line and where along the ring it is brightest (rad). */
  glow: Vec3;
  glowAngle: number;
  beads?: { angles: number[]; sizes: number[] };
  /**
   * Optional glass-ribbon look: a thin open band of `width` (along the ring axis) replaces the
   * round tube, with HDR `edge` highlight lines along both rims.
   */
  ribbon?: { width: number; edge: Vec3 };
  /**
   * Energy sparks fixed on the ring at these angles (rad, same parametrisation as `beads`):
   * they ride the ring's wobble but not the bead travel, so the glints stay where the reference
   * shows them. Rendered by the shared glow-point shader (see SparkSpec for units).
   */
  sparks?: { angle: number; size: number; color: Vec3; halo?: number }[];
};

/**
 * Floating fragments. "prism" (hexagonal quartz-like bipyramid) and "chip" (irregular faceted
 * nugget) are the small blue crystal fragments; "sliver" a thin shard; "cube"/"slab"/"pane" the
 * big pieces.
 */
export type ShardKind = "cube" | "slab" | "sliver" | "pane" | "prism" | "chip";
export type ShardSpec = {
  kind: ShardKind;
  position: Vec3;
  scale: Vec3;
  rotation: Vec3;
  /** Tumble speed rad/s and float amplitude (cluster units). */
  spin: number;
  float: number;
  /** Optional slow swing around the cluster's Y axis (rad amplitude, ~90s period): drifts around the crystal. */
  orbit?: number;
  /** High tier only (dropped on the low tier to save draw/fill cost). */
  detail?: boolean;
};

/* ───────────────────── Particles (shared by all presets) ─────────────────────
 * Rendered by one additive glow-point shader (parts.tsx → GlowPoints): soft round sprite, size
 * attenuated by true view depth, per-point size/colour/brightness, twinkle + drift computed in
 * the vertex shader (no per-frame CPU buffer work). Units:
 *  - size: core diameter in CSS px for a point on the z = 0 plane of a 900px-tall canvas; a
 *    point at distance d from the camera renders size × camera.z / d (perspective attenuation).
 *  - brightness multiplies the tint (linear); keep dust < 1 so Bloom (threshold 0.95) ignores
 *    it, sparks > 1 so the high tier blooms them.
 */
export type ParticleTint = "blue" | "violet" | "ice" | "white" | "cyan";
export type ParticleField = {
  count: { high: number; low: number };
  /** World-space z range (camera sits at +camera.z looking down -Z): spreads the field through depth. */
  depth: [number, number];
  /**
   * Screen-anchored rectangle [nxMin, nxMax, nyMin, nyMax] (fractions of the frame, centred, so
   * ±0.5 = frame edge) evaluated at each point's own depth, so every depth shell covers the
   * same part of the screen and parallax reveals the depth.
   */
  region: [number, number, number, number];
  /** > 0 thins the field towards the bottom (stars thin out over the ridge). */
  topBias?: number;
  /**
   * Gaussian clumps (screen fractions; r = σ as a fraction of frame height) taking `share` of the
   * points. Omit nx/ny to centre the clump on the crystal wherever the layout puts it.
   */
  clusters?: { nx?: number; ny?: number; r: number; share: number }[];
  size: [number, number];
  /** Exponent on the size pick (> 1 → mostly small points, a few larger). */
  sizeSkew?: number;
  brightness: [number, number];
  tints: Partial<Record<ParticleTint, number>>;
  /**
   * Optional bright tail: `share` of the points (only right of `minNx`, so a text column stays
   * clean) become haloed stars, size × `size` and brightness × `brightness` with soft `halo`.
   * Picked from a separate seeded stream, so the rest of the field keeps its placement.
   */
  brightTail?: { share: number; size: [number, number]; brightness: number; halo: number; minNx?: number };
  /**
   * Optional dimming of points inside a screen rectangle [nxMin, nxMax, nyMin, nyMax] on canvases
   * narrower than `maxAspect` (e.g. the stacked mobile hero: keep the text block area darker).
   */
  shade?: { maxAspect: number; rect: [number, number, number, number]; factor: number };
  /** Twinkle depth 0..1 (only ~half the points twinkle visibly) and drift radius (world units). */
  twinkle: number;
  drift: number;
  seed: number;
};
/**
 * A screen-anchored glow point in world space (nx/ny as in ParticleField.region, at depth z):
 * single landmark lights of the backdrop, e.g. the head of the hero's top light streak.
 */
export type BeaconSpec = {
  nx: number;
  ny: number;
  z: number;
  size: number;
  color: Vec3;
  halo?: number;
  /** Only shown when the canvas aspect is at least this (e.g. a glint on the desktop ridge). */
  minAspect?: number;
};
/** A bright cyan-blue energy point in cluster space; `halo` 0..1.5 widens its soft glow + glint. */
export type SparkSpec = { position: Vec3; size: number; color: Vec3; halo?: number; detail?: boolean };

/** Shared particle palette (sRGB hex; converted to linear when the buffers are built). */
export const PARTICLE_TINTS: Record<ParticleTint, string> = {
  blue: "#5b8cff",
  violet: "#8b6cff",
  ice: "#a9c8ff",
  white: "#eef2ff",
  cyan: "#5fd6ff",
};
/** Default spark colour: HDR cyan-blue (blooms on the high tier). */
const SPARK: Vec3 = [1.5, 2.7, 5.2];
const SPARK_SOFT: Vec3 = [0.8, 1.5, 3.4];

/** `sparks`: bright haloed glints seeded on this rock's ridge top (see rockGlintPoints). */
export type RockSpec = { nx: number; ny: number; r: number; z: number; stretch: Vec3; seed: number; sparks?: number };
/**
 * A preset's rock set. `glintDust` is the share of upward facets carrying a tiny mineral speck on
 * the high tier (halved on the low tier); `dustBrightness` scales those specks.
 */
export type RockSet = { unit: number; items: RockSpec[]; glintDust: number; dustBrightness?: number; rim?: Vec3 };
/**
 * Luminous glass panel (world space, built per viewport by the preset): a flat sheet with an
 * HDR emissive gradient (`bottom` -> `top`, linear RGB), bright `edge` outline, faint inner grid +
 * fine scanlines and a slow travelling shimmer band. `glow` is the soft outer halo strength (the
 * low tier, which has no Bloom, leans on it). `shear` slants the top/bottom edges (y += x * shear)
 * so the sheet reads as a parallelogram; `rotation` adds the perspective tilt. `sway` (rad) and
 * `float` (units) drive a very slow idle drift, offset per panel by `phase`.
 */
export type PanelSpec = {
  position: Vec3;
  size: [number, number];
  rotation: Vec3;
  shear: number;
  bottom: Vec3;
  top: Vec3;
  edge: Vec3;
  /** Body opacity 0..1 (edges and halo are not scaled by it). */
  opacity: number;
  glow: number;
  /** Grid cell size in world units (0 = no grid). */
  grid: number;
  sway: number;
  float: number;
  phase: number;
};
/** Extra point light (e.g. the panels' blue spill on the rocks). */
export type LightSpec = { position: Vec3; color: string; intensity: number; distance: number };
export type FlareSpec = { position: Vec3; size: number; streak: number; color: Vec3; angle: number };
export type Layout = { x: number; y: number; scale: number };

export type PresetConfig = {
  camera: { fov: number; z: number };
  layout: (vp: Viewport) => Layout;
  /** Rocks are placed in viewport space (not cluster space) so they hug the frame edges. */
  rocks: ((vp: Viewport) => RockSet) | null;
  /** null -> no gem (the "about" backdrop). */
  gem: GemSpec | null;
  /** Luminous glass panels, laid out in viewport space (inside the Rig: they share its parallax). */
  panels?: (vp: Viewport) => PanelSpec[];
  lights?: LightSpec[];
  rings: RingSpec[];
  shards: ShardSpec[];
  flares: FlareSpec[];
  /** Depth-particle fields in world space (outside the cluster, so camera parallax shows depth). */
  particles: ParticleField[];
  /** Free energy sparks in cluster space (ring-anchored ones live on RingSpec.sparks). */
  sparks: SparkSpec[];
  /** Screen-anchored landmark lights (world space). */
  beacons: BeaconSpec[];
  bloom: { intensity: number; threshold: number; radius: number };
  /** Pointer parallax: cluster rotation (rad at the screen edge) and camera shift (units). */
  parallax: { rotate: number; camera: number };
  /** Idle bob amplitude (cluster units). */
  float: number;
  /** Hero only: scale-in intro gated on the Seam preloader, scroll-velocity reactivity. */
  intro: boolean;
  scrollReactive: boolean;
  /** Max device pixel ratio per tier. */
  dpr: { high: number; low: number };
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/* ────────────────────────────── HERO ──────────────────────────────
 * ref/hero.png: two large crossing glass rings (span ≈ 48%→88% of the viewport width,
 * centre ≈ 68% / 42%), a small vertical blue-violet diamond at the centre, cubic beads on
 * the rings, a big dark slab lower-left of the rings and a rocky ridge lower-right. */
export const HERO_CAMERA = { fov: 36, z: 10 };
/** Projected width of the largest ring in cluster units (2 × radius × ellipse + tube). */
const HERO_DESIGN_SPAN = 4.75;
/** Projected height of the tall ring — used to cap the scale on very wide screens. */
const HERO_DESIGN_HEIGHT = 4.2;
// nx 0.23 → ring centre ≈ 73% so the big ring clears the end of "MOVE BUSINESS" (ref: clear gap).
export const HERO_DESKTOP = { nx: 0.23, ny: 0.08, spanOfWidth: 0.395, maxHeightOfViewport: 0.6 };
export const HERO_TABLET = { nx: 0.22, ny: 0.04, spanOfWidth: 0.52, maxHeightOfViewport: 0.5 };
export const HERO_MOBILE = { nx: 0.3, ny: -0.13, spanOfWidth: 0.66, maxHeightOfViewport: 0.42 };
export const HERO_GEM_HEIGHT = 1.32;

function heroLayout(vp: Viewport): Layout {
  const c = vp.aspect >= 1.1 ? HERO_DESKTOP : vp.aspect >= 0.75 ? HERO_TABLET : HERO_MOBILE;
  const scale = Math.min(
    (vp.width * c.spanOfWidth) / HERO_DESIGN_SPAN,
    (vp.height * c.maxHeightOfViewport) / HERO_DESIGN_HEIGHT,
  );
  return { x: vp.width * c.nx, y: vp.height * c.ny, scale };
}

function heroRocks(vp: Viewport): RockSet {
  const unit = Math.min(vp.height, vp.width * 0.75);
  if (vp.aspect < 0.75) {
    return {
      unit,
      glintDust: 0.1,
      items: [
        { nx: 0.5, ny: -0.43, r: 0.46, z: -0.4, stretch: [1.4, 0.75, 1] as Vec3, seed: 11, sparks: 2 },
        { nx: 0.14, ny: -0.53, r: 0.34, z: -0.2, stretch: [1.5, 0.7, 1] as Vec3, seed: 23, sparks: 1 },
      ],
    };
  }
  return {
    unit,
    // Ref: a dark ridge with only a handful of bright sparkles along the crest, few specks.
    glintDust: 0.1,
    items: [
      // Ridge rising to the right edge, peak ≈ middle height at the right edge (ref).
      { nx: 0.53, ny: -0.3, r: 0.32, z: -0.8, stretch: [1.25, 0.95, 1] as Vec3, seed: 11, sparks: 2 },
      { nx: 0.3, ny: -0.43, r: 0.24, z: -0.4, stretch: [1.45, 0.8, 1] as Vec3, seed: 23, sparks: 2 },
      { nx: 0.12, ny: -0.52, r: 0.18, z: -0.2, stretch: [1.6, 0.75, 1] as Vec3, seed: 37, sparks: 1 },
      { nx: -0.06, ny: -0.57, r: 0.13, z: 0, stretch: [1.7, 0.7, 1] as Vec3, seed: 41 },
      { nx: -0.36, ny: -0.6, r: 0.12, z: -0.6, stretch: [2, 0.65, 1] as Vec3, seed: 53, sparks: 1 },
    ],
  };
}

/**
 * Small faceted blue crystals drifting around the gem and through the rings at several depths
 * (cluster units; scale ≈ 0.1 → ~9px tall at 1440). Ref: a handful, never a swarm.
 */
export const HERO_FRAGMENTS: ShardSpec[] = [
  // Mid-size faceted crystals hugging the rings' upper-left / upper-right (ref: a few chunks that
  // read as cut crystals, not specks), plus one small piece below. Never a swarm.
  { kind: "prism", position: [1.55, 0.95, -0.7], scale: [0.18, 0.43, 0.18], rotation: [0.4, 0.2, 0.7], spin: 0.2, float: 0.05, orbit: 0.08 },
  { kind: "chip", position: [2.7, -0.2, -0.4], scale: [0.26, 0.22, 0.24], rotation: [0.3, 0.8, 0.2], spin: -0.14, float: 0.04 },
  { kind: "prism", position: [-0.65, 1.7, 0.3], scale: [0.15, 0.37, 0.15], rotation: [0.2, 0.4, -0.6], spin: 0.22, float: 0.05, orbit: 0.06 },
  { kind: "chip", position: [-2.5, 0.45, 0.6], scale: [0.15, 0.14, 0.15], rotation: [1.0, 0.2, 0.4], spin: 0.18, float: 0.05 },
  { kind: "prism", position: [2.3, 1.6, -1.0], scale: [0.11, 0.28, 0.11], rotation: [0.3, 1.1, 0.9], spin: 0.2, float: 0.04, detail: true },
  { kind: "prism", position: [0.85, -1.65, 1.2], scale: [0.1, 0.24, 0.1], rotation: [0.9, 0.3, 1.1], spin: -0.2, float: 0.04, orbit: 0.07, detail: true },
];

/** Mobile hero (ref): stars mostly in the top band and around the ring; the text block stays dark. */
const HERO_MOBILE_TEXT_SHADE: ParticleField["shade"] = { maxAspect: 0.75, rect: [-0.6, 0.22, -0.42, 0.36], factor: 0.65 };

/**
 * Hero particles (world space, camera z 10). Ref: sparse stars across the sky thinning over the
 * ridge, a blue/violet dust haze concentrated around the crystal and along the top light streak,
 * a few big defocused motes in front, almost nothing over the headline column.
 */
export const HERO_PARTICLES: ParticleField[] = [
  // Far stars: whole sky, thinning towards the ridge.
  {
    count: { high: 280, low: 125 }, depth: [-18, -7], region: [-0.55, 0.55, -0.45, 0.55], topBias: 1.1,
    size: [2.4, 6.5], sizeSkew: 2.4, brightness: [0.3, 1.05], tints: { white: 3, ice: 3, blue: 2, violet: 1.5 },
    // Ref: a handful of noticeably brighter, haloed stars in the open sky (none over the headline).
    brightTail: { share: 0.035, size: [2.5, 3.5], brightness: 2.1, halo: 0.55, minNx: -0.12 },
    shade: HERO_MOBILE_TEXT_SHADE,
    twinkle: 0.7, drift: 0, seed: 17,
  },
  // Mid dust: around the rings and under the top light streak.
  {
    count: { high: 120, low: 55 }, depth: [-5, 0.5], region: [-0.05, 0.55, -0.3, 0.5],
    clusters: [
      { r: 0.2, share: 0.45 },
      { nx: -0.06, ny: 0.43, r: 0.07, share: 0.12 },
    ],
    size: [1.8, 4.6], sizeSkew: 2, brightness: [0.25, 0.85], tints: { blue: 3, violet: 3, ice: 1.5 },
    shade: HERO_MOBILE_TEXT_SHADE,
    twinkle: 0.5, drift: 0.12, seed: 29,
  },
  // Near motes: few, large, dim (parallax depth cue). High tier only (big sprites = fill cost).
  {
    count: { high: 12, low: 0 }, depth: [2, 5], region: [0, 0.55, -0.35, 0.5],
    size: [3.5, 7], brightness: [0.12, 0.28], tints: { blue: 2, violet: 2, ice: 1 },
    twinkle: 0.25, drift: 0.18, seed: 41,
  },
];

/** Free sparks: tiny energy points close to the gem and one over the left run of the rings. */
export const HERO_SPARKS: SparkSpec[] = [
  { position: [0.6, 0.8, 0.7], size: 5.4, color: SPARK, halo: 0.6 },
  { position: [-0.55, -0.55, 0.9], size: 4.7, color: SPARK_SOFT, halo: 0.5 },
  { position: [-1.95, 1.7, -0.5], size: 5.8, color: SPARK_SOFT, halo: 0.7, detail: true },
];

export const HERO: PresetConfig = {
  camera: HERO_CAMERA,
  layout: heroLayout,
  rocks: heroRocks,
  gem: {
    kind: "diamond",
    size: HERO_GEM_HEIGHT,
    position: [0, 0.02, 0],
    rotation: [0.06, 0.4, 0.07],
    spin: 0.22,
    tint: "#3242f0",
    innerTint: "#5a2cff",
    core: { color: [0.5, 0.75, 4.2], scale: 0.5 },
    edgeColor: [0.45, 0.6, 2.6],
    halo: { size: 2.7, color: [0.24, 0.18, 1.4], opacity: 0.5 },
    light: { color: "#5b63ff", intensity: 10, distance: 5.5 },
  },
  rings: [
    // Ring A: the big near-horizontal ellipse, rising to the right (~11°).
    {
      radius: 2.3, tube: 0.085, ellipse: 1.02, tilt: [-1.02, 0.02, 0.42], wobble: 0.05, wobbleSpeed: 0.21,
      beadSpin: 0.07, color: "#6c78ff", opacity: 0.34, glow: [0.12, 0.42, 3.8], glowAngle: -1.9,
      beads: { angles: [2.75, 3.25, 4.65, 0.2, 1.05], sizes: [0.24, 0.21, 0.17, 0.27, 0.16] },
      // Glints at the ring's left tip, its front run and its right end (ref).
      sparks: [
        { angle: 3.02, size: 9, color: SPARK, halo: 1 },
        { angle: 4.32, size: 7.2, color: SPARK_SOFT, halo: 0.8 },
        { angle: 5.95, size: 6.3, color: SPARK_SOFT, halo: 0.6 },
      ],
    },
    // Ring B: the tall narrow ellipse, leaning right at the top.
    {
      radius: 2.05, tube: 0.06, ellipse: 1, tilt: [0.16, 1.11, -0.23], wobble: 0.06, wobbleSpeed: -0.17,
      beadSpin: -0.05, color: "#8f9cff", opacity: 0.34, glow: [0.3, 0.5, 2.6], glowAngle: 1.2,
      beads: { angles: [1.4, 4.3], sizes: [0.28, 0.16] },
      // Bright point where the tall ring dips below ring A (ref: the flare at the bottom crossing).
      sparks: [{ angle: 4.62, size: 10.8, color: SPARK, halo: 1.2 }],
    },
    // Ring C: faint, thin outer orbit.
    {
      radius: 2.6, tube: 0.012, ellipse: 1.04, tilt: [-1.32, 0.45, -0.42], wobble: 0.04, wobbleSpeed: 0.13,
      beadSpin: 0, color: "#8b8fff", opacity: 0.35, glow: [0.45, 0.5, 1.6], glowAngle: 2.4,
      sparks: [{ angle: 2.55, size: 5.4, color: SPARK_SOFT, halo: 0.5 }],
    },
    // Inner orbit hugging the gem (the small concentric lines in the ref).
    {
      radius: 0.95, tube: 0.016, ellipse: 1, tilt: [-1.2, -0.35, 0.3], wobble: 0.08, wobbleSpeed: 0.33,
      beadSpin: 0, color: "#a9b6ff", opacity: 0.4, glow: [0.5, 0.8, 2.4], glowAngle: -1.4,
      sparks: [{ angle: 0.45, size: 5.4, color: SPARK, halo: 0.5 }],
    },
  ],
  shards: [
    // Large tilted glass cube upper-left of the gem.
    { kind: "cube", position: [-1.25, 1.2, 0.5], scale: [0.5, 0.5, 0.5], rotation: [0.6, 0.5, 0.2], spin: 0.12, float: 0.07 },
    // Glass cube right, below ring A's right end.
    { kind: "cube", position: [1.7, -0.68, 0.55], scale: [0.42, 0.42, 0.42], rotation: [0.3, 0.9, 0.5], spin: -0.1, float: 0.06 },
    // The big dark slab lower-left (ref: floating rock-glass chunk).
    { kind: "slab", position: [-1.8, -2.0, 0.9], scale: [1.3, 0.38, 0.62], rotation: [0.35, 0.35, -0.42], spin: 0.03, float: 0.09 },
    ...HERO_FRAGMENTS,
  ],
  flares: [
    // Star glint at the top of ring B (ref: bright sparkle on the ring's upper edge).
    { position: [0.52, 2.05, 0.3], size: 0.3, streak: 1.5, color: [1.2, 1.5, 3.2], angle: 0.15 },
    // Small sparkle on ring A's lower-left run.
    { position: [-1.6, -0.62, 1.1], size: 0.18, streak: 0.7, color: [1.0, 1.2, 2.8], angle: -0.3 },
  ],
  particles: HERO_PARTICLES,
  sparks: HERO_SPARKS,
  // Ref: the bright star at the head of the top light streak and a small violet point below it.
  beacons: [
    { nx: -0.135, ny: 0.47, z: -6, size: 7.5, color: [1.4, 1.9, 4.4], halo: 0.9 },
    { nx: -0.075, ny: 0.33, z: -4, size: 5, color: [1.3, 0.95, 3.0], halo: 0.6 },
    // Small blue stars in the upper-right sky (ref).
    { nx: 0.284, ny: 0.364, z: -7, size: 5.5, color: [0.9, 1.5, 3.6], halo: 0.6 },
    { nx: 0.446, ny: 0.297, z: -8, size: 4.5, color: [0.7, 1.1, 2.8], halo: 0.5 },
    { nx: 0.165, ny: 0.411, z: -9, size: 4, color: [0.7, 1.0, 2.4], halo: 0.4 },
    // Lilac glint on the ridge crest below the rings (desktop ridge layout only).
    { nx: 0.245, ny: -0.205, z: 0.4, size: 6, color: [2.2, 1.6, 3.8], halo: 1, minAspect: 1.1 },
  ],
  bloom: { intensity: 0.85, threshold: 0.95, radius: 0.72 },
  parallax: { rotate: 0.22, camera: 0.28 },
  float: 0.07,
  intro: true,
  scrollReactive: true,
  dpr: { high: 1.75, low: 1.25 },
};

/* ────────────────────────────── SKILLS ──────────────────────────────
 * ref/skills.png: a central glowing orb (the "</>" glyph is HTML laid over its centre by the
 * skills package — keep the centre bright and uncluttered) wrapped in swirling glass rings. */
export const SKILLS_CAMERA = { fov: 35, z: 8 };
/** Projected diameter of the outer ring in cluster units. */
const SKILLS_DESIGN_SPAN = 3.8;
/** Fraction of min(viewport width, height) the ring swirl spans. */
export const SKILLS_SPAN_OF_VIEWPORT = 0.76;
export const SKILLS_ORB_DIAMETER = 1.55;

/** Small angular shards around the orb (ref: broken glass bits caught in the ribbons). */
export const SKILLS_FRAGMENTS: ShardSpec[] = [
  { kind: "sliver", position: [1.6, -1.05, 0.3], scale: [0.1, 0.26, 0.1], rotation: [0.5, 0.2, 0.9], spin: 0.22, float: 0.04 },
  { kind: "prism", position: [-1.35, 1.2, 0.2], scale: [0.1, 0.25, 0.1], rotation: [1.1, 0.4, -0.3], spin: -0.2, float: 0.04, orbit: 0.08 },
  { kind: "chip", position: [1.25, 1.35, 0.5], scale: [0.13, 0.11, 0.13], rotation: [0.3, 0.6, 0.2], spin: 0.18, float: 0.04 },
  { kind: "prism", position: [-1.75, -0.35, 0.7], scale: [0.08, 0.21, 0.08], rotation: [0.2, 0.3, 1.0], spin: 0.2, float: 0.04, orbit: 0.06 },
  { kind: "chip", position: [0.2, -1.55, -0.6], scale: [0.1, 0.08, 0.1], rotation: [0.8, 0.1, 0.5], spin: -0.16, float: 0.03, detail: true },
];

/**
 * Skills particles (camera z 8, square-ish canvas with a radial feather). Ref: a little blue /
 * violet dust in the orb's glow and a few faint stars; the cards around it stay clean.
 */
export const SKILLS_PARTICLES: ParticleField[] = [
  {
    count: { high: 46, low: 22 }, depth: [-9, -4], region: [-0.45, 0.45, -0.45, 0.45],
    size: [2.2, 5], sizeSkew: 2.4, brightness: [0.2, 0.7], tints: { white: 2, ice: 3, blue: 2 },
    twinkle: 0.6, drift: 0, seed: 53,
  },
  {
    count: { high: 60, low: 28 }, depth: [-2.5, 1.5], region: [-0.4, 0.4, -0.4, 0.4],
    clusters: [{ r: 0.16, share: 0.65 }],
    size: [2, 4.5], sizeSkew: 2, brightness: [0.3, 0.95], tints: { blue: 3, violet: 3, ice: 1 },
    twinkle: 0.5, drift: 0.08, seed: 59,
  },
];

export const SKILLS: PresetConfig = {
  camera: SKILLS_CAMERA,
  layout: (vp) => ({ x: 0, y: 0, scale: (Math.min(vp.width, vp.height) * SKILLS_SPAN_OF_VIEWPORT) / SKILLS_DESIGN_SPAN }),
  rocks: null,
  gem: {
    kind: "orb",
    size: SKILLS_ORB_DIAMETER,
    position: [0, 0, 0],
    rotation: [0.2, 0, 0.1],
    spin: 0.16,
    tint: "#2f5bff",
    innerTint: "#3a3cff",
    // Saturated electric-blue core (not white) so the white "</>" HTML glyph on top keeps its contrast.
    core: { color: [0.1, 0.32, 2.1], scale: 0.86 },
    edgeColor: [0.4, 0.6, 1.8],
    halo: { size: 2.9, color: [0.2, 0.32, 1.5], opacity: 0.45 },
    light: { color: "#5b7bff", intensity: 7, distance: 5 },
  },
  rings: [
    // Glass ribbons (ref): translucent bands with cyan-white rim highlights.
    {
      radius: 1.55, tube: 0.1, ellipse: 1.08, tilt: [-1.18, 0.1, 0.32], wobble: 0.08, wobbleSpeed: 0.25,
      beadSpin: 0, color: "#6f7cff", opacity: 0.26, glow: [0.7, 0.22, 2.3], glowAngle: -1.6,
      ribbon: { width: 0.3, edge: [0.55, 1.2, 2.3] },
      sparks: [
        { angle: 3.45, size: 8.1, color: SPARK, halo: 1 },
        { angle: 0.35, size: 5.4, color: SPARK_SOFT, halo: 0.6 },
      ],
    },
    {
      radius: 1.8, tube: 0.07, ellipse: 1.05, tilt: [0.35, 1.0, -0.55], wobble: 0.1, wobbleSpeed: -0.2,
      beadSpin: 0, color: "#7685ff", opacity: 0.22, glow: [0.15, 0.55, 2.2], glowAngle: 0.8,
      ribbon: { width: 0.22, edge: [0.6, 1.25, 2.2] },
      sparks: [{ angle: 2.0, size: 6.3, color: SPARK, halo: 0.8 }],
    },
    {
      radius: 1.3, tube: 0.022, ellipse: 1, tilt: [0.7, -0.6, 1.1], wobble: 0.12, wobbleSpeed: 0.3,
      beadSpin: 0, color: "#5a4ae6", opacity: 0.4, glow: [0.9, 0.35, 2.6], glowAngle: -2.2,
      sparks: [{ angle: 4.0, size: 5.4, color: [0.9, 0.8, 3.2], halo: 0.6 }],
    },
  ],
  shards: [
    { kind: "pane", position: [1.45, 1.05, -0.4], scale: [0.08, 0.7, 0.4], rotation: [0.2, 0.6, -0.5], spin: 0.08, float: 0.05 },
    { kind: "pane", position: [-1.5, -0.95, -0.3], scale: [0.08, 0.6, 0.38], rotation: [-0.3, 0.4, 0.7], spin: -0.07, float: 0.05 },
    ...SKILLS_FRAGMENTS,
  ],
  flares: [],
  particles: SKILLS_PARTICLES,
  beacons: [],
  sparks: [
    // Ref: energy points close to the core. The HTML "</>" disc covers the orb's centre (radius
    // ≈ 0.72 units), so these sit just outside it: the strong cyan-white glint off the orb's
    // upper-left rim, a smaller one beside it, one at the ring's lower right, and the violet
    // glow under the rings; a faint point where the left connector meets the ribbons.
    { position: [-0.7, 0.66, 0.9], size: 16, color: [2.2, 3.4, 6.4], halo: 1.5 },
    { position: [-1.0, 0.92, 0.6], size: 6.5, color: SPARK, halo: 0.7 },
    { position: [1.12, -0.62, 0.7], size: 10, color: SPARK, halo: 1.1 },
    { position: [0.08, -0.92, 0.8], size: 16, color: [2.2, 1.0, 5.0], halo: 1.5 },
    { position: [-1.62, 0.02, 0.3], size: 6.5, color: SPARK_SOFT, halo: 0.8, detail: true },
  ],
  bloom: { intensity: 0.85, threshold: 0.95, radius: 0.7 },
  parallax: { rotate: 0.16, camera: 0.12 },
  float: 0.05,
  intro: false,
  scrollReactive: false,
  dpr: { high: 1.5, low: 1.25 },
};

/* ────────────────────────────── CONTACT ──────────────────────────────
 * ref/contact.png: a large chunky cube-like faceted gem, tilted, blazing white-blue at its
 * centre, a flat elliptical ring around its base, glass panes, dark rocks underneath.
 * When the canvas is wide (full section) the gem sits at ~75% / 40%; in a narrower box it
 * centres itself. */
export const CONTACT_CAMERA = { fov: 35, z: 9 };
/** Projected height of the tilted gem in cluster units. */
const CONTACT_DESIGN_HEIGHT = 2.9;
export const CONTACT_WIDE = { minAspect: 1.5, nx: 0.25, ny: 0.12, gemOfHeight: 0.64, gemOfWidth: 0.27 };
export const CONTACT_NARROW = { nx: 0, ny: 0.1, gemOfHeight: 0.5, gemOfWidth: 0.55 };
export const CONTACT_GEM_SIZE = 1.85;

function contactLayout(vp: Viewport): Layout {
  const c = vp.aspect >= CONTACT_WIDE.minAspect ? CONTACT_WIDE : CONTACT_NARROW;
  const scale = Math.min((vp.height * c.gemOfHeight) / CONTACT_DESIGN_HEIGHT, (vp.width * c.gemOfWidth) / CONTACT_DESIGN_HEIGHT);
  return { x: vp.width * c.nx, y: vp.height * c.ny, scale: clamp(scale, 0.2, 4) };
}

function contactRocks(vp: Viewport): RockSet {
  const unit = Math.min(vp.height, vp.width * 0.75);
  if (vp.aspect >= CONTACT_WIDE.minAspect) {
    return {
      unit,
      // Ref: frosty glints all across the rock tops plus a few bright sparkles.
      glintDust: 0.5,
      dustBrightness: 1.6,
      items: [
        { nx: 0.47, ny: -0.36, r: 0.42, z: -0.8, stretch: [1.4, 0.8, 1] as Vec3, seed: 71, sparks: 3 },
        { nx: 0.24, ny: -0.5, r: 0.34, z: -0.3, stretch: [1.6, 0.7, 1] as Vec3, seed: 83, sparks: 3 },
        { nx: 0.02, ny: -0.56, r: 0.24, z: -0.1, stretch: [1.8, 0.62, 1] as Vec3, seed: 97, sparks: 2 },
      ],
    };
  }
  return {
    unit,
    glintDust: 0.5,
    dustBrightness: 1.6,
    items: [
      { nx: 0.3, ny: -0.5, r: 0.4, z: -0.5, stretch: [1.5, 0.75, 1] as Vec3, seed: 71, sparks: 2 },
      { nx: -0.2, ny: -0.56, r: 0.32, z: -0.3, stretch: [1.7, 0.65, 1] as Vec3, seed: 83, sparks: 2 },
    ],
  };
}

/** Ref: an elongated prism upper-left of the gem, a chunk tucked right, tiny chips near the ring. */
export const CONTACT_FRAGMENTS: ShardSpec[] = [
  { kind: "prism", position: [-1.3, 1.2, 0.25], scale: [0.2, 0.55, 0.2], rotation: [0.15, 0.3, 0.45], spin: 0.16, float: 0.05 },
  { kind: "chip", position: [1.35, -0.4, 0.75], scale: [0.18, 0.15, 0.17], rotation: [1.0, 0.3, -0.5], spin: -0.18, float: 0.04 },
  { kind: "prism", position: [1.9, 0.35, -0.6], scale: [0.08, 0.21, 0.08], rotation: [0.2, 0.5, -0.4], spin: 0.22, float: 0.04, orbit: 0.06 },
  { kind: "chip", position: [-1.85, -0.75, 0.5], scale: [0.1, 0.08, 0.1], rotation: [0.4, 0.9, 0.2], spin: 0.2, float: 0.03, detail: true },
];

/**
 * Contact particles (camera z 9; the canvas covers the right ~55% of the section). Ref: faint
 * stars thickest in the upper right, light blue dust around the gem's glow, nothing in front of
 * the rocks' lower half.
 */
export const CONTACT_PARTICLES: ParticleField[] = [
  {
    count: { high: 150, low: 70 }, depth: [-16, -6], region: [-0.5, 0.55, -0.3, 0.55], topBias: 1.3,
    clusters: [{ nx: 0.38, ny: 0.35, r: 0.14, share: 0.2 }],
    size: [2.4, 6], sizeSkew: 2.4, brightness: [0.2, 0.9], tints: { white: 3, ice: 3, blue: 2, violet: 1 },
    twinkle: 0.7, drift: 0, seed: 61,
  },
  {
    count: { high: 50, low: 24 }, depth: [-3.5, 1], region: [-0.3, 0.5, -0.2, 0.45],
    clusters: [{ r: 0.16, share: 0.55 }],
    size: [1.8, 4.2], sizeSkew: 2, brightness: [0.25, 0.8], tints: { blue: 3, violet: 2, ice: 2 },
    twinkle: 0.5, drift: 0.1, seed: 67,
  },
  // A few faint mid-depth points in the gap between the text column and the gem (ref), kept
  // above/right of the form rows.
  {
    count: { high: 6, low: 4 }, depth: [-4, -1], region: [-0.36, -0.2, -0.04, 0.32],
    size: [2.4, 5], sizeSkew: 1.6, brightness: [0.35, 0.85], tints: { blue: 3, ice: 2, violet: 1 },
    twinkle: 0.5, drift: 0.06, seed: 73,
  },
];

export const CONTACT: PresetConfig = {
  camera: CONTACT_CAMERA,
  layout: contactLayout,
  rocks: contactRocks,
  gem: {
    kind: "chunky",
    size: CONTACT_GEM_SIZE,
    position: [0, 0.1, 0],
    // Corner-forward (ref): Y 45° puts a vertical edge/corner toward the camera, X tilt shows the
    // lit top face, a small roll leans it right. Sway (not spin) keeps that corner facing forward.
    rotation: [0.52, 0.785, 0.16],
    spin: 0,
    sway: { amp: 0.16, speed: 0.32 },
    tint: "#ffffff",
    innerTint: "#ffffff",
    core: { color: [2.4, 2.8, 6.0], scale: 0.07 },
    edgeColor: [0.95, 1.0, 3.2],
    halo: { size: 3.6, color: [0.4, 0.42, 1.8], opacity: 0.4 },
    light: { color: "#9fb2ff", intensity: 9, distance: 4.5 },
    glass: { top: "#c8c2ff", mid: "#5040f4", bottom: "#220f7c", innerEdges: 0.14 },
  },
  rings: [
    // Thin, subtle ellipses around the base (ref: faint glass orbits, no strong neon).
    {
      radius: 1.75, tube: 0.008, ellipse: 1.12, tilt: [-1.4, 0, 0.06], position: [0, -0.85, 0], wobble: 0.02,
      wobbleSpeed: 0.18, beadSpin: 0, color: "#b4c0ff", opacity: 0.22, glow: [0.25, 0.3, 0.95], glowAngle: -1.57,
      // Ref: small bright points where the base orbit turns at its left and right ends.
      sparks: [
        { angle: 3.3, size: 7.2, color: SPARK, halo: 0.9 },
        { angle: 5.75, size: 5.4, color: SPARK_SOFT, halo: 0.6 },
      ],
    },
    {
      radius: 2.1, tube: 0.006, ellipse: 1.12, tilt: [-1.37, 0.05, 0.08], position: [0, -0.95, 0], wobble: 0.02,
      wobbleSpeed: -0.14, beadSpin: 0, color: "#a9b3ff", opacity: 0.2, glow: [0.28, 0.34, 1.0], glowAngle: -1.2,
      sparks: [
        { angle: 0.1, size: 6.3, color: SPARK, halo: 0.8 },
        { angle: 3.95, size: 4.7, color: SPARK_SOFT, halo: 0.5 },
      ],
    },
  ],
  shards: [
    // Tall glass panes either side of the gem.
    { kind: "pane", position: [-1.65, 0.05, -0.35], scale: [0.09, 1.25, 0.65], rotation: [0.1, 0.5, 0.22], spin: 0.03, float: 0.05 },
    { kind: "pane", position: [1.5, 0.95, -0.55], scale: [0.08, 0.9, 0.5], rotation: [-0.1, -0.4, -0.25], spin: -0.03, float: 0.05 },
    ...CONTACT_FRAGMENTS,
  ],
  flares: [
    // White-blue starburst at the heart of the gem: main cross plus a fainter diagonal cross.
    { position: [0, 0.1, 0.2], size: 1.15, streak: 3.4, color: [2.6, 2.9, 5.0], angle: 0.35 },
    { position: [0, 0.1, 0.21], size: 0.55, streak: 1.7, color: [1.6, 1.9, 4.2], angle: 0.35 + Math.PI / 4 },
  ],
  particles: CONTACT_PARTICLES,
  beacons: [],
  sparks: [
    { position: [1.15, 1.05, 0.4], size: 5, color: SPARK_SOFT, halo: 0.6 },
    { position: [-0.95, -0.55, 0.9], size: 4.3, color: SPARK, halo: 0.4, detail: true },
  ],
  bloom: { intensity: 1.05, threshold: 0.95, radius: 0.75 },
  parallax: { rotate: 0.16, camera: 0.18 },
  float: 0.06,
  intro: false,
  scrollReactive: false,
  dpr: { high: 1.5, low: 1.25 },
};

/* ────────────────────────────── ABOUT ──────────────────────────────
 * Backdrop of the About portrait column (tall box ≈ 420×820 desktop, ≈ 300×375 mobile). The
 * person cutout is HTML layered on top, standing centre/right from ~8% down. Target: tall, vivid
 * blue luminous glass panels behind the figure (a left panel top → mid-height, a big one behind
 * the head extending above it, a lower one right of centre), near-black rocky ground in the
 * lower quarter rising to the bottom-left with blue rim light + glints, sparse blue/violet
 * particles (fewer over the person) in a deep navy space. No gem, no rings.
 */
export const ABOUT_CAMERA = { fov: 35, z: 9 };
/** Linear HDR panel palette: ≈ #2f6bff (bottom) → #8fbaff (top) body, cyan-white edges (> 1 blooms on high). */
export const ABOUT_PANEL_DEEP: Vec3 = [0.018, 0.075, 0.6];
export const ABOUT_PANEL_LIGHT: Vec3 = [0.13, 0.32, 1.05];
export const ABOUT_PANEL_EDGE: Vec3 = [1.3, 2.1, 3.4];
export const ABOUT_PANEL_OPACITY = 0.72;
/**
 * Panel placement in screen fractions of the box (centred: ±0.5 = edge) at the panel's own depth.
 * cx/cy centre, w/h size (w of the box width, h of the box height), z depth, ry/rz tilt (rad),
 * shear slant, brightness multiplier, glow halo, sway (rad) and phase.
 */
export const ABOUT_PANELS = [
  // Tall panel at the left of the box, top → about mid-height.
  { cx: -0.27, cy: 0.23, w: 0.3, h: 0.44, z: -2.2, ry: 0.42, rz: 0, shear: -0.32, brightness: 0.9, glow: 0.5, sway: 0.03, phase: 0 },
  // Big bright panel behind the head / upper body, extending above the head.
  { cx: 0.14, cy: 0.2, w: 0.5, h: 0.5, z: -3.4, ry: -0.3, rz: 0, shear: 0.2, brightness: 1.15, glow: 0.7, sway: 0.025, phase: 1.7 },
  // Lower panel right of centre, mid-lower height.
  { cx: 0.3, cy: -0.16, w: 0.36, h: 0.26, z: -1.6, ry: -0.36, rz: 0, shear: 0.26, brightness: 1, glow: 0.55, sway: 0.03, phase: 3.1 },
  // Small sliver low on the left (depth cue between the left panel and the ground).
  { cx: -0.38, cy: -0.1, w: 0.16, h: 0.18, z: -1.2, ry: 0.5, rz: 0, shear: -0.3, brightness: 0.75, glow: 0.4, sway: 0.035, phase: 4.4 },
];

function aboutPanels(vp: Viewport): PanelSpec[] {
  const tanHalf = vp.height / (2 * ABOUT_CAMERA.z);
  return ABOUT_PANELS.map((p) => {
    // Visible frame at the panel's own depth, so the screen placement holds for any z.
    const h = 2 * (ABOUT_CAMERA.z - p.z) * tanHalf;
    const w = h * vp.aspect;
    const b = p.brightness;
    const scale = (c: Vec3): Vec3 => [c[0] * b, c[1] * b, c[2] * b];
    return {
      position: [p.cx * w, p.cy * h, p.z],
      size: [p.w * w, p.h * h],
      rotation: [0, p.ry, p.rz],
      shear: p.shear,
      bottom: scale(ABOUT_PANEL_DEEP),
      top: scale(ABOUT_PANEL_LIGHT),
      edge: ABOUT_PANEL_EDGE,
      opacity: ABOUT_PANEL_OPACITY,
      glow: p.glow,
      grid: h * 0.085,
      sway: p.sway,
      float: h * 0.004,
      phase: p.phase,
    };
  });
}

export const ABOUT_ROCK_RIM: Vec3 = [0.1, 0.19, 0.7];

function aboutRocks(vp: Viewport): RockSet {
  // Tall box: the rock size follows the width so the ground keeps to the lower quarter.
  const unit = Math.min(vp.height * 0.6, vp.width);
  return {
    unit,
    glintDust: 0.3,
    dustBrightness: 1.6,
    // Strong blue rim on the crest facets (the panels' light catching the ridge).
    rim: ABOUT_ROCK_RIM,
    items: [
      // Rising toward the bottom-left; the crest stays in the lower quarter.
      { nx: -0.4, ny: -0.46, r: 0.36, z: -0.6, stretch: [1.15, 0.9, 1], seed: 131, sparks: 3 },
      { nx: -0.04, ny: -0.53, r: 0.3, z: -0.2, stretch: [1.6, 0.68, 1], seed: 149, sparks: 2 },
      { nx: 0.38, ny: -0.56, r: 0.28, z: -0.4, stretch: [1.8, 0.6, 1], seed: 157, sparks: 2 },
    ],
  };
}

/** The figure covers roughly this screen rect: particles there are dimmed (at every aspect). */
const ABOUT_PERSON_SHADE: ParticleField["shade"] = { maxAspect: 100, rect: [-0.12, 0.5, -0.5, 0.36], factor: 0.3 };

export const ABOUT_PARTICLES: ParticleField[] = [
  // Far blue/violet dust across the column, thinning toward the ground.
  {
    count: { high: 110, low: 50 }, depth: [-11, -4], region: [-0.55, 0.55, -0.4, 0.55], topBias: 0.6,
    size: [2.2, 5.5], sizeSkew: 2.2, brightness: [0.3, 1.0], tints: { blue: 3, violet: 2.5, ice: 2, white: 1 },
    brightTail: { share: 0.06, size: [2.2, 3.2], brightness: 2.2, halo: 0.6 },
    shade: ABOUT_PERSON_SHADE,
    twinkle: 0.7, drift: 0.05, seed: 211,
  },
  // Mid motes around the panels (parallax depth cue), slow drift.
  {
    count: { high: 46, low: 22 }, depth: [-3, 1.5], region: [-0.5, 0.5, -0.25, 0.5],
    clusters: [{ nx: -0.3, ny: 0.15, r: 0.16, share: 0.35 }],
    size: [1.8, 4.4], sizeSkew: 2, brightness: [0.35, 1.0], tints: { blue: 3, violet: 3, ice: 1.5 },
    shade: ABOUT_PERSON_SHADE,
    twinkle: 0.5, drift: 0.14, seed: 223,
  },
];

export const ABOUT: PresetConfig = {
  camera: ABOUT_CAMERA,
  layout: () => ({ x: 0, y: 0, scale: 1 }),
  rocks: aboutRocks,
  gem: null,
  panels: aboutPanels,
  // Blue spill from the panels onto the rock tops (rim highlights).
  lights: [
    { position: [-0.7, -0.9, -2.0], color: "#3f7bff", intensity: 16, distance: 6 },
    { position: [1.0, -1.4, -1.6], color: "#5f8dff", intensity: 9, distance: 4.5 },
  ],
  rings: [],
  shards: [],
  flares: [],
  particles: ABOUT_PARTICLES,
  sparks: [],
  // A few brighter sparkles: panel corners and the open space left of the head.
  beacons: [
    { nx: -0.14, ny: 0.45, z: -3, size: 6.5, color: [1.4, 2.0, 4.4], halo: 0.9 },
    { nx: -0.42, ny: 0.0, z: -2, size: 5, color: [1.2, 1.6, 3.8], halo: 0.7 },
    { nx: 0.47, ny: -0.05, z: -1.5, size: 4.5, color: [1.3, 1.1, 3.4], halo: 0.6 },
    { nx: -0.3, ny: 0.4, z: -5, size: 4, color: [0.9, 1.3, 3.0], halo: 0.5 },
  ],
  bloom: { intensity: 1.1, threshold: 0.9, radius: 0.75 },
  parallax: { rotate: 0.06, camera: 0.12 },
  float: 0,
  intro: false,
  scrollReactive: false,
  dpr: { high: 1.5, low: 1.25 },
};

export const PRESETS = { hero: HERO, skills: SKILLS, contact: CONTACT, about: ABOUT } as const;
