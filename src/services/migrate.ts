import { useData } from './store'
import { todayKey, weekKey } from '@/lib/dates'
import { useTheme } from '@/lib/theme'
import { setLang } from '@/lib/i18n'
import { hasBackend, supabase } from '@/lib/supabase'
import { initSync } from './sync'
import type { DataState, Task, TaskTier, Goal, Routine, HabitLog, InboxItem, DayStat } from './types'

/**
 * legacy 单文件版（localStorage 'epoch-state' / Supabase app_state 'state.full'）
 * → 新结构一次性迁移。规则：
 *  1. 迁移前先把旧 blob 备份到 'epoch-backup-legacy'（不删原键，防回滚）；
 *  2. done → completed(status)+completedAt=now（legacy 的 done 只表示「今天」）；
 *  3. goal/routine 由标题/名称关联成 id（对不上则置空，不丢任务）；
 *  4. habits chips 与 routines 同名合并，打卡态转 habit_logs（今天的日志）；
 *  5. history → dayStats（70 天点阵历史落点）；review → reviews[weekKey]；
 *  6. theme/lang 迁到新键；lastDay 直接登记为今天（昨日定格已在 history 里）；
 *  7. 幂等：'epoch-migrated-v2' 标记后跳过。
 */

const LEGACY_KEY = 'epoch-state'
const BACKUP_KEY = 'epoch-backup-legacy'
const MIGRATED_KEY = 'epoch-migrated-v2'
const LEGACY_CLOUD_KEY = 'state.full'    // app_state 表里的全量 JSON 键

interface LegacyTask {
  id: string; title: string; tier?: string; time?: string | null; date?: string | null
  dur?: number | null; urgent?: boolean; done?: boolean; goal?: string | null
  routine?: string | null; notes?: string | null
}
interface LegacyHabit { id: string; name: string; sub?: string; done?: boolean }
interface LegacyInbox { id: string; title: string; hint?: string; hintEm?: string }
interface LegacyGoal {
  id: string; kicker?: string; title: string; note?: string; focus?: string; next?: string
  ladder?: { lv: string; t: string; cur: boolean }[]
}
interface LegacyRoutine { id: string; name: string; sub?: string; type?: string }
interface LegacyReview { week?: string; good?: string; drain?: string; one?: string; at?: string }
interface LegacyState {
  tasks?: LegacyTask[]; habits?: LegacyHabit[]; inbox?: LegacyInbox[]
  goals?: LegacyGoal[]; routines?: LegacyRoutine[]
  direction?: string; domains?: string[]; wake?: string; sleep?: string; work?: string
  history?: Record<string, { done?: number; total?: number; urgent?: boolean }>
  review?: LegacyReview | null
  lastDay?: string | null
  theme?: string | null
  lang?: string | null
}

