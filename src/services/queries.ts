import { useEffect, useMemo } from 'react'
import { useData, tasksForDay, dayCounts, goalPct, checkDayRollover } from './store'
import { dateKey, todayKey, addDays, addDaysKey, rangeKeys } from '@/lib/dates'
import {
  parseSchedule,
  computeStatus,
  statusesInRange,
  computeStreak,
  toCompletionSet,
  isActionableToday,
  type Schedule,
  type HabitStatus,
} from '@/lib/schedule'
import type { Task, Goal, Routine, InboxItem, DayStat, Direction, LearnLang, LearnWord, HealthDay } from './types'
import { scoreHealthDay } from '@/lib/health-score'

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

/** 解析习惯日程；旧数据（frequency=null）按「每天」处理，锚定创建日。 */
export function scheduleOf(r: Routine): Schedule {
  return parseSchedule(r.frequency) ?? { kind: 'daily', startDate: (r.createdAt || todayKey()).slice(0, 10) }
}

/** Today 习惯条：仅返回今日「应出现」的习惯（到期/欠账/失败/已完成），带自适应状态与连续记录。 */
export function useHabitsToday(): {
  routine: Routine
  status: HabitStatus
  done: boolean
  schedule: Schedule
  streak: number
}[] {
  const today = useToday()
  const routines = useData((s) => s.routines)
  const logs = useData((s) => s.habitLogs)
  return useMemo(() => {
    const computeDone = (id: string) => toCompletionSet(logs, id)
    return routines
      .filter((r) => r.kind === 'habit' && !r.archived)
      .map((r) => {
        const schedule = scheduleOf(r)
        const done = computeDone(r.id)
        const status = computeStatus(schedule, today, done, today)
        return { routine: r, status, done: done.has(today), schedule, streak: computeStreak(schedule, done, today).current }
      })
      .filter((x) => isActionableToday(x.schedule, computeDone(x.routine.id), today))
  }, [routines, logs, today])
}

/** 某习惯在 [from,to] 区间的逐日状态（日历/点阵视图消费）。 */
/** 某习惯的当前/最长连续记录。 */
/** Progress 习惯回顾：每个习惯的连续记录 + 近 N 日逐日自适应状态（日历点阵消费）。 */
export function useHabitsReview(days = 28): {
  routine: Routine
  streak: { current: number; longest: number }
  statuses: { date: string; status: HabitStatus }[]
}[] {
  const today = useToday()
  const routines = useData((s) => s.routines)
  const logs = useData((s) => s.habitLogs)
  const from = dateKey(addDays(new Date(), -(days - 1)))
  return useMemo(() => routines
    .filter((r) => r.kind === 'habit' && !r.archived)
    .map((r) => {
      const schedule = scheduleOf(r)
      const done = toCompletionSet(logs, r.id)
      return {
        routine: r,
        streak: computeStreak(schedule, done, today),
        statuses: statusesInRange(schedule, done, today, from, today),
      }
    }), [routines, logs, today, from])
}

/** Me/Progress 目标列表（真实 pct 派生）。 */
export function useGoalsWithPct(): { goal: Goal; pct: number }[] {
  const goals = useData((s) => s.goals)
  const tasks = useData((s) => s.tasks)
  const logs = useData((s) => s.habitLogs)
  const routines = useData((s) => s.routines)
  return useMemo(() => goals
    .filter((g) => g.status === 'active')
    .map((g) => ({ goal: g, pct: goalPct(g.id, tasks, logs, routines) })), [goals, tasks, logs, routines])
}

/** 70 天点阵数据：历史=定格快照；今天=实时派生（不落缓存）。 */
export function useCalendarStats(days = 70): { key: string; stat: DayStat | null }[] {
  const today = useToday()
  const stats = useData((s) => s.dayStats)
  const tasks = useData((s) => s.tasks)
  // 当天实时 dayCounts 提前算一次；其余走 stats 索引，避免 70 × filter 全 tasks
  const todayStat = dayCounts(tasks, today)
  return useMemo(() => {
    const base = new Date()
    const out: { key: string; stat: DayStat | null }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const k = dateKey(addDays(base, -i))
      out.push({ key: k, stat: k === today ? todayStat : (stats[k] ?? null) })
    }
    return out
  }, [today, stats, todayStat, days])
}

export function useWeekReview(wk: string): ReturnType<typeof useData.getState>['reviews'][string] | undefined {
  return useData((s) => s.reviews[wk])
}

export function useDirection(): Direction {
  return useData((s) => s.direction)
}

/* ── Fit / Learn / Health / Notes 派生查询 ── */

