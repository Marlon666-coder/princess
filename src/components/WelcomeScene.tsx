import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Float, Sparkles, Environment, Lightformer, SoftShadows } from '@react-three/drei'
import {
  EffectComposer,
  Bloom,
  DepthOfField,
  Vignette,
  N8AO,
  ToneMapping,
  HueSaturation,
  BrightnessContrast,
  SMAA,
} from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Environment3D } from './Environment3D'
import { SeatedCouple } from './SeatedCouple'
import {
  ACESFilmicToneMapping,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  MathUtils,
  Object3D,
  PCFSoftShadowMap,
  RepeatWrapping,
  SRGBColorSpace,
  TubeGeometry,
  Vector3,
  type Group,
  type InstancedMesh,
  type Vector3Tuple,
} from 'three'
import { useTheme } from '../context/ThemeContext'

/* eslint-disable react-hooks/immutability -- mutating the camera and the scene
   graph each frame inside useFrame is the intended react-three-fiber pattern. */
/* eslint-disable react-hooks/purity -- the procedural tree layout (roots,
   branches, blossom clusters, petals) is generated once inside useMemo/lazy
   state; randomised seeds there are intentional and stable for the render. */

const reduced = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/* ----------------------------------------------------------------
   Procedural bark texture — gives the trunk real HD surface detail
   (color + bump) without shipping any image assets.
----------------------------------------------------------------- */
function useBarkTextures(night: boolean) {
  return useMemo(() => {
    const size = 512
    const make = (draw: (ctx: CanvasRenderingContext2D) => void) => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = size
      const ctx = canvas.getContext('2d')!
      draw(ctx)
      const tex = new CanvasTexture(canvas)
      tex.anisotropy = 16
      tex.wrapS = tex.wrapT = RepeatWrapping
      tex.repeat.set(1, 3)
      return tex
    }

    const base = night ? '#3a2630' : '#5c4047'
    const dark = night ? '#231118' : '#3c2a2e'
    const light = night ? '#54343f' : '#7a545c'

    const color = make((ctx) => {
      ctx.fillStyle = base
      ctx.fillRect(0, 0, size, size)
      // subtle vertical gradient for depth
      const grad = ctx.createLinearGradient(0, 0, size, 0)
      grad.addColorStop(0, dark)
      grad.addColorStop(0.5, base)
      grad.addColorStop(1, dark)
      ctx.globalAlpha = 0.3
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, size, size)
      ctx.globalAlpha = 1
      // vertical fibrous streaks
      for (let i = 0; i < 260; i++) {
        const x = Math.random() * size
        const w = 1 + Math.random() * 4
        const h = 40 + Math.random() * 180
        const y = Math.random() * size
        ctx.fillStyle = Math.random() > 0.5 ? dark : light
        ctx.globalAlpha = 0.18 + Math.random() * 0.25
        ctx.fillRect(x, y, w, h)
      }
      // knots / speckles
      ctx.globalAlpha = 0.25
      for (let i = 0; i < 120; i++) {
        ctx.fillStyle = dark
        ctx.beginPath()
        ctx.arc(Math.random() * size, Math.random() * size, 1 + Math.random() * 3, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    })

    // bump/roughness map: grayscale streaks
    const bump = make((ctx) => {
      ctx.fillStyle = '#7f7f7f'
      ctx.fillRect(0, 0, size, size)
      for (let i = 0; i < 320; i++) {
        const x = Math.random() * size
        const w = 1 + Math.random() * 5
        const h = 60 + Math.random() * 220
        const y = Math.random() * size
        const v = Math.random() > 0.5 ? 255 : 0
        ctx.fillStyle = `rgb(${v},${v},${v})`
        ctx.globalAlpha = 0.12 + Math.random() * 0.2
        ctx.fillRect(x, y, w, h)
      }
      ctx.globalAlpha = 1
    })

    color.colorSpace = SRGBColorSpace
    return { color, bump }
  }, [night])
}

