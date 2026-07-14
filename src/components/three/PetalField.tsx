"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const PETAL_COLORS = [
  "#A26769", // dusty rose
  "#C8A882", // warm gold
  "#7A9E7E", // sage
  "#6D2E46", // deep berry
  "#E8C5C9", // blush
];

interface PetalFieldProps {
  /** Instance count — callers pass ~200 desktop / ~60 mobile. */
  count: number;
  /** Static arrangement: matrices set once, no frame loop, no parallax. */
  reducedMotion: boolean;
}

interface PetalSeed {
  x: number;
  y: number;
  z: number;
  speed: number;
  phase: number;
  scale: number;
  tiltX: number;
  tiltY: number;
}

function makeSeeds(count: number): PetalSeed[] {
  return Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * 16,
    y: (Math.random() - 0.5) * 9,
    z: (Math.random() - 0.5) * 6 - 1,
    speed: 0.15 + Math.random() * 0.45,
    phase: Math.random() * Math.PI * 2,
    scale: 0.4 + Math.random() * 0.75,
    tiltX: Math.random() * Math.PI * 2,
    tiltY: Math.random() * Math.PI * 2,
  }));
}

function Petals({ count, reducedMotion }: PetalFieldProps) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(() => makeSeeds(count), [count]);
  const smoothedPointer = useRef({ x: 0, y: 0 });

  // Per-instance brand colors, assigned once.
  useEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      color.set(PETAL_COLORS[i % PETAL_COLORS.length]);
      instanced.setColorAt(i, color);
    }
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  }, [count]);

  const applyMatrices = useMemo(
    () =>
      function apply(time: number, pointerX: number, pointerY: number, spread: number) {
        const instanced = mesh.current;
        if (!instanced) return;
        for (let i = 0; i < seeds.length; i++) {
          const s = seeds[i];
          const drift = reducedMotion ? 0 : 1;
          dummy.position.set(
            s.x * (1 + spread * 0.6) +
              Math.sin(time * s.speed + s.phase) * 0.7 * drift +
              pointerX * 0.5 * s.scale,
            s.y * (1 + spread * 0.4) +
              Math.cos(time * s.speed * 0.8 + s.phase) * 0.5 * drift +
              pointerY * 0.35 * s.scale,
            s.z,
          );
          dummy.rotation.set(
            s.tiltX + time * 0.12 * s.speed * drift,
            s.tiltY + time * 0.18 * s.speed * drift,
            s.phase,
          );
          // Elongated Y scale turns the disc geometry petal-shaped.
          dummy.scale.set(s.scale, s.scale * 1.7, s.scale);
          dummy.updateMatrix();
          instanced.setMatrixAt(i, dummy.matrix);
        }
        instanced.instanceMatrix.needsUpdate = true;
      },
    [seeds, dummy, reducedMotion],
  );

  // Static arrangement for reduced motion: one layout pass, no loop.
  useEffect(() => {
    if (reducedMotion) applyMatrices(0, 0, 0, 0);
  }, [reducedMotion, applyMatrices]);

  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    smoothedPointer.current.x +=
      (state.pointer.x - smoothedPointer.current.x) * 0.04;
    smoothedPointer.current.y +=
      (state.pointer.y - smoothedPointer.current.y) * 0.04;
    // Petals part as the page scrolls, revealing the headline.
    const spread = Math.min(window.scrollY / 700, 1);
    applyMatrices(
      t,
      smoothedPointer.current.x,
      smoothedPointer.current.y,
      spread,
    );
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, count]}
      frustumCulled={false}
    >
      <circleGeometry args={[0.28, 10]} />
      <meshStandardMaterial
        side={THREE.DoubleSide}
        roughness={0.7}
        metalness={0}
        transparent
        opacity={0.85}
      />
    </instancedMesh>
  );
}

export default function PetalField({ count, reducedMotion }: PetalFieldProps) {
  return (
    <Canvas
      aria-hidden
      camera={{ position: [0, 0, 9], fov: 50 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      frameloop={reducedMotion ? "demand" : "always"}
      className="!absolute inset-0"
    >
      <ambientLight intensity={1.1} />
      <directionalLight position={[4, 6, 8]} intensity={0.9} />
      <Petals count={count} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
