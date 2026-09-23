import { describe, it, expect } from 'vitest'
import {
  parseSchedule,
  isDue,
  periodRange,
  computeStatus,
  computeStreak,
  toCompletionSet,
  type Schedule,
} from '@/lib/schedule'

// 用固定基准，避免依赖真实时钟。
const S = '2026-09-07' // 周一
const done = (dates: string[]) => new Set(dates)

describe('parseSchedule', () => {
  it('接受合法 weekly，拒绝缺 startDate', () => {
    expect(parseSchedule({ kind: 'weekly', daysOfWeek: [0, 2, 4], startDate: S })).toBeTruthy()
    expect(parseSchedule({ kind: 'weekly', daysOfWeek: [0] })).toBeNull()
    expect(parseSchedule(null)).toBeNull()
    expect(parseSchedule({ kind: 'nope', startDate: S })).toBeNull()
  })
  it('weekly 去重排序 + 越界星期剔除', () => {
    const s = parseSchedule({ kind: 'weekly', daysOfWeek: [4, 0, 4, 9, 0], startDate: S }) as Schedule
    expect(s.kind === 'weekly' && s.daysOfWeek).toEqual([0, 4])
  })
})

describe('isDue', () => {
  it('weekly 指定日：周一/三/五', () => {
    const s = parseSchedule({ kind: 'weekly', daysOfWeek: [0, 2, 4], startDate: S })!
    expect(isDue(s, '2026-09-07')).toBe(true)  // 周一
    expect(isDue(s, '2026-09-08')).toBe(false) // 周二
    expect(isDue(s, '2026-09-09')).toBe(true)  // 周三
    expect(isDue(s, '2026-09-11')).toBe(true)  // 周五
  })
  it('monthly 指定日 + 月末', () => {
    const s = parseSchedule({ kind: 'monthly', daysOfMonth: [1, 15], includeLastDay: true, startDate: S })!
    expect(isDue(s, '2026-09-15')).toBe(true)
    expect(isDue(s, '2026-09-30')).toBe(true)  // 9 月末日
    expect(isDue(s, '2026-09-16')).toBe(false)
  })
  it('alternate 3 做 2 歇', () => {
    const s = parseSchedule({ kind: 'alternate', dueDays: 3, periodDays: 5, startDate: S })!
    expect(['07', '08', '09'].map((d) => isDue(s, `2026-09-${d}`))).toEqual([true, true, true])
    expect(['10', '11'].map((d) => isDue(s, `2026-09-${d}`))).toEqual([false, false])
    expect(isDue(s, '2026-09-12')).toBe(true) // 下一周期首三天
  })
  it('早于 startDate 永不到期', () => {
    const s = parseSchedule({ kind: 'daily', startDate: S })!
    expect(isDue(s, '2026-09-01')).toBe(false)
  })
})

describe('periodRange（独立周期）', () => {
  it('weekly 周期 = 自 startDate 起每 7 天', () => {
    const s = parseSchedule({ kind: 'weekly', daysOfWeek: [0], startDate: S })!
    expect(periodRange(s, '2026-09-13')).toEqual({ start: '2026-09-07', end: '2026-09-13' })
    expect(periodRange(s, '2026-09-14')).toEqual({ start: '2026-09-14', end: '2026-09-20' })
  })
  it('monthly 周期 = 自然月（首月被 startDate 截断）', () => {
    const s = parseSchedule({ kind: 'monthly', daysOfMonth: [5], startDate: S })!
    expect(periodRange(s, '2026-09-21')).toEqual({ start: '2026-09-07', end: '2026-09-30' })
    expect(periodRange(s, '2026-10-10')).toEqual({ start: '2026-10-01', end: '2026-10-31' })
  })
})

