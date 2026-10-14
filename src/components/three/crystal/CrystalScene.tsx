"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import type { DeviceTier } from "@/hooks/useClientEnv";
import { PRESETS, type CrystalPreset, type PresetConfig, type ShardKind, type ShardSpec, type Vec3, type Viewport } from "./presets";
import { glowTexture, shardGeometry } from "./geometry";
import { AlphaFromColor } from "./AlphaFromColor";
import { onIntroGate, readHeroProgress, readPointer, readPulse, subscribePointer, subscribeSignals } from "./input";
import { DepthParticles, Flare, Gem, Lighting, LuminousPanels, MotionContext, OrbitRing, Rocks, Shards, Sparks, withGlassRim, type MotionState } from "./parts";

/*
 * Real-time crystal scene (R3F). One component, three compositions (presets.ts):
 *   hero    — vertical diamond + crossing glass rings with travelling beads, shards, rock ridge
 *   skills  — faceted orb with a bright core (HTML "</>" sits on top) inside swirling rings
 *   contact — chunky cube-like gem, flat base ring, glass panes, rocks
 *   about   — luminous blue glass panels, rocky ground and dust behind the About portrait
 *
 * Performance:
 *  - Transparent canvas (alpha) so each section's .night-sky backdrop shows through.
 *  - Environment baked once from Lightformers; geometries memoised + disposed on unmount.
 *  - Beads and fragments are InstancedMeshes; all motion lives in useFrame on refs.
 *  - Particles (stars, dust, motes, energy sparks) share one additive point shader: depth-sized,
 *    twinkle/drift on the GPU. World-space fields sit outside the Rig so the damped camera
 *    parallax separates the depth shells; sparks sit inside it, on the rings and around the gem.
 *    Low tier: ~45% of the points, no near-mote layer, no `detail` sparks/fragments.
 *  - High tier: Bloom (mipmapBlur) + Neutral tone mapping + alpha fix in the composer. Low tier:
 *    tone mapping + alpha fix only (one pass), fewer segments/particles, standard instead of
 *    physical materials, lower DPR.
 *  - frameloop: "never" off-screen, "demand" (one static frame) under reduced motion.
 */

export type CrystalSceneProps = {
  preset: CrystalPreset;
  tier: DeviceTier;
  reducedMotion: boolean;
  active: boolean;
  onReady: () => void;
};

/** Motion spec §1 damping constants (THREE.MathUtils.damp λ). */
const LAMBDA_CAMERA = 2.4;
const LAMBDA_POINTER = 2;
const LAMBDA_OBJECT = 4;
/** Hero camera dolly (units) at full "hero:progress", and glow swell. */
const HERO_DOLLY = 2.2;
const HERO_PROGRESS_GLOW = 0.6;
const PULSE_GLOW = 0.9;
const INTRO_SECONDS = 2.2;
const INTRO_FROM_SCALE = 0.55;

/** Bright glass outlines (ref): strong on the clear panes, subtle on the small crystal fragments. */
const SHARD_EDGES: Partial<Record<ShardKind, { color: Vec3; opacity: number }>> = {
  pane: { color: [0.75, 0.85, 1.9], opacity: 0.75 },
  prism: { color: [0.6, 0.7, 1.6], opacity: 0.35 },
  chip: { color: [0.6, 0.7, 1.6], opacity: 0.35 },
  sliver: { color: [0.6, 0.7, 1.6], opacity: 0.35 },
};

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const damp = THREE.MathUtils.damp;

/** Visible size of the z=0 plane, from the preset camera (not the live camera, which drifts). */
function useViewport(cfg: PresetConfig): Viewport {
  const size = useThree((s) => s.size);
  return useMemo(() => {
    const height = 2 * cfg.camera.z * Math.tan(THREE.MathUtils.degToRad(cfg.camera.fov) / 2);
    const aspect = size.width / Math.max(1, size.height);
    return { width: height * aspect, height, aspect };
  }, [cfg.camera.z, cfg.camera.fov, size.width, size.height]);
}