/** Fit 本周（今天往前 7 天）：总 kcal / 总分钟 / 训练天数 + 逐日 kcal 序列。 */
export function useFitWeek(): { kcal: number; minutes: number; days: number; series: { date: string; kcal: number }[] } {
  const today = useToday()
  const sessions = useData((s) => s.fitSessions)
  return useMemo(() => {
    const keys = rangeKeys(addDaysKey(today, -6), today)
    const inWeek = sessions.filter((x) => keys.includes(x.date))
    return {
      kcal: inWeek.reduce((a, x) => a + x.kcal, 0),
      minutes: inWeek.reduce((a, x) => a + x.minutes, 0),
      days: new Set(inWeek.map((x) => x.date)).size,
      series: keys.map((date) => ({ date, kcal: inWeek.filter((x) => x.date === date).reduce((a, x) => a + x.kcal, 0) })),
    }
  }, [sessions, today])
}

/** Fit 今日：所选课程与已完成分钟/kcal。 */
export function useFitToday(): { courseId: string | null; doneMin: number; doneKcal: number } {
  const today = useToday()
  const courseId = useData((s) => s.fitToday)
  const sessions = useData((s) => s.fitSessions)
  return useMemo(() => {
    const todays = sessions.filter((x) => x.date === today)
    return { courseId, doneMin: todays.reduce((a, x) => a + x.minutes, 0), doneKcal: todays.reduce((a, x) => a + x.kcal, 0) }
  }, [courseId, sessions, today])
}

/** 某语言学习连续天数（含今日或昨日截止；纯函数便于测试）。 */
export function learnStreakOf(entries: { date: string; langId: string }[], langId: string, today: string): number {
  const done = new Set(entries.filter((e) => e.langId === langId).map((e) => e.date))
  if (done.size === 0) return 0
  let cursor = today
  if (!done.has(cursor)) cursor = addDaysKey(cursor, -1)
  let n = 0
  while (done.has(cursor)) { n += 1; cursor = addDaysKey(cursor, -1) }
  return n
}

export interface LearnTodayView {
  lang: LearnLang | null
  words: number
  minutes: number
  pct: number
  streak: number
}

/** Learn 今日：活跃语言的 词数（words 模式）/ 总分钟 / 目标进度 / 连续。 */
export function useLearnToday(): LearnTodayView {
  const today = useToday()
  const langs = useData((s) => s.learnLangs)
  const activeId = useData((s) => s.learnActive)
  const entries = useData((s) => s.learnEntries)
  return useMemo(() => {
    const lang = langs.find((l) => l.id === activeId) ?? null
    if (!lang) return { lang: null, words: 0, minutes: 0, pct: 0, streak: 0 }
    const todays = entries.filter((e) => e.langId === lang.id && e.date === today)
    const words = todays.filter((e) => e.mode === 'words').reduce((a, e) => a + e.words, 0)
    const minutes = todays.reduce((a, e) => a + e.minutes, 0)
    return {
      lang,
      words,
      minutes,
      pct: lang.goal > 0 ? Math.min(1, words / lang.goal) : 0,
      streak: learnStreakOf(entries, lang.id, today),
    }
  }, [langs, activeId, entries, today])
}

/** Health 今日：手动记录（缺省为空对象）+ 得分。 */
export function useHealthToday(): { day: HealthDay | null; score: number; grade: ReturnType<typeof scoreHealthDay>['grade'] } {
  const today = useToday()
  const days = useData((s) => s.healthDays)
  const day = days[today] ?? null
  return { day, ...scoreHealthDay(day) }
}

/** Health 近 7 天步数序列 + 日均 + 上一次体重。 */
export function useHealthWeek(): { series: { date: string; steps: number | null }[]; avg: number; prevWeight: number | null } {
  const today = useToday()
  const days = useData((s) => s.healthDays)
  return useMemo(() => {
    const keys = rangeKeys(addDaysKey(today, -6), today)
    const series = keys.map((date) => ({ date, steps: days[date]?.steps ?? null }))
    const withSteps = series.filter((x) => x.steps != null && x.steps > 0)
    const weightDates = Object.keys(days).filter((d) => d < today && (days[d]?.weight ?? 0) > 0).sort()
    const last = weightDates[weightDates.length - 1]
    return {
      series,
      avg: withSteps.length ? Math.round(withSteps.reduce((a, x) => a + (x.steps ?? 0), 0) / withSteps.length) : 0,
      prevWeight: last ? (days[last]?.weight ?? null) : null,
    }
  }, [days, today])
}

/** Notes 标签计数（按出现次数降序；一篇多标签各自计入，未分类不进 chips）。 */
export function useNoteTags(): { tag: string; count: number }[] {
  const notes = useData((s) => s.notes)
  return useMemo(() => {
    const m = new Map<string, number>()
    for (const n of notes) for (const t of n.tags) m.set(t, (m.get(t) ?? 0) + 1)
    return [...m.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count)
  }, [notes])
}


/** 今日到期的复习词（Leitner：due<=今天 且 box<5）；语言为空返回 []。 */
export function useWordsDue(langId: string | null): LearnWord[] {
  const words = useData((s) => s.learnWords)
  const today = todayKey()
  return useMemo(
    () => (langId ? words.filter((w) => w.langId === langId && (w.box ?? 1) < 5 && (w.due ?? today) <= today) : []),
    [words, langId, today],
  )
}
