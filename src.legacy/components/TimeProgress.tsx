import { memo, useMemo } from 'react'
import { formatTime } from '../lib/dates'

interface TimeProgressProps {
  start: string // HH:MM
  end: string // HH:MM
  now?: Date
  className?: string
}

function parseMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export const TimeProgress = memo(function TimeProgress({
  start,
  end,
  now,
  className = '',
}: TimeProgressProps) {
  const current = now ?? new Date()
  const currentMinutes = current.getHours() * 60 + current.getMinutes()
  const startMin = parseMinutes(start)
  const endMin = parseMinutes(end)

  const pct = useMemo(() => {
    if (currentMinutes <= startMin) return 0
    if (currentMinutes >= endMin) return 100
    return ((currentMinutes - startMin) / (endMin - startMin)) * 100
  }, [currentMinutes, startMin, endMin])

  const remainingMinutes = Math.max(0, endMin - currentMinutes)
  const remainingHours = Math.floor(remainingMinutes / 60)
  const remainingMins = remainingMinutes % 60

  return (
    <div className={`time-progress ${className}`}>
      <div className="time-progress-track">
        <div className="time-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="time-progress-foot">
        <span>
          {formatTime(`${start}:00`)} — {formatTime(`${end}:00`)}
        </span>
        <span>
          {pct >= 100
            ? '已结束'
            : `还剩 ${remainingHours}小时${remainingMins}分`}
        </span>
      </div>
    </div>
  )
})
