import { useEffect, useRef } from 'react'
import './netbg.css'

/**
 * Ambient net —— 极简点阵网络背景（自 legacy.html 引擎 1:1 移植，docs/particle-bg-research）。
 * 存在但不被注意到：小点/稀疏/低透明/极慢漂移/极少量连线。
 * 达标：rAF 单循环、页面隐藏即停、reduced-motion 只画静态一帧、DPR≤2、颜色走 --net-* token。
 */
const NET_CFG = {
  countByViewport: [[1280, 50], [768, 36], [0, 20]] as const,
  dotR: [0.6, 1.25],
  dotA: [0.10, 0.26],
  breathe: 0.2,
  linkDist: 130,
  linkA: 0.08,
  linkW: 0.6,
  speed: [0.1, 0.22],
  repulseR: 90,
  repulseF: 10,
  dprCap: 2,
}

export function NetBackground({ tier = 'subtle' }: { tier?: 'subtle' | 'ambient' | 'featured' }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const g2d = cv.getContext?.('2d')
    if (!g2d) return
    const rmq = window.matchMedia('(prefers-reduced-motion: reduce)')
    let W = 1, H = 1, dpr = 1, raf = 0, last = 0, frame = 0
    let colDot = 'rgba(138,148,166,1)', colLink = 'rgba(167,178,196,1)'
    const pointer = { x: -1e4, y: -1e4, on: false }
    let dots: Array<{ x: number; y: number; a: number; v: number; r: number; o: number; p: number; w: number; ox: number; oy: number }> = []

    const readColors = () => {
      const cs = getComputedStyle(document.documentElement)
      const d = cs.getPropertyValue('--net-dot').trim()
      const l = cs.getPropertyValue('--net-link').trim()
      if (d) colDot = d.startsWith('#') ? hexA(d, 1) : d
      if (l) colLink = l.startsWith('#') ? hexA(l, 1) : l
    }
    const hexA = (hex: string, a: number) => {
      const h = hex.replace('#', '')
      const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
    }

    const seed = () => {
      const n = NET_CFG.countByViewport.find(([w]) => window.innerWidth >= w)![1]
      dots = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        a: Math.random() * Math.PI * 2,
        v: NET_CFG.speed[0] + Math.random() * (NET_CFG.speed[1] - NET_CFG.speed[0]),
        r: NET_CFG.dotR[0] + Math.random() * (NET_CFG.dotR[1] - NET_CFG.dotR[0]),
        o: NET_CFG.dotA[0] + Math.random() * (NET_CFG.dotA[1] - NET_CFG.dotA[0]),
        p: Math.random() * Math.PI * 2,
        w: (7 + Math.random() * 8) * 1000,
        ox: 0, oy: 0,
      }))
    }
    const resize = () => {
      W = Math.max(1, window.innerWidth)
      H = Math.max(1, window.innerHeight)
      dpr = Math.min(window.devicePixelRatio || 1, NET_CFG.dprCap)
      cv.width = Math.round(W * dpr)
      cv.height = Math.round(H * dpr)
      seed(); readColors(); render()
    }
    const step = (dt: number) => {
      const k = dt / 16.7
      for (const p of dots) {
        p.x += Math.cos(p.a) * p.v * k
        p.y += Math.sin(p.a) * p.v * k
        if (p.x < -8) { p.x = -8; p.a = Math.PI - p.a } else if (p.x > W + 8) { p.x = W + 8; p.a = Math.PI - p.a }
        if (p.y < -8) { p.y = -8; p.a = -p.a } else if (p.y > H + 8) { p.y = H + 8; p.a = -p.a }
        if (pointer.on) {
          const dx = p.x + p.ox - pointer.x, dy = p.y + p.oy - pointer.y, d = Math.hypot(dx, dy) || 0.01
          if (d < NET_CFG.repulseR) {
            const f = (1 - d / NET_CFG.repulseR) * NET_CFG.repulseF / d
            p.ox += dx * f * 0.16 * k
            p.oy += dy * f * 0.16 * k
          }
        }
        const ease = Math.pow(0.92, k)
        p.ox *= ease; p.oy *= ease
      }
    }
    const render = () => {
      g2d.setTransform(dpr, 0, 0, dpr, 0, 0)
      g2d.clearRect(0, 0, W, H)
      const LD = W < 420 ? 110 : NET_CFG.linkDist
      g2d.lineWidth = NET_CFG.linkW
      g2d.strokeStyle = colLink
      for (let i = 0; i < dots.length; i++) for (let j = i + 1; j < dots.length; j++) {
        const A = dots[i]!, B = dots[j]!
        const dx = A.x - B.x, dy = A.y - B.y, d2 = dx * dx + dy * dy
        if (d2 >= LD * LD) continue
        const f = 1 - Math.sqrt(d2) / LD
        g2d.globalAlpha = NET_CFG.linkA * f * f
        g2d.beginPath()
        g2d.moveTo(A.x + A.ox, A.y + A.oy)
        g2d.lineTo(B.x + B.ox, B.y + B.oy)
        g2d.stroke()
      }
      g2d.fillStyle = colDot
      const ts = performance.now()
      for (const p of dots) {
        const breath = 1 - NET_CFG.breathe / 2 + (NET_CFG.breathe / 2) * Math.sin((ts / p.w) * Math.PI * 2 + p.p)
        g2d.globalAlpha = p.o * breath
        g2d.beginPath()
        g2d.arc(p.x + p.ox, p.y + p.oy, p.r, 0, Math.PI * 2)
        g2d.fill()
      }
      g2d.globalAlpha = 1
    }
    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop)
      if (!last) { last = ts; return }
      const dt = Math.min(48, ts - last)
      last = ts
      if (++frame % 180 === 0) readColors()
      step(dt); render()
    }
    const start = () => { if (!raf && !rmq.matches) { last = 0; raf = requestAnimationFrame(loop) } }
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0 } }

    const onVis = () => { document.hidden ? stop() : start() }
    const onRm = () => { rmq.matches ? (stop(), render()) : start() }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== 'mouse') return
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = true
    }
    const onOut = () => { pointer.on = false; pointer.x = pointer.y = -1e4 }

    document.addEventListener('visibilitychange', onVis)
    rmq.addEventListener?.('change', onRm)
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerout', onOut)

    resize()
    if (rmq.matches) render()
    else start()

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVis)
      rmq.removeEventListener?.('change', onRm)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerout', onOut)
    }
  }, [])

  return <canvas ref={ref} className="netbg" data-tier={tier} aria-hidden="true" />
}
