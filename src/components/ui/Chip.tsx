import type { ReactNode } from 'react'
import './chip.css'

/** 可点筛选 chip（单一交互 chip 语义；旧 chip 双重定义已废）。 */
export function Chip({ on, onClick, children, ariaLabel }: { on?: boolean; onClick?: () => void; children: ReactNode; ariaLabel?: string }) {
  return (
    <button
      type="button"
      className={`chip ${on ? 'on' : ''}`}
      aria-pressed={on}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

/** 只读小标签（信息展示，不可点）。 */
export function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'danger' | 'warning' }) {
  return <span className={`tag tag--${tone}`}>{children}</span>
}