/* ----------------------------------------------------------------
   A tapering, slightly curved tube used for trunk / branches / roots
----------------------------------------------------------------- */
function Limb({
  points,
  radiusStart,
  radiusEnd,
  colorMap,
  bumpMap,
  radialSegments = 10,
}: {
  points: Vector3Tuple[]
  radiusStart: number
  radiusEnd: number
  colorMap: CanvasTexture
  bumpMap: CanvasTexture
  radialSegments?: number
}) {
  const geo = useMemo(() => {
    const curve = new CatmullRomCurve3(points.map((p) => new Vector3(...p)))
    // Build a custom tapered tube by sampling the curve.
    const steps = 48
    const tube = new TubeGeometry(curve, steps, radiusStart, radialSegments, false)
    // taper the radius along the length by scaling ring vertices
    const pos = tube.attributes.position
    const tmp = new Vector3()
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const r = MathUtils.lerp(radiusStart, radiusEnd, t) / radiusStart
      // Use getPoint (uniform param) to match TubeGeometry's own sampling so the
      // ring recentering is exact — getPointAt (arc-length) warps the mesh.
      const center = curve.getPoint(Math.min(t, 1))
      for (let j = 0; j <= radialSegments; j++) {
        const idx = i * (radialSegments + 1) + j
        if (idx >= pos.count) continue
        tmp.fromBufferAttribute(pos, idx)
        tmp.sub(center).multiplyScalar(r).add(center)
        pos.setXYZ(idx, tmp.x, tmp.y, tmp.z)
      }
    }
    pos.needsUpdate = true
    tube.computeVertexNormals()
    return tube
  }, [points, radiusStart, radiusEnd, radialSegments])

  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshStandardMaterial
        map={colorMap}
        bumpMap={bumpMap}
        bumpScale={0.15}
        roughnessMap={bumpMap}
        roughness={1}
        metalness={0}
        envMapIntensity={0.25}
      />
    </mesh>
  )
}

