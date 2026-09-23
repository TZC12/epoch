/** FitPage 课程目录（常量，不落库；完成记录见 FitSession）。 */
export interface FitCourse {
  id: string
  minutes: number
  kcal: number
  level: 'beginner' | 'medium' | 'high'
  focus: 'fullbody' | 'burn' | 'relax' | 'core' | 'cardio' | 'strength'
}

export const FIT_COURSES: FitCourse[] = [
  { id: 'hiit-fullbody', minutes: 25, kcal: 220, level: 'medium', focus: 'fullbody' },
  { id: 'hiit-intro', minutes: 20, kcal: 180, level: 'beginner', focus: 'burn' },
  { id: 'yoga-morning', minutes: 15, kcal: 90, level: 'beginner', focus: 'relax' },
  { id: 'core', minutes: 18, kcal: 140, level: 'medium', focus: 'core' },
  { id: 'run-easy', minutes: 30, kcal: 240, level: 'beginner', focus: 'cardio' },
  { id: 'strength-base', minutes: 35, kcal: 200, level: 'high', focus: 'strength' },
]

export function courseById(id: string | null): FitCourse | null {
  if (!id) return null
  return FIT_COURSES.find((c) => c.id === id) ?? null
}
