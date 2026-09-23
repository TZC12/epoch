import { beforeEach, describe, expect, it } from 'vitest'
import { useData, initialData } from '@/services/store'
import * as A from '@/services/actions'
import { scoreHealthDay, isLowEnergy } from '@/lib/health-score'
import { learnStreakOf } from '@/services/queries'
import { todayKey, addDaysKey } from '@/lib/dates'

beforeEach(() => {
  localStorage.clear()
  useData.persist.clearStorage()
  A.__replaceStateForTests(structuredClone(initialData))
})

describe('scoreHealthDay', () => {
  it('空记录 0 分 poor；满分形态 ex', () => {
    expect(scoreHealthDay(null)).toEqual({ score: 0, grade: 'poor' })
    const full = scoreHealthDay({ steps: 10000, restingHR: 60, sleepMin: 480, deepMin: 120, weight: 65 })
    expect(full.score).toBeGreaterThanOrEqual(85)
    expect(full.grade).toBe('ex')
  })
  it('心率偏离 55–70 衰减', () => {
    const base = { steps: 10000, sleepMin: 480, deepMin: 120, weight: 65 }
    const good = scoreHealthDay({ ...base, restingHR: 62 })
    const bad = scoreHealthDay({ ...base, restingHR: 90 })
    expect(bad.score).toBeLessThan(good.score)
  })
  it('isLowEnergy：睡眠 <6.5h 或静息心率 >78', () => {
    expect(isLowEnergy({ steps: 0, restingHR: 60, sleepMin: 360, deepMin: 0, weight: 0 })).toBe(true)
    expect(isLowEnergy({ steps: 0, restingHR: 90, sleepMin: 480, deepMin: 0, weight: 0 })).toBe(true)
    expect(isLowEnergy({ steps: 0, restingHR: 60, sleepMin: 480, deepMin: 0, weight: 0 })).toBe(false)
    expect(isLowEnergy(null)).toBe(false)
  })
})

describe('learnStreakOf', () => {
  const e = (langId: string, date: string) => ({ langId, date })
  it('无记录=0；今天起连续；断档截止昨天仍算', () => {
    const t = todayKey()
    expect(learnStreakOf([], 'l1', t)).toBe(0)
    expect(learnStreakOf([e('l1', t), e('l1', addDaysKey(t, -1)), e('l1', addDaysKey(t, -2))], 'l1', t)).toBe(3)
    expect(learnStreakOf([e('l1', addDaysKey(t, -1))], 'l1', t)).toBe(1)
    expect(learnStreakOf([e('l1', addDaysKey(t, -2))], 'l1', t)).toBe(0)
    expect(learnStreakOf([e('l1', t), e('l2', t)], 'l1', t)).toBe(1)
  })
})

describe('fit/learn/notes/health actions', () => {
  it('logFitSession：按分钟折算 kcal，最少 1 分钟', () => {
    const s = A.logFitSession('hiit-fullbody', 0.2, 220 / 25)
    expect(s.minutes).toBe(1)
    expect(s.kcal).toBeGreaterThan(0)
    expect(useData.getState().fitSessions.some((x) => x.id === s.id)).toBe(true)
  })
  it('addLearnLang：同名去重、首个自动激活；removeLearnLang 级联', () => {
    const l1 = A.addLearnLang('英语', 20)!
    expect(l1).toBeTruthy()
    expect(A.addLearnLang('英语')).toBeNull()
    expect(useData.getState().learnActive).toBe(l1.id)
    A.logLearn(l1.id, 'words', 5, 3)
    A.addLearnWord(l1.id, 'abc', '字母')
    A.removeLearnLang(l1.id)
    const s = useData.getState()
    expect(s.learnLangs).toHaveLength(0)
    expect(s.learnEntries).toHaveLength(0)
    expect(s.learnWords).toHaveLength(0)
    expect(s.learnActive).toBeNull()
  })
  it('notes：create 前插、update 触 updatedAt、delete→restore 原位', () => {
    const a = A.createNote({ title: 'A', body: 'a' })!
    const b = A.createNote({ title: 'B', tags: ['灵感'] })!
    expect(useData.getState().notes.map((n) => n.id)).toEqual([b.id, a.id])
    A.updateNote(a.id, { pinned: true })
    expect(useData.getState().notes.find((n) => n.id === a.id)!.pinned).toBe(true)
    const snap = A.deleteNote(b.id)!
    expect(useData.getState().notes.some((n) => n.id === b.id)).toBe(false)
    A.restoreNote(snap.item, snap.index)
    expect(useData.getState().notes.map((n) => n.id)).toEqual([b.id, a.id])
  })
  it('normalizeTags：Token Field 标签去空/去重（大小写不敏感）/剥 #，保序', () => {
    expect(A.normalizeTags([' 灵感 ', '', '  ', '灵感', 'Ideas', '#ideas', '读书'])).toEqual(['灵感', 'Ideas', '读书'])
    const n = A.createNote({ title: 'T', tags: ['a', 'A', 'b'] })!
    expect(n.tags).toEqual(['a', 'b'])
  })
  it('saveHealthDay：写 healthDays 并刷新 legacy health（source=manual）', () => {
    const t = todayKey()
    A.saveHealthDay(t, { steps: 8000, restingHR: 60, sleepMin: 420, deepMin: 90, weight: 66 })
    const s = useData.getState()
    expect(s.healthDays[t]!.steps).toBe(8000)
    expect(s.health!.source).toBe('manual')
    expect(s.health!.today!.sleepHours).toBeCloseTo(7, 5)
    expect(s.health!.today!.steps).toBe(8000)
  })
  it('createTask 支持 category；updateTask 可清除', () => {
    const task = A.createTask({ title: '看书', category: 'study' })
    expect(task.category).toBe('study')
    A.updateTask(task.id, { category: null })
    expect(useData.getState().tasks[0]!.category).toBeNull()
  })
})
