import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'system' | 'light' | 'dark'

interface ThemeState {
  mode: ThemeMode
  setMode: (m: ThemeMode) => void
}

function resolve(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function apply(mode: ThemeMode) {
  document.documentElement.dataset.mode = resolve(mode)
}

/** 主题三态（system/light/dark）；持久化 localStorage（修复旧版不持久化的 P1 bug）。 */
export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => { apply(mode); set({ mode }) },
    }),
    {
      name: 'epoch-theme',
      onRehydrateStorage: () => (state) => { if (state) apply(state.mode) },
    },
  ),
)

/* 系统主题变化时，system 档跟随（一次性监听，挂在模块层） */
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (useTheme.getState().mode === 'system') apply('system')
  })
}
