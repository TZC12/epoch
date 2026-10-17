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

/** 把浏览器外壳（状态栏 / 地址栏 / PWA 启动图背景）染成 App 当前画布色。
 *  index.html 里的静态 theme-color 只跟系统偏好，而本 App 的明暗×配色是三轴自选的：
 *  系统浅色 + 应用内深色 = 状态栏一条白，正是"不像原生"的破绽。
 *  ⚠ 必须等 data-mode/palette 写完之后读值——getComputedStyle 会强制样式重算，
 *  放在前面拿到的是旧主题的色。 */
let themeColorTries = 0
function syncThemeColor() {
  const root = document.documentElement
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim()
  /* theme.ts 在模块层就被求值（persist rehydrate），那一刻样式表可能还没进文档，
     读到空值不能就这么放弃——下一帧再试，最多 8 帧后认输（不至于无限排帧）。 */
  if (!bg) {
    if (themeColorTries < 8) {
      themeColorTries += 1
      requestAnimationFrame(syncThemeColor)
    }
    return
  }
  themeColorTries = 0
  const metas = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')]
  /* 静态标签带 media=(prefers-color-scheme)，会把"系统偏好"凌驾于"应用内选择"之上。
     接管后只留第一颗并摘掉 media，其余删除，避免两条互相覆盖的声明。 */
  const [keep, ...rest] = metas.length ? metas : [createMeta()]
  keep.removeAttribute('media')
  keep.setAttribute('content', bg)
  for (const m of rest) m.remove()
}

function createMeta(): HTMLMetaElement {
  const m = document.createElement('meta')
  m.name = 'theme-color'
  document.head.appendChild(m)
  return m
}

function apply(mode: ThemeMode, palette: ThemePalette, bg: ThemeBg) {
  document.documentElement.dataset.mode = resolve(mode)
  document.documentElement.dataset.palette = palette
  document.documentElement.dataset.bg = bg
  syncThemeColor()
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
