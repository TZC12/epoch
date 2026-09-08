import type { ReactNode } from 'react'
import './empty.css'

export interface EmptyStateProps {
  title: string
  sub?: string
  action?: ReactNode        /* 出口：空状态必须有下一步（spec §10） */
}

/** 空状态：一句主文案 + 一句副文案 + 可选动作。无插画无营销话术。 */
export function EmptyState({ title, sub, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <p className="empty__title t-body">{title}</p>
      {sub && <p className="empty__sub t-caption">{sub}</p>}
      {action && <div className="empty__act">{action}</div>}
    </div>
  )
}
