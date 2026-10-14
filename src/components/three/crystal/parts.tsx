"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import type { DeviceTier } from "@/hooks/useClientEnv";
import type { BeaconSpec, FlareSpec, GemSpec, PanelSpec, ParticleField, RingSpec, RockSpec, ShardKind, ShardSpec, SparkSpec, Vec3 } from "./presets";
import {
  addParticleField,
  addSparks,
  emptyGlowPoints,
  gemGeometry,
  glowPointsGeometry,
  ringGlowGeometry,
  rockGeometry,
  rockGlintPoints,
  shardGeometry,
} from "./geometry";

/*
 * Shared building blocks composed by the preset configs (presets.ts).
 *
 * Draw-order contract (transparent glass needs an explicit order, not distance sorting):
 *   -3 depth particles (additive, depth-tested, no depth write)
 *   -2 halos (additive, no depth test, sit under everything)
 *    0 opaque: rocks, beads, cubes, slabs, gem core
 *    2 gem inner facets (back faces, no depth write)
 *    3 gem outer shell (front faces, WRITES depth → ring arcs behind the gem are hidden)
 *    4 gem facet edges (additive)
 *   10 ring glass tubes (translucent, no depth write — crossings read as overlapping glass)
 *   11 ring neon cores (additive, drawn over their own tube so the glass doesn't mute them)
 *   12 glass panes
 *   15 energy sparks (additive, depth-tested: the opaque gem/rocks still hide the ones behind them)
 *   20 lens flares (additive, no depth test, on top)
 */

/** Per-frame values written by the scene Rig and read by every part. */
export type MotionState = { spin: number; glow: number; reduced: boolean };
export type MotionRef = RefObject<MotionState>;

/** Provided by the scene Rig (the only writer); parts only read it inside useFrame. */
export const MotionContext = createContext<MotionRef>({ current: { spin: 1, glow: 1, reduced: false } });
const useMotion = () => useContext(MotionContext);

const ADD = THREE.AdditiveBlending;
const hdr = (c: Vec3) => new THREE.Color().setRGB(c[0], c[1], c[2], THREE.LinearSRGBColorSpace);
/** Delta clamp: a frameloop resumed from "never" reports one huge delta. */
const dt = (delta: number) => Math.min(delta, 0.1);

/* ───────────────────────────── Gem ───────────────────────────── */

