import { useFrame } from '@react-three/fiber'
import { useRef, type ReactNode } from 'react'
import type { Group, Vector3Tuple } from 'three'

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

type BlockProps = {
  position: Vector3Tuple
  size: Vector3Tuple
  color: string
  rotation?: Vector3Tuple
  outline?: boolean
  emissive?: string
  children?: ReactNode
}

/** A thin, outlined box. From the front it reads like pixel art, while its
 * physical depth, lighting and shadows make it 2.5D. */
function PixelBlock({
  position,
  size,
  color,
  rotation = [0, 0, 0],
  outline = true,
  emissive = '#000000',
  children,
}: BlockProps) {
  const outlineSize: Vector3Tuple = [size[0] + 0.1, size[1] + 0.1, size[2] + 0.025]
  return (
    <group position={position} rotation={rotation}>
      {outline && (
        <mesh position={[0, 0, -0.045]} castShadow>
          <boxGeometry args={outlineSize} />
          <meshStandardMaterial color="#17141a" roughness={0.92} />
        </mesh>
      )}
      <mesh position={[0, 0, 0.025]} castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={emissive === '#000000' ? 0 : 0.12}
          roughness={0.72}
          metalness={0.02}
        />
      </mesh>
      {children}
    </group>
  )
}

function PixelFace({ feminine = false }: { feminine?: boolean }) {
  return (
    <group position={[0, 0, 0.33]}>
      <PixelBlock position={[-0.31, 0.1, 0]} size={[0.15, 0.3, 0.05]} color="#201b22" outline={false} />
      <PixelBlock position={[0.31, 0.1, 0]} size={[0.15, 0.3, 0.05]} color="#201b22" outline={false} />
      <PixelBlock position={[0, -0.28, 0]} size={[0.34, 0.1, 0.05]} color={feminine ? '#9a4a62' : '#65483f'} outline={false} />
      {feminine && (
        <>
          <PixelBlock position={[-0.49, -0.12, -0.005]} size={[0.18, 0.1, 0.04]} color="#f18fae" outline={false} />
          <PixelBlock position={[0.49, -0.12, -0.005]} size={[0.18, 0.1, 0.04]} color="#f18fae" outline={false} />
        </>
      )}
    </group>
  )
}

function SeatedBoy() {
  return (
    <group rotation={[0.05, 0.08, -0.07]}>
      {/* head + pixel hair layers, based on the supplied reference */}
      <PixelBlock position={[0, 2.72, 0]} size={[1.38, 1.35, 0.58]} color="#b99477">
        <PixelFace />
      </PixelBlock>
      <PixelBlock position={[0, 3.34, 0.02]} size={[1.48, 0.42, 0.64]} color="#171519" />
      <PixelBlock position={[-0.58, 2.97, 0.02]} size={[0.32, 0.72, 0.64]} color="#171519" />
      <PixelBlock position={[0.55, 3.03, 0.02]} size={[0.38, 0.62, 0.64]} color="#171519" />
      <PixelBlock position={[-0.26, 3.48, 0.02]} size={[0.75, 0.22, 0.64]} color="#201d21" />

      {/* black shirt with charcoal highlight so it remains readable */}
      <PixelBlock position={[0, 1.53, 0]} size={[1.25, 1.35, 0.56]} color="#1b1d22" />
      <PixelBlock position={[0, 1.76, 0.33]} size={[0.34, 0.34, 0.06]} color="#343942" outline={false} />
      <PixelBlock position={[-0.77, 1.55, 0]} size={[0.35, 1.16, 0.5]} color="#202329" rotation={[0, 0, -0.14]} />

      {/* inside arm reaches gently toward the princess */}
      <PixelBlock position={[0.76, 1.48, 0.08]} size={[0.36, 1.05, 0.46]} color="#202329" rotation={[0, 0, -0.7]} />
      <PixelBlock position={[1.05, 1.06, 0.1]} size={[0.34, 0.34, 0.46]} color="#b99477" />

      {/* seated, bent legs */}
      <PixelBlock position={[-0.36, 0.55, 0.12]} size={[0.45, 1.05, 0.5]} color="#252930" rotation={[0, 0, -0.52]} />
      <PixelBlock position={[0.3, 0.53, 0.12]} size={[0.45, 1.05, 0.5]} color="#252930" rotation={[0, 0, 0.48]} />
      <PixelBlock position={[-0.63, -0.04, 0.2]} size={[0.42, 0.88, 0.48]} color="#16191e" rotation={[0, 0, 0.08]} />
      <PixelBlock position={[0.57, -0.05, 0.2]} size={[0.42, 0.88, 0.48]} color="#16191e" rotation={[0, 0, -0.08]} />
      <PixelBlock position={[-0.65, -0.51, 0.28]} size={[0.58, 0.3, 0.78]} color="#111318" />
      <PixelBlock position={[0.6, -0.52, 0.28]} size={[0.58, 0.3, 0.78]} color="#111318" />
    </group>
  )
}

