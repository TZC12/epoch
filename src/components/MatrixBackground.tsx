import { useEffect, useRef } from 'react'
import './netbg.css'

type Tier = 'subtle' | 'ambient' | 'featured'

/**
 * 矩阵背景（Dot Matrix Network）——诉求口径：极简/克制/安静/精密，
 * 要"系统正在运行"而不是"动画背景"；第一眼看内容，第二眼才注意到它。
 *
 * 与 NetBackground（科技档）的三点结构差异：
 *  1. 位置固定在规则栅格上（轻微 jitter + 低频疏密变化），只有亮度与极小位移会动；
 *  2. 常驻变化只有一条极慢的宽亮度带（≈12px/s，一屏约 60s），所以每帧的重绘面积=「带 ∪ 光标窗」，其余像素不碰；
 *  3. 连线只从栅格邻居里抽 ~2%，天然短、天然稀，且不因光标新生成。
 * 按诉求排除：霓虹/发光粒子/星空/黑客感/密集连线/玻璃拟态/蓝紫渐变/粒子跟随。
 */
const CFG = {
  /** 栅格间距按视口：桌面全矩阵，平板更疏，手机最疏（绝不过密、绝不压可读性） */
  gapByViewport: [[1280, 30], [768, 38], [0, 48]] as const,
  jitter: 0.22,          // 相对间距的自然偏移
  densityWave: 0.13,     // 低频疏密起伏幅度
  keepBase: 0.88,
  dotR: [0.6, 1.0],
  baseA: [0.08, 0.16],   // 默认透明度很低
  linkKeepP: 0.018,
  linkA: 0.07,
  linkW: 0.5,
  bandHalf: 140,         // 亮度带的高斯窗
  bandPaintHalf: 250,    // 实际清屏/重绘的矩形更宽，让带的尾巴衰减到 0 再收尾（不留硬边）
  bandSpeed: 0.012,      // px/ms
  bandBoost: 0.05,
  pointerR: 190,         // 光标响应：软、宽、只碰局部
  pointerLift: 0.3,
  pointerPush: 2.6,
  approach: 0.86,        // 位移慢跟
  decay: 0.94,           // 亮度慢退（不是弹回）
  heatFloor: 0.002,
  maxA: 0.52,            // 亮度硬顶：任何情况都不许抢内容
  fps: 30,               // 极慢动效 30fps 足够，绘制量减半
  dprCap: 2,
  tierScale: { subtle: 0.85, ambient: 1, featured: 1.25 } as Record<Tier, number>,
}

interface Node {
  x: number; y: number          // 静置位（栅格 + jitter）
  px: number; py: number        // 当前绘制位（含光标位移）
  heat: number                  // 光标响应（慢慢退到 0）
  band: number                  // 本帧亮度带权重 0..1
  r: number; a: number
}