/* ----------------------------------------------------------------
   The majestic Yggdrasil — towering trunk, flared roots, branching
   limbs, and a vast multi-layer blossom canopy.
----------------------------------------------------------------- */
function Yggdrasil({ night, quality }: { night: boolean; quality: 'high' | 'low' }) {
  const { color, bump } = useBarkTextures(night)

  const blossom = useMemo(
    () => ({
      a: new Color(night ? '#f29ebd' : '#ffb0cd'),
      b: new Color(night ? '#e07ba6' : '#ff93bb'),
      c: new Color(night ? '#ffd3e2' : '#ffe2ee'),
    }),
    [night],
  )

  // Trunk core path (slightly sinuous, very tall)
  const trunk: Vector3Tuple[] = [
    [0, -2, 0],
    [0.2, 4, 0.3],
    [-0.3, 10, -0.2],
    [0.25, 16, 0.2],
    [0, 21, 0],
  ]

  // Flared roots radiating outward
  const roots = useMemo(() => {
    const out: Vector3Tuple[][] = []
    const n = quality === 'high' ? 7 : 5
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.3
      const r = 3.6
      out.push([
        [0, 0.5, 0],
        [Math.cos(a) * 1.4, -1.2, Math.sin(a) * 1.4],
        [Math.cos(a) * r, -2.2, Math.sin(a) * r],
        [Math.cos(a) * (r + 1.6), -2.6, Math.sin(a) * (r + 1.6)],
      ])
    }
    return out
  }, [quality])

  // Big branches splitting off high up
  const branches = useMemo(() => {
    const out: { pts: Vector3Tuple[]; canopy: Vector3Tuple; size: number }[] = []
    const defs = [
      { base: [0, 13, 0], dir: [1, 0.5, 0.2] },
      { base: [0, 14.5, 0], dir: [-0.9, 0.6, 0.3] },
      { base: [0, 16, 0], dir: [0.3, 0.7, -0.9] },
      { base: [0, 15, 0], dir: [-0.4, 0.5, -0.8] },
      { base: [0, 17.5, 0], dir: [0.7, 0.6, 0.6] },
      { base: [0, 18.5, 0], dir: [0, 0.9, 0] },
    ]
    const use = quality === 'high' ? defs : defs.slice(0, 4)
    for (const d of use) {
      const b = new Vector3(...(d.base as Vector3Tuple))
      const dir = new Vector3(...(d.dir as Vector3Tuple)).normalize()
      const mid = b.clone().add(dir.clone().multiplyScalar(3))
      const tip = b.clone().add(dir.clone().multiplyScalar(6))
      out.push({
        pts: [[b.x, b.y, b.z], [mid.x, mid.y, mid.z], [tip.x, tip.y, tip.z]],
        canopy: [tip.x, tip.y, tip.z],
        size: 2.4 + Math.random() * 1.2,
      })
    }
    return out
  }, [quality])

  // Canopy blossom clusters (crown + per-branch)
  const clusters = useMemo(() => {
    const out: { pos: Vector3Tuple; scale: number; color: Color }[] = []
    const addCluster = (cx: number, cy: number, cz: number, spread: number, puffs: number, scale: number) => {
      for (let i = 0; i < puffs; i++) {
        const u = Math.random()
        const v = Math.random()
        const theta = u * Math.PI * 2
        const phi = Math.acos(2 * v - 1)
        const rr = spread * Math.cbrt(Math.random())
        out.push({
          pos: [
            cx + rr * Math.sin(phi) * Math.cos(theta),
            cy + rr * Math.cos(phi) * 0.8,
            cz + rr * Math.sin(phi) * Math.sin(theta),
          ],
          scale: scale * (0.7 + Math.random() * 0.7),
          color: [blossom.a, blossom.b, blossom.c][i % 3],
        })
      }
    }
    const density = quality === 'high' ? 1 : 0.5
    // vast, full crown built from several overlapping domes
    addCluster(0, 21, 0, 6.0, Math.round(110 * density), 1.6)
    addCluster(0, 19.5, 0, 6.8, Math.round(90 * density), 1.9)
    addCluster(0, 22.5, 0, 4.4, Math.round(60 * density), 1.4)
    addCluster(-3, 20, 1, 4.0, Math.round(45 * density), 1.5)
    addCluster(3, 20.5, -1, 4.0, Math.round(45 * density), 1.5)
    // per-branch tufts
    for (const br of branches) {
      addCluster(br.canopy[0], br.canopy[1], br.canopy[2], br.size, Math.round(40 * density), 1.25)
    }
    return out
  }, [branches, blossom, quality])

  const canopyRef = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (reduced() || !canopyRef.current) return
    canopyRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.08) * 0.03
  })

  return (
    <group>
      {/* roots */}
      {roots.map((pts, i) => (
        <Limb key={`root-${i}`} points={pts} radiusStart={0.9} radiusEnd={0.1} colorMap={color} bumpMap={bump} />
      ))}
      {/* trunk */}
      <Limb points={trunk} radiusStart={1.9} radiusEnd={0.5} colorMap={color} bumpMap={bump} radialSegments={14} />
      {/* branches */}
      {branches.map((br, i) => (
        <Limb key={`br-${i}`} points={br.pts} radiusStart={0.55} radiusEnd={0.12} colorMap={color} bumpMap={bump} />
      ))}
      {/* canopy */}
      <Float speed={reduced() ? 0 : 0.6} rotationIntensity={0.04} floatIntensity={0.3}>
        <group ref={canopyRef}>
          {clusters.map((c, i) => (
            <mesh key={i} position={c.pos} scale={c.scale} castShadow>
              <icosahedronGeometry args={[1, quality === 'high' ? 2 : 1]} />
              <meshStandardMaterial
                color={c.color}
                emissive={c.color}
                emissiveIntensity={night ? 0.5 : 0.22}
                roughness={0.6}
                metalness={0}
                envMapIntensity={0.8}
                flatShading
              />
            </mesh>
          ))}
        </group>
      </Float>
      {/* glow orb at the heart of the canopy for a mythic feel */}
      <pointLight position={[0, 20, 0]} intensity={night ? 2.2 : 1.1} distance={16} color={night ? '#ffc0dd' : '#fff0f6'} />
    </group>
  )
}

/* ----------------------------------------------------------------
   Falling petals
----------------------------------------------------------------- */
function makePetalSeeds(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    x: -10 + Math.random() * 20,
    y: Math.random() * 22,
    z: -6 + Math.random() * 12,
    speed: 0.6 + Math.random() * 1.1,
    drift: 0.2 + Math.random() * 0.6,
    phase: i * 0.6,
    scale: 0.07 + Math.random() * 0.1,
  }))
}

