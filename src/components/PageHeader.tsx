import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

const reduced = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * PageHeader — a decorated, animated header shared by every page.
 * Renders an eyebrow, a glowing title with an ornamental divider, an optional
 * subtitle, and a slot for actions on the right. Animates in gently.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  hero = false,
}: {
  eyebrow?: string
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  hero?: boolean
}) {
  const content = (
    <div className="page-header-text">
      {eyebrow && <p className="eyebrow eyebrow-glow">{eyebrow}</p>}
      <h1 className="title-glow">{title}</h1>
      <span className="title-flourish" aria-hidden="true">
        <i />
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M12 2c.6 2.8 2.2 4.4 5 5-2.8.6-4.4 2.2-5 5-.6-2.8-2.2-4.4-5-5 2.8-.6 4.4-2.2 5-5z" />
        </svg>
        <i />
      </span>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
  )

  if (reduced()) {
    return (
      <header className={`page-header ${hero ? 'hero-header' : ''}`}>
        {content}
        {actions}
      </header>
    )
  }

  return (
    <motion.header
      className={`page-header ${hero ? 'hero-header' : ''}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {content}
      {actions}
    </motion.header>
  )
}
