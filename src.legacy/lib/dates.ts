const WEEKDAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

/** 本地日期键 YYYY-MM-DD */
export function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayKey(): string {
  return toDateKey(new Date())
}

/** 0=周一 … 6=周日 */
export function weekdayIndex(d: Date): number {
  return (d.getDay() + 6) % 7
}

export function dateKeyToWeekday(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return weekdayIndex(new Date(y, m - 1, d))
}

export function weekdayName(w: number): string {
  return WEEKDAY_NAMES[w] ?? ''
}

/** 如「8月22日 周五」 */
export function formatCnDate(d: Date): string {
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdayName(weekdayIndex(d))}`
}

/** '06:45:00' → '06:45'；null → '' */
export function formatTime(time: string | null): string {
  if (!time) return ''
  const [h, m] = time.split(':')
  return `${h}:${m}`
}

export function formatTimeLabel(time: string | null): string {
  return time ? formatTime(time) : '随时'
}
