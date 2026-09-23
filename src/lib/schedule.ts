/* ══════════════════════════════════════════════════════════════════════════
 * 自适应习惯调度引擎 —— RoutineTracker（DanielRendox）core/domain 的 TS 移植。
 *
 * 关键理念（区别于普通习惯打卡 App）：
 *  1. 一个习惯按「日程」重复（每日 / 每周指定日 / 每周 N 天 / 每月指定日 / 每月 N 天 /
 *     隔周期 / 自定义日期），不是简单的「每天」。
 *  2. 周期内各日相互依赖：漏掉的日子变成「待补 backlog」，提前完成会「抵消」未来的到期日。
 *     —— 即 Adaptive Scheduling，用一个「schedule deviation（进度差）」刻画。
 *  3. 周期彼此独立（weekly/monthly/alternate）：上一周期的超额不会顺延取消下一周期的到期。
 *  4. 连续记录（streak）以「创建连续的日子」为单位，遇到「失败日」才断，未到期日不断。
 *
 * 纯函数、无副作用、无 React 依赖；便于单测与在 store/query 层复用。
 * ══════════════════════════════════════════════════════════════════════════ */

import {
  addDaysKey,
  diffDays,
  endOfMonthKey,
  rangeKeys,
  startOfMonthKey,
  weekdayIndex,
} from './dates'

/** 星期索引：周一=0 … 周日=6（与 dates.ts WEEKDAY_ZH 对齐）。 */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

/**
 * 日程定义（存进 Routine.frequency: jsonb，可空）。
 * 所有日期均为 'YYYY-MM-DD' 本地键。
 */
export type Schedule =
  | { kind: 'daily'; startDate: string; endDate?: string | null }
  | { kind: 'weekly'; daysOfWeek: Weekday[]; startDate: string; endDate?: string | null }
  | { kind: 'weeklyCount'; n: number; startDate: string; endDate?: string | null }
  | { kind: 'monthly'; daysOfMonth: number[]; includeLastDay?: boolean; startDate: string; endDate?: string | null }
  | { kind: 'monthlyCount'; n: number; startDate: string; endDate?: string | null }
  | { kind: 'alternate'; dueDays: number; periodDays: number; startDate: string; endDate?: string | null }
  | { kind: 'custom'; dates: string[]; startDate: string; endDate?: string | null }

/** 单日状态（决定日历点色 + 今日是否出现在「待办」）。 */
export type HabitStatus =
  | 'notStarted'      // 早于 startDate
  | 'finished'        // 晚于 endDate
  | 'completed'       // 到期且已完成
  | 'completedLater'  // 曾漏，后被补回（同一周期内进度差回正）
  | 'failed'          // 到期、过去、未完成
  | 'planned'         // 到期、今天或未来、未完成
  | 'backlog'         // 未到期，但有欠账可补（catch-up 机会）
  | 'sortedOutBacklog'// 未到期但完成，抵消了欠账
  | 'overCompleted'   // 未到期且完成，形成提前量
  | 'alreadyCompleted'// 到期，但提前量已覆盖，可跳过
  | 'notDue'          // 未到期且无欠账

/** 计入连续记录的状态（对齐 RoutineTracker streakCreatorStatuses）。 */
export const STREAK_CREATOR_STATUSES: HabitStatus[] = ['completed', 'overCompleted', 'sortedOutBacklog']
/** 今日应出现在任务流的状态（对齐 dueOrCompletedStatuses）。 */
export const DUE_OR_DONE_STATUSES: HabitStatus[] = ['planned', 'backlog', 'failed', 'completed', 'overCompleted', 'sortedOutBacklog']

/* ───────────────────────── 解析 / 构造 ───────────────────────── */

/** 把 Routine.frequency 的未知 JSON 安全解析为 Schedule；非法返回 null。 */
export function parseSchedule(raw: unknown): Schedule | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>
  const startDate = typeof s.startDate === 'string' ? s.startDate : null
  if (!startDate) return null
  const endDate = typeof s.endDate === 'string' ? s.endDate : null
  const isKey = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
  switch (s.kind) {
    case 'daily':
      return { kind: 'daily', startDate, endDate }
    case 'weekly': {
      if (!Array.isArray(s.daysOfWeek)) return null
      const days = s.daysOfWeek.filter((d): d is Weekday => typeof d === 'number' && d >= 0 && d <= 6)
      if (!days.length) return null
      return { kind: 'weekly', daysOfWeek: Array.from(new Set(days)).sort(), startDate, endDate }
    }
    case 'weeklyCount': {
      const n = typeof s.n === 'number' ? Math.max(1, Math.min(7, Math.round(s.n))) : 0
      return n ? { kind: 'weeklyCount', n, startDate, endDate } : null
    }
    case 'monthly': {
      if (!Array.isArray(s.daysOfMonth)) return null
      const dm = s.daysOfMonth.filter((d): d is number => typeof d === 'number' && d >= 1 && d <= 31)
      return { kind: 'monthly', daysOfMonth: Array.from(new Set(dm)).sort((a, b) => a - b), includeLastDay: !!s.includeLastDay, startDate, endDate }
    }
    case 'monthlyCount': {
      const n = typeof s.n === 'number' ? Math.max(1, Math.min(31, Math.round(s.n))) : 0
      return n ? { kind: 'monthlyCount', n, startDate, endDate } : null
    }
    case 'alternate': {
      const dueDays = typeof s.dueDays === 'number' ? Math.round(s.dueDays) : 0
      const periodDays = typeof s.periodDays === 'number' ? Math.round(s.periodDays) : 0
      return dueDays >= 1 && periodDays > dueDays && periodDays <= 198
        ? { kind: 'alternate', dueDays, periodDays, startDate, endDate }
        : null
    }
    case 'custom': {
      if (!Array.isArray(s.dates)) return null
      const dates = Array.from(new Set(s.dates.filter(isKey))).sort()
      return dates.length ? { kind: 'custom', dates, startDate, endDate } : null
    }
    default:
      return null
  }
}

