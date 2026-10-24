import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import { EffectComposer, Bloom, DepthOfField } from '@react-three/postprocessing'
import { useMemo, useRef, useState } from 'react'
import { MathUtils, type Group, type Vector3Tuple } from 'three'
import { useTheme } from '../context/ThemeContext'

/* eslint-disable react-hooks/immutability -- mutating the camera and the scene
   graph each frame inside useFrame is the intended react-three-fiber pattern. */

const reduced = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/* ----------------------------------------------------------------
   Blocky (Minecraft-inspired, original) character
   A simple voxel-style figure built from boxes. Not using any
   Minecraft assets/textures — just cubes and colours.
----------------------------------------------------------------- */
type Palette = {
  skin: string
  hair: string
  shirt: string
  pants: string
  shoes: string
}

function BlockyCharacter({
  position,
  facing = 1,
  palette,
  waveArm = false,
}: {
  position: Vector3Tuple
  facing?: 1 | -1
  palette: Palette
  waveArm?: boolean
}) {
  const inner = useRef<Group>(null)
  const armRef = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (reduced()) return
    const t = clock.elapsedTime
    // gentle idle bob + sway
    if (inner.current) {
      inner.current.position.y = Math.sin(t * 1.4 + position[0]) * 0.03
      inner.current.rotation.z = Math.sin(t * 0.8 + position[0]) * 0.015
    }
    // the inner (non–hand-holding) arm waves softly
    if (armRef.current && waveArm) {
      armRef.current.rotation.x = Math.sin(t * 2) * 0.25 - 0.1
    }
  })

  const unit = 0.32 // block size

  return (
    <group position={position} scale={0.9}>
      <group ref={inner}>
        {/* Head */}
        <mesh position={[0, unit * 5.1, 0]} castShadow>
          <boxGeometry args={[unit * 2, unit * 2, unit * 2]} />
          <meshStandardMaterial color={palette.skin} roughness={0.85} />
        </mesh>
        {/* Hair cap */}
        <mesh position={[0, unit * 6.05, 0]}>
          <boxGeometry args={[unit * 2.15, unit * 0.9, unit * 2.15]} />
          <meshStandardMaterial color={palette.hair} roughness={0.9} />
        </mesh>
        {/* Hair back */}
        <mesh position={[0, unit * 5.2, -unit * 0.95]}>
          <boxGeometry args={[unit * 2.15, unit * 2, unit * 0.3]} />
          <meshStandardMaterial color={palette.hair} roughness={0.9} />
        </mesh>
        {/* Eyes */}
        <mesh position={[facing * unit * 0.45, unit * 5.1, unit * 1.01]}>
          <boxGeometry args={[unit * 0.32, unit * 0.32, unit * 0.05]} />
          <meshStandardMaterial color="#3a2330" />
        </mesh>
        <mesh position={[facing * -unit * 0.45, unit * 5.1, unit * 1.01]}>
          <boxGeometry args={[unit * 0.32, unit * 0.32, unit * 0.05]} />
          <meshStandardMaterial color="#3a2330" />
        </mesh>
        {/* Rosy cheek / smile hint */}
        <mesh position={[0, unit * 4.6, unit * 1.01]}>
          <boxGeometry args={[unit * 0.7, unit * 0.14, unit * 0.05]} />
          <meshStandardMaterial color="#d8738f" emissive="#d8738f" emissiveIntensity={0.3} />
        </mesh>

        {/* Torso */}
        <mesh position={[0, unit * 3.2, 0]} castShadow>
          <boxGeometry args={[unit * 2, unit * 3, unit * 1]} />
          <meshStandardMaterial color={palette.shirt} roughness={0.8} />
        </mesh>

        {/* Outer arm (the one that can wave) */}
        <group position={[facing * -unit * 1.5, unit * 4.3, 0]} ref={armRef}>
          <mesh position={[0, -unit * 1.3, 0]} castShadow>
            <boxGeometry args={[unit, unit * 3, unit] } />
            <meshStandardMaterial color={palette.shirt} roughness={0.8} />
          </mesh>
          <mesh position={[0, -unit * 3, 0]}>
            <boxGeometry args={[unit, unit * 0.7, unit]} />
            <meshStandardMaterial color={palette.skin} roughness={0.85} />
          </mesh>
        </group>

        {/* Inner arm (reaches toward partner — raised to hold hands) */}
        <group position={[facing * unit * 1.5, unit * 4.3, 0]} rotation={[0, 0, facing * -0.9]}>
          <mesh position={[facing * unit * 1.1, -unit * 0.4, 0]} castShadow>
            <boxGeometry args={[unit * 3, unit, unit]} />
            <meshStandardMaterial color={palette.shirt} roughness={0.8} />
          </mesh>
          <mesh position={[facing * unit * 2.7, -unit * 0.4, 0]}>
            <boxGeometry args={[unit * 0.8, unit, unit]} />
            <meshStandardMaterial color={palette.skin} roughness={0.85} />
          </mesh>
        </group>

        {/* Legs */}
        <mesh position={[facing * -unit * 0.5, unit * 0.9, 0]} castShadow>
          <boxGeometry args={[unit * 0.95, unit * 3, unit]} />
          <meshStandardMaterial color={palette.pants} roughness={0.85} />
        </mesh>
        <mesh position={[facing * unit * 0.5, unit * 0.9, 0]} castShadow>
          <boxGeometry args={[unit * 0.95, unit * 3, unit]} />
          <meshStandardMaterial color={palette.pants} roughness={0.85} />
        </mesh>
        {/* Shoes */}
        <mesh position={[facing * -unit * 0.5, -unit * 0.75, unit * 0.1]}>
          <boxGeometry args={[unit, unit * 0.7, unit * 1.3]} />
          <meshStandardMaterial color={palette.shoes} roughness={0.7} />
        </mesh>
        <mesh position={[facing * unit * 0.5, -unit * 0.75, unit * 0.1]}>
          <boxGeometry args={[unit, unit * 0.7, unit * 1.3]} />
          <meshStandardMaterial color={palette.shoes} roughness={0.7} />
        </mesh>
      </group>
    </group>
  )
}

