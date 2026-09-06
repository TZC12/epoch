import { useMemo } from 'react'
import Paper from '@mui/material/Paper'
import { cardSx } from '../lib/cardSx'
import type { DayStats } from '../hooks/useMonthlyStats'

interface CompletionStatsProps {
  stats: DayStats[]
  /** 完成率阈值（%），>= 此值的柱子显示绿色 */
  threshold?: number
}

interface Annotation {
  rate: number
  label: string
}

const DEFAULT_THRESHOLD = 75

const ANNOTATIONS: Annotation[] = [
  { rate: 0, label: '最差' },
  { rate: 25, label: '较差' },
  { rate: 50, label: '一般' },
  { rate: 75, label: '良好' },
  { rate: 100, label: '完美' },
]

export function CompletionStats({ stats, threshold = DEFAULT_THRESHOLD }: CompletionStatsProps) {
  const bars = useMemo(() => {
    if (stats.length === 0) return []
    // 取最近 30 天的数据，按日期排序
    const sorted = [...stats].sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    return sorted.slice(-30)
  }, [stats])

  const summary = useMemo(() => {
    if (bars.length === 0) return { avg: 0, best: 0, worst: 0, challengeDays: 0 }
    const rates = bars.map((b) => b.rate)
    const avg = Math.round(rates.reduce((s, r) => s + r, 0) / rates.length)
    const best = Math.max(...rates)
    const worst = Math.min(...rates)
    const challengeDays = rates.filter((r) => r >= threshold).length
    return { avg, best, worst, challengeDays }
  }, [bars, threshold])

  const maxRate = 100

  return (
    <Paper elevation={0} sx={[cardSx, { p: 3 }]}>
      {/* 标题与摘要 */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--foreground)]">完成度挑战</h3>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">近 {bars.length} 天每日完成率分布</p>
        </div>
        <div className="flex gap-3 text-right">
          <div>
            <p className="text-[20px] font-bold tabular-nums text-[var(--green-accent-dot)]">{summary.challengeDays}</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">达标天数</p>
          </div>
          <div>
            <p className="text-[20px] font-bold tabular-nums text-[var(--foreground)]">{summary.avg}%</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">平均完成率</p>
          </div>
        </div>
      </div>

      {/* 柱状图 */}
      <div className="relative">
        {/* Y 轴刻度线 */}
        <div className="relative h-[120px]">
          {/* 75% 阈值线 */}
          <div
            className="absolute left-0 right-0 border-t border-dashed"
            style={{
              bottom: `${(threshold / maxRate) * 100}%`,
              borderColor: 'var(--green-accent)',
              opacity: 0.4,
            }}
          >
            <span className="absolute -top-2.5 right-0 rounded-full bg-[var(--green-accent-soft)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--green-text)]">
              {threshold}%
            </span>
          </div>

          {/* 柱子 */}
          <div className="flex h-full items-end gap-[2px]">
            {bars.map((bar) => {
              const isGood = bar.rate >= threshold
              return (
                <div
                  key={bar.dateKey}
                  className="group relative flex-1"
                  style={{ height: '100%' }}
                >
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-t-[2px]"
                    style={{
                      height: `${(bar.rate / maxRate) * 100}%`,
                      backgroundColor: isGood ? 'var(--green-accent)' : 'var(--tw-border-l3)',
                      opacity: bar.rate === 0 ? 0.15 : isGood ? 0.85 : 0.4,
                      transition: 'height 0.24s cubic-bezier(0.4,0,0.2,1)',
                    }}
                  />
                  {/* 悬浮提示 */}
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-lg bg-[var(--foreground)] px-2 py-1 text-[10px] font-medium whitespace-nowrap text-[var(--background)] opacity-0 transition-opacity duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:opacity-100">
                    {bar.dateKey.slice(5)} · {bar.rate}%
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* X 轴 */}
        <div className="mt-1.5 flex items-center justify-between px-0.5">
          {ANNOTATIONS.map((a) => (
            <div key={a.rate} className="flex flex-col items-center gap-0.5">
              <span
                className="rounded-full px-1.5 py-0.5 text-[9px] font-medium tabular-nums"
                style={{
                  backgroundColor: a.rate >= threshold ? 'var(--green-accent-soft)' : 'transparent',
                  color: a.rate >= threshold ? 'var(--green-text)' : 'var(--muted-foreground)',
                }}
              >
                {a.rate}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-0.5 flex items-center justify-between px-0.5">
          {ANNOTATIONS.map((a) => (
            <span key={a.label} className="text-[9px] text-[var(--muted-foreground)]">{a.label}</span>
          ))}
        </div>
      </div>

      {/* 底部统计 */}
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--tw-border-l1)] pt-3">
        <div className="text-center">
          <p className="text-[11px] text-[var(--muted-foreground)]">最高</p>
          <p className="mt-0.5 text-[15px] font-bold tabular-nums text-[var(--green-accent-dot)]">{summary.best}%</p>
        </div>
        <div className="border-x border-[var(--tw-border-l1)] text-center">
          <p className="text-[11px] text-[var(--muted-foreground)]">最低</p>
          <p className="mt-0.5 text-[15px] font-bold tabular-nums text-[var(--foreground)]">{summary.worst}%</p>
        </div>
        <div className="text-center">
          <p className="text-[11px] text-[var(--muted-foreground)]">达标率</p>
          <p className="mt-0.5 text-[15px] font-bold tabular-nums text-[var(--foreground)]">
            {bars.length > 0 ? Math.round((summary.challengeDays / bars.length) * 100) : 0}%
          </p>
        </div>
      </div>
    </Paper>
  )
}
