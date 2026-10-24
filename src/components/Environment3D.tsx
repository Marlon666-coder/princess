import { Sky, Clouds, Cloud, Stars } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  MeshBasicMaterial,
  ShaderMaterial,
  Vector3,
  type Group,
  type Mesh,
} from 'three'

const reduced = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/* ----------------------------------------------------------------
   Layered procedural mountain ranges — several ridgelines at
   increasing distance, lighter/hazier the further back for depth.
----------------------------------------------------------------- */
function MountainRange({
  z,
  baseY,
  height,
  color,
  seed,
}: {
  z: number
  baseY: number
  height: number
  color: string
  seed: number
}) {
  const geo = useMemo(() => {
    const width = 220
    const segments = 60
    const positions: number[] = []
    const indices: number[] = []
    // ridgeline via layered sines + a little noise
    const heights: number[] = []
    for (let i = 0; i <= segments; i++) {
      const n =
        Math.sin(i * 0.4 + seed) * 0.5 +
        Math.sin(i * 0.9 + seed * 2) * 0.3 +
        Math.sin(i * 1.7 + seed * 3) * 0.2 +
        (Math.sin(i * 7.3 + seed) * 0.5 + 0.5) * 0.15
      heights.push(baseY + (n * 0.5 + 0.5) * height)
    }
    for (let i = 0; i <= segments; i++) {
      const x = (i / segments - 0.5) * width
      // top vertex then bottom vertex
      positions.push(x, heights[i], z)
      positions.push(x, baseY - 40, z)
    }
    for (let i = 0; i < segments; i++) {
      const a = i * 2
      const b = i * 2 + 1
      const c = i * 2 + 2
      const d = i * 2 + 3
      indices.push(a, b, c, c, b, d)
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(positions, 3))
    g.setIndex(indices)
    g.computeVertexNormals()
    return g
  }, [z, baseY, height, seed])

  return (
    <mesh geometry={geo}>
      <meshBasicMaterial color={color} fog={true} />
    </mesh>
  )
}

/* ----------------------------------------------------------------
   The sun (or moon): a bright glowing disc + soft halo billboard.
----------------------------------------------------------------- */
function Sun({ night, position }: { night: boolean; position: [number, number, number] }) {
  const halo = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (reduced() || !halo.current) return
    const s = 1 + Math.sin(clock.elapsedTime * 0.6) * 0.04
    halo.current.scale.setScalar(s)
    const m = halo.current.material as MeshBasicMaterial
    m.opacity = (night ? 0.5 : 0.65) + Math.sin(clock.elapsedTime * 0.6) * 0.06
  })
  const core = night ? '#fff4fb' : '#ffe6b0'
  const glow = night ? '#ffd9ec' : '#ff8c3c'
  return (
    <group position={position}>
      {/* core disc */}
      <mesh>
        <circleGeometry args={[night ? 5 : 6, 48]} />
        <meshBasicMaterial color={core} fog={false} toneMapped={false} />
      </mesh>
      {/* soft halo */}
      <mesh ref={halo} position={[0, 0, -0.1]}>
        <circleGeometry args={[night ? 11 : 15, 48]} />
        <meshBasicMaterial color={glow} transparent opacity={0.55} fog={false} toneMapped={false} />
      </mesh>
      {/* outer faint halo */}
      <mesh position={[0, 0, -0.2]}>
        <circleGeometry args={[night ? 20 : 26, 48]} />
        <meshBasicMaterial color={glow} transparent opacity={0.18} fog={false} toneMapped={false} />
      </mesh>
      {/* the actual light source */}
      <pointLight intensity={night ? 1.2 : 2.4} distance={120} color={glow} />
    </group>
  )
}

/* ----------------------------------------------------------------
   Drifting volumetric clouds
----------------------------------------------------------------- */
function DriftingClouds({ night }: { night: boolean }) {
  const group = useRef<Group>(null)
  useFrame((_, delta) => {
    if (reduced() || !group.current) return
    group.current.position.x += delta * 0.4
    if (group.current.position.x > 60) group.current.position.x = -60
  })
  const tint = night ? '#c9b6e8' : '#ffd9a8'
  return (
    <group ref={group}>
      <Clouds material={MeshBasicMaterial} limit={40}>
        <Cloud seed={1} segments={28} bounds={[26, 5, 10]} volume={9} color={tint} opacity={night ? 0.5 : 0.8} fade={70} position={[-26, 30, -60]} speed={0.1} growth={5} />
        <Cloud seed={4} segments={24} bounds={[22, 4, 8]} volume={8} color={night ? '#b8a3dd' : '#ffb9a0'} opacity={night ? 0.45 : 0.78} fade={70} position={[24, 34, -70]} speed={0.12} growth={4} />
        <Cloud seed={7} segments={20} bounds={[18, 3, 7]} volume={6} color={tint} opacity={night ? 0.4 : 0.7} fade={60} position={[4, 40, -85]} speed={0.1} growth={4} />
      </Clouds>
    </group>
  )
}

