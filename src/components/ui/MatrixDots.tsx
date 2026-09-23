import type { CSSProperties } from 'react'
import './matrix-dots.css'

export type MatrixVariant = 'scan' | 'twinkle' | 'orbit' | 'pulse'

const CYCLE = 1200 /* ms，与 CSS --matrix-cycle 同值 */
const TWINKLE = [7, 2, 11, 5, 14, 9, 0, 12, 3, 15, 6, 10, 13, 1, 8, 4]
/* orbit 环：4×4 网格里绕心的 8 格（天然避开四角），中心 4 格恒亮 */
const RING = [1, 2, 7, 11, 14, 13, 8, 4]
const INNER = [5, 6, 9, 10]
const CORNERS = [0, 3, 12, 15]

function delaysFor(variant: MatrixVariant): number[] {
  const d = Array<number>(16).fill(0)
  if (variant === 'scan') {
    for (let i = 0; i < 16; i++) d[i] = (i % 4) * (CYCLE / 10)
  } else if (variant === 'twinkle') {
    TWINKLE.forEach((v, j) => { d[j] = v * (CYCLE / 16) })
  } else if (variant === 'orbit') {
    RING.forEach((cell, j) => { d[cell] = j * (CYCLE / 8) })
  } else {
    for (let i = 0; i < 16; i++) if (!INNER.includes(i)) d[i] = CYCLE * 0.16
  }
  return d
}

/**
 * Matrix dot loader（Transitions.dev 机制，皮肤跟 Paper Mono：ink 脉冲 on 16% 底）。
 * 4×4 点阵共享一条颜色脉冲循环，variant 只是延迟表：
 *   scan 逐列扫过 · twinkle 乱序闪烁 · orbit 环形巡游（中心定、四角空）· pulse 内核先亮外圈跟进。
 * 多通道：动效 + role="status" 文本。reduced-motion 收口（CSS 里 animation:none）。
 */
export function MatrixDots({ variant = 'scan', dot = 2, label = '加载中', className = '' }: {
  variant?: MatrixVariant; dot?: number; label?: string; className?: string
}) {
  const d = delaysFor(variant)
  return (
    <span
      className={`matrix matrix--${variant} ${className}`}
      style={{ '--matrix-dot': `${dot}px` } as CSSProperties}
      role="status"
      aria-label={label}
    >
      {Array.from({ length: 16 }, (_, i) => {
        const gap = (variant === 'orbit' || variant === 'pulse') && CORNERS.includes(i)
        const steady = variant === 'orbit' && INNER.includes(i)
        const style = gap || steady ? undefined : ({ '--d': d[i] } as CSSProperties)
        return <i key={i} aria-hidden="true" className={gap ? 'is-gap' : steady ? 'is-steady' : ''} style={style} />
      })}
    </span>
  )
}
