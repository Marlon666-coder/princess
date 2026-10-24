import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type Theme = 'day' | 'night'
type ThemeContextValue = { theme: Theme; toggle: () => void; setTheme: (theme: Theme) => void }

const ThemeContext = createContext<ThemeContextValue | null>(null)
const STORAGE_KEY = 'olw-theme'

function initialTheme(): Theme {
  if (typeof window === 'undefined') return 'day'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'day' || stored === 'night') return stored
  return 'day'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore storage errors (private mode, etc.) */
    }
  }, [theme])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: setThemeState,
      toggle: () => setThemeState((current) => (current === 'day' ? 'night' : 'day')),
    }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside ThemeProvider')
  return value
}
