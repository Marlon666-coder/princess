import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import { EffectComposer, Bloom, DepthOfField } from '@react-three/postprocessing'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Shape, type Group } from 'three'

/* eslint-disable react-hooks/set-state-in-effect -- WebGL/reduced-motion support
   can only be detected on the client, so it is set from an effect after mount. */

type PetalSeed = { x: number; y: number; z: number; speed: number; phase: number; scale: number; spin: number }

const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** A real cherry-blossom petal outline (notched tip) extruded with soft depth. */
function usePetalShape() {
  return useMemo(() => {
    const shape = new Shape()
    shape.moveTo(0, -0.5)
    shape.bezierCurveTo(0.42, -0.35, 0.5, 0.25, 0.14, 0.52)
    shape.bezierCurveTo(0.06, 0.58, 0.04, 0.62, 0, 0.5)
    shape.bezierCurveTo(-0.04, 0.62, -0.06, 0.58, -0.14, 0.52)
    shape.bezierCurveTo(-0.5, 0.25, -0.42, -0.35, 0, -0.5)
    return shape
  }, [])
}

function makePetals(count: number): PetalSeed[] {
  return Array.from({ length: count }, (_, index) => ({
    x: -8 + Math.random() * 16,
    y: -5 + Math.random() * 14,
    z: -3 + Math.random() * 7,
    speed: 0.12 + Math.random() * 0.22,
    phase: index * 0.73,
    scale: 0.18 + Math.random() * 0.22,
    spin: 0.2 + Math.random() * 0.5,
  }))
}

function PetalField({ count }: { count: number }) {
  const group = useRef<Group>(null)
  const shape = usePetalShape()
  // Seeds are generated once, lazily, so re-renders never shuffle the petals.
  const [petals] = useState<PetalSeed[]>(() => makePetals(count))
  useFrame(({ clock }, delta) => {
    group.current?.children.forEach((object, index) => {
      const seed = petals[index]
      object.position.y -= seed.speed * delta
      object.position.x += Math.sin(clock.elapsedTime * 0.55 + seed.phase) * delta * 0.09
      object.rotation.x += delta * 0.35 * seed.spin
      object.rotation.z += delta * 0.2 * seed.spin
      object.rotation.y += delta * 0.3 * seed.spin
      if (object.position.y < -5) object.position.set(-8 + Math.random() * 16, 8, seed.z)
    })
  })
  return (
    <group ref={group}>
      {petals.map((petal, index) => (
        <mesh
          key={index}
          position={[petal.x, petal.y, petal.z]}
          rotation={[petal.phase, petal.phase * 0.5, petal.phase]}
          scale={petal.scale}
        >
          <extrudeGeometry
            args={[shape, { depth: 0.06, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2, steps: 1 }]}
          />
          <meshStandardMaterial
            color={index % 3 ? '#f7a8c0' : '#ffd6e0'}
            emissive={index % 3 ? '#e06a90' : '#ffb4c8'}
            emissiveIntensity={0.35}
            roughness={0.55}
            metalness={0.05}
            transparent
            opacity={0.82}
          />
        </mesh>
      ))}
    </group>
  )
}