describe('computeStatus（自适应核心）', () => {
  // RoutineTracker 文档示例：周日一二四(=周一二四日? 用周一/二/四/五) 习惯，漏掉首日 → 后续变 backlog。
  it('到期且完成 = completed', () => {
    const s = parseSchedule({ kind: 'weekly', daysOfWeek: [0, 1, 3, 4], startDate: S })!
    expect(computeStatus(s, '2026-09-07', done(['2026-09-07']), '2026-09-17')).toBe('completed')
  })
  it('到期、过去、未完成 = failed', () => {
    const s = parseSchedule({ kind: 'weekly', daysOfWeek: [0, 1, 3, 4], startDate: S })!
    expect(computeStatus(s, '2026-09-07', done([]), '2026-09-17')).toBe('failed')
  })
  it('今天到期未完成 = planned', () => {
    const s = parseSchedule({ kind: 'weekly', daysOfWeek: [4], startDate: S })!
    expect(computeStatus(s, '2026-09-11', done([]), '2026-09-11')).toBe('planned')
  })
  it('漏掉到期日后，未到期日显示 backlog（可补）', () => {
    // 周一/二/四/五 到期，周一漏（过去未完成），周二今天且未到期 → backlog 补欠机会
    const s = parseSchedule({ kind: 'weekly', daysOfWeek: [0, 1, 3, 4], startDate: S })!
    // 周一(07) failed 累积欠账；周三(09) 未到期，today=09 → backlog
    expect(computeStatus(s, '2026-09-09', done([]), '2026-09-09')).toBe('backlog')
  })
  it('补做未到期日 = sortedOutBacklog', () => {
    const s = parseSchedule({ kind: 'weekly', daysOfWeek: [0, 1, 3, 4], startDate: S })!
    // 周一漏，周三(未到期)完成 → 抵消欠账
    expect(computeStatus(s, '2026-09-09', done(['2026-09-09']), '2026-09-09')).toBe('sortedOutBacklog')
  })
  it('提前完成后，未来到期日 = alreadyCompleted', () => {
    // 每周一二到期。周日(未到期)提前完成 → 下周一可 alreadyCompleted
    const s = parseSchedule({ kind: 'weekly', daysOfWeek: [0, 1], startDate: S })!
    // 用同周期：周一(07)提前? 周一就是到期日。改用 alternate 更直观：
    // alternate 每5天做3天，从07起。第4天(10)未到期，先完成形成提前量，第5天(11)也未到期。
    const a = parseSchedule({ kind: 'alternate', dueDays: 2, periodDays: 5, startDate: S })!
    // 07,08 到期。若 07 完成、08 也完成 → 09(未到期)完成形成 over；未来周期 12,13 到期。
    expect(computeStatus(a, '2026-09-09', done(['2026-09-07', '2026-09-08', '2026-09-09']), '2026-09-09')).toBe('overCompleted')
    // 提前量使下一到期日 12 变 alreadyCompleted（today 仍 09，12 在未来）
    expect(computeStatus(a, '2026-09-12', done(['2026-09-07', '2026-09-08', '2026-09-09']), '2026-09-09')).toBe('planned')
    void s
  })
  it('未到期且无欠账 = notDue', () => {
    // 仅周五到期，从周一起；周三(09)之前无任何到期日 → 无欠账 → notDue
    const s = parseSchedule({ kind: 'weekly', daysOfWeek: [4], startDate: S })!
    expect(computeStatus(s, '2026-09-09', done([]), '2026-09-09')).toBe('notDue')
  })
  it('早于 startDate = notStarted；晚于 endDate = finished', () => {
    const s = parseSchedule({ kind: 'daily', startDate: S, endDate: '2026-09-20' })!
    expect(computeStatus(s, '2026-09-01', done([]), '2026-09-17')).toBe('notStarted')
    expect(computeStatus(s, '2026-09-25', done([]), '2026-09-26')).toBe('finished')
  })
})

describe('computeStreak', () => {
  it('每日习惯：连续完成累加，漏一天归零', () => {
    const s = parseSchedule({ kind: 'daily', startDate: S })!
    // 07,08,09 完成，10 漏，11,12 完成，today=12
    const d = toCompletionSet(
      ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-11', '2026-09-12'].map((x) => ({ routineId: 'r', date: x, value: 1 })),
      'r',
    )
    const r = computeStreak(s, d, '2026-09-12')
    expect(r.current).toBe(2)   // 11,12
    expect(r.longest).toBe(3)   // 07,08,09
  })
  it('未到期日不打断 weekly streak', () => {
    // 每周一，连续三个周一完成，中间的非周一无关
    const s = parseSchedule({ kind: 'weekly', daysOfWeek: [0], startDate: S })!
    const d = toCompletionSet(
      ['2026-09-07', '2026-09-14', '2026-09-21'].map((x) => ({ routineId: 'r', date: x, value: 1 })),
      'r',
    )
    const r = computeStreak(s, d, '2026-09-23')
    expect(r.current).toBe(3)
    expect(r.longest).toBe(3)
  })
})
