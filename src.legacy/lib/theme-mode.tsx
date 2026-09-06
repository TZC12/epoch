import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

type ThemeMode = 'light' | 'dark'

interface ThemeModeContextValue {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggle: () => void
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null)

const STORAGE_KEY = 'epoch-theme-mode'

function resolveInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(resolveInitialMode)

  const applyMode = useCallback((next: ThemeMode) => {
    const root = document.documentElement
    if (next === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    window.localStorage.setItem(STORAGE_KEY, next)
  }, [])

  useEffect(() => {
    applyMode(mode)
  }, [mode, applyMode])

  const setMode = useCallback(
    (next: ThemeMode) => {
      setModeState(next)
      applyMode(next)
    },
    [applyMode],
  )

  const toggle = useCallback(() => {
    setMode(mode === 'light' ? 'dark' : 'light')
  }, [setMode, mode])

  const value = useMemo<ThemeModeContextValue>(() => ({ mode, setMode, toggle }), [mode, setMode, toggle])

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>
}

export function useThemeMode(): ThemeModeContextValue {
  const ctx = useContext(ThemeModeContext)
  if (!ctx) throw new Error('useThemeMode must be used within ThemeModeProvider')
  return ctx
}
