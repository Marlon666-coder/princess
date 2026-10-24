import { Moon, Sun } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'

/**
 * ThemeToggle — a small floating day/night switch. Uses Lucide SVG icons so it
 * renders crisply everywhere (no emoji/glyph dependency).
 */
export function ThemeToggle({ floating = false }: { floating?: boolean }) {
  const { theme, toggle } = useTheme()
  const night = theme === 'night'
  return (
    <button
      type="button"
      className={`theme-toggle${floating ? ' theme-toggle-floating' : ''}`}
      onClick={toggle}
      aria-label={night ? 'Beralih ke mode siang' : 'Beralih ke mode malam'}
      title={night ? 'Mode siang' : 'Mode malam'}
    >
      <motion.span
        key={theme}
        initial={{ rotate: -40, opacity: 0, scale: 0.6 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        style={{ display: 'grid', placeItems: 'center' }}
      >
        {night ? <Moon fill="currentColor" /> : <Sun />}
      </motion.span>
    </button>
  )
}
