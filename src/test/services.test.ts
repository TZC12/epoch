import { beforeEach, describe, expect, it } from 'vitest'
import { useData, initialData, dayCounts, goalPct, checkDayRollover, completedForKeys, completedAllTime } from '@/services/store'
import * as A from '@/services/actions'
import { migrateLocal } from '@/services/migrate'
import { todayKey, dateKey, addDays, weekKey } from '@/lib/dates'

const reset = (): void => {
  localStorage.clear()
  useData.persist.clearStorage()
  A.__replaceStateForTests(structuredClone(initialData))
}

beforeEach(reset)

describe('legacy 迁移（migrateLocal）', () => {
  it('备份 → 映射 → 偏好迁移 → 幂等', () => {
    const today = todayKey()
    const yesterday = dateKey(addDays(new Date(), -1))
    const legacy = {
      tasks: [
        { id: 't1', title: '早餐', tier: 'block', time: '07:00', dur: 20, done: true, notes: '蛋白质优先' },
        { id: 't5', title: 'Run · 30 min', tier: 'main', time: '20:15', dur: 30, done: false, goal: '体态与精力改善', routine: 'Run', urgent: true },
        { id: 't7', title: '睡觉', tier: 'block', time: '23:20', done: false },
      ],
      habits: [{ id: 'h2', name: 'Posture', sub: '5 min', done: true }],
      inbox: [{ id: 'i1', title: 'Research Gentherm', hint: '建议', hintEm: '周四 22:00' }],
      goals: [{ id: 'g2', kicker: 'HEALTH', title: '体态与精力改善', note: '当前季度', focus: '每日体态', next: '稳定三天', ladder: [{ lv: 'Quarter', t: '体态与精力改善', cur: true }] }],
      routines: [
        { id: 'r1', name: 'Run', sub: 'Mon / Wed / Fri', type: 'habit' },
        { id: 'r2', name: 'Posture', sub: 'Daily', type: 'habit' },
      ],
      direction: 'I want more freedom.',
      domains: ['Career', 'Health'],
      wake: '06:50', sleep: '23:20', work: '08:00 – 18:30',
      history: { [yesterday]: { done: 2, total: 5, urgent: true } },
      review: { week: '2026-09-07', good: '跑步三次', drain: '开会太多', one: '把复盘提前到周五', at: new Date().toISOString() },
      theme: 'dark', lang: 'en', lastDay: yesterday,
    }
    localStorage.setItem('epoch-state', JSON.stringify(legacy))

    expect(migrateLocal()).toBe(true)
    expect(localStorage.getItem('epoch-backup-legacy')).toBeTruthy()

    const s = useData.getState()
    expect(s.tasks).toHaveLength(3)
    const breakfast = s.tasks.find((t) => t.id === 't1')!
    expect(breakfast.status).toBe('completed')
    expect(breakfast.completedAt).toBeTruthy()
    expect(breakfast.note).toBe('蛋白质优先')
    const run = s.tasks.find((t) => t.id === 't5')!
    expect(run.goalId).toBe('g2')        // 标题关联
    expect(run.routineId).toBe('r1')     // 名称关联
    expect(run.urgent).toBe(true)
    expect(s.habitLogs.some((l) => l.routineId === 'r2' && l.date === today)).toBe(true) // Posture 打卡
    expect(s.inbox[0].hint).toBe('周四 22:00')
    expect(s.dayStats[yesterday]).toEqual({ done: 2, total: 5, urgent: true })
    expect(Object.keys(s.reviews)).toContain(weekKey(new Date('2026-09-07')))
    expect(s.direction.statement).toBe('I want more freedom.')
    expect(s.lastDay).toBe(today)        // 直接登记今天
    expect(localStorage.getItem('epoch-lang')).toBe('en')
    expect(localStorage.getItem('epoch-theme')).toContain('dark')

    expect(migrateLocal()).toBe(false)   // 幂等
  })

  it('无 legacy 数据时安全通过', () => {
    expect(migrateLocal()).toBe(true)
    expect(useData.getState().tasks).toHaveLength(0)
  })

  it('损坏 blob：不崩溃、不删原键', () => {
    localStorage.setItem('epoch-state', '{broken json')
    expect(migrateLocal()).toBe(false)
    expect(localStorage.getItem('epoch-state')).toBe('{broken json')
  })
})

