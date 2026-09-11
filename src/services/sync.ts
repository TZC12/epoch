import { supabase, hasBackend } from '@/lib/supabase'
import { useData, initialData } from './store'
import { todayKey } from '@/lib/dates'
import type { DataState } from './types'

/**
 * Supabase best-effort 镜像同步（本地为事实源）：
 *  - 变更后 800ms 防抖整包 upsert（对齐 legacy save() 的节流写）；
 *  - 仅当本地为空（新设备/新浏览器）时拉取远端回填，避免覆盖本地；
 *  - 失败静默降级（dirty 置回，下次再试）；Phase 4 接节流错误 toast。
 * RLS 保证只能触到自己的行（user_id = auth.uid()）。
 */

let timer: ReturnType<typeof setTimeout> | null = null
let dirty = false

export function schedulePush(): void {
  if (!hasBackend) return
  dirty = true
  if (timer != null) return
  timer = setTimeout(() => {
    timer = null
    void push()
  }, 800)
}

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

async function push(): Promise<void> {
  if (!dirty || !supabase) return
  const uid = await currentUserId()
  if (!uid) { dirty = true; return }
  dirty = false
  const s = useData.getState()
  const now = new Date().toISOString()
  try {
    await supabase.from('goals').upsert(
      s.goals.map((g) => ({ id: g.id, user_id: uid, title: g.title, kicker: g.kicker, note: g.note, focus: g.focus, next: g.next, ladder: g.ladder, status: g.status, created_at: g.createdAt, updated_at: g.updatedAt })),
    )
    await supabase.from('routines').upsert(
      s.routines.map((r) => ({ id: r.id, user_id: uid, goal_id: r.goalId, name: r.name, sub: r.sub, frequency: r.frequency, time: r.time, dur_min: r.durMin, kind: r.kind, archived: r.archived, created_at: r.createdAt, updated_at: r.updatedAt })),
    )
    await supabase.from('tasks').upsert(
      s.tasks.map((t) => ({ id: t.id, user_id: uid, goal_id: t.goalId, routine_id: t.routineId, title: t.title, tier: t.tier, status: t.status, date: t.date, time: t.time, dur_min: t.durMin, urgent: t.urgent, completed_at: t.completedAt, note: t.note, created_at: t.createdAt, updated_at: t.updatedAt })),
    )
    await supabase.from('habit_logs').upsert(
      s.habitLogs.map((l) => ({ id: l.id, user_id: uid, routine_id: l.routineId, date: l.date, value: l.value, created_at: l.createdAt })),
    )
    await supabase.from('inbox_items').upsert(
      s.inbox.map((i) => ({ id: i.id, user_id: uid, title: i.title, hint: i.hint, status: i.status, source: i.source, converted_task_id: i.convertedTaskId, created_at: i.createdAt })),
    )
    await supabase.from('reviews').upsert(
      Object.values(s.reviews).map((r) => ({ user_id: uid, week_key: r.weekKey, wins: r.wins, drained: r.drained, one_thing: r.oneThing, created_at: r.createdAt, updated_at: r.updatedAt })),
    )
    await supabase.from('day_stats').upsert(
      Object.entries(s.dayStats).map(([date, v]) => ({ user_id: uid, date, done: v.done, total: v.total, urgent: v.urgent })),
    )
    if (s.direction.statement || s.direction.domains.length > 0) {
      await supabase.from('directions').upsert({ user_id: uid, statement: s.direction.statement, domains: s.direction.domains, wake: s.direction.wake, sleep: s.direction.sleep, work: s.direction.work, updated_at: now })
    }
  } catch (err) {
    dirty = true
    console.warn('[sync] push failed:', err)
  }
}