function SakuraBranches() {
  return (
    <group position={[5.6, 3.8, -1.5]} rotation={[0, 0, -0.7]}>
      <mesh>
        <cylinderGeometry args={[0.12, 0.28, 5, 8]} />
        <meshStandardMaterial color="#6f4650" roughness={0.9} />
      </mesh>
      {Array.from({ length: 12 }, (_, index) => {
        const angle = index * 1.7
        return (
          <group key={index} position={[Math.sin(angle) * 0.55, index * 0.25 - 1.3, Math.cos(angle) * 0.35]}>
            <mesh scale={[0.24, 0.12, 0.28]}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshStandardMaterial
                color={index % 2 ? '#f4a4bb' : '#ffd0dc'}
                emissive="#f08cae"
                emissiveIntensity={0.25}
              />
            </mesh>
            <mesh position={[0.27, 0.05, 0.04]} scale={[0.18, 0.09, 0.22]}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshStandardMaterial color="#f7b2c5" emissive="#f08cae" emissiveIntensity={0.2} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

/**
 * SceneBackdrop — a full-screen soft pink gradient rendered INSIDE the WebGL scene.
 * This is essential: once an EffectComposer is active the canvas is no longer
 * transparent, so without this the composer composites over opaque black. Drawing
 * the romantic gradient in-scene lets bloom/DOF/vignette sit on top of pink.
 */
function SceneBackdrop() {
  const { viewport } = useThree()
  return (
    <mesh position={[0, 0, -6]} scale={[viewport.width * 3, viewport.height * 3, 1]}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial
        depthWrite={false}
        uniforms={{
          top: { value: [1.0, 0.956, 0.976] }, // #fff4f9
          mid: { value: [0.992, 0.862, 0.905] }, // #fddde7
          bottom: { value: [0.976, 0.929, 0.976] }, // #f9edf9
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec2 vUv;
          uniform vec3 top;
          uniform vec3 mid;
          uniform vec3 bottom;
          void main() {
            vec3 color = vUv.y > 0.5
              ? mix(mid, top, (vUv.y - 0.5) * 2.0)
              : mix(bottom, mid, vUv.y * 2.0);
            gl_FragColor = vec4(color, 1.0);
          }
        `}
      />
    </mesh>
  )
}

/** Smoothly eases the camera toward the pointer for a parallax/sinematik feel. */
function ParallaxRig({ enabled }: { enabled: boolean }) {
  const { camera, mouse } = useThree()
  /* eslint-disable react-hooks/immutability -- mutating the camera each frame is
     the intended react-three-fiber pattern for an animated/parallax rig. */
  useFrame(() => {
    if (!enabled) return
    camera.position.x += (mouse.x * 1.1 - camera.position.x) * 0.04
    camera.position.y += (mouse.y * 0.7 - camera.position.y) * 0.04
    camera.lookAt(0, 0, 0)
  })
  /* eslint-enable react-hooks/immutability */
  return null
}

/** Pauses the render loop when the browser tab is hidden to save battery/GPU. */
function useDocumentVisible() {
  const [visible, setVisible] = useState(() => (typeof document === 'undefined' ? true : !document.hidden))
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])
  return visible
}

function CssCanvasFallback({ dense }: { dense: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    let animation = 0
    const count = innerWidth < 640 ? 14 : dense ? 36 : 22
    const petals = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      size: 4 + Math.random() * 7,
      speed: 0.2 + Math.random() * 0.5,
      phase: i * 0.7,
    }))
    const resize = () => {
      const ratio = Math.min(devicePixelRatio, 2)
      canvas.width = innerWidth * ratio
      canvas.height = innerHeight * ratio
      canvas.style.width = `${innerWidth}px`
      canvas.style.height = `${innerHeight}px`
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }
    const draw = (time: number) => {
      context.clearRect(0, 0, innerWidth, innerHeight)
      petals.forEach((p) => {
        p.y += p.speed
        p.x += Math.sin(time / 900 + p.phase) * 0.2
        if (p.y > innerHeight + 10) p.y = -10
        context.save()
        context.translate(p.x, p.y)
        context.rotate(Math.sin(time / 700 + p.phase))
        context.fillStyle = 'rgba(242,143,173,.55)'
        context.beginPath()
        context.ellipse(0, 0, p.size, p.size / 2.4, 0.5, 0, Math.PI * 2)
        context.fill()
        context.restore()
      })
      animation = requestAnimationFrame(draw)
    }
    resize()
    addEventListener('resize', resize)
    if (!prefersReducedMotion()) animation = requestAnimationFrame(draw)
    else draw(0)
    return () => {
      removeEventListener('resize', resize)
      cancelAnimationFrame(animation)
    }
  }, [dense])
  return <canvas ref={canvasRef} className="sakura-canvas" aria-hidden="true" />
}

export function SakuraBackground({ dense = false }: { dense?: boolean }) {
  const [webgl, setWebgl] = useState(false)
  const [reduced, setReduced] = useState(false)
  const visible = useDocumentVisible()

  useEffect(() => {
    setReduced(prefersReducedMotion())
    try {
      const canvas = document.createElement('canvas')
      setWebgl(Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl')))
    } catch {
      setWebgl(false)
    }
  }, [])

  // On low-capability devices or reduced-motion, keep the lightweight 2D fallback.
  if (!webgl || reduced) return <CssCanvasFallback dense={dense} />

  const mobile = typeof window !== 'undefined' && innerWidth < 640
  const petalCount = mobile ? 16 : dense ? 42 : 25

  return (
    <div className="sakura-canvas" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 48 }}
        dpr={[1, mobile ? 1.25 : 1.6]}
        frameloop={visible ? 'always' : 'never'}
        gl={{ alpha: true, antialias: !mobile }}
      >
        {/* In-scene pink gradient so post-processing composites over pink, not black. */}
        <SceneBackdrop />
        <ambientLight intensity={1.6} />
        <directionalLight position={[3, 5, 6]} intensity={1.4} color="#fff2f7" />
        <pointLight position={[-4, -2, 4]} intensity={0.7} color="#ffd6e6" />
        <ParallaxRig enabled={!mobile} />
        <Float speed={0.35} rotationIntensity={0.08} floatIntensity={0.1}>
          <SakuraBranches />
        </Float>
        <PetalField count={petalCount} />
        {/* Gentle bloom only — tuned to glow the petals without darkening the scene. */}
        {!mobile && (
          <EffectComposer>
            <Bloom intensity={0.55} luminanceThreshold={0.6} luminanceSmoothing={0.9} mipmapBlur radius={0.6} />
            <DepthOfField focusDistance={0.015} focalLength={0.06} bokehScale={1.8} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  )
}
