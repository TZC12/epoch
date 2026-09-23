import { supabase, hasBackend } from '@/lib/supabase'
import { useData, initialData } from './store'
import { pruneFolders } from './folders'
import { todayKey } from '@/lib/dates'
import { parseSchedule } from '@/lib/schedule'
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
    /* 0006 新分片：健身/学习/备忘/健康（aiConfig 刻意不上云——密钥只留本机） */
    await supabase.from('fit_sessions').upsert(
      s.fitSessions.map((x) => ({ id: x.id, user_id: uid, course_id: x.courseId, date: x.date, minutes: x.minutes, kcal: x.kcal, created_at: x.createdAt })),
    )
    await supabase.from('learn_langs').upsert(
      s.learnLangs.map((x) => ({ id: x.id, user_id: uid, name: x.name, goal: x.goal, created_at: x.createdAt })),
    )
    await supabase.from('learn_active').upsert({ user_id: uid, lang_id: s.learnActive, updated_at: now }, { onConflict: 'user_id' })
    await supabase.from('learn_entries').upsert(
      s.learnEntries.map((x) => ({ id: x.id, user_id: uid, lang_id: x.langId, date: x.date, words: x.words, minutes: x.minutes, mode: x.mode, created_at: x.createdAt })),
    )
    await supabase.from('learn_words').upsert(
      s.learnWords.map((x) => ({ id: x.id, user_id: uid, lang_id: x.langId, word: x.word, meaning: x.meaning, example: x.example, tag: x.tag, box: x.box, due: x.due, source: x.source, created_at: x.createdAt })),
    )
    /* 0007：成组关系随 notes 一起上云（folder_id 列 + note_folders 表，RLS 同 0006）。
       夹的删除不传播（本层是 upsert 镜像，所有分片都如此），所以回填侧用
       pruneFolders 重跑一遍"<2 成员即解散"，云端残留的空夹不会在新设备上复活。
       aiConfig 仍然刻意不上云——密钥只留用户本机浏览器。 */
    await supabase.from('note_folders').upsert(
      s.noteFolders.map((f) => ({ id: f.id, user_id: uid, title: f.title, created_at: f.createdAt })),
    )
    await supabase.from('notes').upsert(
      s.notes.map((x) => ({ id: x.id, user_id: uid, title: x.title, body: x.body, tags: x.tags, pinned: x.pinned, folder_id: x.folderId, created_at: x.createdAt, updated_at: x.updatedAt })),
    )
    await supabase.from('health_days').upsert(
      Object.entries(s.healthDays).map(([date, v]) => ({ user_id: uid, date, steps: v.steps, resting_hr: v.restingHR, sleep_min: v.sleepMin, deep_min: v.deepMin, weight: v.weight, updated_at: now })),
    )
  } catch (err) {
    dirty = true
    console.warn('[sync] push failed:', err)
  }
}