/* ----------------------------------------------------------------
   The big sakura tree — chunky trunk + layered blossom canopy
----------------------------------------------------------------- */
function SakuraTree({ night }: { night: boolean }) {
  const blossomA = night ? '#f5a9c4' : '#ffb7d0'
  const blossomB = night ? '#e98bb0' : '#ff9ec2'
  const blossomC = night ? '#ffd0e0' : '#ffe0ec'
  const bark = night ? '#5b3a44' : '#6f4a52'

  // Deterministic canopy puffs so it never reshuffles.
  const puffs = useMemo(() => {
    const out: { pos: Vector3Tuple; scale: number; color: string }[] = []
    const ring = (count: number, radius: number, y: number, jitter: number) => {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2
        out.push({
          pos: [
            Math.cos(a) * radius + (((i * 37) % 10) - 5) * 0.04 * jitter,
            y + (((i * 53) % 10) - 5) * 0.05 * jitter,
            Math.sin(a) * radius + (((i * 71) % 10) - 5) * 0.04 * jitter,
          ],
          scale: 1 + (((i * 29) % 10) / 10) * 0.6,
          color: [blossomA, blossomB, blossomC][i % 3],
        })
      }
    }
    ring(10, 2.6, 5.4, 1)
    ring(9, 2.2, 6.4, 1)
    ring(7, 1.6, 7.1, 0.8)
    ring(5, 1.0, 7.7, 0.6)
    out.push({ pos: [0, 8.1, 0], scale: 1.6, color: blossomC })
    return out
  }, [blossomA, blossomB, blossomC])

  return (
    <group>
      {/* Trunk */}
      <mesh position={[0, 2.4, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.95, 5.2, 7]} />
        <meshStandardMaterial color={bark} roughness={0.95} />
      </mesh>
      {/* A couple of big branches */}
      <mesh position={[1.1, 4.4, 0.2]} rotation={[0, 0, -0.9]}>
        <cylinderGeometry args={[0.18, 0.32, 2.4, 6]} />
        <meshStandardMaterial color={bark} roughness={0.95} />
      </mesh>
      <mesh position={[-1.0, 4.6, -0.2]} rotation={[0, 0, 0.8]}>
        <cylinderGeometry args={[0.16, 0.3, 2.2, 6]} />
        <meshStandardMaterial color={bark} roughness={0.95} />
      </mesh>
      {/* Blossom canopy */}
      <Float speed={reduced() ? 0 : 0.8} rotationIntensity={0.05} floatIntensity={0.2}>
        {puffs.map((p, i) => (
          <mesh key={i} position={p.pos} scale={p.scale} castShadow>
            <icosahedronGeometry args={[0.9, 1]} />
            <meshStandardMaterial
              color={p.color}
              emissive={p.color}
              emissiveIntensity={night ? 0.45 : 0.2}
              roughness={0.7}
              flatShading
            />
          </mesh>
        ))}
      </Float>
    </group>
  )
}

/* ----------------------------------------------------------------
   Falling petals across the whole scene
----------------------------------------------------------------- */
function makePetalSeeds(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    x: -7 + Math.random() * 14,
    y: Math.random() * 10,
    z: -4 + Math.random() * 8,
    speed: 0.5 + Math.random() * 0.8,
    drift: 0.2 + Math.random() * 0.5,
    phase: i * 0.6,
    scale: 0.06 + Math.random() * 0.08,
  }))
}

function Petals({ count, night }: { count: number; night: boolean }) {
  const group = useRef<Group>(null)
  // generated once, lazily, so re-renders never reshuffle petals
  const [seeds] = useState(() => makePetalSeeds(count))
  useFrame(({ clock }, delta) => {
    group.current?.children.forEach((child, i) => {
      const s = seeds[i]
      child.position.y -= s.speed * delta
      child.position.x += Math.sin(clock.elapsedTime * 0.6 + s.phase) * delta * s.drift
      child.rotation.x += delta * 1.2
      child.rotation.z += delta * 0.8
      if (child.position.y < -1) {
        child.position.y = 10
        child.position.x = -7 + Math.random() * 14
      }
    })
  })
  return (
    <group ref={group}>
      {seeds.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]} scale={s.scale}>
          <boxGeometry args={[1, 0.25, 1]} />
          <meshStandardMaterial
            color={night ? '#ffc4da' : '#ff9ec2'}
            emissive={night ? '#ff9ebb' : '#ff7fae'}
            emissiveIntensity={night ? 0.5 : 0.25}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
    </group>
  )
}