function Petals({ count, night }: { count: number; night: boolean }) {
  const group = useRef<Group>(null)
  const [seeds] = useState(() => makePetalSeeds(count))
  useFrame(({ clock }, delta) => {
    group.current?.children.forEach((child, i) => {
      const s = seeds[i]
      child.position.y -= s.speed * delta
      child.position.x += Math.sin(clock.elapsedTime * 0.6 + s.phase) * delta * s.drift
      child.rotation.x += delta * 1.2
      child.rotation.z += delta * 0.8
      if (child.position.y < -2) {
        child.position.y = 22
        child.position.x = -10 + Math.random() * 20
      }
    })
  })
  return (
    <group ref={group}>
      {seeds.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]} scale={s.scale}>
          <boxGeometry args={[1, 0.22, 1.3]} />
          <meshStandardMaterial color={night ? '#ffc4da' : '#ff9ec2'} emissive={night ? '#ff9ebb' : '#ff7fae'} emissiveIntensity={night ? 0.5 : 0.28} transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/* ----------------------------------------------------------------
   Volumetric-style light shafts streaming down through the canopy —
   cheap additive cones that fake god rays for a cinematic UE-ish feel.
----------------------------------------------------------------- */
function LightShafts({ night }: { night: boolean }) {
  const shafts = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2 + 0.4
        return { x: Math.cos(a) * 4, z: Math.sin(a) * 4, rot: (Math.random() - 0.5) * 0.18, h: 10 + Math.random() * 3 }
      }),
    [],
  )
  const baseOpacity = night ? 0.1 : 0.06
  const group = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (reduced() || !group.current) return
    const t = clock.elapsedTime
    group.current.children.forEach((c, i) => {
      const m = c as unknown as { material?: { opacity?: number } }
      if (m.material) m.material.opacity = baseOpacity + Math.sin(t * 0.5 + i) * 0.02
    })
  })
  // Shafts live high up near the canopy only, angled outward, so they read as
  // light breaking through the blossoms — never over the trunk.
  return (
    <group ref={group} position={[0, 17, 0]}>
      {shafts.map((s, i) => (
        <mesh key={i} position={[s.x, 0, s.z]} rotation={[0, 0, s.rot]}>
          <coneGeometry args={[1.6, s.h, 14, 1, true]} />
          <meshBasicMaterial
            color={night ? '#ffc6e2' : '#fff4da'}
            transparent
            opacity={baseOpacity}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

/* ----------------------------------------------------------------
   Short instanced meadow grass. Hundreds of blades render in one draw call,
   leaving a clear seating area around the characters.
----------------------------------------------------------------- */
const seeded = (index: number, salt: number) => {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453
  return value - Math.floor(value)
}

function GrassTufts({ night, count }: { night: boolean; count: number }) {
  const grass = useRef<InstancedMesh>(null)
  const blades = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => {
        const angle = seeded(index, 1) * Math.PI * 2
        const radius = 3.3 + Math.pow(seeded(index, 2), 0.6) * 58
        return {
          x: Math.cos(angle) * radius,
          z: Math.sin(angle) * radius - 4,
          height: 0.28 + seeded(index, 3) * 0.62,
          rotation: seeded(index, 4) * Math.PI,
          lean: (seeded(index, 5) - 0.5) * 0.28,
          tone: index % 3,
        }
      }),
    [count],
  )

  useLayoutEffect(() => {
    if (!grass.current) return
    const dummy = new Object3D()
    const colors = night ? ['#315f42', '#3d7350', '#294e38'] : ['#579447', '#6aaa52', '#447e3c']
    blades.forEach((blade, index) => {
      dummy.position.set(blade.x, -2.6 + blade.height / 2, blade.z)
      dummy.rotation.set(blade.lean, blade.rotation, blade.lean * 0.45)
      dummy.scale.set(0.85, blade.height, 0.85)
      dummy.updateMatrix()
      grass.current?.setMatrixAt(index, dummy.matrix)
      grass.current?.setColorAt(index, new Color(colors[blade.tone]))
    })
    grass.current.instanceMatrix.needsUpdate = true
    // setColorAt allocates instanceColor; flag it so the colours actually show
    if (grass.current.instanceColor) grass.current.instanceColor.needsUpdate = true
  }, [blades, night])

  return (
    <instancedMesh ref={grass} args={[undefined, undefined, count]} castShadow receiveShadow>
      <coneGeometry args={[0.055, 1, 3]} />
      {/* base color (no vertexColors) — instanceColor tints per blade, and this
          guarantees a green fallback instead of black if colours lag a frame */}
      <meshStandardMaterial color={night ? '#3d7350' : '#6aaa52'} roughness={0.96} />
    </instancedMesh>
  )
}

/* ----------------------------------------------------------------
   A flower field in three instanced draw calls: stems, coloured blossoms and
   golden centres. The clearing around the seated couple stays unobstructed.
----------------------------------------------------------------- */
function FlowerField({ night, count }: { night: boolean; count: number }) {
  const stems = useRef<InstancedMesh>(null)
  const blossoms = useRef<InstancedMesh>(null)
  const centres = useRef<InstancedMesh>(null)
  const flowers = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => {
        const angle = seeded(index, 11) * Math.PI * 2
        const radius = 3.5 + Math.pow(seeded(index, 12), 0.62) * 42
        let x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius - 3
        // Keep the couple and visible roots clear of intersecting flowers.
        if (Math.abs(x) < 2.4 && z > 0.2 && z < 5.2) x += x < 0 ? -2.8 : 2.8
        return {
          x,
          z,
          height: 0.32 + seeded(index, 13) * 0.55,
          scale: 0.75 + seeded(index, 14) * 0.75,
          tone: index % 5,
        }
      }),
    [count],
  )

  useLayoutEffect(() => {
    if (!stems.current || !blossoms.current || !centres.current) return
    const dummy = new Object3D()
    const palette = night
      ? ['#ff8fbd', '#d8b2ff', '#fff0f7', '#89b8ff', '#ffd083']
      : ['#f06f9f', '#ffb1cc', '#fff4f7', '#b99be8', '#f5c45f']

    flowers.forEach((flower, index) => {
      dummy.position.set(flower.x, -2.6 + flower.height / 2, flower.z)
      dummy.rotation.set(0, seeded(index, 15) * Math.PI, 0)
      dummy.scale.set(1, flower.height, 1)
      dummy.updateMatrix()
      stems.current?.setMatrixAt(index, dummy.matrix)

      dummy.position.set(flower.x, -2.6 + flower.height, flower.z)
      dummy.rotation.set(0, seeded(index, 16) * Math.PI, 0)
      dummy.scale.set(flower.scale, flower.scale * 0.58, flower.scale)
      dummy.updateMatrix()
      blossoms.current?.setMatrixAt(index, dummy.matrix)
      blossoms.current?.setColorAt(index, new Color(palette[flower.tone]))

      dummy.position.set(flower.x, -2.6 + flower.height + 0.015, flower.z + 0.07)
      dummy.scale.setScalar(0.72 * flower.scale)
      dummy.updateMatrix()
      centres.current?.setMatrixAt(index, dummy.matrix)
    })

    ;[stems.current, blossoms.current, centres.current].forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    })
  }, [flowers, night])

  return (
    <group>
      <instancedMesh ref={stems} args={[undefined, undefined, count]}>
        <cylinderGeometry args={[0.018, 0.026, 1, 5]} />
        <meshStandardMaterial color={night ? '#39704a' : '#4b923f'} roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={blossoms} args={[undefined, undefined, count]} castShadow>
        <icosahedronGeometry args={[0.13, 1]} />
        {/* base color (no vertexColors) so blossoms are never black; instanceColor
            tints each one pink/white/violet/etc. */}
        <meshStandardMaterial color={night ? '#ff8fbd' : '#f06f9f'} roughness={0.7} emissive={night ? '#301328' : '#1a050b'} emissiveIntensity={night ? 0.32 : 0.08} />
      </instancedMesh>
      <instancedMesh ref={centres} args={[undefined, undefined, count]}>
        <sphereGeometry args={[0.045, 6, 4]} />
        <meshStandardMaterial color="#ffd267" emissive="#ffbd45" emissiveIntensity={0.35} roughness={0.6} />
      </instancedMesh>
    </group>
  )
}

