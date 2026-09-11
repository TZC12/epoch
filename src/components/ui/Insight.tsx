import type { ReactNode } from 'react'
import { Card } from './Card'
import './insight.css'

export interface InsightProps {
  title: ReactNode
  body?: ReactNode
  tone?: 'neutral' | 'accent'   /* accent=与完成/活跃相关（唯一强调色语义） */
  actions?: ReactNode
  className?: string
}

/** 观察卡（建议/能量提示/复盘观察）：一句话 + 可选说明 + 可选动作。无图标堆砌。 */
export function Insight({ title, body, tone = 'neutral', actions, className = '' }: InsightProps) {
  return (
    <Card tone="sunken" className={`insight insight--${tone} ${className}`.trim()}>
      <span className="insight__dot" aria-hidden="true" />
      <div className="insight__main">
        <div className="insight__title t-small">{title}</div>
        {body && <div className="insight__body t-caption">{body}</div>}
      </div>
      {actions && <div className="insight__acts">{actions}</div>}
    </Card>
  )
}
