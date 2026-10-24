import { useMemo } from 'react'

const reduced = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Ambiance — a purely decorative, non-interactive atmosphere layer that sits
 * behind page content to make the whole app feel immersive and alive:
 *   • Aurora: slow-drifting soft colour blobs (pink / lavender / peach)
 *   • Floating hearts: a sparse field of hearts rising gently
 *   • Sparkles: tiny twinkling dots
 *
 * All of it is CSS-driven (cheap), pointer-events:none, aria-hidden, and it
 * collapses to a single static wash under prefers-reduced-motion.
 */
export function Ambiance({ variant = 'app' }: { variant?: 'app' | 'auth' }) {
  const calm = reduced()

  const hearts = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        left: `${(i * 11 + 4) % 100}%`,
        size: 10 + ((i * 7) % 18),
        delay: `${(i * 1.7) % 12}s`,
        duration: `${16 + ((i * 3) % 10)}s`,
        opacity: 0.08 + ((i % 4) * 0.04),
      })),
    [],
  )

  const sparkles = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        left: `${(i * 37 + 9) % 100}%`,
        top: `${(i * 53 + 13) % 100}%`,
        size: 2 + ((i * 5) % 4),
        delay: `${(i * 0.9) % 7}s`,
        duration: `${3 + ((i * 2) % 5)}s`,
      })),
    [],
  )

  return (
    <div className={`ambiance ambiance-${variant}`} aria-hidden="true">
      <span className="aurora aurora-1" />
      <span className="aurora aurora-2" />
      <span className="aurora aurora-3" />
      {!calm && (
        <>
          <div className="floating-hearts">
            {hearts.map((h, i) => (
              <span
                key={`h-${i}`}
                style={{
                  left: h.left,
                  width: h.size,
                  height: h.size,
                  opacity: h.opacity,
                  animationDelay: h.delay,
                  animationDuration: h.duration,
                }}
              >
                ♥
              </span>
            ))}
          </div>
          <div className="sparkles">
            {sparkles.map((s, i) => (
              <i
                key={`s-${i}`}
                style={{
                  left: s.left,
                  top: s.top,
                  width: s.size,
                  height: s.size,
                  animationDelay: s.delay,
                  animationDuration: s.duration,
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