function CoupleSpotlight({ night, mobile }: { night: boolean; mobile: boolean }) {
  const target = useMemo(() => {
    const object = new Object3D()
    object.position.set(0, -0.55, 2.75)
    return object
  }, [])

  return (
    <>
      <primitive object={target} />
      <spotLight
        position={[-11, 15, 11]}
        target={target}
        color={night ? '#d8c7ff' : '#ffd28c'}
        intensity={night ? 85 : 150}
        distance={48}
        angle={0.3}
        penumbra={0.82}
        decay={1.55}
        castShadow={!mobile}
        shadow-mapSize={[mobile ? 512 : 1024, mobile ? 512 : 1024]}
        shadow-bias={-0.0002}
      />
      <pointLight position={[0, 1.2, 5.2]} intensity={night ? 5 : 3.5} distance={10} color={night ? '#b8a5ff' : '#ffc77b'} />
    </>
  )
}

/* ----------------------------------------------------------------
   Camera rig — wide establishing shot of the whole tree, easing to a
   close zoom when `zoom` turns true.
----------------------------------------------------------------- */
// Wide shot: far back + higher so the whole towering tree reads against the
// sky, sun, clouds and distant mountains.
const WIDE: Vector3Tuple = [2, 11, 44]
// On mobile (narrow/tall), pull back a lot more and raise the camera so the
// tree isn't cramped against the edges of the screen.
const WIDE_MOBILE: Vector3Tuple = [0, 13, 62]
// On enter, glide down toward the seated couple and the sunlit base of the tree.
const CLOSE: Vector3Tuple = [0.1, 0.5, 10]
const CLOSE_MOBILE: Vector3Tuple = [0.1, 1.35, 15]
const LOOK_WIDE: Vector3Tuple = [0, 9, 0]
const LOOK_CLOSE: Vector3Tuple = [0, -0.55, 2.75]