/** 人类可读的周期标签（供习惯卡副标题，替代旧的 free-text `sub`）。lang 适配中/英两端。 */
export function scheduleLabel(s: Schedule | null, lang: 'zh' | 'en' = 'zh'): string {
  if (!s) return lang === 'zh' ? '随时' : 'Anytime'
  const wd = lang === 'zh' ? '一二三四五六日' : 'MTWTFSS'
  const sep = lang === 'zh' ? '、' : ', '
  switch (s.kind) {
    case 'daily': return lang === 'zh' ? '每天' : 'Daily'
    case 'weekly': return lang === 'zh'
      ? `每周 ${s.daysOfWeek.map((d) => wd[d]).join(sep)}`
      : `Weekly · ${s.daysOfWeek.map((d) => wd[d]).join(sep)}`
    case 'weeklyCount': return lang === 'zh' ? `每周 ${s.n} 天` : `${s.n}× / week`
    case 'monthly': return lang === 'zh'
      ? `每月 ${s.daysOfMonth.join(sep)} 日${s.includeLastDay ? ' + 月末' : ''}`
      : `Monthly · day ${s.daysOfMonth.join(sep)}${s.includeLastDay ? ' + last' : ''}`
    case 'monthlyCount': return lang === 'zh' ? `每月 ${s.n} 天` : `${s.n}× / month`
    case 'alternate': return lang === 'zh'
      ? `每 ${s.periodDays} 天做 ${s.dueDays} 天`
      : `${s.dueDays} of every ${s.periodDays} days`
    case 'custom': return lang === 'zh' ? `${s.dates.length} 个指定日期` : `${s.dates.length} set dates`
  }
}

/* ───────────────────────── 到期判定 ───────────────────────── */

/** 该日程在 date 是否「计划到期」（纯频率，不含自适应）。 */
export function isDue(s: Schedule, date: string): boolean {
  if (date < s.startDate) return false
  if (s.endDate && date > s.endDate) return false
  switch (s.kind) {
    case 'daily':
      return true
    case 'weekly':
      return s.daysOfWeek.includes(weekdayIndex(date) as Weekday)
    case 'monthly': {
      const dom = Number(date.slice(8, 10))
      if (s.includeLastDay && date === endOfMonthKey(date)) return true
      return s.daysOfMonth.includes(dom)
    }
    case 'custom':
      return s.dates.includes(date)
    case 'weeklyCount':
    case 'monthlyCount':
    case 'alternate':
      // 「N 天/周期」类：落在周期内的前 N 个自然日 → 到期。
      return firstNDaysOfPeriodIsDue(s, date)
  }
}

function firstNDaysOfPeriodIsDue(s: Schedule, date: string): boolean {
  const { start } = periodRange(s, date)
  const idx = diffDays(start, date) // 0-based 周期内序号
  const n =
    s.kind === 'alternate' ? s.dueDays
    : s.kind === 'weeklyCount' ? s.n
    : s.kind === 'monthlyCount' ? s.n
    : 0
  return idx >= 0 && idx < n
}

/* ───────────────────────── 周期区间（独立周期） ───────────────────────── */

/** date 所属周期的 [start, end]（含端点）。非周期日程返回整个跨度。 */
export function periodRange(s: Schedule, date: string): { start: string; end: string } {
  let start: string
  let end: string
  switch (s.kind) {
    case 'daily':
      start = s.startDate
      end = s.endDate ?? addDaysKey(start, 3650)
      break
    case 'custom':
      start = s.dates[0] ?? s.startDate
      end = s.dates[s.dates.length - 1] ?? s.startDate
      break
    case 'weekly':
    case 'weeklyCount': {
      const k = Math.floor(diffDays(s.startDate, date) / 7)
      start = addDaysKey(s.startDate, k * 7)
      end = addDaysKey(start, 6)
      break
    }
    case 'monthly':
    case 'monthlyCount':
      start = startOfMonthKey(date)
      end = endOfMonthKey(date)
      break
    case 'alternate': {
      const k = Math.floor(diffDays(s.startDate, date) / s.periodDays)
      start = addDaysKey(s.startDate, k * s.periodDays)
      end = addDaysKey(start, s.periodDays - 1)
      break
    }
  }
  // 周期不早于 startDate、不晚于 endDate。
  if (start < s.startDate) start = s.startDate
  if (s.endDate && end > s.endDate) end = s.endDate
  return { start, end }
}