function PrincessCrown() {
  return (
    <group position={[0, 3.98, 0.04]}>
      <PixelBlock position={[0, -0.14, 0]} size={[0.9, 0.25, 0.46]} color="#f6c85f" emissive="#f6c85f" />
      <PixelBlock position={[-0.32, 0.12, 0]} size={[0.22, 0.42, 0.4]} color="#ffd875" emissive="#ffd875" />
      <PixelBlock position={[0, 0.2, 0]} size={[0.22, 0.58, 0.4]} color="#ffe08a" emissive="#ffe08a" />
      <PixelBlock position={[0.32, 0.12, 0]} size={[0.22, 0.42, 0.4]} color="#ffd875" emissive="#ffd875" />
      <PixelBlock position={[0, 0.16, 0.24]} size={[0.13, 0.13, 0.06]} color="#f06494" outline={false} emissive="#f06494" />
    </group>
  )
}

function SeatedPrincess() {
  return (
    <group rotation={[0.05, -0.08, 0.07]}>
      {/* long hair silhouette behind the face and dress */}
      <PixelBlock position={[0, 2.35, -0.12]} size={[1.62, 2.35, 0.46]} color="#4a2833" />
      <PixelBlock position={[0, 3.02, 0.04]} size={[1.4, 1.32, 0.58]} color="#f0c2a2">
        <PixelFace feminine />
      </PixelBlock>
      <PixelBlock position={[0, 3.65, 0.03]} size={[1.5, 0.42, 0.62]} color="#4a2833" />
      <PixelBlock position={[-0.61, 3.15, 0.03]} size={[0.32, 0.94, 0.62]} color="#4a2833" />
      <PixelBlock position={[0.61, 3.15, 0.03]} size={[0.32, 0.94, 0.62]} color="#4a2833" />
      <PrincessCrown />

      {/* princess bodice and puff sleeves */}
      <PixelBlock position={[0, 1.85, 0.05]} size={[1.12, 1.18, 0.56]} color="#ed6f9d" emissive="#d94d82" />
      <PixelBlock position={[0, 2.06, 0.36]} size={[0.58, 0.18, 0.06]} color="#ffd0df" outline={false} />
      <PixelBlock position={[-0.72, 2.05, 0.05]} size={[0.48, 0.55, 0.52]} color="#f291b4" />
      <PixelBlock position={[0.72, 2.05, 0.05]} size={[0.48, 0.55, 0.52]} color="#f291b4" />

      {/* inside hand meets his hand */}
      <PixelBlock position={[-0.76, 1.47, 0.12]} size={[0.32, 0.9, 0.44]} color="#ef86ac" rotation={[0, 0, 0.66]} />
      <PixelBlock position={[-1.03, 1.08, 0.13]} size={[0.32, 0.32, 0.44]} color="#f0c2a2" />
      <PixelBlock position={[0.76, 1.52, 0]} size={[0.32, 0.95, 0.46]} color="#ef86ac" rotation={[0, 0, -0.14]} />

      {/* tiered pink skirt spreads across the grass while sitting */}
      <PixelBlock position={[0, 0.95, 0.08]} size={[1.45, 0.58, 0.58]} color="#e75f91" emissive="#d94d82" />
      <PixelBlock position={[0, 0.49, 0.11]} size={[1.85, 0.48, 0.62]} color="#f07eaa" emissive="#d94d82" />
      <PixelBlock position={[0, 0.08, 0.16]} size={[2.18, 0.42, 0.68]} color="#f598ba" emissive="#d94d82" />
      <PixelBlock position={[-0.55, -0.33, 0.22]} size={[0.52, 0.6, 0.48]} color="#f7b0c9" rotation={[0, 0, 0.18]} />
      <PixelBlock position={[0.55, -0.33, 0.22]} size={[0.52, 0.6, 0.48]} color="#f7b0c9" rotation={[0, 0, -0.18]} />
      <PixelBlock position={[-0.59, -0.64, 0.31]} size={[0.58, 0.24, 0.72]} color="#f6d4de" />
      <PixelBlock position={[0.59, -0.64, 0.31]} size={[0.58, 0.24, 0.72]} color="#f6d4de" />
    </group>
  )
}

/** Two original pixel/block 2.5D characters, seated against the trunk. */
export function SeatedCouple({ position = [0, -1.95, 2.75] }: { position?: Vector3Tuple }) {
  const couple = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (reducedMotion() || !couple.current) return
    const t = clock.elapsedTime
    couple.current.position.y = position[1] + Math.sin(t * 1.1) * 0.025
    couple.current.rotation.y = Math.sin(t * 0.45) * 0.018
  })

  return (
    <group ref={couple} position={position}>
      <group position={[-0.78, 0, 0]}><SeatedBoy /></group>
      <group position={[0.92, -0.02, 0.04]}><SeatedPrincess /></group>
    </group>
  )
}