export function Gem({ spec, tier, glowMap }: { spec: GemSpec; tier: DeviceTier; glowMap: THREE.Texture }) {
  const motion = useMotion();
  const high = tier === "high";
  const glass = spec.glass;
  const geometry = useMemo(
    () => gemGeometry(spec.kind, 5, glass ? { top: glass.top, mid: glass.mid, bottom: glass.bottom, rotation: spec.rotation } : undefined),
    [spec.kind, glass, spec.rotation],
  );
  // 8° threshold: drops the diagonals of coplanar hull triangles, keeps real facet edges.
  // Glass gems have shallow face pyramids, so they need a lower threshold to keep those splits.
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry, glass ? 5 : 8), [geometry, glass]);
  useEffect(
    () => () => {
      geometry.dispose();
      edges.dispose();
    },
    [geometry, edges],
  );

  const coreBase = useMemo(() => hdr(spec.core.color), [spec.core.color]);
  const edgeColor = useMemo(() => hdr(spec.edgeColor), [spec.edgeColor]);
  const haloColor = useMemo(() => hdr(spec.halo.color), [spec.halo.color]);
  // Unlit inner facets: a dimmed innerTint (vertex tints multiply on top) reads as a deep, glowing violet.
  const innerColor = useMemo(() => new THREE.Color(spec.innerTint).multiplyScalar(0.9), [spec.innerTint]);

  const spinGroup = useRef<THREE.Group>(null);
  const coreMat = useRef<THREE.MeshBasicMaterial>(null);
  const haloMat = useRef<THREE.SpriteMaterial>(null);
  const light = useRef<THREE.PointLight>(null);

  useFrame(({ clock }, delta) => {
    const m = motion.current;
    if (!m) return;
    if (spinGroup.current && !m.reduced) {
      if (spec.sway) {
        // Gentle sway around the resting pose: the forward corner never turns away.
        const t = clock.elapsedTime * spec.sway.speed;
        spinGroup.current.rotation.set(Math.sin(t * 0.7 + 1.1) * spec.sway.amp * 0.35, Math.sin(t) * spec.sway.amp, 0);
      } else {
        spinGroup.current.rotation.y += dt(delta) * spec.spin * m.spin;
      }
    }
    // Glow (pulse / scroll swell) brightens the core, halo and light together.
    if (coreMat.current) coreMat.current.color.copy(coreBase).multiplyScalar(m.glow);
    // Without bloom (low tier) the halo sprite carries the whole glow, so it gets a boost.
    if (haloMat.current) haloMat.current.opacity = Math.min(1, spec.halo.opacity * (high ? 1 : 1.25) * (0.75 + 0.25 * m.glow));
    if (light.current) light.current.intensity = spec.light.intensity * m.glow;
  });

  return (
    <group position={spec.position} rotation={spec.rotation}>
      <sprite scale={[spec.halo.size, spec.halo.size, 1]} renderOrder={-2}>
        <spriteMaterial
          ref={haloMat}
          map={glowMap}
          color={haloColor}
          blending={ADD}
          transparent
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
        />
      </sprite>
      <group ref={spinGroup} scale={spec.size}>
        {/* Luminous core: same silhouette, unlit, HDR → the only thing bright enough to bloom. */}
        <mesh geometry={geometry} scale={spec.core.scale}>
          <meshBasicMaterial ref={coreMat} color={coreBase} toneMapped={false} />
        </mesh>
        {/* Inner facets: back faces glow violet so the far side reads through the glass. Unlit on
            purpose: the gem's own point light sits at its centre, a hair from these faces, and a lit
            material there blew out to a white/grey sheen (specular) that washed the whole stone pale.
            Vertex tints keep the per-facet blue/violet variation. */}
        <mesh geometry={geometry} renderOrder={2}>
          <meshBasicMaterial
            color={innerColor}
            transparent
            opacity={glass ? (high ? 0.5 : 0.58) : high ? 0.72 : 0.78}
            depthWrite={false}
            side={THREE.BackSide}
            vertexColors
          />
        </mesh>
        {/* Outer shell. No transmission on purpose: with an alpha canvas three clears the
            transmission buffer to 50% white, which turns the glass milky. Clearcoat +
            iridescence + a strong Lightformer env give the blue/cyan/violet facet flashes. */}
        <mesh geometry={geometry} renderOrder={3}>
          {high ? (
            <meshPhysicalMaterial
              color={spec.tint}
              metalness={glass ? 0.45 : 0.7}
              roughness={0.03}
              // Clearcoat + iridescence reflect untinted: at full strength they washed the camera-facing
              // facets to pale lavender. Kept low so the stone stays a saturated blue-violet.
              clearcoat={0.3}
              clearcoatRoughness={0.04}
              iridescence={0.15}
              iridescenceIOR={1.45}
              iridescenceThicknessRange={[180, 620]}
              specularIntensity={1}
              envMapIntensity={glass ? 1.8 : 2.2}
              transparent
              opacity={glass ? 0.42 : 0.56}
              flatShading
              vertexColors
            />
          ) : (
            // Low tier has no bloom: a little self-illumination keeps the stone saturated and glowing.
            <meshStandardMaterial
              color={spec.tint}
              emissive={glass ? glass.bottom : spec.tint}
              emissiveIntensity={glass ? 0.3 : 0.55}
              metalness={glass ? 0.4 : 0.6}
              roughness={0.08}
              envMapIntensity={0.9}
              transparent
              opacity={glass ? 0.5 : 0.62}
              flatShading
              vertexColors
            />
          )}
        </mesh>
        <lineSegments geometry={edges} renderOrder={4}>
          <lineBasicMaterial color={edgeColor} transparent opacity={glass ? 0.3 : 0.34} blending={ADD} depthWrite={false} toneMapped={false} />
        </lineSegments>
        {/* Clear glass: the far-side facet edges show through the stone (same buffer, no depth test). */}
        {glass && (
          <lineSegments geometry={edges} renderOrder={1}>
            <lineBasicMaterial
              color={edgeColor}
              transparent
              opacity={glass.innerEdges}
              blending={ADD}
              depthWrite={false}
              depthTest={false}
              toneMapped={false}
            />
          </lineSegments>
        )}
      </group>
      <pointLight ref={light} color={spec.light.color} intensity={spec.light.intensity} distance={spec.light.distance} decay={2} />
    </group>
  );
}

/* ───────────────────────────── Orbit rings ───────────────────────────── */

