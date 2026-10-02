import { Canvas, useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Group } from 'three'

type PetalSeed = { x: number; y: number; z: number; speed: number; phase: number; scale: number }

function PetalField({ count }: { count: number }) {
  const group = useRef<Group>(null)
  const petals = useMemo<PetalSeed[]>(() => Array.from({ length: count }, (_, index) => ({
    x: -8 + Math.random() * 16, y: -5 + Math.random() * 14, z: -3 + Math.random() * 7,
    speed: .12 + Math.random() * .22, phase: index * .73, scale: .08 + Math.random() * .12,
  })), [count])
  useFrame(({ clock }, delta) => {
    group.current?.children.forEach((object, index) => {
      const seed = petals[index]
      object.position.y -= seed.speed * delta
      object.position.x += Math.sin(clock.elapsedTime * .55 + seed.phase) * delta * .09
      object.rotation.x += delta * .35; object.rotation.z += delta * .2
      if (object.position.y < -5) object.position.set(-8 + Math.random() * 16, 8, seed.z)
    })
  })
  return <group ref={group}>{petals.map((petal, index) => <mesh key={index} position={[petal.x, petal.y, petal.z]} rotation={[petal.phase, 0, petal.phase]} scale={petal.scale}>
    <sphereGeometry args={[1, 7, 4]} /><meshStandardMaterial color={index % 3 ? '#f5a6bd' : '#ffd1dc'} roughness={.7} transparent opacity={.72} />
  </mesh>)}</group>
}

function SakuraBranches() {
  return <group position={[5.6, 3.8, -1.5]} rotation={[0, 0, -.7]}>
    <mesh><cylinderGeometry args={[.12,.28,5,8]} /><meshStandardMaterial color="#6f4650" /></mesh>
    {Array.from({ length: 12 }, (_, index) => { const angle = index * 1.7; return <group key={index} position={[Math.sin(angle) * .55, index * .25 - 1.3, Math.cos(angle) * .35]}><mesh scale={[.24,.12,.28]}><sphereGeometry args={[1,8,6]} /><meshStandardMaterial color={index % 2 ? '#f4a4bb' : '#ffd0dc'} /></mesh><mesh position={[.27,.05,.04]} scale={[.18,.09,.22]}><sphereGeometry args={[1,8,6]} /><meshStandardMaterial color="#f7b2c5" /></mesh></group> })}
  </group>
}

function CssCanvasFallback({ dense }: { dense: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current; const context = canvas?.getContext('2d'); if (!canvas || !context) return
    let animation = 0; const count = innerWidth < 640 ? 14 : dense ? 36 : 22
    const petals = Array.from({ length: count }, (_, i) => ({ x: Math.random()*innerWidth, y: Math.random()*innerHeight, size: 4+Math.random()*7, speed:.2+Math.random()*.5, phase:i*.7 }))
    const resize = () => { const ratio=Math.min(devicePixelRatio,2); canvas.width=innerWidth*ratio; canvas.height=innerHeight*ratio; canvas.style.width=`${innerWidth}px`; canvas.style.height=`${innerHeight}px`; context.setTransform(ratio,0,0,ratio,0,0) }
    const draw = (time: number) => { context.clearRect(0,0,innerWidth,innerHeight); petals.forEach((p) => { p.y+=p.speed; p.x+=Math.sin(time/900+p.phase)*.2; if(p.y>innerHeight+10)p.y=-10; context.save(); context.translate(p.x,p.y); context.rotate(Math.sin(time/700+p.phase)); context.fillStyle='rgba(242,143,173,.55)'; context.beginPath(); context.ellipse(0,0,p.size,p.size/2.4,.5,0,Math.PI*2); context.fill(); context.restore() }); animation=requestAnimationFrame(draw) }
    resize(); addEventListener('resize',resize); animation=requestAnimationFrame(draw); return()=>{removeEventListener('resize',resize);cancelAnimationFrame(animation)}
  },[dense])
  return <canvas ref={canvasRef} className="sakura-canvas" aria-hidden="true" />
}

export function SakuraBackground({ dense = false }: { dense?: boolean }) {
  const [webgl, setWebgl] = useState(false)
  useEffect(() => { try { const canvas=document.createElement('canvas'); setWebgl(Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))) } catch { setWebgl(false) } }, [])
  if (!webgl) return <CssCanvasFallback dense={dense} />
  return <div className="sakura-canvas" aria-hidden="true"><Canvas camera={{ position:[0,0,10], fov:48 }} dpr={[1,1.5]} gl={{ alpha:true, antialias:innerWidth>640 }}><ambientLight intensity={1.5}/><directionalLight position={[3,5,6]} intensity={1.2} color="#fff2f7"/><Float speed={.35} rotationIntensity={.08} floatIntensity={.1}><SakuraBranches/></Float><PetalField count={innerWidth<640?16:dense?42:25}/></Canvas></div>
}