export function MatrixBackground({ tier = 'subtle' }: { tier?: Tier }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const tierRef = useRef<Tier>(tier)
  const repaintRef = useRef<(() => void) | null>(null)
  tierRef.current = tier

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    // 与 NetBackground 同一约定：视觉回归时关掉背景，让基线对齐组件层。
    if ((window as unknown as { __EPOCH_TEST_NO_BG__?: boolean }).__EPOCH_TEST_NO_BG__) return
    const g2d = cv.getContext?.('2d')
    if (!g2d) return

    const rmq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const fineQ = window.matchMedia('(hover: hover) and (pointer: fine)')   // 触屏不做光标响应
    let W = 1, H = 1, dpr = 1, raf = 0, last = 0, tick = 0
    let colDot = 'rgba(138,148,166,1)', colLink = 'rgba(167,178,196,1)'
    const pointer = { x: -1e4, y: -1e4, inside: false }
    let nodes: Node[] = []
    let links: [number, number][] = []

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

    /** 低频疏密场：两个不同周期的正弦相乘 → 缓慢起伏的"这片稍密、那片稍疏"。 */
    const densityField = (x: number, y: number) =>
      (Math.sin(x * 0.0055 + 1.7) * Math.cos(y * 0.0041 - 0.6) + 1) / 2

    const seed = () => {
      const gap = CFG.gapByViewport.find(([w]) => window.innerWidth >= w)![1]
      const cols = Math.ceil(W / gap) + 1
      const rows = Math.ceil(H / gap) + 1
      nodes = []
      links = []
      const idx = new Map<number, number>()      // 栅格坐标 → 节点下标（连线只连栅格邻居）
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const bx = i * gap, by = j * gap
          const keepP = CFG.keepBase + (densityField(bx, by) - 0.5) * 2 * CFG.densityWave
          if (Math.random() > keepP) continue    // 点要么在要么不在：半透明抽稀会糊掉栅格感
          idx.set(j * cols + i, nodes.length)
          const x = bx + (Math.random() - 0.5) * gap * CFG.jitter * 2
          const y = by + (Math.random() - 0.5) * gap * CFG.jitter * 2
          nodes.push({
            x, y, px: x, py: y, heat: 0, band: 0,
            r: CFG.dotR[0] + Math.random() * (CFG.dotR[1] - CFG.dotR[0]),
            a: CFG.baseA[0] + Math.random() * (CFG.baseA[1] - CFG.baseA[0]),
          })
        }
      }
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          for (const [di, dj] of [[1, 0], [0, 1]] as const) {
            const a = idx.get(j * cols + i), b = idx.get((j + dj) * cols + (i + di))
            if (a === undefined || b === undefined) continue
            if (Math.random() < CFG.linkKeepP) links.push([a, b])
          }
        }
      }
    }

    const alphaOf = (n: Node) =>
      Math.min(CFG.maxA, n.a * CFG.tierScale[tierRef.current] + CFG.bandBoost * n.band + n.heat)

    /** 本帧需要重绘的面积：亮度带一条横贯的窗 + 光标一方窗（有余温时保留，退完自动收）。 */
    const updateRects = (bandY: number, heatAlive: boolean) => {
      const out = [{ x0: 0, y0: bandY - CFG.bandPaintHalf, x1: W, y1: bandY + CFG.bandPaintHalf }]
      if (heatAlive && pointer.x > -1e3) {
        out.push({
          x0: pointer.x - CFG.pointerR, y0: pointer.y - CFG.pointerR,
          x1: pointer.x + CFG.pointerR, y1: pointer.y + CFG.pointerR,
        })
      }
      return out
    }
    const inRects = (x: number, y: number, rs: { x0: number; y0: number; x1: number; y1: number }[]) =>
      rs.some((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1)

    /** rs=null 表示整幅重画（初始化/换档/减弱动效静态帧）。 */
    const paint = (rs: ReturnType<typeof updateRects> | null) => {
      const full = rs === null
      if (full) g2d.clearRect(0, 0, W, H)
      else for (const r of rs) g2d.clearRect(Math.max(0, r.x0), Math.max(0, r.y0), r.x1 - r.x0, r.y1 - r.y0)
      g2d.lineWidth = CFG.linkW
      g2d.strokeStyle = colLink
      for (const [ai, bi] of links) {
        const A = nodes[ai], B = nodes[bi]
        const mx = (A.px + B.px) / 2, my = (A.py + B.py) / 2
        if (!full && !inRects(mx, my, rs)) continue
        const wake = (alphaOf(A) + alphaOf(B)) / 2 / CFG.baseA[1]
        g2d.globalAlpha = Math.min(0.16, CFG.linkA * wake)
        g2d.beginPath()
        g2d.moveTo(A.px, A.py)
        g2d.lineTo(B.px, B.py)
        g2d.stroke()
      }
      g2d.fillStyle = colDot
      for (const n of nodes) {
        if (!full && !inRects(n.px, n.py, rs)) continue
        const a = alphaOf(n)
        if (a <= 0.003) continue
        g2d.globalAlpha = a
        g2d.beginPath()
        g2d.arc(n.px, n.py, n.r, 0, Math.PI * 2)
        g2d.fill()
      }
      g2d.globalAlpha = 1
    }

    /** 亮度带当前位置：step 里算每个节点的带权重，loop 里决定重绘矩形。 */
    let lastBandY = 0

    /** 返回本帧是否还有节点带余温（决定要不要继续重绘光标窗）。 */
    const step = (k: number) => {
      const usePointer = pointer.inside && fineQ.matches
      let heatAlive = false
      for (const n of nodes) {
        let tx = 0, ty = 0
        if (usePointer) {
          const dx = n.x - pointer.x, dy = n.y - pointer.y
          const d = Math.hypot(dx, dy)
          if (d < CFG.pointerR) {
            const soft = (1 - d / CFG.pointerR) ** 2          // 软边：中心强、外缘不断崖
            tx = (dx / (d || 1)) * soft * CFG.pointerPush
            ty = (dy / (d || 1)) * soft * CFG.pointerPush
            const lift = soft * CFG.pointerLift
            if (lift > n.heat) n.heat = lift
          }
        }
        /* 位移慢跟、亮度慢退：两条都是指数逼近，不会"啪"地弹回，也不会跳帧 */
        const ease = 1 - Math.pow(CFG.approach, k)
        n.px += (n.x + tx - n.px) * ease
        n.py += (n.y + ty - n.py) * ease
        n.heat *= Math.pow(CFG.decay, k)
        if (n.heat > CFG.heatFloor) heatAlive = true
        const dy2 = (n.y - lastBandY) / CFG.bandHalf
        n.band = Math.exp(-dy2 * dy2 * 2.2)
      }
      return heatAlive
    }

    const resize = () => {
      W = Math.max(1, window.innerWidth)
      H = Math.max(1, window.innerHeight)
      dpr = Math.min(window.devicePixelRatio || 1, CFG.dprCap)
      cv.width = Math.round(W * dpr)
      cv.height = Math.round(H * dpr)
      seed(); readColors()
      g2d.setTransform(dpr, 0, 0, dpr, 0, 0)
      paint(null)
    }

    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop)
      if (!last) { last = ts; return }
      if (ts - last < 1000 / CFG.fps) return            // 节流：极慢动效不需要 60fps
      const k = Math.min(48, ts - last) / 16.7
      last = ts
      if (++tick % 180 === 0) readColors()
      lastBandY = (ts * CFG.bandSpeed) % (H + CFG.bandHalf * 2) - CFG.bandHalf
      const heatAlive = step(k)
      paint(updateRects(lastBandY, heatAlive))
    }

    const start = () => { if (!raf && !rmq.matches) { last = 0; raf = requestAnimationFrame(loop) } }
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0 } }

    const onVis = () => { if (document.hidden) stop(); else start() }
    const onRm = () => { if (rmq.matches) { stop(); paint(null) } else start() }
    const onMove = (e: PointerEvent) => {
      if (!fineQ.matches) return
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.inside = true
    }
    const onOut = () => { pointer.inside = false }
    /* 滚动降强度：动的是 canvas 的 opacity（合成层），一帧重绘都不产生 */
    const onScroll = (e: Event) => {
      const el = e.target as Element | Document | null
      const top = el && el !== document ? (el as Element).scrollTop || 0 : window.scrollY || 0
      cv.style.opacity = String(Math.max(0.42, Math.min(1, 1 - top / 1400)))
    }

    document.addEventListener('visibilitychange', onVis)
    rmq.addEventListener?.('change', onRm)
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerout', onOut)
    document.addEventListener('scroll', onScroll, { passive: true, capture: true })

    repaintRef.current = () => paint(null)
    resize()
    if (rmq.matches) paint(null)          // 减弱动效：只留静态矩阵，不起循环
    else start()

    return () => {
      repaintRef.current = null
      stop()
      document.removeEventListener('visibilitychange', onVis)
      rmq.removeEventListener?.('change', onRm)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerout', onOut)
      document.removeEventListener('scroll', onScroll, { capture: true })
    }
  }, [])

  /* tier（路由档位）变了要整幅重画：它是乘在每个节点透明度上的全局系数，
     只重绘"更新面积"会把上一档的旧亮度留在带子还没走到的地方。 */
  useEffect(() => { repaintRef.current?.() }, [tier])

  return <canvas ref={ref} className="netbg netbg--matrix" data-tier={tier} aria-hidden="true" />
}