export function OrbitRing({
  spec,
  tier,
  beadGeometry,
  beadMaterial,
  refDistance = 10,
}: {
  spec: RingSpec;
  tier: DeviceTier;
  beadGeometry: THREE.BufferGeometry;
  beadMaterial: THREE.Material;
  /** Preset camera z: the distance at which spark sizes are exact. */
  refDistance?: number;
}) {
  const motion = useMotion();
  const segments = tier === "high" ? 220 : 140;
  const ribbon = spec.ribbon;
  const tubeGeometry = useMemo(() => {
    if (!ribbon) return new THREE.TorusGeometry(spec.radius, spec.tube, tier === "high" ? 14 : 8, segments);
    // Glass ribbon: an open band around the ring axis (Z), i.e. a short cylinder turned on its side.
    const band = new THREE.CylinderGeometry(spec.radius, spec.radius, ribbon.width, segments, 1, true);
    band.rotateX(Math.PI / 2);
    return band;
  }, [spec.radius, spec.tube, tier, segments, ribbon]);
  // Rim highlights of a ribbon: two thin neon lines along the band's edges.
  const rimGeometry = useMemo(
    () => (ribbon ? ringGlowGeometry(spec.radius, 0.007, ribbon.edge, spec.glowAngle + 0.9, segments) : null),
    [ribbon, spec.radius, spec.glowAngle, segments],
  );
  const glowGeometry = useMemo(
    () => ringGlowGeometry(spec.radius, Math.max(0.006, spec.tube * 0.5), spec.glow, spec.glowAngle, segments),
    [spec.radius, spec.tube, spec.glow, spec.glowAngle, segments],
  );
  useEffect(
    () => () => {
      tubeGeometry.dispose();
      glowGeometry.dispose();
      rimGeometry?.dispose();
    },
    [tubeGeometry, glowGeometry, rimGeometry],
  );

  const sparkGeometry = useMemo(() => {
    if (!spec.sparks?.length) return null;
    const pts = spec.sparks.map((s) => ({
      ...s,
      // In the ellipse-scaled group, so X is stretched by the parent like the tube itself.
      position: [Math.cos(s.angle) * spec.radius, Math.sin(s.angle) * spec.radius, 0] as Vec3,
    }));
    return glowPointsGeometry(addSparks(emptyGlowPoints(), pts, Math.round(spec.radius * 100)));
  }, [spec.sparks, spec.radius]);
  useEffect(() => () => sparkGeometry?.dispose(), [sparkGeometry]);

  const tilt = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const beads = useRef<THREE.InstancedMesh>(null);
  const beadCount = spec.beads?.angles.length ?? 0;

  // Beads are static inside the spinning group: the group's rotation carries them along the ring.
  useLayoutEffect(() => {
    const mesh = beads.current;
    if (!mesh || !spec.beads) return;
    const o = new THREE.Object3D();
    spec.beads.angles.forEach((a, i) => {
      o.position.set(Math.cos(a) * spec.radius, Math.sin(a) * spec.radius, 0);
      o.rotation.set(a * 1.7 + 0.4, a * 0.9, a + 0.6);
      o.scale.setScalar(spec.beads!.sizes[i] ?? 0.25);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [spec.beads, spec.radius]);

  useFrame(({ clock }, delta) => {
    const m = motion.current;
    const t = m?.reduced ? 0 : clock.elapsedTime;
    if (tilt.current) {
      // Slow precession: small, out of phase per axis, so silhouettes breathe but the composition holds.
      const w = spec.wobble;
      tilt.current.rotation.set(
        spec.tilt[0] + Math.sin(t * spec.wobbleSpeed) * w,
        spec.tilt[1] + Math.sin(t * spec.wobbleSpeed * 0.7 + 1.3) * w,
        spec.tilt[2] + Math.cos(t * spec.wobbleSpeed * 0.5) * w * 0.5,
        "ZYX",
      );
    }
    if (spin.current && m && !m.reduced) spin.current.rotation.z += dt(delta) * spec.beadSpin * m.spin;
  });

  return (
    <group position={spec.position ?? [0, 0, 0]}>
      <group ref={tilt} rotation={[spec.tilt[0], spec.tilt[1], spec.tilt[2], "ZYX"]}>
        <group scale={[spec.ellipse, 1, 1]}>
          <mesh geometry={glowGeometry} renderOrder={11}>
            <meshBasicMaterial
              vertexColors
              transparent
              opacity={ribbon ? 0.5 : 0.95}
              blending={ADD}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          {rimGeometry &&
            ribbon &&
            [-0.5, 0.5].map((side) => (
              <mesh key={side} geometry={rimGeometry} position={[0, 0, side * ribbon.width]} renderOrder={11}>
                <meshBasicMaterial vertexColors transparent opacity={0.9} blending={ADD} depthWrite={false} toneMapped={false} />
              </mesh>
            ))}
          <mesh geometry={tubeGeometry} renderOrder={10}>
            {tier === "high" ? (
              <meshPhysicalMaterial
                color={spec.color}
                metalness={ribbon ? 0.35 : 0.55}
                roughness={ribbon ? 0.06 : 0.12}
                clearcoat={1}
                clearcoatRoughness={0.08}
                envMapIntensity={ribbon ? 2.4 : 1.9}
                transparent
                opacity={spec.opacity}
                depthWrite={false}
                side={ribbon ? THREE.DoubleSide : THREE.FrontSide}
              />
            ) : (
              <meshStandardMaterial
                color={spec.color}
                emissive={spec.color}
                emissiveIntensity={0.22}
                metalness={0.6}
                roughness={0.15}
                envMapIntensity={1.8}
                transparent
                opacity={spec.opacity}
                depthWrite={false}
                side={ribbon ? THREE.DoubleSide : THREE.FrontSide}
              />
            )}
          </mesh>
          {sparkGeometry && <GlowPoints geometry={sparkGeometry} twinkle={0.55} drift={0} glow renderOrder={15} refDistance={refDistance} />}
          {beadCount > 0 && (
            <group ref={spin}>
              <instancedMesh ref={beads} args={[beadGeometry, beadMaterial, beadCount]} />
            </group>
          )}
        </group>
      </group>
    </group>
  );
}

/* ───────────────────────────── Floating fragments ───────────────────────────── */

const Y_AXIS = new THREE.Vector3(0, 1, 0);

/**
 * One InstancedMesh per fragment kind; matrices rebuilt per frame (≤ 6 instances each).
 * Optional `edges`: additive facet-edge lines per instance (the bright glass outlines in the ref),
 * one tiny LineSegments draw per fragment sharing a single EdgesGeometry and material.
 */
export function Shards({
  kind,
  specs,
  material,
  renderOrder = 0,
  edges,
}: {
  kind: ShardKind;
  specs: ShardSpec[];
  material: THREE.Material;
  renderOrder?: number;
  edges?: { color: Vec3; opacity: number };
}) {
  const motion = useMotion();
  const geometry = useMemo(() => shardGeometry(kind, kind.length * 7 + 3), [kind]);
  const edgeGeometry = useMemo(() => (edges ? new THREE.EdgesGeometry(geometry, 12) : null), [geometry, edges]);
  const edgeMaterial = useMemo(
    () =>
      edges
        ? new THREE.LineBasicMaterial({
            color: hdr(edges.color),
            transparent: true,
            opacity: edges.opacity,
            blending: ADD,
            depthWrite: false,
            toneMapped: false,
          })
        : null,
    [edges],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      edgeGeometry?.dispose();
      edgeMaterial?.dispose();
    },
    [geometry, edgeGeometry, edgeMaterial],
  );
  const mesh = useRef<THREE.InstancedMesh>(null);
  const lines = useRef<(THREE.LineSegments | null)[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const angles = useRef<number[]>([]);
  const swing = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }, delta) => {
    const im = mesh.current;
    const m = motion.current;
    if (!im || !m) return;
    const t = m.reduced ? 0 : clock.elapsedTime;
    specs.forEach((s, i) => {
      const a = (angles.current[i] ?? 0) + (m.reduced ? 0 : dt(delta) * s.spin * m.spin);
      angles.current[i] = a;
      swing.set(s.position[0], s.position[1] + Math.sin(t * 0.55 + i * 1.7) * s.float, s.position[2]);
      // Optional slow swing around the cluster's vertical axis (~90s period): drifts around the gem.
      if (s.orbit) swing.applyAxisAngle(Y_AXIS, Math.sin(t * 0.07 + i * 2.3) * s.orbit);
      dummy.position.copy(swing);
      dummy.rotation.set(s.rotation[0] + a * 0.6, s.rotation[1] + a, s.rotation[2]);
      dummy.scale.set(s.scale[0], s.scale[1], s.scale[2]);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
      const line = lines.current[i];
      if (line) line.matrix.copy(dummy.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
  });

  // Instances move a little each frame; skip per-instance culling bookkeeping.
  return (
    <>
      <instancedMesh ref={mesh} args={[geometry, material, specs.length]} frustumCulled={false} renderOrder={renderOrder} />
      {edgeGeometry &&
        edgeMaterial &&
        specs.map((_, i) => (
          <lineSegments
            key={i}
            ref={(el) => {
              lines.current[i] = el;
            }}
            geometry={edgeGeometry}
            material={edgeMaterial}
            matrixAutoUpdate={false}
            frustumCulled={false}
            renderOrder={renderOrder + 1}
          />
        ))}
    </>
  );
}

/* ───────────────────────────── Rocks ───────────────────────────── */

/**
 * Near-black stone (ref). Lambert on purpose: a PBR material picks up a strong Fresnel sheen from
 * the back rim light at grazing angles, which turned the whole ridge navy. Diffuse-only keeps the
 * body black; vertex colours carry the per-face speckle texture. A small shader addition paints a
 * cool blue rim on upward-facing silhouette facets — the "moonlit ridge" edge in the reference.
 */
const ROCK_RIM_DEFAULT: Vec3 = [0.035, 0.05, 0.16];

function createRockMaterial(rim: Vec3 = ROCK_RIM_DEFAULT) {
  const material = new THREE.MeshLambertMaterial({ color: "#0b0c12", flatShading: true, vertexColors: true });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      /* glsl */ `{
        vec3 rimN = normalize(normal);
        float rimF = pow(1.0 - clamp(dot(rimN, normalize(vViewPosition)), 0.0, 1.0), 4.0);
        outgoingLight += vec3(${rim.map((c) => c.toFixed(3)).join(", ")}) * rimF * smoothstep(0.1, 0.8, rimN.y);
      }
      #include <opaque_fragment>`,
    );
  };
  material.customProgramCacheKey = () => `rock-rim-${rim.join(",")}`;
  return material;
}

/**
 * Glass edge highlight for the floating fragments and panes (ref: pale glass whose facet edges
 * and silhouette catch a bright ice-blue line). A view-angle Fresnel term is added to the lit
 * colour and lifts alpha at grazing angles, so a translucent body still shows crisp, bright
 * edges: the side facets of a thin pane read as its outline. One shader patch, no extra pass.
 */
export function withGlassRim<M extends THREE.MeshStandardMaterial>(
  material: M,
  { color, strength, power = 3, alphaLift = 0.7 }: { color: string; strength: number; power?: number; alphaLift?: number },
): M {
  const rim = new THREE.Color(color).multiplyScalar(strength);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = { value: rim };
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", "uniform vec3 uRimColor;\nvoid main() {")
      .replace(
        "#include <opaque_fragment>",
        /* glsl */ `{
          float rimF = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), ${power.toFixed(2)});
          outgoingLight += uRimColor * rimF;
          diffuseColor.a = mix(diffuseColor.a, 1.0, clamp(rimF * ${alphaLift.toFixed(2)}, 0.0, 1.0));
        }
        #include <opaque_fragment>`,
      );
  };
  // Distinct program per rim setting (otherwise three may reuse a cached unpatched program).
  material.customProgramCacheKey = () => `glass-rim-${color}-${strength}-${power}-${alphaLift}`;
  return material;
}

function Rock({
  spec,
  unit,
  vw,
  vh,
  tier,
  material,
  refDistance,
  glintDust,
  dustBrightness,
}: {
  spec: RockSpec;
  unit: number;
  vw: number;
  vh: number;
  tier: DeviceTier;
  material: THREE.Material;
  refDistance: number;
  glintDust: number;
  dustBrightness: number;
}) {
  const geometry = useMemo(() => rockGeometry(spec.seed, tier === "high" ? 5 : 4), [spec.seed, tier]);
  const yaw = spec.seed * 0.7;
  const glints = useMemo(
    () =>
      glowPointsGeometry(
        rockGlintPoints(geometry, spec.seed, tier === "high" ? glintDust : glintDust * 0.5, spec.sparks ?? 0, dustBrightness, yaw),
      ),
    [geometry, spec.seed, spec.sparks, tier, glintDust, dustBrightness, yaw],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      glints.dispose();
    },
    [geometry, glints],
  );

  const r = spec.r * unit;
  return (
    <group
      position={[spec.nx * vw, spec.ny * vh, spec.z]}
      scale={[r * spec.stretch[0], r * spec.stretch[1], r * spec.stretch[2]]}
      rotation={[0.08, yaw, 0]}
    >
      <mesh geometry={geometry} material={material} />
      {/* Mineral specks + ridge-top sparkles (ref), drawn by the shared glow-point shader so they
          twinkle like the rest of the particles; depth-tested, so the rock body hides the far side. */}
      <GlowPoints geometry={glints} twinkle={0.6} drift={0} renderOrder={1} refDistance={refDistance} />
    </group>
  );
}

