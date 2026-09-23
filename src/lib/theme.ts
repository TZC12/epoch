import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'system' | 'light' | 'dark'
export type ThemePalette = 'mono' | 'warm'   /* mono=黑白灰（默认）· warm=温馨（原 Paper Mono 暖纸） */
export type ThemeBg = 'tech' | 'matrix'      /* tech=粒子网络（默认）· matrix=点阵网络（规整栅格，静默运行感） */

interface ThemeState {
  mode: ThemeMode
  palette: ThemePalette
  bg: ThemeBg
  setMode: (m: ThemeMode) => void
  setPalette: (p: ThemePalette) => void
  setBg: (b: ThemeBg) => void
}

function resolve(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function apply(mode: ThemeMode, palette: ThemePalette, bg: ThemeBg) {
  document.documentElement.dataset.mode = resolve(mode)
  document.documentElement.dataset.palette = palette
  document.documentElement.dataset.bg = bg
}

/** 主题三轴：明暗（system/light/dark）× 配色（黑白灰/温馨）× 背景（科技/矩阵）；持久化 localStorage。 */
export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      palette: 'mono',
      bg: 'tech',
      setMode: (mode) => { apply(mode, useTheme.getState().palette, useTheme.getState().bg); set({ mode }) },
      setPalette: (palette) => { apply(useTheme.getState().mode, palette, useTheme.getState().bg); set({ palette }) },
      setBg: (bg) => { apply(useTheme.getState().mode, useTheme.getState().palette, bg); set({ bg }) },
    }),
    {
      /* 旧快照没有 bg：persist 的浅合并会用上面的初值补上，不必升 version */
      name: 'epoch-theme',
      onRehydrateStorage: () => (state) => {
        if (state) apply(state.mode, state.palette ?? 'mono', state.bg ?? 'tech')
      },
    },
  ),
)

/* 系统主题变化时，system 档跟随（一次性监听，挂在模块层） */
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const s = useTheme.getState()
    if (s.mode === 'system') apply('system', s.palette, s.bg)
  })
}
