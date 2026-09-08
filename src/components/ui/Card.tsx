import type { CSSProperties, ReactNode } from 'react'
import './card.css'

export type CardTone = 'flat' | 'sunken' | 'glass'

export interface CardProps {
  tone?: CardTone                /* flat=默认白卡（无边框无阴影）；sunken=内嵌；glass=悬浮玻璃 */
  pad?: 'none' | 'sm' | 'md' | 'lg'
  onClick?: () => void
  as?: 'div' | 'section' | 'article' | 'li'
  className?: string
  style?: CSSProperties
  children: ReactNode
}

/**
 * 唯一卡片容器（收敛旧 9 种玻璃卡面）。
 * Paper Mono：flat 卡片靠色阶分层——无边框、无阴影（elev-flat）；
 * 阴影只出现在真正悬浮的东西上（glass 档配 blur + elev-floating）。
 */
export function Card({ tone = 'flat', pad = 'md', onClick, as = 'div', className = '', style, children }: CardProps) {
  const Tag = as
  const cls = ['card', `card--${tone}`, pad !== 'none' ? `card--pad-${pad}` : '', onClick ? 'card--action' : '', className]
    .filter(Boolean)
    .join(' ')
  return (
    <Tag
      className={cls}
      style={style}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </Tag>
  )
}