export function Rocks({
  items,
  unit,
  glintDust,
  dustBrightness = 1,
  rim,
  vw,
  vh,
  tier,
  refDistance,
}: {
  /** Linear rim-light colour on upward silhouette facets (default: faint moonlit blue). */
  rim?: Vec3;
  items: RockSpec[];
  unit: number;
  glintDust: number;
  dustBrightness?: number;
  vw: number;
  vh: number;
  tier: DeviceTier;
  /** Preset camera z (glint sizes are calibrated at this distance). */
  refDistance: number;
}) {
  const material = useMemo(() => createRockMaterial(rim), [rim]);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <group>
      {items.map((spec) => (
        <Rock
          key={spec.seed}
          spec={spec}
          unit={unit}
          vw={vw}
          vh={vh}
          tier={tier}
          material={material}
          refDistance={refDistance}
          glintDust={glintDust}
          dustBrightness={dustBrightness}
        />
      ))}
    </group>
  );
}

/* ───────────────────────────── Stars & flares ───────────────────────────── */

/* ───────────────────────────── Glow points ─────────────────────────────
 * One additive point shader for every particle in the scenes (stars, dust, motes, sparks):
 *  - size attenuation by true view depth (px = size × refDistance / depth), so the shells read
 *    as 3D and the dolly / pointer parallax slides near points past far ones;
 *  - soft round sprite (gaussian core) plus, for sparks (aHalo > 0), a wider soft halo and a
 *    faint 4-point glint — Bloom picks the HDR sparks up on the high tier, the halo carries the
 *    glow on the low tier;
 *  - twinkle + slow drift in the vertex shader from one uTime uniform (no per-frame buffer work);
 *    uMotion = 0 under reduced motion renders a static field;
 *  - sub-pixel points keep a 1.5px footprint and lose energy instead, so tiny far stars don't
 *    shimmer as they move.
 */
