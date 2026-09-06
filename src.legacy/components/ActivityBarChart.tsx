import { memo } from 'react'

export interface ActivityItem {
  label: string
  value: number
  color: 'green' | 'dark' | 'muted'
}

interface ActivityBarChartProps {
  title?: string
  subtitle?: string
  items: ActivityItem[]
  className?: string
}

const FILL_CLASS = {
  green: 'activity-fill activity-fill-green',
  dark: 'activity-fill activity-fill-dark',
  muted: 'activity-fill activity-fill-muted',
}

export const ActivityBarChart = memo(function ActivityBarChart({
  title,
  subtitle,
  items,
  className = '',
}: ActivityBarChartProps) {
  return (
    <section className={`glass-panel p-4 ${className}`} aria-label={title ?? '活动统计'}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>}
          {subtitle && <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{subtitle}</p>}
        </div>
      )}
      <div className="activity-chart">
        {items.map((item) => (
          <div key={item.label} className="activity-row">
            <span className="activity-label">{item.label}</span>
            <div className="activity-track" aria-hidden>
              <div className={FILL_CLASS[item.color]} style={{ width: `${Math.max(0, Math.min(100, item.value))}%` }} />
            </div>
            <span className="activity-value" aria-label={`${item.label} ${item.value}%`}>
              {item.value}%
            </span>
          </div>
        ))}
      </div>
    </section>
  )
})
