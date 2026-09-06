import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface DayStats {
  dateKey: string // 'YYYY-MM-DD'
  total: number
  done: number
  rate: number // 0–100
}

function monthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  const fmt = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  return { start: fmt(start), end: fmt(end) }
}

/** 获取某月每日完成统计 */
export function useMonthlyStats(year: number, month: number) {
  const { start, end } = monthRange(year, month)

  return useQuery({
    queryKey: ['monthly-stats', start, end],
    queryFn: async (): Promise<DayStats[]> => {
      const { data, error } = await supabase
        .from('daily_tasks')
        .select('task_date, status')
        .gte('task_date', start)
        .lte('task_date', end)

      if (error) throw new Error(error.message)

      const byDate = new Map<string, { total: number; done: number }>()
      for (const row of data ?? []) {
        const key = row.task_date as string
        const entry = byDate.get(key) ?? { total: 0, done: 0 }
        entry.total++
        if (row.status === 'done') entry.done++
        byDate.set(key, entry)
      }

      return Array.from(byDate.entries())
        .map(([dateKey, v]) => ({
          dateKey,
          total: v.total,
          done: v.done,
          rate: v.total === 0 ? 0 : Math.round((v.done / v.total) * 100),
        }))
        .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    },
    staleTime: 60_000,
  })
}
