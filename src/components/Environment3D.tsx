import { Sky, Clouds, Cloud, Stars } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  BufferGeometry,
  Float32BufferAttribute,
  MeshBasicMaterial,
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
  const core = night ? '#fff4fb' : '#fff3d6'
  const glow = night ? '#ffd9ec' : '#ffdca0'
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
  const tint = night ? '#c9b6e8' : '#ffffff'
  return (
    <group ref={group}>
      <Clouds material={MeshBasicMaterial} limit={40}>
        <Cloud seed={1} segments={28} bounds={[26, 5, 10]} volume={9} color={tint} opacity={night ? 0.5 : 0.85} fade={60} position={[-26, 30, -60]} speed={0.1} growth={5} />
        <Cloud seed={4} segments={24} bounds={[22, 4, 8]} volume={8} color={night ? '#b8a3dd' : '#ffe6f1'} opacity={night ? 0.45 : 0.8} fade={60} position={[24, 34, -70]} speed={0.12} growth={4} />
        <Cloud seed={7} segments={20} bounds={[18, 3, 7]} volume={6} color={tint} opacity={night ? 0.4 : 0.75} fade={50} position={[4, 40, -85]} speed={0.1} growth={4} />
      </Clouds>
    </group>
  )
}

/**
 * Environment3D — sky, sun/moon, clouds, layered mountains, and (at night)
 * a starfield. Everything is procedural; nothing is fetched.
 */
export function Environment3D({ night, mobile }: { night: boolean; mobile: boolean }) {
  // Sun low on the horizon for a golden-hour / moonrise feel.
  const sunPos = useMemo<Vector3>(() => new Vector3(-30, 16, -80), [])

  return (
    <group>
      {/* Atmospheric sky with physical scattering */}
      <Sky
        distance={450000}
        sunPosition={[sunPos.x, sunPos.y, sunPos.z]}
        inclination={night ? 0.52 : 0.49}
        azimuth={0.25}
        turbidity={night ? 10 : 6}
        rayleigh={night ? 0.6 : 2.2}
        mieCoefficient={0.006}
        mieDirectionalG={0.85}
      />

      {night && <Stars radius={120} depth={60} count={mobile ? 1200 : 3500} factor={4} saturation={0} fade speed={0.6} />}

      <Sun night={night} position={[sunPos.x, sunPos.y, sunPos.z]} />

      {!mobile && <DriftingClouds night={night} />}

      {/* Mountain ranges — far = hazy/light, near = darker */}
      <MountainRange z={-95} baseY={-3} height={30} seed={1.2} color={night ? '#2b2440' : '#cdb8d8'} />
      <MountainRange z={-78} baseY={-3} height={24} seed={3.7} color={night ? '#241d38' : '#b89bc8'} />
      <MountainRange z={-62} baseY={-3} height={18} seed={6.1} color={night ? '#1d1730' : '#9f7fb4'} />
    </group>
  )
}