function remoteToState(g: Record<string, unknown>[], r: Record<string, unknown>[], t: Record<string, unknown>[], l: Record<string, unknown>[], i: Record<string, unknown>[], rv: Record<string, unknown>[], st: Record<string, unknown>[], d: Record<string, unknown> | null): Partial<DataState> {
  const goals = g.map((x) => ({ id: x.id as string, title: x.title as string, kicker: (x.kicker as string | null) ?? null, note: (x.note as string | null) ?? null, focus: (x.focus as string | null) ?? null, next: (x.next as string | null) ?? null, ladder: (x.ladder as DataState['goals'][number]['ladder']) ?? [], status: x.status as DataState['goals'][number]['status'], createdAt: x.created_at as string, updatedAt: x.updated_at as string }))
  const routines = r.map((x) => ({ id: x.id as string, goalId: (x.goal_id as string | null) ?? null, name: x.name as string, sub: (x.sub as string | null) ?? null, frequency: parseSchedule(x.frequency), time: (x.time as string | null) ?? null, durMin: (x.dur_min as number | null) ?? null, kind: x.kind as DataState['routines'][number]['kind'], archived: !!x.archived, createdAt: x.created_at as string, updatedAt: x.updated_at as string }))
  const tasks = t.map((x) => ({ id: x.id as string, title: x.title as string, tier: x.tier as DataState['tasks'][number]['tier'], status: x.status as DataState['tasks'][number]['status'], date: (x.date as string | null) ?? null, time: (x.time as string | null) ?? null, durMin: (x.dur_min as number | null) ?? null, urgent: !!x.urgent, category: (x.category as DataState['tasks'][number]['category']) ?? null, completedAt: (x.completed_at as string | null) ?? null, note: (x.note as string | null) ?? null, goalId: (x.goal_id as string | null) ?? null, routineId: (x.routine_id as string | null) ?? null, createdAt: x.created_at as string, updatedAt: x.updated_at as string }))
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

/**
 * 云端 notes + note_folders 行 → 本机切片（纯函数，直接可测）。
 * push 是 upsert 镜像、不传播删除，所以云端可能残留成员已不足 2 的夹，甚至卡片的
 * folder_id 指向一个已经不存在的夹。回填前重跑一遍 folders.ts 那条唯一规则，
 * 否则换设备第一次打开备忘页就会凭空多出空文件夹。
 */
export function remoteNoteSlices(
  noteRows: Record<string, unknown>[],
  folderRows: Record<string, unknown>[],
): Pick<DataState, 'notes' | 'noteFolders'> {
  const notes: DataState['notes'] = noteRows.map((x) => ({
    id: x.id as string,
    title: x.title as string,
    body: (x.body as string) ?? '',
    tags: Array.isArray(x.tags) ? (x.tags as string[]) : [],
    pinned: !!x.pinned,
    folderId: (x.folder_id as string | null) ?? null,
    createdAt: x.created_at as string,
    updatedAt: x.updated_at as string,
  }))
  const noteFolders: DataState['noteFolders'] = folderRows.map((f) => ({
    id: f.id as string,
    title: f.title as string,
    createdAt: f.created_at as string,
  }))
  return pruneFolders({ notes, noteFolders })
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
    const [goals, routines, tasks, logs, inbox, reviews, stats, dir, fitS, langs, entries, words, notes, nfld, hdays, lact] = await Promise.all([
      supabase.from('goals').select('*').eq('user_id', uid),
      supabase.from('routines').select('*').eq('user_id', uid),
      supabase.from('tasks').select('*').eq('user_id', uid),
      supabase.from('habit_logs').select('*').eq('user_id', uid),
      supabase.from('inbox_items').select('*').eq('user_id', uid),
      supabase.from('reviews').select('*').eq('user_id', uid),
      supabase.from('day_stats').select('*').eq('user_id', uid),
      supabase.from('directions').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('fit_sessions').select('*').eq('user_id', uid),
      supabase.from('learn_langs').select('*').eq('user_id', uid),
      supabase.from('learn_entries').select('*').eq('user_id', uid),
      supabase.from('learn_words').select('*').eq('user_id', uid),
      supabase.from('notes').select('*').eq('user_id', uid),
      supabase.from('note_folders').select('*').eq('user_id', uid),
      supabase.from('health_days').select('*').eq('user_id', uid),
      supabase.from('learn_active').select('*').eq('user_id', uid).maybeSingle(),
    ])
    const count = (tasks.data?.length ?? 0) + (goals.data?.length ?? 0) + (routines.data?.length ?? 0) + (inbox.data?.length ?? 0)
    if (count === 0) return false
    const patch = remoteToState(
      (goals.data ?? []) as Record<string, unknown>[], (routines.data ?? []) as Record<string, unknown>[],
      (tasks.data ?? []) as Record<string, unknown>[], (logs.data ?? []) as Record<string, unknown>[],
      (inbox.data ?? []) as Record<string, unknown>[], (reviews.data ?? []) as Record<string, unknown>[],
      (stats.data ?? []) as Record<string, unknown>[], (dir.data ?? null) as Record<string, unknown> | null,
    )
    const R = (x: { data: unknown[] | null }) => (x.data ?? []) as Record<string, unknown>[]
    /* 0007 还没执行时 note_folders 查不到行、notes 也没有 folder_id 列——两侧都落成
       null/[]，等价于"回填成散卡"，不会报错也不会丢内容。 */
    const noteSlices = remoteNoteSlices(R({ data: notes.data }), R({ data: nfld.data }))
    useData.setState({
      ...patch,
      fitSessions: R({ data: fitS.data }).map((x) => ({ id: x.id as string, courseId: x.course_id as string, date: x.date as string, minutes: (x.minutes as number) ?? 0, kcal: (x.kcal as number) ?? 0, createdAt: x.created_at as string })),
      learnLangs: R({ data: langs.data }).map((x) => ({ id: x.id as string, name: x.name as string, goal: (x.goal as number) ?? 30, createdAt: x.created_at as string })),
      learnActive: ((lact.data as Record<string, unknown> | null)?.lang_id as string | null) ?? null,
      learnEntries: R({ data: entries.data }).map((x) => ({ id: x.id as string, langId: x.lang_id as string, date: x.date as string, words: (x.words as number) ?? 0, minutes: (x.minutes as number) ?? 0, mode: x.mode as DataState['learnEntries'][number]['mode'], createdAt: x.created_at as string })),
      learnWords: R({ data: words.data }).map((x) => ({ id: x.id as string, langId: x.lang_id as string, word: x.word as string, meaning: x.meaning as string, example: (x.example as string | null) ?? null, tag: (x.tag as string | null) ?? null, box: (x.box as number) ?? 1, due: x.due as string, source: (x.source as DataState['learnWords'][number]['source']) ?? 'manual', createdAt: x.created_at as string })),
      /* folderId / noteFolders 由 remoteNoteSlices 统一给出（含云端残留空夹的收口） */
      ...noteSlices,
      healthDays: Object.fromEntries(R({ data: hdays.data }).map((x) => [x.date as string, { steps: (x.steps as number) ?? 0, restingHR: (x.resting_hr as number) ?? 0, sleepMin: (x.sleep_min as number) ?? 0, deepMin: (x.deep_min as number) ?? 0, weight: Number(x.weight ?? 0) }])),
      lastDay: todayKey(),
    })
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