/** Layout, pointer parallax, scroll-velocity reactivity, glow pulses and the hero intro. */
function Rig({
  cfg,
  vp,
  reducedMotion,
  onReady,
  children,
}: {
  cfg: PresetConfig;
  vp: Viewport;
  reducedMotion: boolean;
  onReady: () => void;
  children: ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  // Single writer of the shared motion state; parts read it through MotionContext.
  const motion = useRef<MotionState>({ spin: 1, glow: 1, reduced: reducedMotion });
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    motion.current.reduced = reducedMotion;
    invalidate();
  }, [reducedMotion, invalidate]);

  const layout = useMemo(() => cfg.layout(vp), [cfg, vp]);
  const gateOpen = useRef(!cfg.intro);
  const introStart = useRef<number | null>(null);
  const lastScroll = useRef<number | null>(null);
  const ready = useRef(false);

  useEffect(() => {
    if (!cfg.intro) return;
    return onIntroGate(() => {
      gateOpen.current = true;
    });
  }, [cfg.intro]);

  useFrame(({ clock, camera }, delta) => {
    const g = group.current;
    const m = motion.current;
    if (!g || !m) return;
    const t = clock.elapsedTime;
    const d = Math.min(delta, 0.1);

    if (!ready.current) {
      ready.current = true;
      // Defer: never set React state from inside the render loop.
      requestAnimationFrame(onReady);
    }

    if (m.reduced) {
      // Static, fully composed frame; no pointer, scroll or intro motion.
      g.position.set(layout.x, layout.y, 0);
      g.rotation.set(0, 0, 0);
      g.scale.setScalar(layout.scale);
      camera.position.set(0, 0, cfg.camera.z);
      m.spin = 1;
      m.glow = 1;
      return;
    }

    // Intro: scale 0.55 → 1, easeOutExpo 2.2s, starting when the Seam opens.
    let intro = 1;
    if (cfg.intro) {
      if (gateOpen.current && introStart.current === null) introStart.current = t;
      intro = introStart.current === null ? 0 : easeOutExpo((t - introStart.current) / INTRO_SECONDS);
    }

    // Scroll velocity in px per 60fps-frame (Lenis-like units) → spin boost (motion spec item 4).
    let spinTarget = 1;
    let progress = 0;
    if (cfg.scrollReactive) {
      const y = window.scrollY;
      const v = lastScroll.current === null || d === 0 ? 0 : Math.abs(y - lastScroll.current) / (d * 60);
      lastScroll.current = y;
      spinTarget = 1 + Math.min(v / 30, 2);
      progress = readHeroProgress();
    }
    m.spin = damp(m.spin, spinTarget, LAMBDA_OBJECT, d);
    m.glow = damp(m.glow, 1 + readPulse() * PULSE_GLOW + progress * HERO_PROGRESS_GLOW, LAMBDA_OBJECT, d);

    const p = readPointer();
    g.rotation.y = damp(g.rotation.y, p.x * cfg.parallax.rotate, LAMBDA_POINTER, d);
    g.rotation.x = damp(g.rotation.x, p.y * cfg.parallax.rotate * 0.6, LAMBDA_POINTER, d);
    g.position.x = layout.x;
    g.position.y = layout.y + Math.sin(t * 0.6) * cfg.float * layout.scale;
    g.scale.setScalar(layout.scale * (INTRO_FROM_SCALE + (1 - INTRO_FROM_SCALE) * intro));

    // Camera translates (no lookAt) so the framing holds while near/far layers parallax.
    camera.position.x = damp(camera.position.x, p.x * cfg.parallax.camera, LAMBDA_CAMERA, d);
    camera.position.y = damp(camera.position.y, -p.y * cfg.parallax.camera * 0.6, LAMBDA_CAMERA, d);
    camera.position.z = damp(camera.position.z, cfg.camera.z - progress * HERO_DOLLY, LAMBDA_CAMERA, d);
  });

  return (
    <MotionContext value={motion}>
      <group ref={group}>{children}</group>
    </MotionContext>
  );
}

