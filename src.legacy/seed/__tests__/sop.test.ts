import { describe, expect, it } from 'vitest'
import { DAY_THEMES, SOP_TEMPLATES } from '../sop'

const VALID_CATEGORIES = ['rhythm', 'exercise', 'study', 'supplement', 'skincare', 'review']

describe('SOP 种子数据完整性', () => {
  it('7 天主题齐全', () => {
    expect(DAY_THEMES.map((d) => d.weekday).sort()).toEqual([0, 1, 2, 3, 4, 5, 6])
    for (const d of DAY_THEMES) expect(d.theme.length).toBeGreaterThan(0)
  })

  it('所有模板字段合法', () => {
    for (const t of SOP_TEMPLATES) {
      expect(t.title.length).toBeGreaterThan(0)
      expect(VALID_CATEGORIES).toContain(t.category)
      expect(t.weekdays.length).toBeGreaterThan(0)
      for (const w of t.weekdays) {
        expect(w).toBeGreaterThanOrEqual(0)
        expect(w).toBeLessThanOrEqual(6)
      }
      if (t.time_of_day) expect(t.time_of_day).toMatch(/^\d{2}:\d{2}:\d{2}$/)
    }
  })

  it('每个星期几恰好 5 项最低标准任务', () => {
    for (let w = 0; w <= 6; w++) {
      const minimums = SOP_TEMPLATES.filter((t) => t.is_minimum_standard && t.weekdays.includes(w))
      expect(minimums, `星期 ${w} 的最低标准任务数`).toHaveLength(5)
    }
  })

  it('每个星期几都有任务且不超过 16 项（安排不过满）', () => {
    for (let w = 0; w <= 6; w++) {
      const tasks = SOP_TEMPLATES.filter((t) => t.weekdays.includes(w))
      expect(tasks.length, `星期 ${w} 的任务数`).toBeGreaterThanOrEqual(8)
      expect(tasks.length, `星期 ${w} 的任务数`).toBeLessThanOrEqual(16)
    }
  })

  it('同一天无重复的 标题+时间 组合', () => {
    for (let w = 0; w <= 6; w++) {
      const seen = new Set<string>()
      for (const t of SOP_TEMPLATES.filter((x) => x.weekdays.includes(w))) {
        const key = `${t.title}|${t.time_of_day ?? ''}`
        expect(seen.has(key), `${key} 在星期 ${w} 重复`).toBe(false)
        seen.add(key)
      }
    }
  })
})