/* ───────────────────────── 自适应状态计算 ───────────────────────── */

/** 单日完成次数集合：routineId → Set<dateKey>（value>0 视为完成）。 */
export type CompletionSet = Set<string>

export function toCompletionSet(logs: { routineId: string; date: string; value: number }[], routineId: string): CompletionSet {
  const set = new Set<string>()
  for (const l of logs) if (l.routineId === routineId && l.value > 0) set.add(l.date)
  return set
}

/**
 * 计算 date 在给定日程与完成历史下的状态。
 * 自适应：在 date 所属周期内，从周期起点按时间推进「进度差 balance = 已完成 − 应完成」，
 * balance<0 表示欠账（backlog），>0 表示提前量（credit）。
 *
 * 说明：未来日不产生欠账/失败；只有 <= today 的到期未完成日才计为 failed 并累积欠账。
 */
export function computeStatus(
  s: Schedule,
  date: string,
  done: CompletionSet,
  today: string,
): HabitStatus {
  if (date < s.startDate) return 'notStarted'
  if (s.endDate && date > s.endDate) return 'finished'

  const { start, end } = periodRange(s, date)

  // Phase 1：推进到 date 之前，累计「进入 date 时的进度差 balance」。
  // balance<0 欠账（backlog），>0 提前量（credit）。只有 <=today 的到期未完成日才计欠，
  // 未到期但完成的日按「先抵欠、再转提前量」的顺序结算。
  let balance = 0
  for (const d of rangeKeys(start, end)) {
    if (d >= date || d > end) break
    const due = isDue(s, d)
    const completed = done.has(d)
    if (completed) {
      if (!due) balance += 1 // 非到期日完成 = 净贡献（抵欠或转提前）
      // 到期且完成：应做已做，balance 不变
    } else if (due && d < today) {
      balance -= 1 // 到期、已尘埃落定（早于今天）、未完成 = 欠一天
    }
  }

  // Phase 2：用进入 date 时的 balance 判定 date 当天状态。
  const due = isDue(s, date)
  const completed = done.has(date)
  const settled = date < today // 今天全天保持 planned，次日才转 failed

  if (completed) {
    if (due) return 'completed'
    return balance < 0 ? 'sortedOutBacklog' : 'overCompleted'
  }
  if (due) {
    if (settled) return 'failed'
    return balance > 0 ? 'alreadyCompleted' : 'planned'
  }
  // 未到期、未完成
  if (!settled && balance < 0 && backlogEnabled(s)) return 'backlog'
  return 'notDue'
}

function backlogEnabled(s: Schedule): boolean {
  return s.kind !== 'daily' // 每日日程无「补欠」概念
}

/** 一段区间内逐日状态（日历视图直接消费）。 */
export function statusesInRange(
  s: Schedule,
  done: CompletionSet,
  today: string,
  from: string,
  to: string,
): { date: string; status: HabitStatus }[] {
  return rangeKeys(from, to).map((date) => ({ date, status: computeStatus(s, date, done, today) }))
}

/* ───────────────────────── 连续记录 streak ───────────────────────── */

export interface StreakResult {
  current: number
  longest: number
}

/**
 * 从 startDate 推进到 today，按「创建连续的日子」计连续，遇失败日断。
 * 未到期且非欠账日（notDue）不打断也不累加（惰性）。
 * 为性能：只回看最近 `lookbackDays`（默认 400 天）——足够覆盖常规 streak。
 */
export function computeStreak(
  s: Schedule,
  done: CompletionSet,
  today: string,
  lookbackDays = 400,
): StreakResult {
  const from = s.startDate > addDaysKey(today, -lookbackDays) ? s.startDate : addDaysKey(today, -lookbackDays)
  let current = 0
  let longest = 0
  for (const d of rangeKeys(from, today)) {
    const st = computeStatus(s, d, done, today)
    if (STREAK_CREATOR_STATUSES.includes(st)) {
      current += 1
      if (current > longest) longest = current
    } else if (st === 'failed') {
      current = 0
    }
    // planned/backlog/notDue/... 惰性：不增不断
  }
  return { current, longest }
}

/** 今日是否应出现在任务流（到期/欠账/失败/已完成）。 */
export function isActionableToday(s: Schedule, done: CompletionSet, today: string): boolean {
  return DUE_OR_DONE_STATUSES.includes(computeStatus(s, today, done, today))
}

/* ───────────────────────── 便捷：某日「应做」的习惯集合 ───────────────────────── */