describe('actions（唯一写入口）', () => {
  it('capture → convert → 改期 → skip → toggle → 删除/撤销', () => {
    const item = A.captureInbox('Research Gentherm', '周四 22:00')
    expect(item).toBeTruthy()
    expect(useData.getState().inbox.filter((i) => i.status === 'open')).toHaveLength(1)

    const task = A.convertInboxItem(item!.id, { date: todayKey(), time: '22:00', durMin: 45 })
    expect(task!.status).toBe('scheduled')
    expect(task!.time).toBe('22:00')
    expect(useData.getState().inbox.find((i) => i.id === item!.id)!.status).toBe('converted')

    const tomorrow = dateKey(addDays(new Date(), 1))
    A.rescheduleTask(task!.id, tomorrow)
    expect(useData.getState().tasks.find((t) => t.id === task!.id)!.date).toBe(tomorrow)

    A.skipTask(task!.id)
    expect(useData.getState().tasks.find((t) => t.id === task!.id)!.status).toBe('skipped')
    A.toggleTask(task!.id)
    expect(useData.getState().tasks.find((t) => t.id === task!.id)!.status).toBe('completed')

    const snap = A.deleteTask(task!.id)!
    expect(useData.getState().tasks).toHaveLength(0)
    A.restoreTask(snap.item, snap.index)
    expect(useData.getState().tasks).toHaveLength(1)
  })

  it('captureInbox 空白拒绝', () => {
    expect(A.captureInbox('   ')).toBeNull()
  })

  it('toggleTask 撤销当日完成', () => {
    const t = A.createTask({ title: 'A' })
    A.toggleTask(t.id)
    expect(useData.getState().tasks[0].status).toBe('completed')
    A.toggleTask(t.id)
    const after = useData.getState().tasks[0]
    expect(after.completedAt).toBeNull()
    expect(after.status).toBe('planned')
  })

  it('habit 打卡=日志：toggle 增/删今天的记录', () => {
    useData.setState({
      routines: [{ id: 'r1', goalId: null, name: 'Posture', sub: null, frequency: null, time: null, durMin: null, kind: 'habit', archived: false, createdAt: '', updatedAt: '' }],
    })
    A.toggleHabit('r1')
    expect(useData.getState().habitLogs).toHaveLength(1)
    A.toggleHabit('r1')
    expect(useData.getState().habitLogs).toHaveLength(0)
  })

  it('saveReview 同周键回填 + oneThing 入箱（未变不重复）', () => {
    const wk = weekKey(new Date())
    A.saveReview(wk, { wins: '三次跑步', drained: '会议', oneThing: '把复盘提前' })
    expect(useData.getState().reviews[wk].wins).toBe('三次跑步')
    expect(useData.getState().inbox.some((i) => i.title === '把复盘提前' && i.source === 'review_one_thing')).toBe(true)
    A.saveReview(wk, { wins: '三次跑步+', drained: '会议', oneThing: '把复盘提前' })
    expect(useData.getState().reviews[wk].wins).toBe('三次跑步+')
    expect(useData.getState().inbox.filter((i) => i.source === 'review_one_thing')).toHaveLength(1)
  })
})

describe('rollover（跨日）', () => {
  it('定格昨日 → 登记 today → 幂等；睡觉排除', () => {
    const yesterday = dateKey(addDays(new Date(), -1))
    const t1 = A.createTask({ title: 'A', time: '08:00' })
    A.createTask({ title: '睡觉', time: '23:20' })
    A.toggleTask(t1.id)
    // 把完成时间回拨到昨天（真实流程里跨日时完成时间本来就是昨天）
    A.updateTask(t1.id, { completedAt: new Date(`${yesterday}T22:00:00`).toISOString() })
    useData.setState({ lastDay: yesterday })

    expect(checkDayRollover()).toBe(true)
    const s = useData.getState()
    expect(s.lastDay).toBe(todayKey())
    expect(s.dayStats[yesterday]).toMatchObject({ done: 1, total: 1 })
    expect(checkDayRollover()).toBe(false)
  })

  it('首次使用只登记不重置', () => {
    expect(useData.getState().lastDay).toBeNull()
    expect(checkDayRollover()).toBe(false)
    expect(useData.getState().lastDay).toBe(todayKey())
  })
})