export function mapLegacyState(saved: LegacyState): Partial<DataState> {
  const now = new Date().toISOString()
  const today = todayKey()

  const goals: Goal[] = (saved.goals ?? []).filter((g) => g && g.title).map((g) => ({
    id: g.id,
    title: g.title,
    kicker: g.kicker ?? null,
    note: g.note ?? null,
    focus: g.focus ?? null,
    next: g.next ?? null,
    ladder: Array.isArray(g.ladder) ? g.ladder : [],
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }))
  const goalIdByTitle = new Map(goals.map((g) => [g.title, g.id]))

  const routines: Routine[] = (saved.routines ?? []).filter((r) => r && r.name).map((r) => ({
    id: r.id,
    goalId: null,
    name: r.name,
    sub: r.sub ?? null,
    frequency: null,
    time: null,
    durMin: null,
    kind: r.type === 'habit' ? 'habit' : 'routine',
    archived: false,
    createdAt: now,
    updatedAt: now,
  }))
  const routineIdByName = new Map(routines.map((r) => [r.name, r.id]))

  // 习惯 chips：与 routines 同名合并；打卡态转今天的 habit_logs；无同名则补建 routine
  const habitLogs: HabitLog[] = []
  for (const h of saved.habits ?? []) {
    if (!h?.name) continue
    const rid = routineIdByName.get(h.name)
    if (rid) {
      if (h.done) habitLogs.push({ id: `lg-${h.id}`, routineId: rid, date: today, value: 1, createdAt: now })
    } else {
      routines.push({
        id: h.id, goalId: null, name: h.name, sub: h.sub ?? null, frequency: null,
        time: null, durMin: null, kind: 'habit', archived: false, createdAt: now, updatedAt: now,
      })
      if (h.done) habitLogs.push({ id: `lg-${h.id}`, routineId: h.id, date: today, value: 1, createdAt: now })
    }
  }

  const tasks: Task[] = (saved.tasks ?? []).filter((t) => t && t.title).map((t) => ({
    id: t.id,
    title: t.title,
    tier: ((t.tier as TaskTier) === 'main' || t.tier === 'anytime' ? t.tier : 'block') as TaskTier,
    status: t.done ? 'completed' : 'planned',
    date: t.date ?? null,
    time: t.time ?? null,
    durMin: t.dur ?? null,
    urgent: !!t.urgent,
    completedAt: t.done ? now : null,
    note: t.notes ?? null,
    goalId: t.goal ? (goalIdByTitle.get(t.goal) ?? null) : null,
    routineId: t.routine ? (routineIdByName.get(t.routine) ?? null) : null,
    createdAt: now,
    updatedAt: now,
  }))

  const inbox: InboxItem[] = (saved.inbox ?? []).filter((i) => i && i.title).map((i) => ({
    id: i.id,
    title: i.title,
    hint: i.hintEm ?? i.hint ?? null,
    status: 'open',
    source: 'capture',
    convertedTaskId: null,
    createdAt: now,
  }))

  const dayStats: Record<string, DayStat> = {}
  for (const [k, v] of Object.entries(saved.history ?? {})) {
    if (!k) continue
    dayStats[k] = { done: v?.done ?? 0, total: v?.total ?? 0, urgent: !!v?.urgent }
  }

  const reviews: DataState['reviews'] = {}
  if (saved.review?.week) {
    const wk = weekKey(new Date(saved.review.week))
    reviews[wk] = {
      weekKey: wk,
      wins: saved.review.good ?? '',
      drained: saved.review.drain ?? '',
      oneThing: saved.review.one ?? '',
      createdAt: saved.review.at ?? now,
      updatedAt: now,
    }
  }

  return {
    goals,
    routines,
    tasks,
    habitLogs,
    inbox,
    dayStats,
    reviews,
    direction: {
      statement: saved.direction ?? '',
      domains: Array.isArray(saved.domains) ? saved.domains : [],
      wake: saved.wake ?? null,
      sleep: saved.sleep ?? null,
      work: saved.work ?? null,
    },
    lastDay: today,   // 昨日定格已在 history；直接登记今天，避免对迁移数据误快照
  }
}

/** 偏好迁移（theme/lang 换新键；幂等：新键已存在则不动）。 */
function migratePrefs(saved: LegacyState): void {
  if (saved.theme === 'light' || saved.theme === 'dark' || saved.theme === 'system') {
    if (!localStorage.getItem('epoch-theme')) {
      useTheme.getState().setMode(saved.theme)
    }
  }
  if ((saved.lang === 'zh' || saved.lang === 'en') && !localStorage.getItem('epoch-lang')) {
    setLang(saved.lang)
  }
}

/** 本地 legacy blob 迁移（同步、幂等）。返回是否发生了迁移。 */
export function migrateLocal(): boolean {
  if (localStorage.getItem(MIGRATED_KEY)) return false
  const raw = localStorage.getItem(LEGACY_KEY)
  if (raw) {
    try {
      localStorage.setItem(BACKUP_KEY, raw)   // 先备份，再迁移
      const saved = JSON.parse(raw) as LegacyState
      const patch = mapLegacyState(saved)
      useData.setState((s) => ({ ...s, ...patch }))
      migratePrefs(saved)
    } catch (err) {
      console.warn('[migrate] legacy blob 解析失败（保留原键不删）：', err)
      localStorage.setItem(MIGRATED_KEY, '1')
      return false
    }
  }
  localStorage.setItem(MIGRATED_KEY, '1')
  return true
}

/** 无本地数据时尝试云端 legacy 副本（app_state 'state.full'）。 */
async function migrateCloudLegacy(): Promise<boolean> {
  if (!supabase) return false
  const s = useData.getState()
  if (s.tasks.length > 0 || s.goals.length > 0 || s.inbox.length > 0) return false
  const { data } = await supabase.auth.getSession()
  const uid = data.session?.user?.id
  if (!uid) return false
  try {
    const res = await supabase
      .from('app_state')
      .select('value')
      .eq('user_id', uid)
      .eq('key', LEGACY_CLOUD_KEY)
      .maybeSingle()
    const value = res.data?.value as string | null
    if (!value) return false
    const saved = JSON.parse(value) as LegacyState
    const patch = mapLegacyState(saved)
    useData.setState((cur) => ({ ...cur, ...patch }))
    migratePrefs(saved)
    return true
  } catch (err) {
    console.warn('[migrate] 云端 legacy 副本读取失败：', err)
    return false
  }
}

/** 应用数据启动：本地迁移 → （登录时）云端 legacy 迁移 → 新表拉取/同步。 */
export async function boot(): Promise<void> {
  migrateLocal()
  if (hasBackend) {
    await migrateCloudLegacy()
    await initSync()
  }
}