const GLOW_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uMotion;
uniform float uPx;
uniform float uRef;
uniform float uDrift;
uniform float uTwinkle;
uniform float uBoost;
attribute float aSize;
attribute vec3 aColor;
attribute float aPhase;
attribute float aHalo;
varying vec3 vColor;
varying vec3 vHaloColor;
varying float vSpan;
varying float vHalo;
void main() {
  float ph = aPhase * 6.2831853;
  vec3 p = position + uMotion * uDrift * vec3(
    sin(uTime * 0.11 + ph),
    sin(uTime * 0.083 + ph * 1.7),
    0.5 * sin(uTime * 0.067 + ph * 2.3)
  );
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float px = aSize * uPx * uRef / max(-mv.z, 0.1);
  float fade = clamp(px / 1.5, 0.0, 1.0);
  float span = 1.0 + aHalo * 2.0;
  gl_PointSize = max(px, 1.5) * span;
  // About half the points twinkle visibly, the rest only breathe.
  float amp = fract(aPhase * 7.31) > 0.5 ? 0.55 : 0.15;
  float tw = 1.0 + uMotion * uTwinkle * amp * sin(uTime * (0.45 + fract(aPhase * 3.7) * 1.1) + ph * 5.0);
  vColor = aColor * tw * fade * fade * uBoost;
  // The halo uses the hue at <= 1.0 peak: an HDR halo would clip to the core's brightness and
  // turn the spark into a flat blob (most visible on the low tier, which has no Bloom).
  vHaloColor = vColor / max(1.0, max(vColor.r, max(vColor.g, vColor.b)));
  vSpan = span;
  vHalo = aHalo;
}
`;
const GLOW_FRAGMENT = /* glsl */ `
varying vec3 vColor;
varying vec3 vHaloColor;
varying float vSpan;
varying float vHalo;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float d = length(q) * 2.0;
  if (d > 1.0) discard;
  float r = d * vSpan;
  float core = exp(-r * r * 3.2);
  float edge = 1.0 - d;
  float halo = vHalo * 0.32 * edge * edge * edge;
  float glint = vHalo * 0.5 * (exp(-abs(q.x) * vSpan * 30.0) + exp(-abs(q.y) * vSpan * 30.0)) * edge * edge;
  float mask = smoothstep(1.0, 0.8, d);
  // Premultiplied output, blended ONE + ONE (pure additive light).
  gl_FragColor = vec4((vColor * core + vHaloColor * (halo + glint)) * mask, (core + halo) * mask * 0.5);
}
`;

/** CSS canvas height the `size` units are calibrated for; smaller canvases scale points down (clamped). */
const PARTICLE_REF_HEIGHT = 900;

export function GlowPoints({
  geometry,
  twinkle,
  drift,
  glow = false,
  renderOrder = -3,
  refDistance = 10,
}: {
  geometry: THREE.BufferGeometry;
  twinkle: number;
  drift: number;
  /** Follow the scene glow (pulses / hero scroll swell) — sparks only. */
  glow?: boolean;
  renderOrder?: number;
  /** Camera distance at which `aSize` is exact (the preset camera z). */
  refDistance?: number;
}) {
  const motion = useMotion();
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uMotion: { value: 1 },
          uPx: { value: 1 },
          uRef: { value: refDistance },
          uDrift: { value: drift },
          uTwinkle: { value: twinkle },
          uBoost: { value: 1 },
        },
        vertexShader: GLOW_VERTEX,
        fragmentShader: GLOW_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneFactor,
      }),
    [refDistance, drift, twinkle],
  );
  useEffect(() => () => material.dispose(), [material]);
  const points = useRef<THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);

  useFrame((state) => {
    const m = motion.current;
    if (!points.current) return;
    const u = points.current.material.uniforms;
    u.uMotion.value = m?.reduced ? 0 : 1;
    u.uTime.value = state.clock.elapsedTime;
    u.uPx.value = state.viewport.dpr * THREE.MathUtils.clamp(state.size.height / PARTICLE_REF_HEIGHT, 0.75, 1.2);
    u.uBoost.value = glow && m ? 0.8 + 0.2 * m.glow : 1;
  });

  // Drift moves points past the static bounds; the fields are cheap, so skip culling.
  return <points ref={points} geometry={geometry} material={material} renderOrder={renderOrder} frustumCulled={false} />;
}

const NO_BEACONS: BeaconSpec[] = [];

/**
 * World-space depth particles (stars, dust, near motes) for a preset. Rebuilt for the current
 * aspect so the screen-anchored regions/clusters hold their placement on resize.
 */
export function DepthParticles({
  fields,
  camera,
  aspect,
  high,
  anchor,
  beacons = NO_BEACONS,
}: {
  beacons?: BeaconSpec[];
  fields: ParticleField[];
  camera: { fov: number; z: number };
  aspect: number;
  high: boolean;
  /** Crystal centre as screen fractions, for clusters without nx/ny. */
  anchor: { nx: number; ny: number };
}) {
  const layers = useMemo(
    () =>
      fields.flatMap((field) => {
        const count = high ? field.count.high : field.count.low;
        if (count <= 0) return [];
        return [{ field, geometry: glowPointsGeometry(addParticleField(emptyGlowPoints(), field, camera, aspect, count, anchor)) }];
      }),
    [fields, camera, aspect, high, anchor],
  );
  useEffect(() => () => layers.forEach((l) => l.geometry.dispose()), [layers]);
  const beaconGeometry = useMemo(() => {
    const shown = beacons.filter((b) => aspect >= (b.minAspect ?? 0));
    if (!shown.length) return null;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const pts = shown.map((b) => {
      const halfH = (camera.z - b.z) * tanHalf;
      return { ...b, position: [b.nx * 2 * halfH * aspect, b.ny * 2 * halfH, b.z] as Vec3 };
    });
    return glowPointsGeometry(addSparks(emptyGlowPoints(), pts, 13));
  }, [beacons, camera, aspect]);
  useEffect(() => () => beaconGeometry?.dispose(), [beaconGeometry]);
  return (
    <>
      {beaconGeometry && <GlowPoints geometry={beaconGeometry} twinkle={0.35} drift={0} glow refDistance={camera.z} />}
      {layers.map(({ field, geometry }) => (
        <GlowPoints key={field.seed} geometry={geometry} twinkle={field.twinkle} drift={field.drift} refDistance={camera.z} />
      ))}
    </>
  );
}

/** Free energy sparks in cluster space (rendered inside the Rig, so they move with the crystal). */
export function Sparks({ sparks, high, refDistance }: { sparks: SparkSpec[]; high: boolean; refDistance: number }) {
  const geometry = useMemo(() => {
    const list = sparks.filter((s) => high || !s.detail);
    return list.length ? glowPointsGeometry(addSparks(emptyGlowPoints(), list, 7)) : null;
  }, [sparks, high]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  return geometry ? <GlowPoints geometry={geometry} twinkle={0.55} drift={0.04} glow renderOrder={15} refDistance={refDistance} /> : null;
}

/** Lens glint: a soft core plus two crossed streaks (stretched copies of the same radial texture). */
export function Flare({ spec, map, index }: { spec: FlareSpec; map: THREE.Texture; index: number }) {
  const motion = useMotion();
  const color = useMemo(() => hdr(spec.color), [spec.color]);
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current || motion.current?.reduced) return;
    const g = motion.current?.glow ?? 1;
    group.current.scale.setScalar((0.88 + 0.12 * Math.sin(clock.elapsedTime * 1.3 + index * 2.1)) * (0.85 + 0.15 * g));
  });
  const mat = (rotation: number, opacity: number) => (
    <spriteMaterial
      map={map}
      color={color}
      rotation={rotation}
      blending={ADD}
      transparent
      opacity={opacity}
      depthWrite={false}
      depthTest={false}
      toneMapped={false}
    />
  );
  return (
    <group ref={group} position={spec.position}>
      <sprite scale={[spec.size, spec.size, 1]} renderOrder={20}>
        {mat(0, 0.9)}
      </sprite>
      <sprite scale={[spec.streak, spec.size * 0.07, 1]} renderOrder={20}>
        {mat(spec.angle, 0.8)}
      </sprite>
      <sprite scale={[spec.streak * 0.55, spec.size * 0.05, 1]} renderOrder={20}>
        {mat(spec.angle + Math.PI / 2, 0.6)}
      </sprite>
    </group>
  );
}

/* ───────────────────────────── Luminous glass panels ─────────────────────────────
 * Emissive glass sheets (the About backdrop). One quad per panel, padded beyond the sheet so the
 * same fragment shader draws the soft outer halo; additive (ONE + ONE), no depth write, depth
 * tested (rocks in front still hide them). Linear HDR output, so Bloom picks up the edges and
 * the brightest part of the body on the high tier; on the low tier the emissive body + halo carry
 * the glow alone. Per pixel, from the sheet's signed distance d (< 0 inside):
 *   body   gradient bottom → top (+ a little diagonal), fine scanlines, faint grid, inner rim glow
 *   shimmer a soft diagonal band sweeping across every ~20s, and a slow scan bar moving up
 *   edge   bright anti-aliased outline (top/upper edges brightest), plus the outer halo.
 */
const PANEL_VERTEX = /* glsl */ `
uniform vec2 uFull;
uniform float uShear;
varying vec2 vLocal;
void main() {
  vec2 local = position.xy * uFull;
  vLocal = local;
  vec2 sheared = vec2(local.x, local.y + local.x * uShear);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(sheared / uFull, 0.0, 1.0);
}
`;
const PANEL_FRAGMENT = /* glsl */ `
uniform vec2 uHalf;
uniform vec3 uBottom;
uniform vec3 uTop;
uniform vec3 uEdge;
uniform float uOpacity;
uniform float uGlow;
uniform float uGlowR;
uniform float uGrid;
uniform float uTime;
uniform float uPhase;
uniform float uMotion;
varying vec2 vLocal;
float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
void main() {
  float d = sdBox(vLocal, uHalf);
  float aa = fwidth(d) * 0.75;
  float inside = 1.0 - smoothstep(-aa, aa, d);
  vec2 uv = vLocal / (2.0 * uHalf) + 0.5;
  float t = uTime * uMotion + uPhase * 7.0;

  // Body: deep electric blue at the bottom → light blue at the top, lifted toward the upper edge.
  float g = clamp(uv.y * 0.8 + uv.x * 0.2, 0.0, 1.0);
  vec3 body = mix(uBottom, uTop, smoothstep(0.0, 1.0, g));
  // Fine scanlines: 10 per grid cell, shallow.
  float lines = 0.93 + 0.07 * sin(vLocal.y / max(uGrid, 1e-4) * 62.83);
  vec2 cell = abs(fract(vLocal / max(uGrid, 1e-4) + 0.5) - 0.5);
  float grid = uGrid > 0.0 ? smoothstep(0.44, 0.5, max(cell.x, cell.y)) : 0.0;
  float rimIn = exp(d / (min(uHalf.x, uHalf.y) * 0.18));
  float sweep = fract(t * 0.05);
  float sheen = exp(-pow((uv.x * 0.55 + uv.y - 1.6 + sweep * 2.2) * 6.0, 2.0));
  float scan = exp(-pow((uv.y - fract(t * 0.035 + 0.3)) * 22.0, 2.0));
  vec3 inner = body * lines
    + uTop * grid * 0.1
    + uEdge * (rimIn * 0.22 + sheen * 0.16 + scan * 0.1);

  // Outline: brightest along the top and upper sides.
  float edgeW = aa + min(uHalf.x, uHalf.y) * 0.012;
  float line = 1.0 - smoothstep(0.0, edgeW, abs(d));
  float edgeMul = 0.55 + 0.6 * smoothstep(0.1, 1.0, uv.y) + 0.15 * sin(uv.x * 9.0 + t * 0.4);
  float halo = (1.0 - inside) * exp(-max(d, 0.0) / uGlowR);

  vec3 col = inner * inside * uOpacity + uEdge * line * edgeMul + uTop * halo * halo * uGlow * 0.5;
  gl_FragColor = vec4(col, clamp(inside * uOpacity * 0.6 + line + halo * uGlow * 0.3, 0.0, 1.0));
}
`;

const PANEL_QUAD = new THREE.PlaneGeometry(1, 1);

function LuminousPanel({ spec, high }: { spec: PanelSpec; high: boolean }) {
  const motion = useMotion();
  const pad = Math.min(spec.size[0], spec.size[1]) * 0.32;
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uFull: { value: new THREE.Vector2(spec.size[0] + pad * 2, spec.size[1] + pad * 2) },
          uHalf: { value: new THREE.Vector2(spec.size[0] / 2, spec.size[1] / 2) },
          uShear: { value: spec.shear },
          uBottom: { value: hdr(spec.bottom) },
          uTop: { value: hdr(spec.top) },
          uEdge: { value: hdr(spec.edge) },
          uOpacity: { value: spec.opacity },
          // No Bloom on the low tier: a stronger halo stands in for it.
          uGlow: { value: spec.glow * (high ? 1 : 1.5) },
          uGlowR: { value: pad * 0.32 },
          uGrid: { value: spec.grid },
          uTime: { value: 0 },
          uPhase: { value: spec.phase },
          uMotion: { value: 1 },
        },
        vertexShader: PANEL_VERTEX,
        fragmentShader: PANEL_FRAGMENT,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneFactor,
      }),
    [spec, pad, high],
  );
  useEffect(() => () => material.dispose(), [material]);
  const mesh = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);

  useFrame(({ clock }) => {
    const el = mesh.current;
    if (!el) return;
    const reduced = motion.current?.reduced ?? false;
    const t = reduced ? 0 : clock.elapsedTime;
    el.material.uniforms.uTime.value = t;
    el.material.uniforms.uMotion.value = reduced ? 0 : 1;
    // Very slow sway / drift (~40-60s periods), out of phase per panel.
    el.rotation.set(
      spec.rotation[0] + Math.sin(t * 0.11 + spec.phase) * spec.sway * 0.4,
      spec.rotation[1] + Math.sin(t * 0.13 + spec.phase * 1.3) * spec.sway,
      spec.rotation[2] + Math.sin(t * 0.09 + spec.phase * 0.7) * spec.sway * 0.3,
    );
    el.position.set(spec.position[0], spec.position[1] + Math.sin(t * 0.16 + spec.phase) * spec.float, spec.position[2]);
  });

  return (
    <mesh
      ref={mesh}
      geometry={PANEL_QUAD}
      material={material}
      position={spec.position}
      rotation={spec.rotation}
      scale={[spec.size[0] + pad * 2, spec.size[1] + pad * 2, 1]}
      renderOrder={12}
      frustumCulled={false}
    />
  );
}

export function LuminousPanels({ panels, high }: { panels: PanelSpec[]; high: boolean }) {
  return (
    <>
      {panels.map((p, i) => (
        <LuminousPanel key={i} spec={p} high={high} />
      ))}
    </>
  );
}

/* ───────────────────────────── Lights + environment ───────────────────────────── */

/**
 * Key/rim lights plus an Environment baked once from Lightformers (no HDR download).
 * The env strips are what the glass reflects: cool white top, electric-blue side bars,
 * a violet ring — the blue/cyan/violet facet flashes in the reference.
 */
export function Lighting({ tier }: { tier: DeviceTier }) {
  return (
    <>
      <ambientLight intensity={0.18} color="#8fa2ff" />
      <directionalLight position={[-3, 5, 6]} intensity={1.1} color="#dfe7ff" />
      {/* Blue rim from upper-right-behind: silhouettes rock ridges and ring backs. */}
      <directionalLight position={[6, 4, -5]} intensity={1.5} color="#4f6bff" />
      {/* Violet fill from the left. */}
      <pointLight position={[-6, -1, 3]} intensity={16} distance={16} color="#8b5cf6" />
      <Environment resolution={tier === "high" ? 256 : 64} frames={1}>
        <Lightformer form="rect" intensity={3.2} color="#dfe8ff" position={[0, 4, -5]} scale={[10, 1.4, 1]} />
        <Lightformer form="rect" intensity={2.6} color="#3b82f6" position={[-5, 0.5, -1]} rotation-y={Math.PI / 2} scale={[8, 0.7, 1]} />
        <Lightformer form="rect" intensity={2.2} color="#38bdf8" position={[5, 1.5, 1]} rotation-y={-Math.PI / 2} scale={[6, 0.5, 1]} />
        <Lightformer form="ring" intensity={2.4} color="#8b5cf6" position={[3, -2, -4]} scale={3} />
        <Lightformer form="rect" intensity={1.4} color="#6366f1" position={[0, -4, 3]} rotation-x={Math.PI / 2} scale={[8, 8, 1]} />
        <Lightformer form="circle" intensity={2.5} color="#ffffff" position={[-2, 2, 6]} scale={1.2} />
        {/* Soft frontal panel behind the camera so camera-facing facets read as lit glass, not flat navy. */}
        <Lightformer form="rect" intensity={0.5} color="#c7d2fe" position={[1.5, 1, 9]} rotation-y={Math.PI} scale={[5, 2.5, 1]} />
      </Environment>
    </>
  );
}