describe('派生', () => {
  it('dayCounts：排除睡觉/取消，urgent 传染', () => {
    const today = todayKey()
    A.createTask({ title: 'A', time: '08:00' })
    A.createTask({ title: '睡觉', time: '23:20' })
    const c = A.createTask({ title: 'C', urgent: true })
    expect(dayCounts(useData.getState().tasks, today)).toEqual({ done: 0, total: 2, urgent: true })
    A.toggleTask(c.id)
    expect(dayCounts(useData.getState().tasks, today).done).toBe(1)
  })

  it('goalPct：任务完成率派生（无假数据）', () => {
    useData.setState({
      goals: [{ id: 'g1', title: 'X', kicker: null, note: null, focus: null, next: null, ladder: [], status: 'active', createdAt: '', updatedAt: '' }],
    })
    const t1 = A.createTask({ title: 'a', goalId: 'g1' })
    A.createTask({ title: 'b', goalId: 'g1' })
    A.toggleTask(t1.id)
    const s = useData.getState()
    expect(goalPct('g1', s.tasks, s.habitLogs, s.routines)).toBe(50)
    expect(goalPct('g-none', s.tasks, s.habitLogs, s.routines)).toBe(0)
  })
})

describe('Goal/例程 CRUD（Phase 4 闭环）', () => {
  it('createGoal：空标题拒绝；正常创建 active', () => {
    expect(A.createGoal({ title: '  ' })).toBeNull()
    const g = A.createGoal({ title: '上线 v1', kicker: 'Quarter' })!
    const s = useData.getState()
    expect(s.goals).toHaveLength(1)
    expect(s.goals[0].status).toBe('active')
    expect(s.goals[0].title).toBe('上线 v1')
    void g
  })

  it('updateGoal + setGoalStatus 状态机', () => {
    const g = A.createGoal({ title: 'G' })!
    A.updateGoal(g.id, { focus: '设计系统' })
    expect(useData.getState().goals[0].focus).toBe('设计系统')
    A.setGoalStatus(g.id, 'paused')
    expect(useData.getState().goals[0].status).toBe('paused')
    A.setGoalStatus(g.id, 'active')
    A.setGoalStatus(g.id, 'archived')
    expect(useData.getState().goals[0].status).toBe('archived')
  })

  it('createRoutine/archiveRoutine：归档软删，打卡历史保留', () => {
    expect(A.createRoutine({ name: ' ' })).toBeNull()
    const r = A.createRoutine({ name: 'Reading', time: '22:00', durMin: 20 })!
    A.toggleHabit(r.id)
    expect(useData.getState().habitLogs).toHaveLength(1)
    A.archiveRoutine(r.id)
    const s = useData.getState()
    expect(s.routines[0].archived).toBe(true)
    expect(s.habitLogs).toHaveLength(1) // 历史不丢
  })
})

describe('completedForKeys/completedAllTime（M9 单一聚合源，口径不可漂移）', () => {
  it('同键序列同值；全历史 = Σstats + 今日实时；今日实时不与 stats 重复计', () => {
    useData.setState({
      dayStats: {
        '2026-09-01': { done: 2, total: 3, urgent: false },
        '2026-09-02': { done: 3, total: 4, urgent: false },
      },
      tasks: [{ id: 't9', title: '今日事', tier: 'main', status: 'completed', date: null, time: null, durMin: null, urgent: false, completedAt: new Date(`${todayKey()}T10:00:00`).toISOString(), note: null, goalId: null, routineId: null, createdAt: '', updatedAt: '' }],
    })
    const s = useData.getState()
    expect(completedForKeys(['2026-09-01'], s.dayStats, s.tasks, todayKey())).toBe(2)
    expect(completedForKeys(['2026-09-01', '2026-09-02', todayKey()], s.dayStats, s.tasks, todayKey())).toBe(6)
    expect(completedAllTime(s.dayStats, s.tasks, todayKey())).toBe(6)
  })
})

describe('健康（Demo 输入 + 能量规则）', () => {
  it('connectHealthDemo 标明 demo；energyOf 规则可解释', () => {
    A.connectHealthDemo()
    const h = useData.getState().health!
    expect(h.connected).toBe(true)
    expect(h.source).toBe('demo')
    expect(A.energyOf(h)).toBe('low') // 6.3h < 7.5-1
    useData.setState({ health: { connected: true, source: 'demo', today: { sleepHours: 7.2, usualSleep: 7.5, restingHR: 58, hrv: 48, steps: 6000 } } })
    expect(A.energyOf(useData.getState().health)).toBe('normal')
  })

  it('disconnectHealth 清空（UI 侧负责确认）', () => {
    A.connectHealthDemo()
    A.disconnectHealth()
    expect(useData.getState().health).toBeNull()
  })
})