function remoteToState(g: Record<string, unknown>[], r: Record<string, unknown>[], t: Record<string, unknown>[], l: Record<string, unknown>[], i: Record<string, unknown>[], rv: Record<string, unknown>[], st: Record<string, unknown>[], d: Record<string, unknown> | null): Partial<DataState> {
  const goals = g.map((x) => ({ id: x.id as string, title: x.title as string, kicker: (x.kicker as string | null) ?? null, note: (x.note as string | null) ?? null, focus: (x.focus as string | null) ?? null, next: (x.next as string | null) ?? null, ladder: (x.ladder as DataState['goals'][number]['ladder']) ?? [], status: x.status as DataState['goals'][number]['status'], createdAt: x.created_at as string, updatedAt: x.updated_at as string }))
  const routines = r.map((x) => ({ id: x.id as string, goalId: (x.goal_id as string | null) ?? null, name: x.name as string, sub: (x.sub as string | null) ?? null, frequency: x.frequency ?? null, time: (x.time as string | null) ?? null, durMin: (x.dur_min as number | null) ?? null, kind: x.kind as DataState['routines'][number]['kind'], archived: !!x.archived, createdAt: x.created_at as string, updatedAt: x.updated_at as string }))
  const tasks = t.map((x) => ({ id: x.id as string, title: x.title as string, tier: x.tier as DataState['tasks'][number]['tier'], status: x.status as DataState['tasks'][number]['status'], date: (x.date as string | null) ?? null, time: (x.time as string | null) ?? null, durMin: (x.dur_min as number | null) ?? null, urgent: !!x.urgent, completedAt: (x.completed_at as string | null) ?? null, note: (x.note as string | null) ?? null, goalId: (x.goal_id as string | null) ?? null, routineId: (x.routine_id as string | null) ?? null, createdAt: x.created_at as string, updatedAt: x.updated_at as string }))
  const habitLogs = l.map((x) => ({ id: x.id as string, routineId: x.routine_id as string, date: x.date as string, value: (x.value as number) ?? 1, createdAt: x.created_at as string }))
  const inbox = i.map((x) => ({ id: x.id as string, title: x.title as string, hint: (x.hint as string | null) ?? null, status: x.status as DataState['inbox'][number]['status'], source: (x.source as string | null) ?? null, convertedTaskId: (x.converted_task_id as string | null) ?? null, createdAt: x.created_at as string }))
  const reviews: DataState['reviews'] = {}
  for (const x of rv) reviews[x.week_key as string] = { weekKey: x.week_key as string, wins: (x.wins as string) ?? '', drained: (x.drained as string) ?? '', oneThing: (x.one_thing as string) ?? '', createdAt: x.created_at as string, updatedAt: x.updated_at as string }
  const dayStats: DataState['dayStats'] = {}
  for (const x of st) dayStats[x.date as string] = { done: (x.done as number) ?? 0, total: (x.total as number) ?? 0, urgent: !!x.urgent }
  const direction = d
    ? { statement: (d.statement as string) ?? '', domains: (d.domains as string[]) ?? [], wake: (d.wake as string | null) ?? null, sleep: (d.sleep as string | null) ?? null, work: (d.work as string | null) ?? null }
    : initialData.direction
  return { goals, routines, tasks, habitLogs, inbox, reviews, dayStats, direction }
}

/** 仅当本地为空时从远端回填（返回是否发生了回填）。 */
export async function pullIfEmpty(): Promise<boolean> {
  if (!supabase) return false
  const s = useData.getState()
  const hasLocal = s.tasks.length > 0 || s.goals.length > 0 || s.routines.length > 0 || s.inbox.length > 0 || s.lastDay != null
  if (hasLocal) return false
  const uid = await currentUserId()
  if (!uid) return false
  try {
    const [goals, routines, tasks, logs, inbox, reviews, stats, dir] = await Promise.all([
      supabase.from('goals').select('*').eq('user_id', uid),
      supabase.from('routines').select('*').eq('user_id', uid),
      supabase.from('tasks').select('*').eq('user_id', uid),
      supabase.from('habit_logs').select('*').eq('user_id', uid),
      supabase.from('inbox_items').select('*').eq('user_id', uid),
      supabase.from('reviews').select('*').eq('user_id', uid),
      supabase.from('day_stats').select('*').eq('user_id', uid),
      supabase.from('directions').select('*').eq('user_id', uid).maybeSingle(),
    ])
    const count = (tasks.data?.length ?? 0) + (goals.data?.length ?? 0) + (routines.data?.length ?? 0) + (inbox.data?.length ?? 0)
    if (count === 0) return false
    const patch = remoteToState(
      (goals.data ?? []) as Record<string, unknown>[], (routines.data ?? []) as Record<string, unknown>[],
      (tasks.data ?? []) as Record<string, unknown>[], (logs.data ?? []) as Record<string, unknown>[],
      (inbox.data ?? []) as Record<string, unknown>[], (reviews.data ?? []) as Record<string, unknown>[],
      (stats.data ?? []) as Record<string, unknown>[], (dir.data ?? null) as Record<string, unknown> | null,
    )
    useData.setState({ ...patch, lastDay: todayKey() })
    return true
  } catch (err) {
    console.warn('[sync] pull failed:', err)
    return false
  }
}

/** 启动同步：拉取 + 登录事件跟随。 */
export async function initSync(): Promise<void> {
  await pullIfEmpty()
  if (supabase) {
    void supabase.auth.onAuthStateChange((evt) => {
      if (evt === 'SIGNED_IN') void pullIfEmpty()
    })
  }
}
