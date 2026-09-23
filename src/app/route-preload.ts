/* 首访不再"卡一秒"（其一）：AppShell 挂载后趁浏览器空闲预取全部页面 chunk——
   dev 的按需编译 / 生产的网络拉取都发生在空闲期，点卡片时模块已在缓存，秒开。
   单独成模块：router 依赖 AppShell，反向 import 会成循环。 */
const PRELOADS: (() => Promise<unknown>)[] = [
  () => import('@/features/plan/PlanPage'),
  () => import('@/features/fit/FitPage'),
  () => import('@/features/learn/LearnPage'),
  () => import('@/features/notes/NotesPage'),
  () => import('@/features/health/HealthPage'),
  () => import('@/features/progress/ProgressPage'),
  () => import('@/features/me/MePage'),
  () => import('@/features/goals/GoalPanel'),
]

export function preloadRoutes(): void {
  const run = (): void => PRELOADS.forEach((p) => { void p().catch(() => undefined) })
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 2500 })
  else window.setTimeout(run, 600)
}
