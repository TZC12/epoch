import './gauge.css'

export interface GaugeProps {
  pct: number                  /* 0-100 */
  done: number
  total: number
  label?: string               /* 如 "3 / 6" */
  sub?: string                 /* 如 "已完成" */
}

/**
 * 今日进度仪表：细描边半圆弧（Paper Mono 线性可视化；无填充渐变无粗底）。
 * 轨道 = ink 8%；值弧 = ink；全完成时值弧转 accent（绿=完成的唯一语义）。
 */
export function Gauge({ pct, done, total, label, sub }: GaugeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)))
  const R = 84
  const CIRC = Math.PI * R // 半圆弧长
  const offset = CIRC * (1 - clamped / 100)
  const allDone = total > 0 && done >= total
  return (
    <div className="gauge" role="img" aria-label={`${clamped}%`}>
      <svg viewBox="0 0 200 108" className="gauge__svg">
        {/* 轨道：细线 */}
        <path d="M 16 100 A 84 84 0 0 1 184 100" fill="none" stroke="var(--text-disabled)" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
        {/* 值弧 */}
        <path
          d="M 16 100 A 84 84 0 0 1 184 100"
          fill="none"
          stroke={allDone ? 'var(--accent)' : 'var(--ink)'}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          className="gauge__arc"
          style={{ transition: `stroke-dashoffset var(--dur-5) var(--ease), stroke var(--dur-2) var(--ease)` }}
        />
      </svg>
      <div className="gauge__center">
        <div className="gauge-val t-display">{label ?? `${clamped}%`}</div>
        {sub && <div className="gauge__sub t-caption">{sub}</div>}
      </div>
    </div>
  )
}
