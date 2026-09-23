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

/** 中文星期标签（周一…周日） */
export const WEEKDAY_ZH = ['一', '二', '三', '四', '五', '六', '日'] as const

/* ── 日期键工具（调度引擎依赖；全部以 'YYYY-MM-DD' 本地键为唯一表示，避免时区漂移） ── */

/** 'YYYY-MM-DD' → 本地正午 Date（noon-trick：规避 UTC 解析的跨日偏移）。 */
export function parseKey(key: string): Date {
  return new Date(`${key}T12:00:00`)
}

/** 键 + n 天 → 键。 */
export function addDaysKey(key: string, n: number): string {
  return dateKey(addDays(parseKey(key), n))
}

/** b − a 的整天数（a、b 为键；正数表示 b 在 a 之后）。DST 安全：用正午时刻差。 */
export function diffDays(a: string, b: string): number {
  return Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 86400000)
}

/** 星期索引，周一=0 … 周日=6（与 WEEKDAY_ZH 对齐）。 */
export function weekdayIndex(key: string): number {
  return (parseKey(key).getDay() + 6) % 7
}

/** 键所在自然月的首日 / 末日。 */
export function startOfMonthKey(key: string): string {
  const d = parseKey(key)
  return dateKey(new Date(d.getFullYear(), d.getMonth(), 1))
}
export function endOfMonthKey(key: string): string {
  const d = parseKey(key)
  return dateKey(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}
export function daysInMonth(key: string): number {
  const d = parseKey(key)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

/** [from, to] 闭区间逐日键（含端点）。to<from 时返回空。 */
export function rangeKeys(from: string, to: string): string[] {
  const out: string[] = []
  const n = diffDays(from, to)
  for (let i = 0; i <= n; i++) out.push(addDaysKey(from, i))
  return out
}


/* ── 格式化（3 处去重：FocusVeil/planMyDay/weather） ── */

const pad2 = (n: number): string => String(Math.max(0, Math.floor(n))).padStart(2, '0')

/** 秒数 → 'mm:ss'（FocusVeil 计时；0≤s）。 */
export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  return `${pad2(s / 60)}:${pad2(s % 60)}`
}

/** 总分钟（可能 ≥60）→ 'HH:MM'（planMyDay 建议位；mod 24）。 */
export function fmtMinutes(totalMin: number): string {
  const m = Math.max(0, Math.floor(totalMin))
  return `${pad2(m / 60)}:${pad2(m % 60)}`
}

/** Date → 'HH:00'（weather 当前小时；分钟恒 00）。 */
export function fmtHour(d: Date): string {
  return `${pad2(d.getHours())}:00`
}
