/** 日期工具（本地时区；YYYY-MMDD 唯一键格式与旧版 state.history 对齐）。 */

export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayKey(): string {
  return dateKey(new Date())
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** ISO 周键（周一为一周之始）：2026-W37 */
export function weekKey(d: Date = new Date()): string {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = x.getUTCDay() || 7          // 周日=7
  x.setUTCDate(x.getUTCDate() + 4 - day)  // 周四所在的 ISO 周
  const yearStart = new Date(Date.UTC(x.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((x.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${x.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export function isSameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b)
}

/** 中文星期标签（周一…周日） */
export const WEEKDAY_ZH = ['一', '二', '三', '四', '五', '六', '日'] as const
