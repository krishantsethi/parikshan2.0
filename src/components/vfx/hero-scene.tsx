"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Cinematic hero visualization: a holographic "health intelligence core"
 * (shader plasma sphere) orbited by data rings, satellites, and a starfield of
 * medical data points. Pointer parallax is applied to the whole rig.
 *
 * Performance: single canvas, no postprocessing pass, DPR capped at 1.6,
 * additive particles, and no per-frame allocations. This component is
 * dynamically imported and replaced by a CSS fallback on reduced-motion or
 * WebGL-less devices.
 */

const pointer = { x: 0, y: 0 };

function useGlobalPointer() {
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    const onLeave = () => {
      pointer.x = 0;
      pointer.y = 0;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, []);
}

const VERTEX_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    vPos = position;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColorDeep;
  uniform vec3 uColorAccent;
  uniform vec3 uColorAzure;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vPos;

  void main() {
    float fres = pow(1.0 - clamp(dot(vNormal, vView), 0.0, 1.0), 2.1);
    float bands = 0.5 + 0.5 * sin(vPos.y * 13.0 - uTime * 1.2 + sin(vPos.x * 4.0));
    float scan = smoothstep(0.92, 1.0, sin((vPos.y + uTime * 0.12) * 6.28318));
    float pulse = 0.5 + 0.5 * sin(uTime * 1.15);

    vec3 base = mix(uColorDeep, uColorAzure, 0.28 + 0.22 * sin(uTime * 0.27 + vPos.x * 2.4));
    vec3 col = base
      + uColorAccent * (0.16 * bands + 0.55 * fres)
      + uColorAzure * scan * 0.22
      + uColorAccent * pulse * 0.03;

    float alpha = clamp(0.42 + 0.45 * fres + 0.1 * bands + scan * 0.12, 0.0, 0.94);
    gl_FragColor = vec4(col, alpha);
  }
`;

function HealthCore() {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const shell = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorDeep: { value: new THREE.Color("#0a2b40") },
      uColorAccent: { value: new THREE.Color("#42e8f5") },
      uColorAzure: { value: new THREE.Color("#5b8cff") },
    }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (material.current) material.current.uniforms.uTime!.value = t;
    if (group.current) {
      group.current.rotation.y = t * 0.09;
      group.current.rotation.z = Math.sin(t * 0.16) * 0.06;
    }
    if (shell.current) {
      shell.current.rotation.y = -t * 0.05;
      shell.current.rotation.x = t * 0.03;
    }
  });

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[1.16, 96, 96]} />
        <shaderMaterial
          ref={material}
          uniforms={uniforms}
          vertexShader={VERTEX_SHADER}
          fragmentShader={FRAGMENT_SHADER}
          transparent
          depthWrite={false}
        />
      </mesh>
      <mesh ref={shell} scale={1.23}>
        <icosahedronGeometry args={[1.2, 1]} />
        <meshBasicMaterial color="#42e8f5" wireframe transparent opacity={0.14} />
      </mesh>
      {/* inner glow halo */}
      <mesh scale={1.34}>
        <sphereGeometry args={[1.16, 48, 48]} />
        <meshBasicMaterial color="#42e8f5" transparent opacity={0.035} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function OrbitRings() {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = t * 0.12;
    ref.current.rotation.x = Math.sin(t * 0.1) * 0.12;
  });
  return (
    <group ref={ref}>
      <mesh rotation={[Math.PI / 2.15, 0, 0.22]}>
        <torusGeometry args={[1.85, 0.0045, 6, 240]} />
        <meshBasicMaterial color="#42e8f5" transparent opacity={0.5} />
      </mesh>
      <mesh rotation={[Math.PI / 1.75, 0.4, -0.35]}>
        <torusGeometry args={[2.15, 0.0035, 6, 240]} />
        <meshBasicMaterial color="#5b8cff" transparent opacity={0.4} />
      </mesh>
      <mesh rotation={[Math.PI / 2.6, -0.55, 0.9]}>
        <torusGeometry args={[2.5, 0.0028, 6, 240]} />
        <meshBasicMaterial color="#9aadc4" transparent opacity={0.22} />
      </mesh>
      {/* dashed data ring */}
      <mesh rotation={[Math.PI / 2.0, 0.15, 0.05]}>
        <ringGeometry args={[2.72, 2.735, 96, 1, 0, Math.PI * 1.55]} />
        <meshBasicMaterial color="#42e8f5" transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Satellites() {
  const group = useRef<THREE.Group>(null);
  const { positions, linePositions } = useMemo(() => {
    const count = 7;
    const positions = new Float32Array(count * 3);
    const linePositions = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 1.9 + (i % 3) * 0.24;
      const y = Math.sin(angle * 1.7) * 0.55;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      positions.set([x, y, z], i * 3);
      linePositions.set([0, 0, 0, x * 0.82, y * 0.82, z * 0.82], i * 6);
    }
    return { positions, linePositions };
  }, []);

  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    return geometry;
  }, [linePositions]);

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y = state.clock.elapsedTime * 0.07;
  });

  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#7df1fa"
          size={0.055}
          sizeAttenuation
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial color="#42e8f5" transparent opacity={0.16} />
      </lineSegments>
    </group>
  );
}

function ParticleField() {
  const ref = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const count = 850;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const cyan = new THREE.Color("#42e8f5");
    const azure = new THREE.Color("#5b8cff");
    const muted = new THREE.Color("#9aadc4");
    for (let i = 0; i < count; i++) {
      const radius = 2.4 + Math.random() * 2.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi) * 0.72;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      const color = Math.random() > 0.82 ? muted : cyan.clone().lerp(azure, Math.random());
      colors.set([color.r, color.g, color.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.018;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.06;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        vertexColors
        size={0.022}
        sizeAttenuation
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function Rig({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useGlobalPointer();
  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y = THREE.MathUtils.damp(ref.current.rotation.y, pointer.x * 0.16, 2.6, delta);
    ref.current.rotation.x = THREE.MathUtils.damp(ref.current.rotation.x, -pointer.y * 0.1, 2.6, delta);
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.35) * 0.035;
  });
  return <group ref={ref}>{children}</group>;
}

export default function HeroScene() {
  return (
    <Canvas
      dpr={[1, 1.6]}
      camera={{ position: [0, 0.1, 5.6], fov: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ pointerEvents: "none" }}
      aria-hidden
    >
      <Rig>
        <HealthCore />
        <OrbitRings />
        <Satellites />
        <ParticleField />
      </Rig>
    </Canvas>
  );
}
