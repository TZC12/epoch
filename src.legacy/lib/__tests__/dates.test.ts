import { describe, expect, it } from 'vitest'
import {
  dateKeyToWeekday,
  formatCnDate,
  formatTime,
  toDateKey,
  weekdayIndex,
} from '../dates'

describe('dates', () => {
  it('toDateKey 生成 YYYY-MM-DD', () => {
    expect(toDateKey(new Date(2026, 7, 22))).toBe('2026-08-22')
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('weekdayIndex 0=周一 … 6=周日', () => {
    expect(weekdayIndex(new Date(2026, 7, 24))).toBe(0) // 2026-08-24 周一
    expect(weekdayIndex(new Date(2026, 7, 22))).toBe(5) // 2026-08-22 周六
    expect(weekdayIndex(new Date(2026, 7, 23))).toBe(6) // 2026-08-23 周日
  })

  it('dateKeyToWeekday 与 weekdayIndex 一致', () => {
    for (let i = 22; i <= 28; i++) {
      const key = `2026-08-${String(i).padStart(2, '0')}`
      expect(dateKeyToWeekday(key)).toBe(weekdayIndex(new Date(2026, 7, i)))
    }
  })

  it('formatCnDate 输出中文日期与星期', () => {
    expect(formatCnDate(new Date(2026, 7, 22))).toBe('8月22日 周六')
  })

  it('formatTime 去掉秒，null 返回空串', () => {
    expect(formatTime('06:45:00')).toBe('06:45')
    expect(formatTime(null)).toBe('')
  })
})
