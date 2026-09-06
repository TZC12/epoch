import { useMemo, useState } from 'react'
import { toDateKey, todayKey, weekdayIndex } from '../lib/dates'
import type { DayStats } from '../hooks/useMonthlyStats'
import { cardSx } from '../lib/cardSx'
import Paper from '@mui/material/Paper'

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

interface CalendarProps {
  stats: DayStats[]
  selectedDate?: string
  onSelectDate?: (dateKey: string) => void
}

export function Calendar({ stats, selectedDate, onSelectDate }: CalendarProps) {
  const today = todayKey()
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())

  const statMap = useMemo(() => {
    const m = new Map<string, DayStats>()
    for (const s of stats) m.set(s.dateKey, s)
    return m
  }, [stats])

  const grid = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1)
    // 周一为首列：0=周一 … 6=周日
    const offset = weekdayIndex(firstDay)
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const cells: ({ dateKey: string; day: number } | null)[] = []
    for (let i = 0; i < offset; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ dateKey: toDateKey(new Date(viewYear, viewMonth, d)), day: d })
    }
    return cells
  }, [viewYear, viewMonth])

  const monthLabel = `${viewYear}年${viewMonth + 1}月`

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1)
      setViewMonth(11)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1)
      setViewMonth(0)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  return (
    <Paper elevation={0} sx={[cardSx, { p: 2.5 }]}>
      {/* 月份导航 */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          aria-label="上个月"
          className="flex size-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--tw-overlay-2)]"
          style={{ transition: 'background 0.12s ease' }}
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="text-[15px] font-semibold text-[var(--foreground)]">{monthLabel}</span>
        <button
          type="button"
          onClick={nextMonth}
          aria-label="下个月"
          className="flex size-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--tw-overlay-2)]"
          style={{ transition: 'background 0.12s ease' }}
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* 星期标头 */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="pb-1.5 text-center text-[11px] font-medium text-[var(--muted-foreground)]">
            {w}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-1">
        {grid.map((cell, i) => {
          if (!cell) return <div key={i} className="aspect-square" />

          const stat = statMap.get(cell.dateKey)
          const isToday = cell.dateKey === today
          const isSelected = cell.dateKey === selectedDate
          const hasTasks = stat && stat.total > 0
          const allDone = hasTasks && stat!.done === stat!.total
          const partialDone = hasTasks && stat!.done > 0 && stat!.done < stat!.total
          const notStarted = hasTasks && stat!.done === 0

          // 圆点颜色：绿=全部完成，红=部分完成，紫=有任务但未开始
          const dotColor = allDone
            ? 'var(--green-accent-dot)'
            : partialDone
              ? 'var(--red-accent-dot)'
              : notStarted
                ? 'var(--purple-accent-dot)'
                : 'var(--muted-foreground)'

          return (
            <button
              key={cell.dateKey}
              type="button"
              onClick={() => onSelectDate?.(cell.dateKey)}
              className="relative flex aspect-square flex-col items-center justify-center rounded-lg hover:bg-[var(--tw-overlay-2)] active:bg-[var(--tw-overlay-3)]"
              style={{
                transition: 'background 0.12s cubic-bezier(0.4,0,0.2,1), color 0.12s cubic-bezier(0.4,0,0.2,1)',
                backgroundColor: isSelected ? 'var(--foreground)' : isToday ? 'var(--tw-overlay-2)' : undefined,
                color: isSelected ? 'var(--background)' : 'var(--foreground)',
              }}
              aria-label={cell.dateKey}
            >
              <span className="text-[13px] font-medium tabular-nums">{cell.day}</span>
              {/* 完成度指示点：绿=全完成，红=部分完成，紫=有任务未开始 */}
              {hasTasks && (
                <span
                  className="mt-0.5 size-1.5 rounded-full"
                  style={{
                    backgroundColor: isSelected ? 'var(--background)' : dotColor,
                  }}
                  aria-hidden
                />
              )}
            </button>
          )
        })}
      </div>
    </Paper>
  )
}
