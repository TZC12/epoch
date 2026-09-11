import { Plane } from 'lucide-react'
import './day-progress.css'

export interface DayProgressProps {
  wake: string      /* 'HH:MM' 起床（DEP） */
  sleep: string     /* 'HH:MM' 入睡（ETA） */
  now?: Date        /* 可注入（测试用）；缺省取真实当前时间 */
}

const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * 日进度条（图一 LHR→OPO 航班条的 Epoch 映射，取代旧仪表盘+完成数字对）：
 * 起床=DEP，入睡=ETA，实线=今天已流逝，飞机标记=现在，虚线=今天余下。
 * 线性可视化（Paper Mono）；进度语义=时间推进，不是完成率（完成证据交给点阵图）。
 */
export function DayProgress({ wake, sleep, now }: DayProgressProps) {
  const cur = now ?? new Date()
  const start = toMin(wake)
  const end = toMin(sleep)
  const nowMin = cur.getHours() * 60 + cur.getMinutes()
  const span = Math.max(60, end - start)
  const pct = Math.max(0, Math.min(100, ((nowMin - start) / span) * 100))

  return (
    <div className="dayprog" role="img" aria-label={`${wake} → ${sleep}`}>
      <div className="dayprog__end">
        <span className="dayprog__cap t-h3 tnum">{wake}</span>
        <span className="dayprog__caplabel t-caption">起床</span>
      </div>

      <div className="dayprog__track" aria-hidden="true">
        <div className="dayprog__done" style={{ width: `${pct}%` }} />
        <div className="dayprog__rest" style={{ width: `${100 - pct}%` }} />
        <div className="dayprog__marker" style={{ left: `${pct}%` }}>
          <Plane size={14} strokeWidth={2} aria-hidden="true" />
        </div>
      </div>

      <div className="dayprog__end dayprog__end--right">
        <span className="dayprog__cap t-h3 tnum">{sleep}</span>
        <span className="dayprog__caplabel t-caption">入睡</span>
      </div>
    </div>
  )
}
