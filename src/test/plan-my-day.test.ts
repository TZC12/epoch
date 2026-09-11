import { describe, expect, it, beforeEach } from 'vitest'
import { buildSuggestedDay, parseWindows, type PlanMyDayInput } from '@/features/plan/planMyDay'
import { useData, initialData } from '@/services/store'
import * as A from '@/services/actions'

const base: PlanMyDayInput = {
  direction: { statement: '', domains: [], wake: '07:00', sleep: '23:00', work: null },
  tasks: [],
  routines: [],
  inbox: [],
  today: '2026-09-09',
}

beforeEach(() => {
  useData.setState(initialData, true)
})

describe('parseWindows', () => {
  it('wake→sleep 单窗', () => {
    expect(parseWindows(base.direction)).toEqual([{ start: 420, end: 1380 }])
  })
  it('工作时段挖窗：07:00-23:00 减 09:00-18:00 → 两窗', () => {
    const wins = parseWindows({ ...base.direction, work: '09:00-18:00' })
    expect(wins).toEqual([{ start: 420, end: 540 }, { start: 1080, end: 1380 }])
  })
})

describe('buildSuggestedDay（真生成，无假模板）', () => {
  it('空输入 → 空建议（不再产固定模板）', () => {
    expect(buildSuggestedDay(base)).toEqual([])
  })

  it('有时间的例程占位且不生成任务；游标避开例程时段', () => {
    const s = buildSuggestedDay({
      ...base,
      routines: [{ id: 'r1', goalId: null, name: '晨间例行', sub: null, frequency: null, time: '07:30', durMin: 15, kind: 'habit', archived: false, createdAt: '', updatedAt: '' }],
      inbox: [{ id: 'i1', title: '联系供应商', hint: null, status: 'open', source: 'capture', convertedTaskId: null, createdAt: '' }],
    })
    expect(s[0]).toMatchObject({ time: '07:00', title: '联系供应商', source: 'inbox', reason: '来自收集箱' })
    expect(s[1]).toMatchObject({ time: '07:30', title: '晨间例行', source: 'routine' })
  })

  it('随时任务优先于收集箱入空档', () => {
    const s = buildSuggestedDay({
      ...base,
      tasks: [{ id: 't1', title: '整理笔记', tier: 'anytime', status: 'planned', date: null, time: null, durMin: 45, urgent: false, completedAt: null, note: null, goalId: null, routineId: null, createdAt: '2026-09-08T00:00:00Z', updatedAt: '' }],
      inbox: [{ id: 'i1', title: '回邮件', hint: null, status: 'open', source: 'capture', convertedTaskId: null, createdAt: '' }],
    })
    const fills = s.filter((x) => x.source !== 'routine')
    expect(fills[0]).toMatchObject({ title: '整理笔记', durMin: 45 })
    expect(fills[1]).toMatchObject({ title: '回邮件', durMin: 30 })
  })

  it('低能量 → 填充建议上限 3', () => {
    const inbox = Array.from({ length: 6 }, (_, i) => ({ id: `i${i}`, title: `事项${i}`, hint: null, status: 'open' as const, source: 'capture', convertedTaskId: null, createdAt: '' }))
    const s = buildSuggestedDay({ ...base, inbox, lowEnergy: true })
    expect(s.filter((x) => x.source === 'inbox')).toHaveLength(3)
  })

  it('建议时间不越睡眠线、不撞已排任务', () => {
    const s = buildSuggestedDay({
      ...base,
      tasks: [
        { id: 't0', title: '已排会', tier: 'block', status: 'scheduled', date: '2026-09-09', time: '19:00', durMin: 60, urgent: false, completedAt: null, note: null, goalId: null, routineId: null, createdAt: '', updatedAt: '' },
      ],
      inbox: [{ id: 'i1', title: 'A', hint: null, status: 'open', source: 'capture', convertedTaskId: null, createdAt: '' },
              { id: 'i2', title: 'B', hint: null, status: 'open', source: 'capture', convertedTaskId: null, createdAt: '' }],
    })
    for (const x of s) {
      const m = Number(x.time.slice(0, 2)) * 60 + Number(x.time.slice(3))
      expect(m).toBeGreaterThanOrEqual(420)
      expect(m + x.durMin).toBeLessThanOrEqual(1380)
      if (x.title === 'A') expect(m + x.durMin).toBeLessThanOrEqual(1140) // 不撞 19:00 已排
    }
  })

  it('Accept 落库：inbox 转换为带时间任务（actions 层验证）', () => {
    A.captureInbox('写周报')
    const item = useData.getState().inbox[0]
    const task = A.convertInboxItem(item.id, { date: '2026-09-09', time: '09:00', durMin: 30 })
    expect(task).toMatchObject({ title: '写周报', date: '2026-09-09', time: '09:00' })
    expect(useData.getState().inbox[0].status).toBe('converted')
  })
})