/* ----------------------------------------------------------------
   Night sky dome — a big inward-facing sphere with a vertical gradient
   (deep indigo at the horizon -> near-black at the zenith). Replaces the
   bright physical Sky at night so the sky is actually dark.
----------------------------------------------------------------- */
function NightSkyDome() {
  const mat = useMemo(() => {
    const m = new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new Color('#0a0618') },
        mid: { value: new Color('#201547') },
        bottom: { value: new Color('#3a2168') },
      },
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPos;
        uniform vec3 top; uniform vec3 mid; uniform vec3 bottom;
        void main() {
          float h = clamp((normalize(vPos).y * 0.5 + 0.5), 0.0, 1.0);
          vec3 c = h > 0.5 ? mix(mid, top, (h - 0.5) * 2.0) : mix(bottom, mid, h * 2.0);
          gl_FragColor = vec4(c, 1.0);
        }
      `,
    })
    return m
  }, [])
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[500, 32, 16]} />
      <primitive object={mat} attach="material" />
    </mesh>
  )
}

/* ----------------------------------------------------------------
   Aurora borealis — soft vertical curtains of green/teal/violet light
   waving slowly high in the night sky. Additive, cheap, dreamy.
----------------------------------------------------------------- */
function Aurora() {
  const mat = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      cA: { value: new Color('#5effc4') },
      cB: { value: new Color('#7aa8ff') },
      cC: { value: new Color('#c86bff') },
    }),
    [],
  )
  useFrame(({ clock }) => {
    if (!reduced() && mat.current) mat.current.uniforms.uTime.value = clock.elapsedTime
  })
  return (
    <mesh position={[0, 40, -110]} rotation={[0, 0, 0]}>
      <planeGeometry args={[220, 70, 1, 1]} />
      <shaderMaterial
        ref={mat}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        fog={false}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `}
        fragmentShader={`
          varying vec2 vUv;
          uniform float uTime; uniform vec3 cA; uniform vec3 cB; uniform vec3 cC;
          void main() {
            // waving vertical curtains
            float x = vUv.x;
            float wave = sin(x * 9.0 + uTime * 0.6) * 0.5 + sin(x * 20.0 - uTime * 0.9) * 0.25;
            float band = smoothstep(0.0, 0.5, vUv.y) * (1.0 - smoothstep(0.5, 1.0, vUv.y));
            float curtain = smoothstep(0.35, 0.0, abs(fract(x * 3.0 + wave * 0.08) - 0.5));
            float a = band * curtain;
            vec3 col = mix(cA, cB, x) ;
            col = mix(col, cC, smoothstep(0.6, 1.0, vUv.y));
            gl_FragColor = vec4(col, a * 0.5);
          }
        `}
      />
    </mesh>
  )
}

/**
 * Environment3D — sky, sun/moon, clouds, layered mountains, and (at night)
 * a starfield + aurora. Everything is procedural; nothing is fetched.
 */
export function Environment3D({ night, mobile }: { night: boolean; mobile: boolean }) {
  // Sun sitting low on the horizon (left) for a warm golden-hour sunset.
  const sunPos = useMemo<Vector3>(() => new Vector3(-60, 8, -70), [])

  return (
    <group>
      {night ? (
        <>
          {/* Dark gradient night sky (replaces the bright physical Sky) */}
          <NightSkyDome />
          {/* a sky full of stars */}
          <Stars radius={200} depth={80} count={mobile ? 3500 : 9000} factor={5} saturation={0} fade speed={0.5} />
          {/* aurora curtains high in the sky */}
          {!reduced() && <Aurora />}
        </>
      ) : (
        /* Atmospheric sunset sky: low sun + high turbidity/rayleigh gives the
           orange-pink gradient. */
        <Sky
          distance={450000}
          sunPosition={[sunPos.x, sunPos.y, sunPos.z]}
          turbidity={10}
          rayleigh={3.2}
          mieCoefficient={0.025}
          mieDirectionalG={0.93}
        />
      )}

      {/* sun by day, glowing moon by night */}
      <Sun night={night} position={night ? [34, 30, -80] : [sunPos.x, sunPos.y, sunPos.z]} />

      {!mobile && <DriftingClouds night={night} />}

      {/* Mountain ranges — far = hazy, near = darker */}
      <MountainRange z={-95} baseY={-3} height={30} seed={1.2} color={night ? '#2b2448' : '#e3a68f'} />
      <MountainRange z={-78} baseY={-3} height={24} seed={3.7} color={night ? '#221c3e' : '#c98aa0'} />
      <MountainRange z={-62} baseY={-3} height={18} seed={6.1} color={night ? '#191432' : '#9e6a95'} />
    </group>
  )
}
