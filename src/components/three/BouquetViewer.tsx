"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

/**
 * Procedural 3D bouquet preview (drag to rotate, scroll to zoom within
 * limits). Deliberately built from primitives — no .glb asset has been
 * produced yet; swap the <Bouquet /> group for a Drei useGLTF load when a
 * real model lands. Callers gate this behind desktop + full-motion checks.
 */

const BLOOM_COLORS = ["#A26769", "#C8A882", "#E8C5C9", "#6D2E46", "#F9F5F0"];
const LEAF_COLOR = "#496F50";
const STEM_COLOR = "#5C7A52";
const WRAP_COLOR = "#F1E6D8";

interface Blossom {
  position: THREE.Vector3;
  scale: number;
  color: string;
}

/** Fibonacci-dome layout: even coverage without visible rows. */
function makeBlossoms(count: number): Blossom[] {
  const blossoms: Blossom[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const inclination = Math.acos(1 - t * 0.9);
    const azimuth = golden * i;
    const r = 1.15;
    blossoms.push({
      position: new THREE.Vector3(
        r * Math.sin(inclination) * Math.cos(azimuth),
        r * Math.cos(inclination) * 0.85,
        r * Math.sin(inclination) * Math.sin(azimuth),
      ),
      scale: 0.26 + ((i * 7919) % 100) / 100 * 0.14,
      color: BLOOM_COLORS[i % BLOOM_COLORS.length],
    });
  }
  return blossoms;
}

const BINDING_POINT = new THREE.Vector3(0, -1.55, 0);

function Stem({ to }: { to: THREE.Vector3 }) {
  const { position, quaternion, length } = useMemo(() => {
    const direction = new THREE.Vector3().subVectors(to, BINDING_POINT);
    const len = direction.length();
    const mid = new THREE.Vector3()
      .addVectors(BINDING_POINT, to)
      .multiplyScalar(0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize(),
    );
    return { position: mid, quaternion: quat, length: len };
  }, [to]);

  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[0.015, 0.025, length, 6]} />
      <meshStandardMaterial color={STEM_COLOR} roughness={0.9} />
    </mesh>
  );
}

function Bouquet() {
  const blossoms = useMemo(() => makeBlossoms(21), []);
  const leaves = useMemo(() => makeBlossoms(8), []);

  return (
    <group position={[0, 0.35, 0]}>
      {blossoms.map((b, i) => (
        <group key={i}>
          <Stem to={b.position} />
          <mesh position={b.position}>
            <icosahedronGeometry args={[b.scale, 1]} />
            <meshStandardMaterial
              color={b.color}
              roughness={0.65}
              flatShading
            />
          </mesh>
        </group>
      ))}

      {leaves.map((leaf, i) => (
        <mesh
          key={`leaf-${i}`}
          position={leaf.position.clone().multiplyScalar(1.28)}
          rotation={[leaf.position.x, leaf.position.y, leaf.position.z]}
          scale={[0.5, 0.14, 1]}
        >
          <sphereGeometry args={[0.32, 8, 6]} />
          <meshStandardMaterial color={LEAF_COLOR} roughness={0.85} />
        </mesh>
      ))}

      {/* Paper wrap */}
      <mesh position={[0, -1.05, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.85, 1.6, 24, 1, true]} />
        <meshStandardMaterial
          color={WRAP_COLOR}
          roughness={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Ribbon */}
      <mesh position={[0, -1.15, 0]}>
        <torusGeometry args={[0.42, 0.05, 8, 24]} />
        <meshStandardMaterial color="#6D2E46" roughness={0.5} />
      </mesh>
    </group>
  );
}

export default function BouquetViewer() {
  return (
    <Canvas
      camera={{ position: [0, 0.4, 5], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      className="!absolute inset-0"
      aria-hidden
    >
      <ambientLight intensity={0.95} />
      <directionalLight position={[4, 6, 5]} intensity={1.1} />
      <directionalLight position={[-5, 2, -4]} intensity={0.35} color="#C8A882" />
      <Bouquet />
      <OrbitControls
        enablePan={false}
        minDistance={3.4}
        maxDistance={7}
        minPolarAngle={0.7}
        maxPolarAngle={1.9}
        autoRotate
        autoRotateSpeed={0.7}
      />
    </Canvas>
  );
}
