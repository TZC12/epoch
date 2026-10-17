import type { CSSProperties } from 'react'
import './pbar.css'

export interface PbarProps {
  pct: number
  label?: string              /* 右侧百分比文字；缺省不显示 */
  done?: boolean              /* 完成语义：填充转 accent 绿 */
  className?: string
}

/** 进度条：细线 + 圆端（Paper Mono 线性可视化唯一进度条形态）。 */
export function Pbar({ pct, label, done, className = '' }: PbarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)))
  return (
    <div className={`pbar ${className}`} role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <div className="pbar__track">
        {/* 用 scaleX 表达进度，不再插值 width：width 每帧改动都会重排，
           而进度条恰恰是数据一变就动的元素（今日完成、词数达标、目标完成度）。 */}
        <div
          className={`pbar__fill ${done ? 'pbar__fill--done' : ''}`}
          style={{ '--v': clamped / 100 } as CSSProperties}
        />
      </div>
      {label && <span className="pbar__pct t-caption tnum">{label}</span>}
    </div>
  )
}
