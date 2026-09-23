import type { HealthDay } from '@/services/types'

/**
 * 健康日记打分（0–100，纯派生，不落库）：
 * 步数 30 + 睡眠 30 + 静息心率 20 + 深睡 10 + 体重记录 10。
 */
export type HealthGrade = 'ex' | 'good' | 'fair' | 'poor'

const EMPTY: HealthDay = { steps: 0, restingHR: 0, sleepMin: 0, deepMin: 0, weight: 0 }

export function scoreHealthDay(day: HealthDay | null): { score: number; grade: HealthGrade } {
  const d = day ?? EMPTY
  let s = 0
  s += Math.min(d.steps / 10000, 1) * 30
  s += Math.min(d.sleepMin / 480, 1) * 30
  if (d.restingHR > 0) {
    s += d.restingHR >= 55 && d.restingHR <= 70 ? 20 : Math.max(0, 20 - Math.abs(d.restingHR > 70 ? d.restingHR - 70 : 55 - d.restingHR) * 1.5)
  }
  s += Math.min(d.deepMin / 120, 1) * 10
  if (d.weight > 0) s += 10
  const score = Math.round(s)
  const grade: HealthGrade = score >= 85 ? 'ex' : score >= 70 ? 'good' : score >= 50 ? 'fair' : 'poor'
  return { score, grade }
}

/** 低能量判定：睡眠 <6.5h 或静息心率 >78（Plan/AI 侧降档用）。 */
export function isLowEnergy(day: HealthDay | null): boolean {
  if (!day) return false
  return day.sleepMin > 0 && day.sleepMin < 390 || day.restingHR > 78
}