function CameraRig({ zoom, enableParallax, mobile }: { zoom: boolean; enableParallax: boolean; mobile: boolean }) {
  const { camera, mouse } = useThree()
  const look = useRef<Vector3Tuple>([...LOOK_WIDE])
  useFrame((_, delta) => {
    const wide = mobile ? WIDE_MOBILE : WIDE
    const close = mobile ? CLOSE_MOBILE : CLOSE
    const target = zoom ? close : wide
    const lookTarget = zoom ? LOOK_CLOSE : LOOK_WIDE
    const ease = 1 - Math.pow(zoom ? 0.02 : 0.05, delta)
    const px = enableParallax && !zoom ? mouse.x * 1.2 : 0
    const py = enableParallax && !zoom ? mouse.y * 0.7 : 0
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
   Full scene
----------------------------------------------------------------- */
export function WelcomeScene({ zoom }: { zoom: boolean }) {
  const { theme } = useTheme()
  const night = theme === 'night'
  const mobile = typeof window !== 'undefined' && window.innerWidth < 640
  const calm = reduced()
  const quality: 'high' | 'low' = mobile ? 'low' : 'high'

  // Warm golden-hour haze by day; deep indigo by night.
  const sky = night ? '#2a1a3a' : '#ffb27a'

  return (
    <Canvas
      shadows={!mobile ? { type: PCFSoftShadowMap } : false}
      camera={{ position: mobile ? WIDE_MOBILE : WIDE, fov: mobile ? 56 : 42 }}
      dpr={[1, mobile ? 1.5 : 2]}
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: night ? 1.0 : 0.95,
      }}
    >
      {/* Sky (in Environment3D) paints the background; light warm haze only in
          the far distance so the scene stays clear, not washed-out white. */}
      <fog attach="fog" args={[sky, 90, 200]} />

      <Environment3D night={night} mobile={mobile} />

      {/* Percentage-closer soft shadows for realistic contact softening */}
      {!mobile && <SoftShadows size={28} samples={12} focus={0.9} />}

      {/* HDRI-style image-based lighting via in-scene lightformers (no network) */}
      <Environment resolution={mobile ? 128 : 256} frames={1}>
        <color attach="background" args={[night ? '#1a1030' : '#ffe9f2']} />
        <Lightformer form="rect" intensity={night ? 0.8 : 2.4} position={[0, 14, 10]} scale={[18, 10, 1]} color={night ? '#c9b0ff' : '#ffd79a'} />
        <Lightformer form="circle" intensity={night ? 0.5 : 1.4} position={[-10, 7, -6]} scale={10} color={night ? '#b79bff' : '#ff9e5c'} />
        <Lightformer form="circle" intensity={night ? 0.6 : 0.9} position={[10, 5, 4]} scale={8} color={night ? '#8fb0ff' : '#ffc78a'} />
        <Lightformer form="ring" intensity={night ? 1.2 : 0.7} position={[0, 20, 2]} scale={6} color={night ? '#ffc0dd' : '#ffe6c2'} />
      </Environment>

      <ambientLight intensity={night ? 0.35 : 0.55} />
      {/* key sun light — warm golden-hour from the low sun (left), soft shadows */}
      <directionalLight
        position={[-24, 14, -20]}
        intensity={night ? 1.1 : 3}
        color={night ? '#b79bff' : '#ff9e4d'}
        castShadow={!mobile}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={34}
        shadow-camera-bottom={-12}
      />
      {/* warm sky fill + cool rim so forms read against the sunset */}
      <directionalLight position={[12, 10, 8]} intensity={night ? 0.5 : 1} color={night ? '#7d6aff' : '#ffd9a0'} />
      <hemisphereLight intensity={night ? 0.3 : 0.6} color={night ? '#5b4a8a' : '#ffcf9e'} groundColor={night ? '#1a1030' : '#caa07a'} />

      <CameraRig zoom={zoom} enableParallax={!mobile} mobile={mobile} />

      {/* vast grass meadow stretching to the mountains */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.6, -20]} receiveShadow>
        <planeGeometry args={[400, 260]} />
        <meshStandardMaterial color={night ? '#1e3328' : '#7bbf5e'} roughness={1} metalness={0} envMapIntensity={0.2} />
      </mesh>
      {/* a slightly darker nearer band so the foreground meadow reads with depth */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.58, 12]} receiveShadow>
        <circleGeometry args={[34, 64]} />
        <meshStandardMaterial color={night ? '#24402f' : '#6cb152'} roughness={1} metalness={0} envMapIntensity={0.2} />
      </mesh>
      {!mobile && (
        <ContactShadows position={[0, -2.55, 0]} opacity={night ? 0.5 : 0.4} scale={30} blur={2.4} far={8} resolution={1024} color={night ? '#000010' : '#2f5a32'} />
      )}

      <GrassTufts night={night} count={mobile ? 280 : 700} />
      <FlowerField night={night} count={mobile ? 90 : 240} />

      <Yggdrasil night={night} quality={quality} />

      {/* Pixel/block 2.5D couple sitting and leaning against the trunk. */}
      <SeatedCouple position={[0, -1.95, 2.75]} />
      <CoupleSpotlight night={night} mobile={mobile} />
      {/* Cheap grounding shadow still works when mobile real-time shadows are off. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.565, 3.05]} scale={[1.45, 0.62, 1]}>
        <circleGeometry args={[2.35, 32]} />
        <meshBasicMaterial color={night ? '#09060d' : '#3d562f'} transparent opacity={night ? 0.4 : 0.2} depthWrite={false} />
      </mesh>

      {!calm && <LightShafts night={night} />}

      <Petals count={mobile ? 22 : 55} night={night} />
      {!calm && <Sparkles count={mobile ? 30 : 80} scale={[22, 24, 14]} position={[0, 10, 0]} size={night ? 4 : 2.5} speed={0.3} color={night ? '#ffd0e6' : '#ffffff'} opacity={night ? 0.9 : 0.6} />}

      {!mobile && !calm && (
        <EffectComposer multisampling={0} enableNormalPass>
          {/* ambient occlusion — deep, soft contact shadows in crevices (the
              single biggest contributor to a "rendered game" look) */}
          <N8AO aoRadius={3} distanceFalloff={1} intensity={night ? 2.4 : 1.8} quality="high" halfRes color={night ? '#0a0414' : '#5a3348'} />
          <Bloom intensity={night ? 1.0 : 0.5} luminanceThreshold={night ? 0.35 : 0.82} luminanceSmoothing={0.9} mipmapBlur radius={0.65} />
          <DepthOfField focusDistance={zoom ? 0.004 : 0.02} focalLength={zoom ? 0.025 : 0.03} bokehScale={zoom ? 1.2 : 2.5} />
          {/* filmic color grading */}
          <HueSaturation saturation={night ? 0.08 : 0.14} hue={0} />
          <BrightnessContrast brightness={night ? 0 : -0.06} contrast={0.12} />
          <Vignette eskil={false} offset={0.22} darkness={night ? 0.72 : 0.42} />
          {/* ACES tonemap pass + SMAA anti-aliasing (crisp edges) */}
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <SMAA />
        </EffectComposer>
      )}
    </Canvas>
  )
}
