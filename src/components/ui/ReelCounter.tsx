import { useEffect, useRef, type CSSProperties } from 'react'
import './reel-counter.css'

const SPINS = 3      /* 每列多滚 3 圈再落位 */
const DUR = 1400
const STAGGER = 90   /* 列间级联延迟：左→右 */
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

/**
 * 老虎机计数器（Transitions.dev「Spinning counter」机制）：每个数字是一列
 * 被裁切的 0-9 卷轴，strip 上移 (SPINS*10+digit)*cell 完成「旋转→落位」，
 * 逐列加延迟形成左到右级联；窗口上下沿 mask 柔化裁切。
 * value 变化即重播（挂载也算）。reduced-motion：CSS 强制 transition:none，
 * transform 直达终点=瞬时定格。role=img + aria-label 给读屏真实数值。
 */
export function ReelCounter({ value, cell = 44, className = '' }: {
  value: number; cell?: number; className?: string
}) {
  const str = String(Math.max(0, Math.round(value)))
  const rootRef = useRef<HTMLSpanElement>(null)
  const colRefs = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    const strips = colRefs.current
      .map((col) => col?.firstElementChild as HTMLElement | null)
      .filter((s): s is HTMLElement => !!s)
    /* 复位到顶（无过渡）→ 强制布局 → 挂过渡滚向目标 */
    strips.forEach((s) => { s.style.transition = 'none'; s.style.transform = 'translateY(0)' })
    void rootRef.current?.offsetWidth
    strips.forEach((s, i) => {
      const digit = Number(str[i])
      s.style.transition = `transform ${DUR}ms ${EASE} ${i * STAGGER}ms`
      s.style.transform = `translateY(-${(SPINS * 10 + digit) * cell}px)`
    })
  }, [str, cell])

  return (
    <span
      ref={rootRef}
      className={`reel ${className}`}
      style={{ '--reel-cell': `${cell}px` } as CSSProperties}
      role="img"
      aria-label={str}
    >
      {Array.from({ length: str.length }, (_, i) => (
        <span key={`${i}-${str.length}`} className="reel__col" ref={(el) => { colRefs.current[i] = el }} aria-hidden="true">
          <span className="reel__strip">
            {Array.from({ length: (SPINS + 1) * 10 + 1 }, (_, k) => (
              <span key={k} className="reel__digit">{k % 10}</span>
            ))}
          </span>
        </span>
      ))}
    </span>
  )
}
