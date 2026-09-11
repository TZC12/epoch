import type { ReactNode } from 'react'
import './metric.css'

export interface MetricProps {
  label: string
  value: ReactNode
  sub?: ReactNode
  className?: string
}

/** 指标块：eyebrow 标签 + tnum 大数字 + 可选副行。Progress/仪表场景用。 */
export function Metric({ label, value, sub, className = '' }: MetricProps) {
  return (
    <div className={`metric ${className}`.trim()}>
      <div className="metric__label eyebrow">{label}</div>
      <div className="metric__value">{value}</div>
      {sub && <div className="metric__sub t-caption">{sub}</div>}
    </div>
  )
}
