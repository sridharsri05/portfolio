"use client";

import { useMemo, useState } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  FLOORS,
  FLOOR_HEIGHT,
  LIGHTS_PER_SIDE,
  ROOF_HEIGHT,
  STATUS_COLOR,
  TIER,
  floorWidth,
  lightStatus,
} from "@/components/work/demos/pagoda-data";

/*
 * Simplified, original pagoda: seven tiers, each with a ring of light nodes on
 * its eave. Rendered on demand (frameloop="demand") — the scene only redraws
 * when the user orbits or the selection changes.
 */

export type PagodaSceneProps = {
  floor: number;
  light: number | null;
  onSelectFloor: (floor: number) => void;
  onSelectLight: (floor: number, light: number) => void;
};

/** Positions of the 12 eave lights for a floor, walking the four sides. */
function lightPositions(floor: number) {
  const half = floorWidth(floor) / 2 + 0.16;
  const y = floor * TIER + FLOOR_HEIGHT + 0.02;
  const pts: THREE.Vector3[] = [];
  for (let side = 0; side < 4; side++) {
    for (let j = 0; j < LIGHTS_PER_SIDE; j++) {
      const t = -half * 0.7 + (j * (half * 1.4)) / (LIGHTS_PER_SIDE - 1);
      const [x, z] = side === 0 ? [t, half] : side === 1 ? [half, -t] : side === 2 ? [-t, -half] : [-half, t];
      pts.push(new THREE.Vector3(x, y, z));
    }
  }
  return pts;
}

function Floor({ index, selected, light, onSelectFloor, onSelectLight }: { index: number; selected: boolean; light: number | null } & Omit<PagodaSceneProps, "floor" | "light">) {
  const [hover, setHover] = useState(false);
  const w = floorWidth(index);
  const lights = useMemo(() => lightPositions(index), [index]);
  const y = index * TIER;

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelectFloor(index);
  };

  return (
    <group>
      <mesh
        position={[0, y + FLOOR_HEIGHT / 2, 0]}
        onClick={click}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "";
        }}
      >
        <boxGeometry args={[w * 0.82, FLOOR_HEIGHT, w * 0.82]} />
        <meshStandardMaterial color={selected ? "#3a3470" : hover ? "#323b52" : "#262d40"} roughness={0.6} metalness={0.3} />
      </mesh>
      {/* Roof: a 4-sided frustum rotated 45° reads as a flared square eave. */}
      <mesh position={[0, y + FLOOR_HEIGHT + ROOF_HEIGHT / 2, 0]} rotation={[0, Math.PI / 4, 0]} onClick={click}>
        <cylinderGeometry args={[(w * 0.62) / Math.SQRT2 * 1.0, ((w + 0.5) / Math.SQRT2) * 1.0, ROOF_HEIGHT, 4, 1]} />
        <meshStandardMaterial color={selected ? "#9b8cff" : "#2b3244"} roughness={0.35} metalness={0.7} flatShading />
      </mesh>
      {lights.map((p, i) => {
        const status = lightStatus(index, i);
        const isSel = selected && light === i;
        const color = new THREE.Color(STATUS_COLOR[status]);
        if (selected && status !== "available") color.multiplyScalar(1.6);
        return (
          <mesh
            key={i}
            position={p}
            scale={isSel ? 1.9 : 1}
            onClick={(e) => {
              e.stopPropagation();
              onSelectLight(index, i);
            }}
          >
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshBasicMaterial color={isSel ? "#ffffff" : color} transparent opacity={selected ? 1 : 0.55} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
}

export default function PagodaScene({ floor, light, onSelectFloor, onSelectLight }: PagodaSceneProps) {
  const top = FLOORS * TIER;
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.75]}
      camera={{ position: [6.2, 4.2, 7.4], fov: 34 }}
      gl={{ antialias: true }}
      aria-hidden
    >
      <color attach="background" args={["#0c0f16"]} />
      <hemisphereLight args={["#c9d6ff", "#0c0f16", 1.4]} />
      <directionalLight position={[5, 8, 4]} intensity={1.4} />
      <pointLight position={[0, floor * TIER + 0.4, 0]} color="#9b8cff" intensity={4} distance={4} />

      <group position={[0, -top / 2 + 0.2, 0]}>
        {/* Plinth */}
        <mesh position={[0, -0.08, 0]}>
          <boxGeometry args={[3.2, 0.16, 3.2]} />
          <meshStandardMaterial color="#121620" roughness={0.8} />
        </mesh>
        {Array.from({ length: FLOORS }).map((_, i) => (
          <Floor key={i} index={i} selected={i === floor} light={light} onSelectFloor={onSelectFloor} onSelectLight={onSelectLight} />
        ))}
        {/* Spire */}
        <mesh position={[0, top + 0.3, 0]}>
          <coneGeometry args={[0.08, 0.6, 8]} />
          <meshStandardMaterial color="#f2c66d" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 2.05} target={[0, 0, 0]} />
    </Canvas>
  );
}
