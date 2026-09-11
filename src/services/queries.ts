import { useEffect } from 'react'
import { useData, tasksForDay, dayCounts, goalPct, checkDayRollover } from './store'
import { dateKey, todayKey, addDays } from '@/lib/dates'
import type { Task, Goal, Routine, HabitLog, InboxItem, DayStat, Direction } from './types'

/* ── 查询 hooks：全部从本地 store 派生（本地优先；云同步由 sync 层负责） ── */

/** 当前「今天」（rollover 保证 lastDay 跟随真实日期）。 */
export function useToday(): string {
  return useData((s) => s.lastDay) ?? todayKey()
}

/** 跨日检测：挂载 + 30s 定时器 + visibilitychange（对齐 legacy 三触发点）。 */
export function useDayRollover(): void {
  useEffect(() => {
    checkDayRollover()
    const iv = window.setInterval(checkDayRollover, 30_000)
    const onVis = (): void => {
      if (document.visibilityState === 'visible') checkDayRollover()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(iv)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])
}

const byTime = (a: Task, b: Task): number => (a.time ?? '99:99').localeCompare(b.time ?? '99:99')

/** 今天的时间轴：有时间的在前，随时（无 time）殿后。 */
export function useTodayTasks(): Task[] {
  const today = useToday()
  const tasks = useData((s) => s.tasks)
  return tasksForDay(tasks, today).sort(byTime)
}

/** Plan「已排」：有真实 date 的任务，按日期+时间排。 */
export function useScheduledTasks(): Task[] {
  const tasks = useData((s) => s.tasks)
  return tasks
    .filter((t) => t.date != null && t.status !== 'cancelled')
    .sort((a, b) => `${a.date} ${a.time ?? '99:99'}`.localeCompare(`${b.date} ${b.time ?? '99:99'}`))
}

export function useInboxOpen(): InboxItem[] {
  const inbox = useData((s) => s.inbox)
  return inbox.filter((i) => i.status === 'open')   // filter 在组件层：selector 保持稳定引用
}

/** Today 习惯条：例程 kind='habit' + 今日打卡态。 */
export function useHabitsToday(): { routine: Routine; done: boolean }[] {
  const today = useToday()
  const routines = useData((s) => s.routines)
  const logs = useData((s) => s.habitLogs)
  return routines
    .filter((r) => r.kind === 'habit' && !r.archived)
    .map((r) => ({ routine: r, done: logs.some((l) => l.routineId === r.id && l.date === today) }))
}

/** Me/Progress 目标列表（真实 pct 派生）。 */
export function useGoalsWithPct(): { goal: Goal; pct: number }[] {
  const goals = useData((s) => s.goals)
  const tasks = useData((s) => s.tasks)
  const logs = useData((s) => s.habitLogs)
  const routines = useData((s) => s.routines)
  return goals
    .filter((g) => g.status === 'active')
    .map((g) => ({ goal: g, pct: goalPct(g.id, tasks, logs, routines) }))
}

/** 70 天点阵数据：历史=定格快照；今天=实时派生（不落缓存）。 */
export function useCalendarStats(days = 70): { key: string; stat: DayStat | null }[] {
  const today = useToday()
  const stats = useData((s) => s.dayStats)
  const tasks = useData((s) => s.tasks)
  const out: { key: string; stat: DayStat | null }[] = []
  const base = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const k = dateKey(addDays(base, -i))
    out.push({ key: k, stat: k === today ? dayCounts(tasks, today) : (stats[k] ?? null) })
  }
  return out
}

export function useWeekReview(wk: string): ReturnType<typeof useData.getState>['reviews'][string] | undefined {
  return useData((s) => s.reviews[wk])
}

export function useDirection(): Direction {
  return useData((s) => s.direction)
}

export function useHabitLogOf(routineId: string): HabitLog | undefined {
  const today = useToday()
  return useData((s) => s.habitLogs.find((l) => l.routineId === routineId && l.date === today))
}