/* ----------------------------------------------------------------
   Ground
----------------------------------------------------------------- */
function Ground({ night }: { night: boolean }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.9, 0]} receiveShadow>
      <circleGeometry args={[14, 48]} />
      <meshStandardMaterial color={night ? '#2a1f3a' : '#cdeccd'} roughness={1} />
    </mesh>
  )
}

/* ----------------------------------------------------------------
   Camera rig — eases from a wide shot to a close zoom when `zoom`
   flips true, plus a subtle parallax toward the pointer.
----------------------------------------------------------------- */
const WIDE: Vector3Tuple = [0.5, 3.4, 15]
const CLOSE: Vector3Tuple = [-0.4, 2.4, 6.2]
const LOOK_WIDE: Vector3Tuple = [0, 3.2, 0]
const LOOK_CLOSE: Vector3Tuple = [-0.3, 2.0, 0]

function CameraRig({ zoom, enableParallax }: { zoom: boolean; enableParallax: boolean }) {
  const { camera, mouse } = useThree()
  const look = useRef<Vector3Tuple>([...LOOK_WIDE])
  useFrame((_, delta) => {
    const target = zoom ? CLOSE : WIDE
    const lookTarget = zoom ? LOOK_CLOSE : LOOK_WIDE
    const ease = 1 - Math.pow(0.012, delta) // frame-rate independent smoothing
    const px = enableParallax && !zoom ? mouse.x * 0.8 : 0
    const py = enableParallax && !zoom ? mouse.y * 0.5 : 0
    camera.position.x = MathUtils.lerp(camera.position.x, target[0] + px, ease)
    camera.position.y = MathUtils.lerp(camera.position.y, target[1] + py, ease)
    camera.position.z = MathUtils.lerp(camera.position.z, target[2], ease)
    look.current[0] = MathUtils.lerp(look.current[0], lookTarget[0], ease)
    look.current[1] = MathUtils.lerp(look.current[1], lookTarget[1], ease)
    look.current[2] = MathUtils.lerp(look.current[2], lookTarget[2], ease)
    camera.lookAt(look.current[0], look.current[1], look.current[2])
  })
  return null
}

/* ----------------------------------------------------------------
   The full scene
----------------------------------------------------------------- */
export function WelcomeScene({ zoom }: { zoom: boolean }) {
  const { theme } = useTheme()
  const night = theme === 'night'
  const mobile = typeof window !== 'undefined' && window.innerWidth < 640
  const calm = reduced()

  const boyPalette: Palette = {
    skin: '#f3c6a5',
    hair: '#3a2a22',
    shirt: night ? '#6c8cff' : '#5b8def',
    pants: '#39507a',
    shoes: '#2d2d33',
  }
  const girlPalette: Palette = {
    skin: '#f6cfb4',
    hair: '#4a2d33',
    shirt: night ? '#ff8fb4' : '#ff7fae',
    pants: '#c65b86',
    shoes: '#8a3d59',
  }

  return (
    <Canvas
      shadows={!mobile}
      camera={{ position: WIDE, fov: 42 }}
      dpr={[1, mobile ? 1.3 : 1.7]}
      gl={{ antialias: !mobile, alpha: false }}
    >
      {/* Sky background colour (opaque so composite is correct) */}
      <color attach="background" args={[night ? '#1a1030' : '#ffeef5']} />
      <fog attach="fog" args={[night ? '#1a1030' : '#ffeef5', 14, 30]} />

      <ambientLight intensity={night ? 0.9 : 1.3} />
      <directionalLight
        position={[5, 10, 6]}
        intensity={night ? 1.0 : 1.6}
        color={night ? '#cdb6ff' : '#fff2f7'}
        castShadow={!mobile}
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-6, 4, -4]} intensity={0.5} color="#ffd6e6" />

      <CameraRig zoom={zoom} enableParallax={!mobile} />

      <Ground night={night} />
      <SakuraTree night={night} />

      {/* Two characters holding hands, standing under the tree */}
      <BlockyCharacter position={[-0.95, -0.9, 2.1]} facing={1} palette={boyPalette} waveArm={!zoom} />
      <BlockyCharacter position={[0.95, -0.9, 2.1]} facing={-1} palette={girlPalette} waveArm={!zoom} />

      <Petals count={mobile ? 18 : 40} night={night} />

      {!mobile && !calm && (
        <EffectComposer>
          <Bloom intensity={night ? 0.9 : 0.5} luminanceThreshold={night ? 0.35 : 0.6} luminanceSmoothing={0.9} mipmapBlur />
          <DepthOfField focusDistance={0.01} focalLength={zoom ? 0.04 : 0.025} bokehScale={2} />
        </EffectComposer>
      )}
    </Canvas>
  )
}
