import { useEffect, useRef } from 'react'

/**
 * PhysicsConfetti — canvas 物理彩带（一次性爆发，非持续动效）。
 * burst 计数自增即发射：上扇形喷口 + 重力/空气阻力/自旋翻面（cos 压扁模拟 3D 旋转），
 * 全部落屏外或 4s 硬顶后自动停 rAF 并卸载。颜色在爆发瞬间读当前主题 token，
 * 换肤（mono/warm/深色）自动跟随。reduced-motion：不跑物理，落点静态闪现 400ms 即散。
 */

interface P {
  x: number; y: number
  vx: number; vy: number
  w: number; h: number
  rot: number; spin: number
  color: string
  circle: boolean
}

const GRAVITY = 1500      /* px/s² */
const DRAG = 0.988        /* 每帧（~60fps 归一）空气阻力 */
const COUNT = 90
const MAX_MS = 4000

function readColors(): string[] {
  const cs = getComputedStyle(document.documentElement)
  const pick = (v: string): string => cs.getPropertyValue(v).trim()
  /* 纸感庆祝色：墨为主角，语义色点缀；过滤空值防 token 改名静默变黑块 */
  return [pick('--ink'), pick('--text-primary'), pick('--good'), pick('--warn'), pick('--urgent'), pick('--accent')]
    .filter(Boolean)
}

function spawn(ox: number, oy: number, colors: string[]): P[] {
  const out: P[] = []
  for (let i = 0; i < COUNT; i++) {
    /* 上扇形：-165°..-15° 之间偏垂直，速度越大越集中向上 */
    const a = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI * 0.72)
    const sp = 480 + Math.random() * 640
    out.push({
      x: ox, y: oy,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      w: 5 + Math.random() * 5,
      h: Math.random() < 0.3 ? 10 + Math.random() * 6 : 5 + Math.random() * 5,
      rot: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 14,
      color: colors[i % colors.length],
      circle: Math.random() < 0.18,
    })
  }
  return out
}

function draw(ctx: CanvasRenderingContext2D, ps: P[]): void {
  for (const p of ps) {
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rot)
    ctx.fillStyle = p.color
    if (p.circle) {
      ctx.beginPath()
      ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      /* cos 压扁一个轴 = 彩带绕自身长边翻转的 3D 错觉 */
      const s = Math.max(0.22, Math.abs(Math.cos(p.rot * 2)))
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * s)
    }
    ctx.restore()
  }
}

export function PhysicsConfetti({ burst, origin }: {
  burst: number
  origin?: { x: number; y: number }   /* 视口坐标；缺省=水平居中、垂直 42% */
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (burst <= 0) return
    const cv = ref.current
    if (!cv) return
    const dpr = Math.min(3, window.devicePixelRatio || 1)
    const w = window.innerWidth, h = window.innerHeight
    cv.width = Math.round(w * dpr)
    cv.height = Math.round(h * dpr)
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const ox = origin ? origin.x : w / 2
    const oy = origin ? origin.y : h * 0.42
    const ps = spawn(ox, oy, readColors())

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      /* 不跑物理：把粒子推到 ~0.9s 落位静态画一帧，400ms 后清掉 */
      for (let k = 0; k < 54; k++) step(ps, 1 / 60)
      draw(ctx, ps)
      const id = window.setTimeout(() => { ctx.clearRect(0, 0, w, h) }, 400)
      return () => window.clearTimeout(id)
    }

    let raf = 0
    let last = performance.now()
    const t0 = last
    const loop = (now: number): void => {
      const dt = Math.min(0.032, (now - last) / 1000)
      last = now
      step(ps, dt)
      ctx.clearRect(0, 0, w, h)
      draw(ctx, ps)
      const alive = now - t0 < MAX_MS && ps.some((p) => p.y < h + 30)
      if (alive) raf = requestAnimationFrame(loop)
      else ctx.clearRect(0, 0, w, h)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [burst, origin])

  return (
    <canvas
      ref={ref}
      data-testid="confetti"
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 70 }}
    />
  )
}

function step(ps: P[], dt: number): void {
  /* DRAG 按 60fps 归一，掉帧时阻力按比例增强 */
  const dragK = Math.pow(DRAG, dt * 60)
  for (const p of ps) {
    p.vy += GRAVITY * dt
    p.vx *= dragK
    p.vy *= dragK
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.rot += p.spin * dt
  }
}
