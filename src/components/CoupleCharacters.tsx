import { useGLTF, useAnimations } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import { Color, MeshStandardMaterial, type Group, type Mesh, type Vector3Tuple } from 'three'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'

/* eslint-disable react-hooks/immutability -- driving three.js AnimationActions
   (reset/play/time) and mutating cloned mesh materials is the intended
   imperative API for animated GLTF characters. */

// Rigged, smoothly-animated human from the three.js examples (Mixamo "xbot").
// Served with CORS via jsDelivr. Has an "idle" clip so the characters breathe
// and sway instead of standing stiff.
const MODEL_URL = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/models/gltf/Xbot.glb'

useGLTF.preload(MODEL_URL)

type Props = {
  position: Vector3Tuple
  rotationY?: number
  tint: string
  accent: string
  clipDelay?: number
}

function AnimatedCharacter({ position, rotationY = 0, tint, accent, clipDelay = 0 }: Props) {
  const group = useRef<Group>(null)
  const { scene, animations } = useGLTF(MODEL_URL)

  // Clone the skinned hierarchy so two instances can animate independently.
  const cloned = useMemo(() => cloneSkeleton(scene) as Group, [scene])

  // Recolour the mannequin so the two read as a couple (one cool, one warm).
  useMemo(() => {
    const body = new Color(tint)
    const trim = new Color(accent)
    cloned.traverse((obj) => {
      const mesh = obj as Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
      const src = mesh.material as MeshStandardMaterial
      const mat = (src?.clone?.() as MeshStandardMaterial) ?? new MeshStandardMaterial()
      // The xbot has two materials; give the suit the body colour and any
      // secondary parts the accent colour for a bit of outfit detail.
      mat.color = /joint|Beta_Joints|trim/i.test(src?.name ?? mesh.name) ? trim : body
      mat.metalness = 0.1
      mat.roughness = 0.65
      mat.emissive = body.clone().multiplyScalar(0.08)
      mesh.material = mat
    })
  }, [cloned, tint, accent])

  const { actions, names } = useAnimations(animations, group)
  useEffect(() => {
    const idleName = names.find((n) => /idle/i.test(n)) ?? names[0]
    const action = idleName ? actions[idleName] : undefined
    if (!action) return
    action.reset().fadeIn(0.4).play()
    action.time = clipDelay // slight offset so the two aren't perfectly in sync
    return () => {
      action.fadeOut(0.3)
    }
  }, [actions, names, clipDelay])

  return (
    <group ref={group} position={position} rotation={[0, rotationY, 0]}>
      <primitive object={cloned} />
    </group>
  )
}

/**
 * CoupleCharacters — two rigged, idle-animated figures standing close together
 * under the tree. Warm (rose) + cool (blue) tints read them as a couple.
 */
export function CoupleCharacters({ position = [0, -2.6, 2.6] as Vector3Tuple }: { position?: Vector3Tuple }) {
  return (
    <group position={position} scale={1.1}>
      <AnimatedCharacter position={[-0.75, 0, 0]} rotationY={0.35} tint="#5b8def" accent="#cfe0ff" clipDelay={0} />
      <AnimatedCharacter position={[0.75, 0, 0]} rotationY={-0.35} tint="#ff7fae" accent="#ffd6e6" clipDelay={1.1} />
    </group>
  )
}
