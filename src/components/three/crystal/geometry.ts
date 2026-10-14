import * as THREE from "three";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";
import { PARTICLE_TINTS, type GemKind, type ParticleField, type ParticleTint, type ShardKind, type Vec3 } from "./presets";

/*
 * Procedural geometry for the crystal scenes. Every faceted solid is the convex hull of a
 * hand-designed point set: hulls are always watertight, come out non-indexed with
 * per-face normals (crisp flat facets) and need no manual triangulation.
 * All builders are deterministic (seeded) so the composition is identical between visits.
 */

/** Park–Miller PRNG. */
export function seeded(seed: number) {
  let s = Math.max(1, Math.floor(seed)) % 2147483647;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

type Rand = () => number;
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** A horizontal ring of `n` points with slight radius/height jitter (irregular, hand-cut look). */
function ringPoints(n: number, y: number, r: number, offset: number, rand: Rand, jitter: number) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const a = offset + (i / n) * Math.PI * 2;
    const rr = r * (1 + (rand() - 0.5) * jitter);
    pts.push(v(Math.cos(a) * rr, y + (rand() - 0.5) * jitter * 0.12, Math.sin(a) * rr));
  }
  return pts;
}

/** Chamfered box: every corner is cut into a small triangular facet. Half extents = 0.5. */
function chamferedBox(bevel: number, rand: Rand, jitter: number, cornerPush = 0) {
  const pts: THREE.Vector3[] = [];
  const h = 0.5;
  const k = h - bevel;
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (const sz of [-1, 1]) {
        const push = 1 + (rand() - 0.5) * cornerPush;
        const j = () => (rand() - 0.5) * jitter;
        pts.push(v(sx * k * push + j(), sy * h * push + j(), sz * h * push + j()));
        pts.push(v(sx * h * push + j(), sy * k * push + j(), sz * h * push + j()));
        pts.push(v(sx * h * push + j(), sy * h * push + j(), sz * k * push + j()));
      }
  return pts;
}

/**
 * Rhombic brilliant (ref: the hero gem reads as a near-octahedral rhombus, w/h ≈ 0.8): pointed
 * crown, narrow crown ring, a wide thin girdle band and a long pavilion. Normalised to height 1, centred on its bounding box.
 */
function diamondPoints(rand: Rand) {
  const n = 8;
  const step = Math.PI / n;
  const pts = [
    v(0, 0.62, 0),
    ...ringPoints(n, 0.4, 0.24, 0, rand, 0.1),
    ...ringPoints(n, 0.13, 0.55, step, rand, 0.08),
    ...ringPoints(n, 0.03, 0.54, 0, rand, 0.06),
    ...ringPoints(n, -0.33, 0.32, step, rand, 0.1),
    v(0.02, -0.75, -0.01),
  ];
  return pts.map((p) => p.multiplyScalar(1 / 1.37).add(v(0, 0.065 / 1.37, 0)));
}

/** Cube-like gem: chamfered cube whose faces rise into shallow 4-facet pyramids. Edge ≈ 1. */
function chunkyPoints(rand: Rand, bevel = 0.08, lift = 0.55) {
  const pts = chamferedBox(bevel, rand, 0.025, 0.06);
  // Face apexes lifted (~6° at 0.55, ~18° at 0.66) so each face splits into 4 visible facets (EdgesGeometry keeps them).
  pts.push(v(lift, 0.02, -0.01), v(-lift, -0.01, 0.02), v(0.01, lift, 0.02), v(-0.02, -lift, 0), v(0.02, 0, lift), v(0, 0.01, -lift));
  return pts;
}

/** Faceted orb: jittered icosphere vertices. Diameter ≈ 1. */
function orbPoints(rand: Rand) {
  const ico = new THREE.IcosahedronGeometry(0.5, 1);
  const pos = ico.getAttribute("position");
  const seen = new Map<string, THREE.Vector3>();
  for (let i = 0; i < pos.count; i++) {
    const p = v(pos.getX(i), pos.getY(i), pos.getZ(i));
    const key = `${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}`;
    if (!seen.has(key)) seen.set(key, p.multiplyScalar(1 + (rand() - 0.5) * 0.08));
  }
  ico.dispose();
  return [...seen.values()];
}

