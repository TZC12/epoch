import { useEffect, useState } from 'react'
import './day-progress.css'

export interface DayProgressProps {
  wake: string      /* 'HH:MM' 起床（起点） */
  sleep: string     /* 'HH:MM' 入睡（终点） */
  now?: Date        /* 可注入（测试用）；缺省内部 30s 走时 */
  wakeLabel?: string
  sleepLabel?: string
}

const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * Daily Time Journey（§二）：起床=起点，入睡=终点，当前时间=移动节点。
 * 逻辑约定：
 *  - 跨天：入睡 <= 起床 时跨度 +24h（如 22:00→06:00）；
 *  - 节点位置 = ((当前分钟 - 起点 + 1440) % 1440) / 跨度，早于起点钳在 0，晚于终点钳在 100；
 *  - 内部 30s 走时（真实系统时间），wake/sleep 变化经 props 反应，自动重算。
 */
export function DayProgress({ wake, sleep, now, wakeLabel = '起床', sleepLabel = '入睡' }: DayProgressProps) {
  const [tick, setTick] = useState(() => new Date())

  useEffect(() => {
    if (now) return                       /* 注入模式（测试）不走时 */
    const iv = window.setInterval(() => setTick(new Date()), 30_000)
    return () => window.clearInterval(iv)
  }, [now])

  const cur = now ?? tick
  const start = toMin(wake)
  let end = toMin(sleep)
  if (end <= start) end += 24 * 60        /* 跨天 */
  const span = Math.max(60, end - start)

  let rel = (cur.getHours() * 60 + cur.getMinutes() - start + 1440) % 1440
  let pct: number
  let beforeWake: boolean
  if (rel <= span) {
    pct = Math.min(100, (rel / span) * 100)   /* 区间内：正常推进 */
    beforeWake = false
  } else {
    /* 区间外（模 1440 双关）：就近判定——离终点近=已过入睡(100)；离起点近=未起床(0) */
    const pastEndBy = rel - span
    const beforeWakeBy = 1440 - rel
    if (pastEndBy <= beforeWakeBy) { pct = 100; beforeWake = false }
    else { pct = 0; beforeWake = true }
  }

  return (
    <div className="dayprog" role="img" aria-label={`${wakeLabel} ${wake} → ${sleepLabel} ${sleep}`}>
      <div className="dayprog__labels">
        <span className="dayprog__end">
          <span className="dayprog__time tnum">{wake}</span>
          <span className="dayprog__cap t-caption">{wakeLabel}</span>
        </span>
        <span className="dayprog__end dayprog__end--r">
          <span className="dayprog__time tnum">{sleep}</span>
          <span className="dayprog__cap t-caption">{sleepLabel}</span>
        </span>
      </div>

      <div className="dayprog__track" aria-hidden="true">
        <div className="dayprog__done" style={{ width: `${pct}%` }} />
        <div className="dayprog__rest" style={{ width: `${100 - pct}%` }} />
        <div
          className={`dayprog__node ${beforeWake ? 'is-wait' : ''}`}
          style={{ left: `${beforeWake ? 0 : pct}%` }}
        />
      </div>
    </div>
  )
}
