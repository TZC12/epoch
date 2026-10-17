import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import './reveal.css'

/* ═══════════════════════════════════════════════════════════════════
   Reveal · 进入视口时的一次性揭示（全站共享一个 IntersectionObserver）
   ───────────────────────────────────────────────────────────────────
   三条约束（都是刻意的，改之前先读完）：

   1) root 用视口（root:null）。真实滚动者是文档（.app-main 不定高、不再声明
      overflow，见 app-shell.css），视口就是正确的 scrollport；即便将来换回
      容器滚动，IntersectionObserver 规范也会把祖先裁剪矩形一路 intersect 进来，
      判定同样成立。而传容器当 root 要面对"父 effect 晚于子组件挂载"的时序问题
      （AppShell 的 attach 在 children 之后才跑，第一帧拿到的是 null）。
      少一个时序依赖 = 少一类偶发 bug。

   2) 只动 transform + opacity，且播完就 unobserve：列表行会增删重排，
      留着观察器等于给每行挂一个长期回调；揭示动画也只该播一次，
      来回滚就反复淡入是"AI 生成感"的典型特征。

   3) 关闭动画时内容必须照常可读：reduced-motion 下 CSS 直接把初值改成
      可见态（不是"把时长归零"——那样还得等 JS 加类才出现），
      JS 没跑起来/不支持 IO 时同理，靠 .reveal:not(.is-in) 只在
      @media (prefers-reduced-motion: no-preference) 里生效来兜底。
   ═══════════════════════════════════════════════════════════════════ */

let io: IntersectionObserver | null = null
const waiting = new Map<Element, () => void>()

function ensureObserver(): IntersectionObserver | null {
  if (io || typeof IntersectionObserver === 'undefined') return io
  io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      waiting.get(e.target)?.()
      waiting.delete(e.target)
      io?.unobserve(e.target)
    }
  }, {
    /* 底部让开 8%：元素刚露头就开播，等完全进入再播会显得慢半拍 */
    rootMargin: '0px 0px -8% 0px',
    threshold: 0.01,
  })
  return io
}

export interface RevealProps {
  children: ReactNode
  className?: string
  /** 级联延迟（ms）：同屏多行时错开，上限交给 CSS 的 --dur-* 总预算 */
  delay?: number
  /** 位移方向：纵向列表用 up（默认），横向吸附行用 left */
  from?: 'up' | 'left'
  /** 语义标签：区块级揭示要保住 <section> 的地标语义，别为了动画把结构降级成 div */
  as?: 'div' | 'section'
  ariaLabel?: string
}

/** 包一层做进入视口的揭示。列表里用要配 key，别给每行都包（多一层 DOM）。 */
export function Reveal({ children, className = '', delay = 0, from = 'up', as = 'div', ariaLabel }: RevealProps) {
  const Tag = as
  /* 多态标签下 ref 的具体元素类型由 Tag 决定，静态类型只能给到 HTMLElement 基类 */
  const ref = useRef<HTMLElement | null>(null)

  /* 首屏就在视口里的，不做揭示动画：在首帧绘制前（layout effect）就落到可见态。
     否则进页面时"上面几块依次淡入"会和路由层的淡入叠成两层动效——
     用户明确讨厌的那种 AI 生成感。 */
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-in')
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el || el.classList.contains('is-in')) return
    const obs = ensureObserver()
    if (!obs) { el.classList.add('is-in'); return }
    const show = (): void => { el.classList.add('is-in') }
    waiting.set(el, show)
    obs.observe(el)
    return () => {
      waiting.delete(el)
      obs.unobserve(el)
    }
  }, [])

  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`reveal reveal--${from} ${className}`.trim()}
      aria-label={ariaLabel}
      style={delay ? { transitionDelay: `${Math.min(delay, 240)}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}
