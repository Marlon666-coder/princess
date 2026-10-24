import { motion, useInView, useMotionValue, useSpring, animate } from 'framer-motion'
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

/* eslint-disable react-hooks/set-state-in-effect -- these effects synchronise React
   state with external systems (an animation loop, pointer events, capability checks),
   which is exactly the use case the React docs allow for setState inside an effect. */

const reduced = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Reveal — fades + slides children into view the first time they scroll on screen.
 * Falls back to a plain wrapper when the user prefers reduced motion.
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  if (reduced()) return <div className={className}>{children}</div>
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Counter — animates a number from 0 up to {value} when it scrolls into view.
 */
export function Counter({
  value,
  duration = 1.4,
  className,
}: {
  value: number
  duration?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (!inView) return
    if (reduced()) {
      setDisplay(value)
      return
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    })
    return () => controls.stop()
  }, [inView, value, duration])
  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  )
}

/**
 * Magnetic — the element gently pulls toward the cursor on hover (spring physics).
 * Great for primary buttons/cards. No-op under reduced motion or on touch devices.
 */
export function Magnetic({
  children,
  strength = 0.35,
  className,
}: {
  children: ReactNode
  strength?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 18, mass: 0.4 })
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 18, mass: 0.4 })

  const disabled =
    reduced() || (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches)

  function onMove(event: React.MouseEvent<HTMLDivElement>) {
    if (disabled || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    x.set((event.clientX - (rect.left + rect.width / 2)) * strength)
    y.set((event.clientY - (rect.top + rect.height / 2)) * strength)
  }
  function reset() {
    x.set(0)
    y.set(0)
  }

  if (disabled) return <div className={className}>{children}</div>

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x, y, display: 'inline-flex' }}
      onMouseMove={onMove}
      onMouseLeave={reset}
    >
      {children}
    </motion.div>
  )
}

/**
 * HeartCursor — a soft heart that trails the pointer with spring physics, growing
 * when hovering interactive elements. Hidden on touch devices / reduced motion.
 */
export function HeartCursor() {
  const x = useSpring(useMotionValue(-100), { stiffness: 500, damping: 40 })
  const y = useSpring(useMotionValue(-100), { stiffness: 500, damping: 40 })
  const [active, setActive] = useState(false)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (reduced() || matchMedia('(pointer: coarse)').matches) return
    setEnabled(true)
    const move = (event: MouseEvent) => {
      x.set(event.clientX)
      y.set(event.clientY)
      const target = event.target as HTMLElement | null
      setActive(Boolean(target?.closest('a, button, [role="button"], input, textarea, select, label')))
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [x, y])

  if (!enabled) return null
  return (
    <motion.div
      className="heart-cursor"
      aria-hidden="true"
      style={{ x, y }}
      animate={{ scale: active ? 1.8 : 1, opacity: active ? 0.9 : 0.6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      ♥
    </motion.div>
  )
}

/**
 * GrainOverlay — a fixed, animated film-grain layer for a tactile, filmic finish.
 */
export function GrainOverlay() {
  return <div className="grain-overlay" aria-hidden="true" />
}

type TrailHeart = { id: number; x: number; y: number; size: number; hue: number }

/**
 * HeartTrail — spawns small SVG hearts along the cursor path that drift up and
 * fade. Desktop + fine-pointer only; disabled under reduced motion. Throttled so
 * it stays light. Uses SVG (never glyphs) so it renders crisply everywhere.
 */
export function HeartTrail() {
  const [hearts, setHearts] = useState<TrailHeart[]>([])
  const idRef = useRef(0)
  const lastRef = useRef(0)

  useEffect(() => {
    if (reduced() || matchMedia('(pointer: coarse)').matches) return
    const onMove = (event: MouseEvent) => {
      const now = performance.now()
      if (now - lastRef.current < 90) return // throttle
      lastRef.current = now
      const target = event.target as HTMLElement | null
      // don't spill hearts while interacting with form controls
      if (target?.closest('input, textarea, select')) return
      const id = idRef.current++
      const heart: TrailHeart = {
        id,
        x: event.clientX,
        y: event.clientY,
        size: 10 + Math.random() * 10,
        hue: Math.random() * 20 - 10,
      }
      setHearts((current) => [...current.slice(-18), heart])
      window.setTimeout(() => {
        setHearts((current) => current.filter((h) => h.id !== id))
      }, 900)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  if (!hearts.length) return null
  return (
    <div className="heart-trail" aria-hidden="true">
      {hearts.map((h) => (
        <motion.span
          key={h.id}
          initial={{ opacity: 0.9, scale: 1, x: h.x, y: h.y }}
          animate={{ opacity: 0, scale: 0.4, y: h.y - 40 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          style={{ width: h.size, height: h.size, filter: `hue-rotate(${h.hue}deg)` }}
        >
          <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor">
            <path d="M12 21s-7.5-4.6-10-9.3C.3 8.4 1.9 5 5.2 5c2 0 3.3 1.1 4 2.2.7-1.1 2-2.2 4-2.2 3.3 0 4.9 3.4 3.2 6.7C19.5 16.4 12 21 12 21z" />
          </svg>
        </motion.span>
      ))}
    </div>
  )
}

/**
 * Tilt — a card wrapper that tilts in 3D toward the cursor for depth.
 * No-op under reduced motion or on touch devices.
 */
export function Tilt({
  children,
  max = 8,
  className,
}: {
  children: ReactNode
  max?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const rx = useSpring(useMotionValue(0), { stiffness: 200, damping: 20 })
  const ry = useSpring(useMotionValue(0), { stiffness: 200, damping: 20 })
  const disabled =
    reduced() || (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches)

  function onMove(event: React.MouseEvent<HTMLDivElement>) {
    if (disabled || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width - 0.5
    const py = (event.clientY - rect.top) / rect.height - 0.5
    ry.set(px * max)
    rx.set(-py * max)
  }
  function reset() {
    rx.set(0)
    ry.set(0)
  }

  if (disabled) return <div className={className}>{children}</div>

  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d', transformPerspective: 800 }}
    >
      {children}
    </motion.div>
  )
}

/**
 * LoadingScreen — a cinematic intro that fades out once the app is ready.
 */
export function LoadingScreen({ onDone }: { onDone?: () => void }) {
  const [gone, setGone] = useState(false)
  useEffect(() => {
    const delay = reduced() ? 250 : 1600
    const timer = setTimeout(() => {
      setGone(true)
      onDone?.()
    }, delay)
    return () => clearTimeout(timer)
  }, [onDone])
  return (
    <motion.div
      className="loading-screen"
      initial={{ opacity: 1 }}
      animate={{ opacity: gone ? 0 : 1 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      style={{ pointerEvents: gone ? 'none' : 'auto' }}
      aria-hidden={gone}
    >
      <motion.div
        className="loading-heart"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: [0.8, 1, 0.92, 1], opacity: 1 }}
        transition={{ duration: 1.4, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' }}
      >
        ❤
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        Our Little World
      </motion.p>
    </motion.div>
  )
}