/**
 * Per-facet tints (multiplied with the material colour). Weighted to saturated electric blue /
 * violet (ref: the hero gem reads as a deep, luminous blue-violet stone, not a pale one); one
 * near-white and one ice facet keep the occasional bright flash.
 */
const FACET_TINTS = ["#dfe4ff", "#8fa2ff", "#7c6dff", "#6fb6ff", "#a58cff", "#4f5be0", "#3a34b8", "#5b3df0"].map((c) => new THREE.Color(c));

/**
 * Small fragments: pale ice-blue → lavender glass (ref: the fragments read light and glassy, not
 * saturated royal blue); one deeper periwinkle facet keeps the cut visible.
 */
const CRYSTAL_TINTS = ["#eef2ff", "#c9d4ff", "#b9c4ff", "#a3b2ff", "#8fa2ff", "#aa9cff", "#d6e2ff", "#7d86f0"].map((c) => new THREE.Color(c));

/**
 * Colour each facet (all triangles sharing a plane) with a tint from FACET_TINTS, so neighbouring
 * facets alternate blue / violet / cyan like a cut stone even where the env reflection is dark.
 */
function tintFacets(g: THREE.BufferGeometry, rand: Rand, tints = FACET_TINTS) {
  const nor = g.getAttribute("normal");
  const colors = new Float32Array(nor.count * 3);
  const byPlane = new Map<string, THREE.Color>();
  for (let i = 0; i < nor.count; i += 3) {
    const key = `${nor.getX(i).toFixed(2)},${nor.getY(i).toFixed(2)},${nor.getZ(i).toFixed(2)}`;
    let c = byPlane.get(key);
    if (!c) {
      c = tints[Math.floor(rand() * tints.length)];
      byPlane.set(key, c);
    }
    for (let k = 0; k < 3; k++) c.toArray(colors, (i + k) * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return g;
}

/**
 * "Clear glass" colouring: every facet graded from `top` to `bottom` by its on-screen height
 * (centroid and normal taken after the gem's resting rotation), so upward facets read pale
 * lilac/ice and the underside deep violet. A per-facet brightness jitter keeps neighbouring
 * facets distinct (the cut-stone sparkle) without breaking the gradient.
 */
function gradeFacets(g: THREE.BufferGeometry, rand: Rand, top: string, mid: string, bottom: string, rotation: Vec3) {
  const pos = g.getAttribute("position");
  const nor = g.getAttribute("normal");
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2]));
  const cTop = new THREE.Color(top);
  const cMid = new THREE.Color(mid);
  const cBottom = new THREE.Color(bottom);
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  const out = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    c.set(
      (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3,
      (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3,
      (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3,
    ).applyQuaternion(q);
    n.set(nor.getX(i), nor.getY(i), nor.getZ(i)).applyQuaternion(q);
    // Height + facing (key light from the upper left): each cube face gets its own tone band.
    const t = THREE.MathUtils.clamp(0.5 + c.y * 0.45 + n.y * 0.42 - n.x * 0.12, 0, 1);
    const k = 0.75 + rand() * 0.45;
    if (t < 0.5) out.copy(cBottom).lerp(cMid, t * 2);
    else out.copy(cMid).lerp(cTop, (t - 0.5) * 2);
    out.multiplyScalar(k);
    for (let j = 0; j < 3; j++) out.toArray(colors, (i + j) * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return g;
}

export function gemGeometry(
  kind: GemKind,
  seed = 5,
  glass?: { top: string; mid: string; bottom: string; rotation: Vec3 },
): THREE.BufferGeometry {
  const rand = seeded(seed);
  // Contact cube: chamfered corners + shallow face pyramids (≈ 9°) so every face splits into 8
  // triangular facets while the silhouette stays cube-like (Gem drops its edge threshold to 5°).
  const pts = kind === "diamond" ? diamondPoints(rand) : kind === "chunky" ? chunkyPoints(rand, 0.07, 0.58) : orbPoints(rand);
  const hull = new ConvexGeometry(pts);
  return glass ? gradeFacets(hull, rand, glass.top, glass.mid, glass.bottom, glass.rotation) : tintFacets(hull, rand);
}

/** Unit-sized solids for beads and floating fragments (scaled per instance). */
export function shardGeometry(kind: ShardKind, seed = 9): THREE.BufferGeometry {
  const rand = seeded(seed);
  switch (kind) {
    case "cube":
      // Cut-gem cube (chamfered corners + shallow faceted faces): many small facets catch the env.
      return new ConvexGeometry(chunkyPoints(rand, 0.12, 0.57));
    case "slab":
      // Irregular broken block: corners pushed in/out so it reads as a fractured chunk.
      return new ConvexGeometry(chamferedBox(0.18, rand, 0.08, 0.35));
    case "pane": {
      // Thin glass panel with a slanted, broken top edge.
      const pts: THREE.Vector3[] = [];
      for (const sx of [-0.5, 0.5])
        for (const sz of [-0.5, 0.5]) {
          pts.push(v(sx, -0.5, sz));
          pts.push(v(sx, 0.5 - (sz > 0 ? 0.22 : 0) + (rand() - 0.5) * 0.1, sz));
        }
      pts.push(v(0, 0.56, -0.1));
      return new ConvexGeometry(pts);
    }
    case "prism": {
      // Quartz-like crystal: hexagonal column with pointed, slightly off-centre terminations.
      const pts = [v(0.04, 0.5, -0.02), v(-0.03, -0.5, 0.03)];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + (rand() - 0.5) * 0.25;
        const r = 0.42 + (rand() - 0.5) * 0.12;
        pts.push(v(Math.cos(a) * r, 0.2 + (rand() - 0.5) * 0.06, Math.sin(a) * r));
        pts.push(v(Math.cos(a) * r, -0.22 + (rand() - 0.5) * 0.06, Math.sin(a) * r));
      }
      return tintFacets(new ConvexGeometry(pts), rand, CRYSTAL_TINTS);
    }
    case "chip": {
      // Irregular faceted nugget: a jittered octahedron with a couple of extra cut corners.
      const pts = [v(0.5, 0, 0), v(-0.5, 0, 0), v(0, 0.5, 0), v(0, -0.5, 0), v(0, 0, 0.5), v(0, 0, -0.5)].map((p) =>
        p.multiplyScalar(0.85 + rand() * 0.3).add(v((rand() - 0.5) * 0.12, (rand() - 0.5) * 0.12, (rand() - 0.5) * 0.12)),
      );
      for (let i = 0; i < 4; i++) {
        const dir = v(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
        pts.push(dir.multiplyScalar(0.36 + rand() * 0.08));
      }
      return tintFacets(new ConvexGeometry(pts), rand, CRYSTAL_TINTS);
    }
    case "sliver":
    default: {
      const pts = [v(0.03, 0.5, 0), v(-0.02, -0.5, 0.01)];
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + rand() * 0.4;
        const r = 0.32 + rand() * 0.16;
        pts.push(v(Math.cos(a) * r, (rand() - 0.4) * 0.35, Math.sin(a) * r));
      }
      return tintFacets(new ConvexGeometry(pts), rand, CRYSTAL_TINTS);
    }
  }
}

/** Cheap deterministic 3D noise (sum of sines); identical input → identical output keeps meshes watertight. */
function noise(x: number, y: number, z: number, s: number) {
  return (
    Math.sin(x * 1.7 + s) * Math.sin(y * 2.3 + s * 1.3) * Math.sin(z * 1.9 + s * 0.7) +
    0.5 * Math.sin(x * 3.1 - s * 0.6) * Math.sin(y * 3.7 + s) * Math.sin(z * 2.9 - s * 1.1) +
    0.25 * Math.sin(x * 6.3 + s * 2.1) * Math.sin(y * 5.9 - s) * Math.sin(z * 6.7 + s * 0.4) +
    0.12 * Math.sin(x * 12.7 - s) * Math.sin(y * 11.3 + s * 0.3) * Math.sin(z * 13.1 + s * 1.7)
  );
}

/**
 * Boulder: displaced icosphere with a flattened base, flat-shaded facets. Radius ≈ 1.
 * A per-face brightness jitter (vertex colours) breaks the large facets into a speckled,
 * mineral surface so the rock reads as dark textured stone rather than smooth low-poly.
 */
export function rockGeometry(seed: number, detail = 3): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const pos = g.getAttribute("position") as THREE.BufferAttribute;
  const s = seed * 0.37;
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const n = noise(p.x * 1.3, p.y * 1.3, p.z * 1.3, s);
    // Fine crags on top of the broad shape (identical input → identical output, still watertight).
    const crag = noise(p.x * 4.1, p.y * 4.1, p.z * 4.1, s + 3.1);
    p.multiplyScalar(1 + n * 0.34 + crag * 0.05);
    if (p.y < -0.35) p.y = -0.35 + (p.y + 0.35) * 0.3; // sit on the ground
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  g.computeVertexNormals(); // non-indexed → per-face normals → faceted rock
  const rand = seeded(seed + 7);
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i += 3) {
    const k = 0.3 + Math.pow(rand(), 1.6) * 1.1;
    for (let j = 0; j < 3; j++) colors.set([k, k, k * 1.04], (i + j) * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return g;
}

/**
 * Glints on a rock, as glow points (rock-local space):
 *  - dust: a sparse sample (`ratio`) of upward-facing facets as tiny cool-white specks (the
 *    frosty mineral texture), one in ~12 violet;
 *  - sparks: `sparks` bright white-violet haloed glints seeded on the ridge tops (the highest
 *    upward facets, kept apart from each other) — the sparkles along the crest in the ref.
 * Each point sits on its facet centroid, nudged off the face along the normal so the facet
 * never hides it while the rest of the rock still occludes it.
 */
export function rockGlintPoints(
  rock: THREE.BufferGeometry,
  seed: number,
  ratio: number,
  sparks = 0,
  dustBrightness = 1,
  /** The rock's Y rotation, so "facing the camera" is judged in view space. */
  yaw = 0,
): GlowPointData {
  const rand = seeded(seed + 101);
  const pos = rock.getAttribute("position");
  const nor = rock.getAttribute("normal");
  const out = emptyGlowPoints();
  const ice = new THREE.Color("#b4c6ff");
  const violet = new THREE.Color("#a58cff");
  const c = new THREE.Color();
  const centroid = (i: number, n = 0.015) =>
    new THREE.Vector3(
      (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3 + nor.getX(i) * n,
      (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3 + nor.getY(i) * n,
      (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3 + nor.getZ(i) * n,
    );
  const tops: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i += 3) {
    // Upward ridge facets on the camera side are spark candidates.
    const facing = -Math.sin(yaw) * nor.getX(i) + Math.cos(yaw) * nor.getZ(i);
    if (sparks > 0 && nor.getY(i) > 0.45 && facing > -0.1) tops.push(centroid(i, 0.03));
    if (nor.getY(i) <= 0.3 || rand() >= ratio) continue;
    const p = centroid(i);
    out.positions.push(p.x, p.y, p.z);
    out.sizes.push(1.8 + Math.pow(rand(), 3) * 3.2);
    c.copy(rand() < 0.08 ? violet : ice).multiplyScalar((0.45 + Math.pow(rand(), 2) * 1.1) * dustBrightness);
    out.colors.push(c.r, c.g, c.b);
    out.phases.push(rand());
    out.halos.push(0);
  }
  // Highest first, spaced apart so the sparks spread along the crest instead of clumping.
  tops.sort((a, b) => b.y - a.y);
  const chosen: THREE.Vector3[] = [];
  for (const p of tops) {
    if (chosen.length >= sparks) break;
    if (chosen.every((q) => q.distanceTo(p) > 0.45)) chosen.push(p);
  }
  const sparkRand = seeded(seed + 211);
  chosen.forEach((p, k) => {
    out.positions.push(p.x, p.y, p.z);
    out.sizes.push(8 + sparkRand() * 4.5);
    // White-violet HDR (blooms on the high tier); every third one leans lilac.
    const b = 1.6 + sparkRand() * 1.2;
    if (k % 3 === 2) out.colors.push(1.5 * b, 1.1 * b, 2.6 * b);
    else out.colors.push(1.2 * b, 1.35 * b, 2.4 * b);
    out.phases.push(sparkRand());
    out.halos.push(1.2);
  });
  return out;
}

/**
 * Neon core line for a ring: a thin torus whose vertex colours carry an HDR gradient
 * (brightest at `angle`, with a weaker counter-glow opposite), so one side of the ring
 * blooms like the reference without any per-frame work.
 */
export function ringGlowGeometry(radius: number, tube: number, glow: Vec3, angle: number, segments: number) {
  const g = new THREE.TorusGeometry(radius, tube, 6, segments);
  const uv = g.getAttribute("uv");
  const colors = new Float32Array(uv.count * 3);
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i) * Math.PI * 2;
    const main = Math.pow(0.5 + 0.5 * Math.cos(u - angle), 2.2);
    const counter = Math.pow(0.5 + 0.5 * Math.cos(u - angle - Math.PI), 8);
    const k = 0.22 + main * 1.0 + counter * 0.3;
    colors[i * 3] = glow[0] * k;
    colors[i * 3 + 1] = glow[1] * k;
    colors[i * 3 + 2] = glow[2] * k;
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return g;
}

/* ───────────────────────────── Glow points ───────────────────────────── */

/** Per-point data for the shared glow-point shader (parts.tsx → GlowPoints). */
export type GlowPointData = {
  positions: number[];
  /** Core diameter (CSS px at the reference distance, see ParticleField.size). */
  sizes: number[];
  /** Linear RGB, brightness already multiplied in (HDR allowed). */
  colors: number[];
  /** 0..1: twinkle/drift phase (also picks which points twinkle visibly). */
  phases: number[];
  /** 0 = plain dust point, > 0 = soft halo + faint 4-point glint (sparks). */
  halos: number[];
};

export function emptyGlowPoints(): GlowPointData {
  return { positions: [], sizes: [], colors: [], phases: [], halos: [] };
}

export function glowPointsGeometry(d: GlowPointData) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(d.positions, 3));
  g.setAttribute("aSize", new THREE.Float32BufferAttribute(d.sizes, 1));
  g.setAttribute("aColor", new THREE.Float32BufferAttribute(d.colors, 3));
  g.setAttribute("aPhase", new THREE.Float32BufferAttribute(d.phases, 1));
  g.setAttribute("aHalo", new THREE.Float32BufferAttribute(d.halos, 1));
  g.computeBoundingSphere();
  return g;
}

const TINT_COLORS = Object.fromEntries(
  Object.entries(PARTICLE_TINTS).map(([k, hex]) => [k, new THREE.Color(hex)]),
) as Record<ParticleTint, THREE.Color>;

/** Standard normal sample (Box–Muller). */
function gauss(rand: Rand) {
  return Math.sqrt(-2 * Math.log(Math.max(1e-6, rand()))) * Math.cos(2 * Math.PI * rand());
}

/**
 * One depth-particle field in world space. Each point picks a depth first, then a screen-anchored
 * position scaled to the frustum at that depth, so near and far shells cover the same part of
 * the frame and the camera's pointer parallax separates them. Deterministic per seed.
 */
export function addParticleField(
  out: GlowPointData,
  field: ParticleField,
  camera: { fov: number; z: number },
  aspect: number,
  count: number,
  anchor: { nx: number; ny: number },
) {
  const rand = seeded(field.seed);
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const tints = Object.entries(field.tints) as [ParticleTint, number][];
  const tintTotal = tints.reduce((sum, [, w]) => sum + w, 0);
  const clusters = field.clusters ?? [];
  const [x0, x1, y0, y1] = field.region;
  const color = new THREE.Color();
  const tail = field.brightTail;
  const tailRand = seeded(field.seed * 31 + 7);
  for (let i = 0; i < count; i++) {
    const tailPick = tailRand();
    const tailSize = tailRand();
    const z = THREE.MathUtils.lerp(field.depth[0], field.depth[1], rand());
    const halfH = (camera.z - z) * tanHalf;
    const halfW = halfH * aspect;
    let nx: number;
    let ny: number;
    let pick = rand();
    const cluster = clusters.find((c) => (pick -= c.share) < 0);
    if (cluster) {
      nx = (cluster.nx ?? anchor.nx) + (gauss(rand) * cluster.r) / aspect;
      ny = (cluster.ny ?? anchor.ny) + gauss(rand) * cluster.r;
    } else {
      nx = THREE.MathUtils.lerp(x0, x1, rand());
      const u = field.topBias ? Math.pow(rand(), 1 / (1 + field.topBias)) : rand();
      ny = THREE.MathUtils.lerp(y0, y1, u);
    }
    out.positions.push(nx * 2 * halfW, ny * 2 * halfH, z);
    const bright = tail && tailPick < tail.share && nx >= (tail.minNx ?? -Infinity) ? tail : null;
    const size = THREE.MathUtils.lerp(field.size[0], field.size[1], Math.pow(rand(), field.sizeSkew ?? 1));
    out.sizes.push(bright ? size * THREE.MathUtils.lerp(bright.size[0], bright.size[1], tailSize) : size);
    let w = rand() * tintTotal;
    const tint = tints.find(([, weight]) => (w -= weight) < 0)?.[0] ?? tints[0][0];
    const b = THREE.MathUtils.lerp(field.brightness[0], field.brightness[1], Math.pow(rand(), 1.6));
    // Bright-tail stars: lifted to at least mid brightness first, so a dim pick still reads as a lamp.
    color.copy(TINT_COLORS[tint]).multiplyScalar(bright ? Math.max(b, 0.7) * bright.brightness : b);
    const shade = field.shade;
    if (shade && aspect < shade.maxAspect && nx >= shade.rect[0] && nx <= shade.rect[1] && ny >= shade.rect[2] && ny <= shade.rect[3]) {
      color.multiplyScalar(shade.factor);
    }
    out.colors.push(color.r, color.g, color.b);
    out.phases.push(rand());
    out.halos.push(bright ? bright.halo : 0);
  }
  return out;
}

/** Appends sparks (cluster-space positions, HDR colours). */
export function addSparks(out: GlowPointData, sparks: { position: Vec3; size: number; color: Vec3; halo?: number }[], seed = 3) {
  const rand = seeded(seed);
  for (const s of sparks) {
    out.positions.push(s.position[0], s.position[1], s.position[2]);
    out.sizes.push(s.size);
    out.colors.push(s.color[0], s.color[1], s.color[2]);
    out.phases.push(rand());
    out.halos.push(s.halo ?? 0.8);
  }
  return out;
}

/** Soft radial falloff used by halos, flares, stars and glints. */
export function glowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.16, "rgba(255,255,255,0.55)");
    g.addColorStop(0.42, "rgba(255,255,255,0.12)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  // Left as linear data on purpose: an sRGB decode would crush the soft tail of the falloff.
  return new THREE.CanvasTexture(canvas);
}