function SceneContents({ preset, tier, reducedMotion, onReady }: Omit<CrystalSceneProps, "active">) {
  const cfg = PRESETS[preset];
  const high = tier === "high";
  const vp = useViewport(cfg);
  useEffect(() => {
    const offPointer = subscribePointer();
    const offSignals = subscribeSignals();
    return () => {
      offPointer();
      offSignals();
    };
  }, []);

  // Shared resources, created once per canvas and disposed with it.
  const glowMap = useMemo(() => glowTexture(), []);
  const beadGeometry = useMemo(() => shardGeometry("cube", 21), []);
  const materials = useMemo(() => {
    // Icy, pale glass (ref: the cubes/beads read silver-lilac, not solid blue); a slight
    // translucency + Fresnel edge line keeps them glassy instead of solid.
    const glass = withGlassRim(
      high
        ? new THREE.MeshPhysicalMaterial({
            color: "#eef0ff",
            metalness: 0.35,
            roughness: 0.08,
            clearcoat: 1,
            clearcoatRoughness: 0.05,
            envMapIntensity: 2.4,
            emissive: "#3a2fb0",
            emissiveIntensity: 0.08,
            iridescence: 0.5,
            iridescenceIOR: 1.4,
            flatShading: true,
            transparent: true,
            opacity: 0.86,
          })
        : new THREE.MeshStandardMaterial({
            color: "#e6eaff",
            metalness: 0.45,
            roughness: 0.1,
            envMapIntensity: 2.6,
            emissive: "#3a2fb0",
            emissiveIntensity: 0.12,
            flatShading: true,
            transparent: true,
            opacity: 0.88,
          }),
      { color: "#d4dcff", strength: 0.9, power: 3 },
    );
    const slab = new THREE.MeshStandardMaterial({
      // Dark rock-glass chunk: near-black body, violet edge glints from the env only.
      color: "#07081a",
      metalness: 0.55,
      roughness: 0.32,
      envMapIntensity: 0.4,
      emissive: "#160f48",
      emissiveIntensity: 0.12,
      flatShading: true,
    });
    // Clear glass panes (ref): almost invisible faces, the outline carried by bright edge facets
    // (the Fresnel rim lights the thin side faces and lifts their alpha).
    const pane = withGlassRim(
      new THREE.MeshStandardMaterial({
        color: "#c9d2ff",
        metalness: 0.1,
        roughness: 0.04,
        envMapIntensity: 0.7,
        emissive: "#2a2f9a",
        emissiveIntensity: 0.04,
        transparent: true,
        opacity: 0.13,
        depthWrite: false,
        side: THREE.DoubleSide,
        flatShading: true,
      }),
      { color: "#b9c6ff", strength: 0.6, power: 4, alphaLift: 0.35 },
    );
    // Small floating crystals: pale, translucent blue-violet glass (ref: ice-blue / lavender
    // fragments with bright edges, not saturated chips). Facet tints come from the geometry's
    // vertex colours; a faint lavender self-glow keeps them visible where the env is dark.
    const crystal = withGlassRim(
      high
        ? new THREE.MeshPhysicalMaterial({
            color: "#ffffff",
            vertexColors: true,
            metalness: 0.25,
            roughness: 0.06,
            clearcoat: 1,
            clearcoatRoughness: 0.05,
            envMapIntensity: 1.9,
            emissive: "#5560d8",
            emissiveIntensity: 0.14,
            flatShading: true,
            transparent: true,
            opacity: 0.68,
          })
        : new THREE.MeshStandardMaterial({
            color: "#ffffff",
            vertexColors: true,
            metalness: 0.3,
            roughness: 0.1,
            envMapIntensity: 2,
            emissive: "#5560d8",
            emissiveIntensity: 0.26,
            flatShading: true,
            transparent: true,
            opacity: 0.72,
          }),
      { color: "#c4cfff", strength: 1.3, power: 2.5 },
    );
    return { glass, slab, pane, crystal };
  }, [high]);
  useEffect(
    () => () => {
      glowMap.dispose();
      beadGeometry.dispose();
      materials.glass.dispose();
      materials.slab.dispose();
      materials.pane.dispose();
      materials.crystal.dispose();
    },
    [glowMap, beadGeometry, materials],
  );

  const shardGroups = useMemo(() => {
    const groups = new Map<ShardKind, ShardSpec[]>();
    cfg.shards.filter((s) => high || !s.detail).forEach((s) => groups.set(s.kind, [...(groups.get(s.kind) ?? []), s]));
    return [...groups.entries()];
  }, [cfg.shards, high]);
  const layout = useMemo(() => cfg.layout(vp), [cfg, vp]);
  const anchor = useMemo(() => ({ nx: layout.x / vp.width, ny: layout.y / vp.height }), [layout, vp.width, vp.height]);
  const rocks = useMemo(() => (cfg.rocks ? cfg.rocks(vp) : null), [cfg, vp]);
  const panels = useMemo(() => (cfg.panels ? cfg.panels(vp) : null), [cfg, vp]);
  const materialFor = (kind: ShardKind) =>
    kind === "slab" ? materials.slab : kind === "pane" ? materials.pane : kind === "cube" ? materials.glass : materials.crystal;

  return (
    <>
      <Lighting tier={tier} />
      {cfg.lights?.map((l, i) => (
        <pointLight key={i} position={l.position} color={l.color} intensity={l.intensity} distance={l.distance} decay={2} />
      ))}
      <DepthParticles fields={cfg.particles} beacons={cfg.beacons} camera={cfg.camera} aspect={vp.aspect} high={high} anchor={anchor} />
      {rocks && (
        <Rocks
          items={rocks.items}
          unit={rocks.unit}
          glintDust={rocks.glintDust}
          dustBrightness={rocks.dustBrightness}
          rim={rocks.rim}
          vw={vp.width}
          vh={vp.height}
          tier={tier}
          refDistance={cfg.camera.z}
        />
      )}

      <Rig cfg={cfg} vp={vp} reducedMotion={reducedMotion} onReady={onReady}>
        {cfg.gem && <Gem spec={cfg.gem} tier={tier} glowMap={glowMap} />}
        {panels && <LuminousPanels panels={panels} high={high} />}
        {cfg.rings.map((ring, i) => (
          <OrbitRing key={i} spec={ring} tier={tier} beadGeometry={beadGeometry} beadMaterial={materials.glass} refDistance={cfg.camera.z} />
        ))}
        {shardGroups.map(([kind, specs]) => (
          <Shards
            key={kind}
            kind={kind}
            specs={specs}
            material={materialFor(kind)}
            renderOrder={kind === "pane" ? 12 : 0}
            edges={SHARD_EDGES[kind]}
          />
        ))}
        <Sparks sparks={cfg.sparks} high={high} refDistance={cfg.camera.z} />
        {cfg.flares.map((f, i) => (
          <Flare key={i} index={i} spec={f} map={glowMap} />
        ))}
      </Rig>

      {/* Both tiers run the composer: it owns tone mapping and the alpha fix for the transparent
          canvas (see AlphaFromColor). Low tier = one merged pass, light MSAA, no Bloom.
          Khronos Neutral explicitly: postprocessing's default (AgX) desaturates the electric
          blues to a pale lavender-grey and ACES shifts them to magenta; Neutral keeps the hue. */}
      {high ? (
        <EffectComposer multisampling={4}>
          <Bloom mipmapBlur intensity={cfg.bloom.intensity} luminanceThreshold={cfg.bloom.threshold} luminanceSmoothing={0.2} radius={cfg.bloom.radius} />
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
          <AlphaFromColor />
        </EffectComposer>
      ) : (
        <EffectComposer multisampling={2}>
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
          <AlphaFromColor />
        </EffectComposer>
      )}
    </>
  );
}

export default function CrystalScene({ preset, tier, reducedMotion, active, onReady }: CrystalSceneProps) {
  const cfg = PRESETS[preset];
  const high = tier === "high";
  return (
    <Canvas
      dpr={[1, high ? cfg.dpr.high : cfg.dpr.low]}
      frameloop={!active ? "never" : reducedMotion ? "demand" : "always"}
      camera={{ position: [0, 0, cfg.camera.z], fov: cfg.camera.fov, near: 0.1, far: 80 }}
      // The composer renders off-screen with its own MSAA, so native canvas AA would be wasted.
      gl={{ alpha: true, antialias: false, powerPreference: "high-performance", stencil: false }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      style={{ pointerEvents: "none" }}
      aria-hidden
    >
      <SceneContents preset={preset} tier={tier} reducedMotion={reducedMotion} onReady={onReady} />
    </Canvas>
  );
}
