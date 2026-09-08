import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import './row.css'

export interface RowProps {
  title: ReactNode
  sub?: ReactNode
  right?: ReactNode          /* 右槽：chevron / pct / badge */
  chevron?: boolean
  onClick?: () => void
  className?: string
}

/**
 * 唯一列表行（收敛旧 row/item/tl-row 多形态的基类；时间轴行 = Row + time 左槽）。
 * 可点行是可聚焦、可键盘操作的（审计 §13.2）。
 */
export function Row({ title, sub, right, chevron, onClick, className = '' }: RowProps) {
  const cls = ['row', onClick ? 'row--action' : '', className].filter(Boolean).join(' ')
  return (
    <div
      className={cls}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="row__main">
        <div className="row__title t-small">{title}</div>
        {sub && <div className="row__sub t-caption">{sub}</div>}
      </div>
      {right && <div className="row__right t-caption tnum">{right}</div>}
      {chevron && <ChevronRight className="row__chev" size={16} strokeWidth={1.8} aria-hidden="true" />}
    </div>
  )
}
